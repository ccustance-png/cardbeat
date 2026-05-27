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

// IMPORTANT: specific routes must come BEFORE /:listingId wildcard

// GET /api/social/saved — current user's saved listings
router.get('/saved', authMiddleware, async (req, res) => {
  try {
    const { rows } = await query(
      `SELECT listing_id, listing_title AS title, listing_image AS image,
              listing_price AS price, listing_sport AS sport, listing_url AS item_url, created_at
       FROM saved_listings WHERE user_id = $1 ORDER BY created_at DESC`,
      [req.user.id]
    );
    res.json(rows);
  } catch (err) {
    console.error('[Social] saved error:', err.message);
    res.json([]);
  }
});

// GET /api/social/trending/top — top listings by engagement score in last 24h
router.get('/trending/top', async (_req, res) => {
  try {
    const { rows } = await query(`
      SELECT
        base.listing_id,
        base.title,
        base.image,
        base.price,
        base.sport,
        COALESCE(r.cnt,  0) * 2
          + COALESCE(c.cnt,  0) * 3
          + COALESCE(rx.cnt, 0) * 1
          + COALESCE(sv.cnt, 0) * 2
          + COALESCE(sh.cnt, 0) * 3  AS score,
        COALESCE(r.cnt,  0) AS rating_count,
        COALESCE(c.cnt,  0) AS comment_count,
        COALESCE(rx.cnt, 0) AS reaction_count,
        COALESCE(sv.cnt, 0) AS save_count,
        COALESCE(sh.cnt, 0) AS share_count,
        r.avg_stars
      FROM (
        SELECT
          listing_id,
          MAX(listing_title)  AS title,
          MAX(listing_image)  AS image,
          MAX(listing_price)  AS price,
          MAX(listing_sport)  AS sport
        FROM (
          SELECT listing_id, listing_title, listing_image, listing_price, listing_sport FROM ratings        WHERE created_at > NOW() - INTERVAL '24 hours'
          UNION ALL
          SELECT listing_id, listing_title, listing_image, listing_price, listing_sport FROM comments       WHERE created_at > NOW() - INTERVAL '24 hours'
          UNION ALL
          SELECT listing_id, listing_title, listing_image, listing_price, listing_sport FROM reactions      WHERE created_at > NOW() - INTERVAL '24 hours'
          UNION ALL
          SELECT listing_id, listing_title, listing_image, listing_price, listing_sport FROM saved_listings WHERE created_at > NOW() - INTERVAL '24 hours'
          UNION ALL
          SELECT listing_id, listing_title, listing_image, listing_price, listing_sport FROM shares         WHERE created_at > NOW() - INTERVAL '24 hours'
        ) all_activity
        GROUP BY listing_id
      ) base
      LEFT JOIN (
        SELECT listing_id, COUNT(*) AS cnt, ROUND(AVG(stars)::numeric, 1) AS avg_stars
        FROM ratings WHERE created_at > NOW() - INTERVAL '24 hours'
        GROUP BY listing_id
      ) r  ON r.listing_id  = base.listing_id
      LEFT JOIN (
        SELECT listing_id, COUNT(*) AS cnt
        FROM comments WHERE created_at > NOW() - INTERVAL '24 hours'
        GROUP BY listing_id
      ) c  ON c.listing_id  = base.listing_id
      LEFT JOIN (
        SELECT listing_id, COUNT(*) AS cnt
        FROM reactions WHERE created_at > NOW() - INTERVAL '24 hours'
        GROUP BY listing_id
      ) rx ON rx.listing_id = base.listing_id
      LEFT JOIN (
        SELECT listing_id, COUNT(*) AS cnt
        FROM saved_listings WHERE created_at > NOW() - INTERVAL '24 hours'
        GROUP BY listing_id
      ) sv ON sv.listing_id = base.listing_id
      LEFT JOIN (
        SELECT listing_id, COUNT(*) AS cnt
        FROM shares WHERE created_at > NOW() - INTERVAL '24 hours'
        GROUP BY listing_id
      ) sh ON sh.listing_id = base.listing_id
      ORDER BY score DESC
      LIMIT 10
    `);
    res.json(rows);
  } catch (err) {
    console.error('[Social] trending error:', err.message);
    res.json([]);
  }
});

