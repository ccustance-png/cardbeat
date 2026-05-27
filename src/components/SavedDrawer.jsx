import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.jsx';

function fmt(price) {
  if (!price) return '';
  const n = parseFloat(price);
  return n >= 1000 ? `$${(n / 1000).toFixed(1)}k` : `$${n.toFixed(2)}`;
}

const SPORT_COLORS = {
  baseball: '#e63946', basketball: '#f4a261',
  football: '#2a9d8f', hockey: '#4895ef',
  soccer: '#22c55e',
};

export default function SavedDrawer({ onClose, onCommentClick }) {
  const { authFetch } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    authFetch('/api/social/saved')
      .then(r => r.ok ? r.json() : [])
      .then(data => { setItems(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, [authFetch]);

  async function unsave(listingId) {
    try {
      await authFetch(`/api/social/${listingId}/save`, { method: 'POST', body: JSON.stringify({}) });
      setItems(prev => prev.filter(i => i.listing_id !== listingId));
    } catch {}
  }

  return (
    <div className="drawer-overlay" onClick={onClose}>
      <div className="drawer" onClick={e => e.stopPropagation()}>
        <div className="drawer-header">
          <div className="drawer-title">
            <span>🔖 Saved Listings</span>
            <p className="drawer-subtitle">{items.length} item{items.length !== 1 ? 's' : ''} saved</p>
          </div>
          <button className="drawer-close" onClick={onClose}>✕</button>
        </div>

        <div className="drawer-comments" style={{ padding: '12px 16px', gap: '10px' }}>
          {loading && <p className="drawer-empty">Loading…</p>}

          {!loading && items.length === 0 && (
            <p className="drawer-empty">No saved listings yet — click 🔖 Save on any card to add it here.</p>
          )}

          {items.map(item => (
            <div key={item.listing_id} className="saved-item" style={{ '--sport-color': SPORT_COLORS[item.sport] || '#a1a1aa' }}>
              {item.image && (
                <a href={item.item_url} target="_blank" rel="noreferrer" className="saved-item__img-wrap">
                  <img src={item.image} alt={item.title} className="saved-item__img" />
                </a>
              )}
              <div className="saved-item__info">
                <p className="saved-item__title">
                  {item.item_url ? (
                    <a href={item.item_url} target="_blank" rel="noreferrer">{item.title}</a>
                  ) : item.title}
                </p>
                <div className="saved-item__meta">
                  {item.sport && (
                    <span className="saved-item__sport" style={{ color: SPORT_COLORS[item.sport] }}>
                      {item.sport}
                    </span>
                  )}
                  <span className="saved-item__price">{fmt(item.price)}</span>
                </div>
                <div className="saved-item__actions">
                  <button className="saved-item__comment" onClick={() => onCommentClick?.({
                    id: item.listing_id,
                    title: item.title,
                    image: item.image,
                    price: parseFloat(item.price),
                    sport: item.sport,
                    itemUrl: item.item_url,
                  })}>
                    💬 Comment
                  </button>
                  <button className="saved-item__remove" onClick={() => unsave(item.listing_id)}>
                    Remove
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
