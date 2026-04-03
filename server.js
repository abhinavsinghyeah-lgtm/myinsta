const express = require('express');
const path    = require('path');
const fs      = require('fs');
const app     = express();
const PORT    = process.env.PORT || 3000;

app.use(express.json());

// Data dir for referrals
const dataDir  = path.join(__dirname, 'data');
const refsFile = path.join(dataDir, 'refs.json');
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

// Catch-all → login
app.get('*', (_, res) => res.redirect('/login'));

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

app.listen(PORT, () => {
  console.log(`\n✅  MyInsta running → http://localhost:${PORT}\n`);
  console.log(`   User Login : http://localhost:${PORT}/login`);
  console.log(`   Dashboard  : http://localhost:${PORT}/dashboard`);
  console.log(`   Admin Login: http://localhost:${PORT}/alogin`);
  console.log(`   Admin Panel: http://localhost:${PORT}/admin\n`);
});
