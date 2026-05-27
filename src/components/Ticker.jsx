import { useEffect, useRef } from 'react';

function fmt(price) {
  return price >= 1000
    ? `$${(price / 1000).toFixed(1)}k`
    : `$${price.toFixed(0)}`;
}

function TickerItem({ sale, onClick }) {
  const label = sale.title.length > 40 ? sale.title.slice(0, 38) + '…' : sale.title;

  return (
    <span
      className="ticker-item ticker-item--clickable"
      style={{ '--sport-color': sale.sportColor }}
      onClick={() => onClick(sale)}
      title="Click to comment"
    >
      <span className="ticker-sport-dot" />
      <span className="ticker-label">{label}</span>
      <span className="ticker-price">{fmt(sale.price)}</span>
      <span className="ticker-comment-hint">💬</span>
      <span className="ticker-sep">·</span>
    </span>
  );
}

export default function Ticker({ sales, onItemClick }) {
  const trackRef = useRef(null);

  // Duplicate items for seamless loop
  const items = sales.slice(0, 20);

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    track.style.animationDuration = `${Math.max(20, items.length * 4)}s`;
  }, [items.length]);

  if (!items.length) return null;

  return (
    <div className="ticker-bar">
      <div className="ticker-badge">LIVE</div>
      <div className="ticker-viewport">
        <div className="ticker-track" ref={trackRef}>
          {[...items, ...items].map((sale, i) => (
            <TickerItem key={`${sale.id}-${i}`} sale={sale} onClick={onItemClick ?? (() => {})} />
          ))}
        </div>
      </div>
    </div>
  );
}
