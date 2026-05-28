import { useState, useEffect, useRef } from 'react';

const SPORT_COLORS = {
  baseball: '#e63946', basketball: '#f4a261',
  football: '#2a9d8f', hockey: '#4895ef', soccer: '#22c55e',
};

function fmt(price) {
  if (!price) return '';
  const n = parseFloat(price);
  return n >= 1000 ? `$${(n / 1000).toFixed(1)}k` : `$${n.toFixed(0)}`;
}

function TrendingTickerItem({ item, rank, onClick }) {
  const label = item.title.length > 42 ? item.title.slice(0, 40) + '…' : item.title;
  const color = SPORT_COLORS[item.sport] || '#a1a1aa';

  return (
    <span
      className="ticker-item ticker-item--clickable"
      style={{ '--sport-color': color }}
      onClick={() => onClick(item)}
    >
      <span className="ticker-rank">#{rank}</span>
      <span className="ticker-sport-dot" />
      <span className="ticker-label">{label}</span>
      {item.price && <span className="ticker-price">{fmt(item.price)}</span>}
      {item.comment_count > 0 && (
        <span className="ticker-comment-hint">💬 {item.comment_count}</span>
      )}
      <span className="ticker-sep">·</span>
    </span>
  );
}

function LiveTickerItem({ sale, onClick }) {
  const label = sale.title.length > 42 ? sale.title.slice(0, 40) + '…' : sale.title;

  return (
    <span
      className="ticker-item ticker-item--clickable"
      style={{ '--sport-color': sale.sportColor }}
      onClick={() => onClick(sale)}
    >
      <span className="ticker-sport-dot" />
      <span className="ticker-label">{label}</span>
      <span className="ticker-price">{fmt(sale.price)}</span>
      <span className="ticker-sep">·</span>
    </span>
  );
}

// Ticker fetches its own trending data and falls back to the live feed
export default function Ticker({ sales = [], onItemClick }) {
  const [trending, setTrending] = useState([]);
  const trackRef = useRef(null);

  useEffect(() => {
    function load() {
      fetch('/api/social/trending/top')
        .then(r => r.ok ? r.json() : [])
        .then(data => { if (Array.isArray(data)) setTrending(data); })
        .catch(() => {});
    }
    load();
    const interval = setInterval(load, 60000);
    return () => clearInterval(interval);
  }, []);

  const hasTrending = trending.length > 0;

  // Build the item list: trending if available, else newest 20 from live feed
  const items = hasTrending
    ? trending.slice(0, 10)
    : sales.slice(0, 20);

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    track.style.animationDuration = `${Math.max(20, items.length * 4)}s`;
  }, [items.length]);

  if (!items.length) return null;

  function handleClick(item) {
    if (!onItemClick) return;
    if (hasTrending) {
      // trending item shape: listing_id, title, image, price, sport, item_url
      onItemClick({
        id: item.listing_id,
        title: item.title,
        image: item.image,
        price: item.price,
        sport: item.sport,
        itemUrl: item.item_url,
      });
    } else {
      onItemClick(item);
    }
  }

  return (
    <div className="ticker-bar">
      <div className={`ticker-badge ${hasTrending ? 'ticker-badge--trending' : ''}`}>
        {hasTrending ? '🔥 TRENDING' : 'LIVE'}
      </div>
      <div className="ticker-viewport">
        <div className="ticker-track" ref={trackRef}>
          {[...items, ...items].map((item, i) =>
            hasTrending ? (
              <TrendingTickerItem
                key={`${item.listing_id}-${i}`}
                item={item}
                rank={(i % items.length) + 1}
                onClick={handleClick}
              />
            ) : (
              <LiveTickerItem
                key={`${item.id}-${i}`}
                sale={item}
                onClick={handleClick}
              />
            )
          )}
        </div>
      </div>
    </div>
  );
}
