import 'dotenv/config';
import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { fetchBrowseAllSports } from './ebayClient.js';
import { generateMockSale, generateMockSales } from './mockData.js';
import { addSale, getSales } from './store.js';
import { migrate } from './db.js';
import authRouter from './auth.js';
import socialRouter from './social.js';
import watchlistRouter from './watchlist.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const IS_PROD = process.env.NODE_ENV === 'production';

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, { cors: { origin: '*' } });

const PORT = process.env.PORT || 3001;
const USE_MOCK = process.env.USE_MOCK === 'true' || !process.env.EBAY_CLIENT_ID;
const POLL_INTERVAL_MS = 30000; // 30 seconds between eBay polls

app.use(cors());
app.use(express.json());

app.use('/api/auth', authRouter);
app.use('/api/social', socialRouter);
app.use('/api/watchlist', watchlistRouter);

app.get('/api/sales', (req, res) => {
  const { sport, limit } = req.query;
  res.json(getSales(sport || null, parseInt(limit) || 100));
});

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, mode: USE_MOCK ? 'mock' : 'live', time: new Date().toISOString() });
});

// Serve React build in production
if (IS_PROD) {
  const distPath = join(__dirname, '../dist');
  app.use(express.static(distPath));
  app.get('*', (_req, res) => res.sendFile(join(distPath, 'index.html')));
}

io.on('connection', (socket) => {
  console.log(`Client connected: ${socket.id}`);
  // Send existing sales on connect
  socket.emit('initialSales', getSales(null, 100));
  socket.on('disconnect', () => console.log(`Client disconnected: ${socket.id}`));
});

function broadcastSale(sale) {
  const enriched = addSale(sale);
  if (enriched) io.emit('newSale', enriched);
}

async function pollEbay() {
  try {
    console.log('[eBay] Polling active listings via Browse API…');
    const listings = await fetchBrowseAllSports(50); // 50 per sport = up to 250 active listings
    let newCount = 0;
    for (const listing of listings) {
      const enriched = addSale(listing);
      if (enriched) {
        io.emit('newSale', enriched);
        newCount++;
      }
    }
    console.log(`[eBay] ${newCount} new listings broadcast`);
  } catch (err) {
    console.error('[eBay] Poll error:', err.message);
  }
}

// Queue of real Browse listings waiting to drip into the feed
let dripQueue = [];

async function refillDripQueue() {
  if (!process.env.EBAY_CLIENT_ID) return;
  try {
    console.log('[Mock] Refilling drip queue from eBay Browse API…');
    const fresh = await fetchBrowseAllSports(30); // 30 per sport = up to 120 cards
    // Only queue cards not already in the store (addSale handles dedup by id)
    dripQueue.push(...fresh);
    console.log(`[Mock] Drip queue refilled: ${dripQueue.length} cards`);
  } catch (err) {
    console.warn('[Mock] Browse refill failed:', err.message);
  }
}

async function startMockMode() {
  console.log('[Mock] Starting mock sale generator');

  // Seed initial feed with real Browse listings
  if (process.env.EBAY_CLIENT_ID) {
    try {
      console.log('[Mock] Seeding initial feed from eBay Browse API…');
      const initial = await fetchBrowseAllSports(20); // 20 per sport = up to 80 cards
      initial.forEach((c) => addSale(c));
      console.log(`[Mock] Initial feed seeded: ${initial.length} listings`);

      // Fetch a larger batch for the drip queue (different window via higher limit)
      await refillDripQueue();
    } catch (err) {
      console.warn('[Mock] Browse seed failed, using static mock data:', err.message);
    }
  }

  // Fall back to static mock data if nothing loaded
  if (getSales(null, 1).length === 0) {
    generateMockSales(40).forEach((s) => addSale(s));
  }

  // Drip real listings one at a time; each has its real price and real eBay ID
  async function dropSale() {
    if (dripQueue.length === 0) {
      await refillDripQueue();
    }

    if (dripQueue.length > 0) {
      const card = dripQueue.shift();
      // Stamp a fresh "listed at" time so it appears new in the feed
      broadcastSale({ ...card, soldAt: new Date().toISOString() });
    } else {
      // No Browse data available — fall back to a generated mock
      broadcastSale(generateMockSale());
    }

    setTimeout(dropSale, 4000 + Math.random() * 6000);
  }
  setTimeout(dropSale, 3000);
}

async function startLiveMode() {
  console.log('[Live] Starting eBay Browse API live polling');
  await pollEbay(); // initial seed
  setInterval(pollEbay, POLL_INTERVAL_MS);
}

httpServer.listen(PORT, async () => {
  console.log(`Server running on http://localhost:${PORT} [${USE_MOCK ? 'MOCK' : 'LIVE'}]`);
  if (process.env.DATABASE_URL) {
    try { await migrate(); } catch (e) { console.warn('[DB] Migration skipped:', e.message); }
  }
  if (USE_MOCK) {
    startMockMode();
  } else {
    await startLiveMode();
  }
});
