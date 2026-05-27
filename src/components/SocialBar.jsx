import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.jsx';

const EMOJIS = ['🔥', '💎', '🚀', '💩', '🤔'];

function Stars({ myStars, avg, count, onRate, disabled }) {
  const [hover, setHover] = useState(0);
  return (
    <div className="stars-wrap">
      <div className="stars">
        {[1,2,3,4,5].map(n => (
          <button
            key={n}
            className={`star ${(hover || myStars || 0) >= n ? 'star--on' : ''}`}
            onMouseEnter={() => !disabled && setHover(n)}
            onMouseLeave={() => setHover(0)}
            onClick={() => !disabled && onRate(n)}
            disabled={disabled}
            title={disabled ? 'Sign in to rate' : `Rate ${n} star${n > 1 ? 's' : ''}`}
          >★</button>
        ))}
      </div>
      {count > 0 && (
        <span className="stars-meta">{avg} <span className="stars-count">({count})</span></span>
      )}
    </div>
  );
}

export default function SocialBar({ sale, onCommentClick, onAuthRequired }) {
  const { user, authFetch } = useAuth();
  const [social, setSocial] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!sale?.id) return;
    fetch(`/api/social/${sale.id}`, {
      headers: user ? { Authorization: `Bearer ${localStorage.getItem('cb_token')}` } : {},
    })
      .then(r => r.ok ? r.json() : null)
      .then(setSocial)
      .catch(() => {});
  }, [sale?.id, user]);

  async function rate(stars) {
    if (!user) return onAuthRequired();
    setLoading(true);
    try {
      const r = await authFetch(`/api/social/${sale.id}/rate`, {
        method: 'POST',
        body: JSON.stringify({ stars, title: sale.title, image: sale.image, price: sale.price, sport: sale.sport, itemUrl: sale.itemUrl }),
      });
      const data = await r.json();
      setSocial(s => ({ ...s, rating: { ...data, myStars: stars } }));
    } finally { setLoading(false); }
  }

  async function react(emoji) {
    if (!user) return onAuthRequired();
    try {
      const r = await authFetch(`/api/social/${sale.id}/react`, {
        method: 'POST',
        body: JSON.stringify({ emoji, title: sale.title, image: sale.image, price: sale.price, sport: sale.sport, itemUrl: sale.itemUrl }),
      });
      const data = await r.json();
      setSocial(s => ({
        ...s,
        reactions: data.reactions,
        myReactions: data.active
          ? [...(s?.myReactions || []), emoji]
          : (s?.myReactions || []).filter(e => e !== emoji),
      }));
    } catch {}
  }

  const commentCount = social?.comments?.length ?? 0;

  return (
    <div className="social-bar">
      <Stars
        myStars={social?.rating?.myStars}
        avg={social?.rating?.avg}
        count={social?.rating?.count}
        onRate={rate}
        disabled={loading}
      />
      <div className="emoji-row">
        {EMOJIS.map(emoji => {
          const count = social?.reactions?.find(r => r.emoji === emoji)?.count || 0;
          const active = social?.myReactions?.includes(emoji);
          return (
            <button
              key={emoji}
              className={`emoji-btn ${active ? 'emoji-btn--active' : ''}`}
              onClick={() => react(emoji)}
              title={!user ? 'Sign in to react' : undefined}
            >
              {emoji}{count > 0 && <span className="emoji-count">{count}</span>}
            </button>
          );
        })}
      </div>
      <button className="comment-btn" onClick={onCommentClick}>
        💬 {commentCount > 0 ? commentCount : 'Comment'}
      </button>
    </div>
  );
}
