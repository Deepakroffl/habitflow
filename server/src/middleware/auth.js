const jwt = require('jsonwebtoken');
const { query } = require('../config/db');

const auth = async (req, res, next) => {
  try {
    const header = req.headers.authorization;
    if (!header || !header.startsWith('Bearer ')) return res.status(401).json({ error: 'Authentication required' });
    const token = header.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const { rows } = await query('SELECT id, email, username FROM users WHERE id = $1', [decoded.userId]);
    if (!rows[0]) return res.status(401).json({ error: 'User not found' });
    req.user = rows[0];
    next();
  } catch (e) {
    res.status(401).json({ error: 'Invalid token' });
  }
};

module.exports = auth;
