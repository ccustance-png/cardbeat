import { Router } from 'express';
import { query } from './db.js';
import { authMiddleware } from './auth.js';

const router = Router();

// GET /api/watchlist — get current user's watchlist terms
router.get('/', authMiddleware, async (req, res) => {
  try {
    const { rows } = await query(
      `SELECT id, term, created_at FROM watchlist_terms WHERE user_id = $1 ORDER BY created_at ASC`,
      [req.user.id]
    );
    res.json({ terms: rows });
  } catch (err) {
    console.error('[Watchlist] GET error:', err.message);
    res.json({ terms: [] });
  }
});

// POST /api/watchlist — add a term
router.post('/', authMiddleware, async (req, res) => {
  const { term } = req.body;
  if (!term || typeof term !== 'string' || !term.trim()) {
    return res.status(400).json({ error: 'Term is required' });
  }
  const normalized = term.trim().toLowerCase().slice(0, 50);
  try {
    const { rows } = await query(
      `INSERT INTO watchlist_terms (user_id, term)
       VALUES ($1, $2)
       ON CONFLICT (user_id, term) DO UPDATE SET created_at = watchlist_terms.created_at
       RETURNING id, term, created_at`,
      [req.user.id, normalized]
    );
    res.json({ term: rows[0] });
  } catch (err) {
    console.error('[Watchlist] POST error:', err.message);
    res.status(500).json({ error: 'Failed to add term' });
  }
});

// DELETE /api/watchlist/:term — remove a term
router.delete('/:term', authMiddleware, async (req, res) => {
  try {
    await query(
      `DELETE FROM watchlist_terms WHERE user_id = $1 AND term = $2`,
      [req.user.id, decodeURIComponent(req.params.term)]
    );
    res.json({ ok: true });
  } catch (err) {
    console.error('[Watchlist] DELETE error:', err.message);
    res.status(500).json({ error: 'Failed to remove term' });
  }
});

export default router;
