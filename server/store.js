// In-memory ring buffer of recent sales + per-card price history for comparison
const MAX_SALES = 500;
const sales = [];
const seenIds = new Set();

// price history keyed by a normalized card title (first 40 chars)
const priceHistory = new Map();

function titleKey(title) {
  return title.toLowerCase().replace(/[^a-z0-9 ]/g, '').slice(0, 50).trim();
}

export function addSale(sale) {
  if (seenIds.has(sale.id)) return null;
  seenIds.add(sale.id);

  const key = titleKey(sale.title);
  const history = priceHistory.get(key) || [];

  let prevAvgPrice = null;
  let pctChange = null;
  let priceDirection = 'neutral';

  if (history.length > 0) {
    prevAvgPrice = history.reduce((s, p) => s + p, 0) / history.length;
    pctChange = Math.round(((sale.price - prevAvgPrice) / prevAvgPrice) * 1000) / 10;
    priceDirection = pctChange > 0 ? 'up' : pctChange < 0 ? 'down' : 'neutral';
  }

  history.push(sale.price);
  if (history.length > 20) history.shift();
  priceHistory.set(key, history);

  const enriched = { ...sale, prevAvgPrice, pctChange, priceDirection };

  sales.unshift(enriched);
  if (sales.length > MAX_SALES) {
    const removed = sales.pop();
    seenIds.delete(removed.id);
  }

  return enriched;
}

export function getSales(sport = null, limit = 100) {
  const filtered = sport ? sales.filter((s) => s.sport === sport) : sales;
  return filtered.slice(0, limit);
}

export function clearStore() {
  sales.length = 0;
  seenIds.clear();
  priceHistory.clear();
}
