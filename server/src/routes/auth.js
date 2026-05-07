const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { query } = require('../config/db');
const auth = require('../middleware/auth');

const sign = (id, email) => jwt.sign({ userId: id, email }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });

router.post('/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;
    if (!username || !email || !password) return res.status(400).json({ error: 'All fields are required' });
    if (password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' });

    const exists = await query('SELECT id FROM users WHERE email = $1', [email.toLowerCase()]);
    if (exists.rows.length) return res.status(400).json({ error: 'Email already registered' });

    const hash = await bcrypt.hash(password, 12);
    const { rows } = await query(
      'INSERT INTO users (username, email, password) VALUES ($1, $2, $3) RETURNING id, username, email, points, level, created_at',
      [username, email.toLowerCase(), hash]
    );
    res.status(201).json({ user: rows[0], token: sign(rows[0].id, rows[0].email) });
  } catch (e) { console.error(e); res.status(500).json({ error: 'Registration failed' }); }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

    const { rows } = await query('SELECT * FROM users WHERE email = $1', [email.toLowerCase()]);
    if (!rows[0]) return res.status(401).json({ error: 'Invalid credentials' });

    const ok = await bcrypt.compare(password, rows[0].password);
    if (!ok) return res.status(401).json({ error: 'Invalid credentials' });

    const u = rows[0];
    res.json({ user: { id: u.id, username: u.username, email: u.email, points: u.points, level: u.level, created_at: u.created_at }, token: sign(u.id, u.email) });
  } catch (e) { console.error(e); res.status(500).json({ error: 'Login failed' }); }
});

router.get('/me', auth, async (req, res) => {
  try {
    const { rows } = await query('SELECT id, username, email, points, level, created_at FROM users WHERE id = $1', [req.user.id]);
    if (!rows[0]) return res.status(404).json({ error: 'User not found' });
    res.json({ user: rows[0] });
  } catch (e) { console.error(e); res.status(500).json({ error: 'Failed' }); }
});

module.exports = router;
