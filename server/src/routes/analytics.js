const router = require('express').Router();
const { query } = require('../config/db');
const auth = require('../middleware/auth');

router.use(auth);

// Daily stats
router.get('/daily', async (req, res) => {
  try {
    const days = Math.min(parseInt(req.query.days) || 30, 365);
    const { rows } = await query(
      `SELECT date::text, status, COUNT(*)::int AS count
       FROM habit_logs
       WHERE user_id = $1 AND date >= CURRENT_DATE - $2::int
       GROUP BY date, status ORDER BY date`, [req.user.id, days]
    );
    res.json({ dailyStats: rows });
  } catch (e) { console.error(e); res.status(500).json({ error: 'Failed' }); }
});

// Monthly stats
router.get('/monthly', async (req, res) => {
  try {
    const { rows } = await query(
      `SELECT TO_CHAR(date, 'YYYY-MM') AS month, status, COUNT(*)::int AS count
       FROM habit_logs
       WHERE user_id = $1 AND date >= CURRENT_DATE - INTERVAL '12 months'
       GROUP BY month, status ORDER BY month`, [req.user.id]
    );
    res.json({ monthlyStats: rows });
  } catch (e) { console.error(e); res.status(500).json({ error: 'Failed' }); }
});

// Streaks per habit
router.get('/streaks', async (req, res) => {
  try {
    const habits = await query(
      'SELECT id, title, category, color FROM habits WHERE user_id = $1 AND is_active = true',
      [req.user.id]
    );

    const streaks = [];

    for (const h of habits.rows) {
      const { rows: dates } = await query(
        `SELECT date::text FROM habit_logs
         WHERE habit_id = $1 AND status = 'COMPLETED' ORDER BY date DESC`,
        [h.id]
      );

      let currentStreak = 0;
      let longestStreak = 0;

      if (dates.length > 0) {
        // Current streak
        const today = new Date(); today.setHours(0,0,0,0);
        const yesterday = new Date(today); yesterday.setDate(yesterday.getDate() - 1);
        const first = new Date(dates[0].date); first.setHours(0,0,0,0);

        if (first.getTime() === today.getTime() || first.getTime() === yesterday.getTime()) {
          currentStreak = 1;
          for (let i = 1; i < dates.length; i++) {
            const a = new Date(dates[i - 1].date);
            const b = new Date(dates[i].date);
            if (Math.round((a - b) / 86400000) === 1) currentStreak++;
            else break;
          }
        }

        // Longest streak
        const sorted = dates.map(d => new Date(d.date)).sort((a, b) => a - b);
        let tmp = 1;
        longestStreak = 1;
        for (let i = 1; i < sorted.length; i++) {
          if (Math.round((sorted[i] - sorted[i - 1]) / 86400000) === 1) {
            tmp++;
            if (tmp > longestStreak) longestStreak = tmp;
          } else tmp = 1;
        }
        longestStreak = Math.max(longestStreak, currentStreak);
      }

      streaks.push({
        habitId: h.id,
        habitTitle: h.title,
        category: h.category,
        color: h.color,
        currentStreak,
        longestStreak,
        totalCompletions: dates.length,
      });
    }

    res.json({ streaks });
  } catch (e) { console.error(e); res.status(500).json({ error: 'Failed' }); }
});

// Overview
router.get('/overview', async (req, res) => {
  try {
    const r = await query(
      `SELECT
        (SELECT COUNT(*)::int FROM habits WHERE user_id = $1 AND is_active = true) AS total_habits,
        (SELECT COUNT(*)::int FROM habit_logs WHERE user_id = $1) AS total_logs,
        (SELECT COUNT(*)::int FROM habit_logs WHERE user_id = $1 AND status = 'COMPLETED') AS completed,
        (SELECT points FROM users WHERE id = $1) AS points,
        (SELECT level FROM users WHERE id = $1) AS level`,
      [req.user.id]
    );
    const d = r.rows[0];
    res.json({
      overview: {
        totalHabits: d.total_habits,
        totalLogs: d.total_logs,
        completed: d.completed,
        missed: d.total_logs - d.completed,
        rate: d.total_logs > 0 ? Math.round((d.completed / d.total_logs) * 100) : 0,
        points: d.points,
        level: d.level,
      }
    });
  } catch (e) { console.error(e); res.status(500).json({ error: 'Failed' }); }
});

module.exports = router;