// POST /api/social/:listingId/share — record a share event for trending
router.post('/:listingId/share', async (req, res) => {
  const { listingId } = req.params;
  const meta = listingMeta(req.body);
  try {
    await query(
      `INSERT INTO shares (listing_id, listing_title, listing_image, listing_price, listing_sport, listing_url)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [listingId, meta.listing_title, meta.listing_image, meta.listing_price, meta.listing_sport, meta.listing_url]
    );
    res.json({ ok: true });
  } catch (err) {
    console.error('[Social] share error:', err.message);
    res.json({ ok: false });
  }
});

// POST /api/social/:listingId/register — store listing metadata on share (no auth needed)
router.post('/:listingId/register', async (req, res) => {
  const { listingId } = req.params;
  const meta = listingMeta(req.body);
  try {
    await query(`
      INSERT INTO listings (listing_id, listing_title, listing_image, listing_price, listing_sport, listing_url)
      VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (listing_id) DO UPDATE SET
        listing_title = COALESCE($2, listings.listing_title),
        listing_image = COALESCE($3, listings.listing_image),
        listing_price = COALESCE($4, listings.listing_price),
        listing_sport = COALESCE($5, listings.listing_sport),
        listing_url   = COALESCE($6, listings.listing_url)
    `, [listingId, meta.listing_title, meta.listing_image, meta.listing_price, meta.listing_sport, meta.listing_url]);
    res.json({ ok: true });
  } catch (err) {
    console.error('[Social] register error:', err.message);
    res.json({ ok: false });
  }
});

// GET /api/social/listing/:listingId — full listing data for permalink pages
router.get('/listing/:listingId', optionalAuth, async (req, res) => {
  const { listingId } = req.params;
  const userId = req.user?.id || null;
  try {
    // Look up metadata — try the dedicated listings table first, then fall back to
    // interaction tables. Run separately so a missing listings table doesn't crash everything.
    let meta = null;

    try {
      const r = await query(
        `SELECT listing_id, listing_title, listing_image, listing_price, listing_sport, listing_url
         FROM listings WHERE listing_id = $1 AND listing_title IS NOT NULL LIMIT 1`,
        [listingId]
      );
      if (r.rows.length) meta = r.rows[0];
    } catch {}

    if (!meta) {
      const r = await query(
        `SELECT listing_id, listing_title, listing_image, listing_price, listing_sport, listing_url
         FROM (
           SELECT listing_id, listing_title, listing_image, listing_price, listing_sport, listing_url FROM ratings        WHERE listing_id = $1 AND listing_title IS NOT NULL LIMIT 1
           UNION ALL
           SELECT listing_id, listing_title, listing_image, listing_price, listing_sport, listing_url FROM comments       WHERE listing_id = $1 AND listing_title IS NOT NULL LIMIT 1
           UNION ALL
           SELECT listing_id, listing_title, listing_image, listing_price, listing_sport, listing_url FROM reactions      WHERE listing_id = $1 AND listing_title IS NOT NULL LIMIT 1
           UNION ALL
           SELECT listing_id, listing_title, listing_image, listing_price, listing_sport, listing_url FROM saved_listings WHERE listing_id = $1 AND listing_title IS NOT NULL LIMIT 1
         ) fallback LIMIT 1`,
        [listingId]
      );
      if (r.rows.length) meta = r.rows[0];
    }

    if (!meta) return res.status(404).json({ error: 'Listing not found' });

    const [ratingsRes, reactionsRes, commentsRes, myRatingRes, myReactionsRes, savedRes] = await Promise.all([
      query(`SELECT ROUND(AVG(stars)::numeric, 1) as avg, COUNT(*) as count FROM ratings WHERE listing_id = $1`, [listingId]),
      query(`SELECT emoji, COUNT(*) as count FROM reactions WHERE listing_id = $1 GROUP BY emoji`, [listingId]),
      query(`SELECT c.id, c.content, c.created_at, u.username FROM comments c JOIN users u ON c.user_id = u.id WHERE c.listing_id = $1 ORDER BY c.created_at ASC`, [listingId]),
      userId ? query(`SELECT stars FROM ratings WHERE listing_id = $1 AND user_id = $2`, [listingId, userId]) : Promise.resolve({ rows: [] }),
      userId ? query(`SELECT emoji FROM reactions WHERE listing_id = $1 AND user_id = $2`, [listingId, userId]) : Promise.resolve({ rows: [] }),
      userId ? query(`SELECT id FROM saved_listings WHERE listing_id = $1 AND user_id = $2`, [listingId, userId]) : Promise.resolve({ rows: [] }),
    ]);

    res.json({
      id: meta.listing_id,
      title: meta.listing_title,
      image: meta.listing_image,
      price: parseFloat(meta.listing_price) || 0,
      sport: meta.listing_sport,
      itemUrl: meta.listing_url,
      social: {
        rating: { avg: parseFloat(ratingsRes.rows[0]?.avg) || null, count: parseInt(ratingsRes.rows[0]?.count) || 0, myStars: myRatingRes.rows[0]?.stars || null },
        reactions: reactionsRes.rows.map(r => ({ emoji: r.emoji, count: parseInt(r.count) })),
        myReactions: myReactionsRes.rows.map(r => r.emoji),
        comments: commentsRes.rows,
        isSaved: savedRes.rows.length > 0,
      },
    });
  } catch (err) {
    console.error('[Listing] page error:', err.message);
    res.status(500).json({ error: 'Failed to fetch listing' });
  }
});

// GET /api/social/:listingId — ratings, reactions, comments summary
router.get('/:listingId', optionalAuth, async (req, res) => {
  const { listingId } = req.params;
  const userId = req.user?.id || null;

  try {
    const [ratingsRes, reactionsRes, commentsRes, myRatingRes, myReactionsRes, savedRes] = await Promise.all([
      query(`SELECT ROUND(AVG(stars)::numeric, 1) as avg, COUNT(*) as count FROM ratings WHERE listing_id = $1`, [listingId]),
      query(`SELECT emoji, COUNT(*) as count FROM reactions WHERE listing_id = $1 GROUP BY emoji`, [listingId]),
      query(`SELECT c.id, c.content, c.created_at, u.username FROM comments c JOIN users u ON c.user_id = u.id WHERE c.listing_id = $1 ORDER BY c.created_at DESC LIMIT 20`, [listingId]),
      userId ? query(`SELECT stars FROM ratings WHERE listing_id = $1 AND user_id = $2`, [listingId, userId]) : Promise.resolve({ rows: [] }),
      userId ? query(`SELECT emoji FROM reactions WHERE listing_id = $1 AND user_id = $2`, [listingId, userId]) : Promise.resolve({ rows: [] }),
      userId ? query(`SELECT id FROM saved_listings WHERE listing_id = $1 AND user_id = $2`, [listingId, userId]) : Promise.resolve({ rows: [] }),
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
      isSaved: savedRes.rows.length > 0,
    });
  } catch (err) {
    console.error('[Social] get error:', err.message);
    res.json({ rating: { avg: null, count: 0, myStars: null }, reactions: [], myReactions: [], comments: [], isSaved: false });
  }
});

// POST /api/social/:listingId/rate
router.post('/:listingId/rate', authMiddleware, async (req, res) => {
  const { listingId } = req.params;
  const { stars, ...rest } = req.body;
  if (!stars || stars < 1 || stars > 5)
    return res.status(400).json({ error: 'Stars must be 1–5' });

  try {
    const meta = listingMeta(rest);
    await query(`
      INSERT INTO ratings (listing_id, user_id, stars, listing_title, listing_image, listing_price, listing_sport, listing_url)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      ON CONFLICT (listing_id, user_id) DO UPDATE SET stars = $3
    `, [listingId, req.user.id, stars, meta.listing_title, meta.listing_image, meta.listing_price, meta.listing_sport, meta.listing_url]);

    const { rows } = await query(`SELECT ROUND(AVG(stars)::numeric, 1) as avg, COUNT(*) as count FROM ratings WHERE listing_id = $1`, [listingId]);
    res.json({ avg: parseFloat(rows[0].avg), count: parseInt(rows[0].count), myStars: stars });
  } catch (err) {
    console.error('[Social] rate error:', err.message);
    res.status(500).json({ error: 'Rating failed' });
  }
});

// POST /api/social/:listingId/react
router.post('/:listingId/react', authMiddleware, async (req, res) => {
  const { listingId } = req.params;
  const { emoji, ...rest } = req.body;
  if (!ALLOWED_EMOJIS.includes(emoji))
    return res.status(400).json({ error: 'Invalid emoji' });

  try {
    const meta = listingMeta(rest);
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
  } catch (err) {
    console.error('[Social] react error:', err.message);
    res.status(500).json({ error: 'Reaction failed' });
  }
});

// POST /api/social/:listingId/comment
router.post('/:listingId/comment', authMiddleware, async (req, res) => {
  const { listingId } = req.params;
  const { content, ...rest } = req.body;
  if (!content?.trim()) return res.status(400).json({ error: 'Comment cannot be empty' });
  if (content.length > 500) return res.status(400).json({ error: 'Comment too long (max 500 chars)' });

  try {
    const meta = listingMeta(rest);
    const { rows } = await query(`
      INSERT INTO comments (listing_id, user_id, content, listing_title, listing_image, listing_price, listing_sport, listing_url)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING id, content, created_at
    `, [listingId, req.user.id, content.trim(), meta.listing_title, meta.listing_image, meta.listing_price, meta.listing_sport, meta.listing_url]);

    res.json({ ...rows[0], username: req.user.username });
  } catch (err) {
    console.error('[Social] comment error:', err.message);
    res.status(500).json({ error: 'Comment failed' });
  }
});

// POST /api/social/:listingId/save — toggle save/unsave
router.post('/:listingId/save', authMiddleware, async (req, res) => {
  const { listingId } = req.params;
  const meta = listingMeta(req.body);
  try {
    const existing = await query(
      `SELECT id FROM saved_listings WHERE listing_id = $1 AND user_id = $2`,
      [listingId, req.user.id]
    );
    if (existing.rows.length) {
      await query(`DELETE FROM saved_listings WHERE listing_id = $1 AND user_id = $2`, [listingId, req.user.id]);
      res.json({ saved: false });
    } else {
      await query(
        `INSERT INTO saved_listings (listing_id, user_id, listing_title, listing_image, listing_price, listing_sport, listing_url)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [listingId, req.user.id, meta.listing_title, meta.listing_image, meta.listing_price, meta.listing_sport, meta.listing_url]
      );
      res.json({ saved: true });
    }
  } catch (err) {
    console.error('[Social] save error:', err.message);
    res.status(500).json({ error: 'Save failed' });
  }
});

export default router;
