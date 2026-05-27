import 'dotenv/config';
import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { fetchAllSports, fetchBrowseAllSports } from './ebayClient.js';
import { generateMockSale, generateMockSales } from './mockData.js';
import { addSale, getSales } from './store.js';
import { migrate } from './db.js';
import authRouter from './auth.js';
import socialRouter from './social.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const IS_PROD = process.env.NODE_ENV === 'production';

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, { cors: { origin: '*' } });

const PORT = process.env.PORT || 3001;
const USE_MOCK = process.env.USE_MOCK === 'true' || !process.env.EBAY_CLIENT_ID;
const POLL_INTERVAL_MS = 45000; // 45 seconds between eBay polls

app.use(cors());
app.use(express.json());

app.use('/api/auth', authRouter);
app.use('/api/social', socialRouter);

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
    console.log('[eBay] Polling for new sales…');
    const sales = await fetchAllSports();
    let newCount = 0;
    for (const sale of sales) {
      const enriched = addSale(sale);
      if (enriched) {
        io.emit('newSale', enriched);
        newCount++;
      }
    }
    console.log(`[eBay] ${newCount} new sales broadcast`);
  } catch (err) {
    console.error('[eBay] Poll error:', err.message);
  }
}

// Cards seeded from Browse API (have real images) — used by drip generator
let realCards = [];

async function startMockMode() {
  console.log('[Mock] Starting mock sale generator');

  // Try to seed with real Browse API listings (gives us real card images)
  if (process.env.EBAY_CLIENT_ID) {
    try {
      console.log('[Mock] Seeding with real eBay Browse listings for images…');
      realCards = await fetchBrowseAllSports(20);
      console.log(`[Mock] Seeded ${realCards.length} real listings`);
      realCards.forEach((c) => addSale(c));
    } catch (err) {
      console.warn('[Mock] Browse seed failed, using static mock data:', err.message);
    }
  }

  // Fall back to static mock data if Browse seed didn't populate anything
  if (realCards.length === 0) {
    const initial = generateMockSales(40);
    initial.forEach((s) => addSale(s));
  }

  // Drip new sales every 3–8 seconds, preferring real card images when available
  function dropSale() {
    const sale = realCards.length > 0
      ? makeDripFromReal(realCards[Math.floor(Math.random() * realCards.length)])
      : generateMockSale();
    broadcastSale(sale);
    setTimeout(dropSale, 3000 + Math.random() * 5000);
  }
  setTimeout(dropSale, 2000);
}

let dripIdCounter = 9000;

function makeDripFromReal(card) {
  const variance = 0.15 + Math.random() * 0.2;
  const sign = Math.random() > 0.45 ? 1 : -1;
  const price = Math.max(1, parseFloat((card.price * (1 + sign * variance)).toFixed(2)));
  return {
    ...card,
    id: `drip-${dripIdCounter++}`,
    price,
    soldAt: new Date().toISOString(),
  };
}

async function startLiveMode() {
  console.log('[Live] Starting eBay live polling');
  await pollEbay();
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
