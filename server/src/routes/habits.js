const router = require('express').Router();
const { query } = require('../config/db');
const auth = require('../middleware/auth');

router.use(auth);

// Get all habits
router.get('/', async (req, res) => {
  try {
    const { rows } = await query('SELECT * FROM habits WHERE user_id = $1 AND is_active = true ORDER BY created_at DESC', [req.user.id]);
    res.json({ habits: rows });
  } catch (e) { console.error(e); res.status(500).json({ error: 'Failed to get habits' }); }
});

// Get single habit
router.get('/:id', async (req, res) => {
  try {
    const { rows } = await query('SELECT * FROM habits WHERE id = $1 AND user_id = $2', [req.params.id, req.user.id]);
    if (!rows[0]) return res.status(404).json({ error: 'Not found' });
    res.json({ habit: rows[0] });
  } catch (e) { console.error(e); res.status(500).json({ error: 'Failed' }); }
});

// Create habit
router.post('/', async (req, res) => {
  try {
    const { title, description, category, frequency, color } = req.body;
    if (!title) return res.status(400).json({ error: 'Title required' });

    const { rows } = await query(
      'INSERT INTO habits (user_id, title, description, category, frequency, color) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *',
      [req.user.id, title, description || null, (category || 'OTHER').toUpperCase(), (frequency || 'DAILY').toUpperCase(), color || '#3b82f6']
    );

    // Add 10 points for creating a habit
    await query('UPDATE users SET points = points + 10, level = GREATEST(1, FLOOR((points + 10) / 100) + 1) WHERE id = $1', [req.user.id]);

    res.status(201).json({ habit: rows[0] });
  } catch (e) { console.error(e); res.status(500).json({ error: 'Failed to create habit' }); }
});

// Update habit
router.put('/:id', async (req, res) => {
  try {
    const { title, description, category, frequency, color } = req.body;
    const existing = await query('SELECT id FROM habits WHERE id = $1 AND user_id = $2', [req.params.id, req.user.id]);
    if (!existing.rows[0]) return res.status(404).json({ error: 'Not found' });

    const { rows } = await query(
      `UPDATE habits SET
        title = COALESCE($1, title),
        description = COALESCE($2, description),
        category = COALESCE($3, category),
        frequency = COALESCE($4, frequency),
        color = COALESCE($5, color)
      WHERE id = $6 RETURNING *`,
      [title, description, category ? category.toUpperCase() : null, frequency ? frequency.toUpperCase() : null, color, req.params.id]
    );
    res.json({ habit: rows[0] });
  } catch (e) { console.error(e); res.status(500).json({ error: 'Failed to update' }); }
});

// Delete habit
router.delete('/:id', async (req, res) => {
  try {
    const r = await query('DELETE FROM habits WHERE id = $1 AND user_id = $2 RETURNING id', [req.params.id, req.user.id]);
    if (!r.rows[0]) return res.status(404).json({ error: 'Not found' });
    res.json({ message: 'Deleted' });
  } catch (e) { console.error(e); res.status(500).json({ error: 'Failed to delete' }); }
});

module.exports = router;
