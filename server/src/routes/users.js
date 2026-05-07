const router = require('express').Router();
const { query } = require('../config/db');
const auth = require('../middleware/auth');

router.use(auth);

// Export user data as JSON or CSV
router.get('/export', async (req, res) => {
  try {
    const fmt = req.query.format || 'json';

    const [user, habits, logs] = await Promise.all([
      query('SELECT username, email, points, level, created_at FROM users WHERE id = $1', [req.user.id]),
      query('SELECT title, description, category, frequency, color, created_at FROM habits WHERE user_id = $1', [req.user.id]),
      query(
        `SELECT h.title AS habit, l.date::text, l.status, l.reason, l.notes
         FROM habit_logs l JOIN habits h ON h.id = l.habit_id
         WHERE l.user_id = $1 ORDER BY l.date DESC`, [req.user.id]
      ),
    ]);

    if (fmt === 'csv') {
      let csv = 'Habit,Date,Status,Reason,Notes\n';
      logs.rows.forEach(r => {
        csv += `"${r.habit}","${r.date}","${r.status}","${r.reason || ''}","${r.notes || ''}"\n`;
      });
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=habitflow-export.csv');
      return res.send(csv);
    }

    res.json({ user: user.rows[0], habits: habits.rows, logs: logs.rows, exportedAt: new Date() });
  } catch (e) { console.error(e); res.status(500).json({ error: 'Failed' }); }
});

module.exports = router;
