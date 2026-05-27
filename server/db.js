import pg from 'pg';
import 'dotenv/config';

const { Pool } = pg;

let pool = null;

if (process.env.DATABASE_URL) {
  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 8000,
    idleTimeoutMillis: 30000,
    max: 10,
  });

  pool.on('error', (err) => {
    console.error('[DB] Pool error (non-fatal):', err.message);
  });
}

export async function query(text, params) {
  if (!pool) throw new Error('Database not configured. Add a PostgreSQL service in Railway.');
  const client = await pool.connect();
  try {
    return await client.query(text, params);
  } finally {
    client.release();
  }
}

export async function migrate() {
  await query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      username VARCHAR(50) UNIQUE NOT NULL,
      email VARCHAR(255) UNIQUE NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      created_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS ratings (
      id SERIAL PRIMARY KEY,
      listing_id VARCHAR(255) NOT NULL,
      listing_title TEXT,
      listing_image TEXT,
      listing_price DECIMAL,
      listing_sport VARCHAR(50),
      listing_url TEXT,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      stars INTEGER CHECK (stars >= 1 AND stars <= 5),
      created_at TIMESTAMP DEFAULT NOW(),
      UNIQUE(listing_id, user_id)
    );

    CREATE TABLE IF NOT EXISTS reactions (
      id SERIAL PRIMARY KEY,
      listing_id VARCHAR(255) NOT NULL,
      listing_title TEXT,
      listing_image TEXT,
      listing_price DECIMAL,
      listing_sport VARCHAR(50),
      listing_url TEXT,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      emoji VARCHAR(10) NOT NULL,
      created_at TIMESTAMP DEFAULT NOW(),
      UNIQUE(listing_id, user_id, emoji)
    );

    CREATE TABLE IF NOT EXISTS comments (
      id SERIAL PRIMARY KEY,
      listing_id VARCHAR(255) NOT NULL,
      listing_title TEXT,
      listing_image TEXT,
      listing_price DECIMAL,
      listing_sport VARCHAR(50),
      listing_url TEXT,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      content TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS saved_listings (
      id SERIAL PRIMARY KEY,
      listing_id VARCHAR(255) NOT NULL,
      listing_title TEXT,
      listing_image TEXT,
      listing_price DECIMAL,
      listing_sport VARCHAR(50),
      listing_url TEXT,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      created_at TIMESTAMP DEFAULT NOW(),
      UNIQUE(listing_id, user_id)
    );

    CREATE TABLE IF NOT EXISTS listings (
      listing_id VARCHAR(255) PRIMARY KEY,
      listing_title TEXT,
      listing_image TEXT,
      listing_price DECIMAL,
      listing_sport VARCHAR(50),
      listing_url TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS shares (
      id SERIAL PRIMARY KEY,
      listing_id VARCHAR(255) NOT NULL,
      listing_title TEXT,
      listing_image TEXT,
      listing_price DECIMAL,
      listing_sport VARCHAR(50),
      listing_url TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    );
  `);
  console.log('[DB] Schema ready');
}

export default pool;
