const express = require('express');
const path    = require('path');
const app     = express();
const PORT    = process.env.PORT || 3000;

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

app.listen(PORT, () => {
  console.log(`\n✅  MyInsta running → http://localhost:${PORT}\n`);
  console.log(`   User Login : http://localhost:${PORT}/login`);
  console.log(`   Dashboard  : http://localhost:${PORT}/dashboard`);
  console.log(`   Admin Login: http://localhost:${PORT}/alogin`);
  console.log(`   Admin Panel: http://localhost:${PORT}/admin\n`);
});
