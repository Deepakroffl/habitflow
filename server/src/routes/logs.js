const router = require('express').Router();
const { query } = require('../config/db');
const auth = require('../middleware/auth');

router.use(auth);

// Get all logs for the user
router.get('/', async (req, res) => {
  try {
    const { rows } = await query(
      `SELECT l.*, h.title AS habit_title, h.category, h.color
       FROM habit_logs l JOIN habits h ON h.id = l.habit_id
       WHERE l.user_id = $1 ORDER BY l.date DESC`, [req.user.id]
    );
    res.json({ logs: rows });
  } catch (e) { console.error(e); res.status(500).json({ error: 'Failed' }); }
});

// Get logs for a specific date
router.get('/date/:date', async (req, res) => {
  try {
    const { rows } = await query(
      `SELECT l.*, h.title AS habit_title, h.category, h.color
       FROM habit_logs l JOIN habits h ON h.id = l.habit_id
       WHERE l.user_id = $1 AND l.date = $2`, [req.user.id, req.params.date]
    );
    res.json({ logs: rows });
  } catch (e) { console.error(e); res.status(500).json({ error: 'Failed' }); }
});

// Get logs for a specific habit
router.get('/habit/:habitId', async (req, res) => {
  try {
    const { rows } = await query(
      'SELECT * FROM habit_logs WHERE habit_id = $1 AND user_id = $2 ORDER BY date DESC',
      [req.params.habitId, req.user.id]
    );
    res.json({ logs: rows });
  } catch (e) { console.error(e); res.status(500).json({ error: 'Failed' }); }
});

// Create or update a log (upsert – prevents duplicates for same habit+date)
router.post('/', async (req, res) => {
  try {
    const { habitId, date, status, reason, notes } = req.body;
    if (!habitId || !date || !status) return res.status(400).json({ error: 'habitId, date, and status required' });

    // Check habit belongs to user
    const h = await query('SELECT id FROM habits WHERE id = $1 AND user_id = $2', [habitId, req.user.id]);
    if (!h.rows[0]) return res.status(404).json({ error: 'Habit not found' });

    const st = status.toUpperCase();
    const { rows } = await query(
      `INSERT INTO habit_logs (habit_id, user_id, date, status, reason, notes)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (habit_id, date)
       DO UPDATE SET status = $4, reason = $5, notes = $6
       RETURNING *`,
      [habitId, req.user.id, date, st, st === 'MISSED' ? (reason || null) : null, notes || null]
    );

    // Add 5 points for completing a habit
    if (st === 'COMPLETED') {
      await query('UPDATE users SET points = points + 5, level = GREATEST(1, FLOOR((points + 5) / 100) + 1) WHERE id = $1', [req.user.id]);
    }

    res.json({ log: rows[0] });
  } catch (e) { console.error(e); res.status(500).json({ error: 'Failed to save log' }); }
});

module.exports = router;
