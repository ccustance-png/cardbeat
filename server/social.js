import { Router } from 'express';
import { query } from './db.js';
import { authMiddleware, optionalAuth } from './auth.js';

const router = Router();

const ALLOWED_EMOJIS = ['🔥', '💎', '🚀', '💩', '🤔'];

function listingMeta(body) {
  return {
    listing_title: body.title || null,
    listing_image: body.image || null,
    listing_price: body.price || null,
    listing_sport: body.sport || null,
    listing_url: body.itemUrl || null,
  };
}

// GET /api/social/:listingId — ratings, reactions, comments summary
router.get('/:listingId', optionalAuth, async (req, res) => {
  const { listingId } = req.params;
  const userId = req.user?.id || null;

  const [ratingsRes, reactionsRes, commentsRes, myRatingRes, myReactionsRes] = await Promise.all([
    query(`SELECT ROUND(AVG(stars)::numeric, 1) as avg, COUNT(*) as count FROM ratings WHERE listing_id = $1`, [listingId]),
    query(`SELECT emoji, COUNT(*) as count FROM reactions WHERE listing_id = $1 GROUP BY emoji`, [listingId]),
    query(`SELECT c.id, c.content, c.created_at, u.username FROM comments c JOIN users u ON c.user_id = u.id WHERE c.listing_id = $1 ORDER BY c.created_at DESC LIMIT 20`, [listingId]),
    userId ? query(`SELECT stars FROM ratings WHERE listing_id = $1 AND user_id = $2`, [listingId, userId]) : Promise.resolve({ rows: [] }),
    userId ? query(`SELECT emoji FROM reactions WHERE listing_id = $1 AND user_id = $2`, [listingId, userId]) : Promise.resolve({ rows: [] }),
  ]);

  res.json({
    rating: {
      avg: parseFloat(ratingsRes.rows[0]?.avg) || null,
      count: parseInt(ratingsRes.rows[0]?.count) || 0,
      myStars: myRatingRes.rows[0]?.stars || null,
    },
    reactions: reactionsRes.rows.map(r => ({ emoji: r.emoji, count: parseInt(r.count) })),
    myReactions: myReactionsRes.rows.map(r => r.emoji),
    comments: commentsRes.rows,
  });
});

// POST /api/social/:listingId/rate
router.post('/:listingId/rate', authMiddleware, async (req, res) => {
  const { listingId } = req.params;
  const { stars, ...rest } = req.body;
  if (!stars || stars < 1 || stars > 5)
    return res.status(400).json({ error: 'Stars must be 1–5' });

  const meta = listingMeta(rest);
  await query(`
    INSERT INTO ratings (listing_id, user_id, stars, listing_title, listing_image, listing_price, listing_sport, listing_url)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    ON CONFLICT (listing_id, user_id) DO UPDATE SET stars = $3
  `, [listingId, req.user.id, stars, meta.listing_title, meta.listing_image, meta.listing_price, meta.listing_sport, meta.listing_url]);

  const { rows } = await query(`SELECT ROUND(AVG(stars)::numeric, 1) as avg, COUNT(*) as count FROM ratings WHERE listing_id = $1`, [listingId]);
  res.json({ avg: parseFloat(rows[0].avg), count: parseInt(rows[0].count), myStars: stars });
});

// POST /api/social/:listingId/react
router.post('/:listingId/react', authMiddleware, async (req, res) => {
  const { listingId } = req.params;
  const { emoji, ...rest } = req.body;
  if (!ALLOWED_EMOJIS.includes(emoji))
    return res.status(400).json({ error: 'Invalid emoji' });

  const meta = listingMeta(rest);
  // Toggle: if exists remove, else add
  const existing = await query(`SELECT id FROM reactions WHERE listing_id = $1 AND user_id = $2 AND emoji = $3`, [listingId, req.user.id, emoji]);
  if (existing.rows.length) {
    await query(`DELETE FROM reactions WHERE listing_id = $1 AND user_id = $2 AND emoji = $3`, [listingId, req.user.id, emoji]);
  } else {
    await query(`
      INSERT INTO reactions (listing_id, user_id, emoji, listing_title, listing_image, listing_price, listing_sport, listing_url)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    `, [listingId, req.user.id, emoji, meta.listing_title, meta.listing_image, meta.listing_price, meta.listing_sport, meta.listing_url]);
  }

  const { rows } = await query(`SELECT emoji, COUNT(*) as count FROM reactions WHERE listing_id = $1 GROUP BY emoji`, [listingId]);
  res.json({ reactions: rows.map(r => ({ emoji: r.emoji, count: parseInt(r.count) })), toggled: emoji, active: !existing.rows.length });
});

// POST /api/social/:listingId/comment
router.post('/:listingId/comment', authMiddleware, async (req, res) => {
  const { listingId } = req.params;
  const { content, ...rest } = req.body;
  if (!content?.trim()) return res.status(400).json({ error: 'Comment cannot be empty' });
  if (content.length > 500) return res.status(400).json({ error: 'Comment too long (max 500 chars)' });

  const meta = listingMeta(rest);
  const { rows } = await query(`
    INSERT INTO comments (listing_id, user_id, content, listing_title, listing_image, listing_price, listing_sport, listing_url)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    RETURNING id, content, created_at
  `, [listingId, req.user.id, content.trim(), meta.listing_title, meta.listing_image, meta.listing_price, meta.listing_sport, meta.listing_url]);

  res.json({ ...rows[0], username: req.user.username });
});

// GET /api/trending — top listings by interaction score in last 24h
router.get('/trending/top', async (_req, res) => {
  const { rows } = await query(`
    SELECT
      listing_id,
      MAX(listing_title) as title,
      MAX(listing_image) as image,
      MAX(listing_price::text)::decimal as price,
      MAX(listing_sport) as sport,
      MAX(listing_url) as item_url,
      (COUNT(DISTINCT r.id) * 2 + COUNT(DISTINCT c.id) * 3 + COUNT(DISTINCT rx.id)) as score,
      COUNT(DISTINCT r.id) as rating_count,
      COUNT(DISTINCT c.id) as comment_count,
      COUNT(DISTINCT rx.id) as reaction_count,
      ROUND(AVG(r.stars)::numeric, 1) as avg_stars
    FROM (
      SELECT listing_id, listing_title, listing_image, listing_price, listing_sport, listing_url, id as id FROM ratings WHERE created_at > NOW() - INTERVAL '24 hours'
      UNION ALL
      SELECT listing_id, listing_title, listing_image, listing_price, listing_sport, listing_url, NULL FROM comments WHERE created_at > NOW() - INTERVAL '24 hours'
      UNION ALL
      SELECT listing_id, listing_title, listing_image, listing_price, listing_sport, listing_url, NULL FROM reactions WHERE created_at > NOW() - INTERVAL '24 hours'
    ) combined
    LEFT JOIN ratings r ON r.listing_id = combined.listing_id AND r.created_at > NOW() - INTERVAL '24 hours'
    LEFT JOIN comments c ON c.listing_id = combined.listing_id AND c.created_at > NOW() - INTERVAL '24 hours'
    LEFT JOIN reactions rx ON rx.listing_id = combined.listing_id AND rx.created_at > NOW() - INTERVAL '24 hours'
    GROUP BY listing_id
    ORDER BY score DESC
    LIMIT 10
  `);
  res.json(rows);
});

export default router;
