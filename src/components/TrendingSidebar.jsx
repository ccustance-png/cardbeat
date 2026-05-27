import { useState, useEffect } from 'react';

function fmt(price) {
  if (!price) return '';
  const n = parseFloat(price);
  return n >= 1000 ? `$${(n / 1000).toFixed(1)}k` : `$${n.toFixed(0)}`;
}

const SPORT_COLORS = {
  baseball: '#e63946', basketball: '#f4a261',
  football: '#2a9d8f', hockey: '#4895ef',
};

export default function TrendingSidebar({ onCardClick }) {
  const [trending, setTrending] = useState([]);

  useEffect(() => {
    function load() {
      fetch('/api/social/trending/top')
        .then(r => r.ok ? r.json() : [])
        .then(setTrending)
        .catch(() => {});
    }
    load();
    const interval = setInterval(load, 60000);
    return () => clearInterval(interval);
  }, []);

  return (
    <aside className="trending-sidebar">
      <div className="trending-header">
        <span className="trending-title">🔥 Trending</span>
        <span className="trending-sub">Most active in 24h</span>
      </div>

      {trending.length === 0 ? (
        <div className="trending-empty">
          <p>Rate and comment on listings to see them trend here</p>
        </div>
      ) : (
        <div className="trending-list">
          {trending.map((item, i) => (
            <div
              key={item.listing_id}
              className="trending-item"
              style={{ '--sport-color': SPORT_COLORS[item.sport] || '#a1a1aa' }}
              onClick={() => onCardClick?.(item)}
            >
              <span className="trending-rank">#{i + 1}</span>
              {item.image ? (
                <img src={item.image} alt={item.title} className="trending-img" />
              ) : (
                <div className="trending-img trending-img--placeholder" />
              )}
              <div className="trending-info">
                <p className="trending-card-title">{item.title?.slice(0, 50)}{item.title?.length > 50 ? '…' : ''}</p>
                <div className="trending-stats">
                  <span>💬 {item.comment_count}</span>
                  <span className="trending-price">{fmt(item.price)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </aside>
  );
}
