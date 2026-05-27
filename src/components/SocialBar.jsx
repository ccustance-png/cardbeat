import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.jsx';

const EMOJIS = ['🔥', '💎', '🚀', '💩', '🤔'];

export default function SocialBar({ sale, onCommentClick, onAuthRequired }) {
  const { user, authFetch } = useAuth();
  const [social, setSocial] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [shareFeedback, setShareFeedback] = useState(false);

  useEffect(() => {
    if (!sale?.id) return;
    fetch(`/api/social/${sale.id}`, {
      headers: user ? { Authorization: `Bearer ${localStorage.getItem('cb_token')}` } : {},
    })
      .then(r => r.ok ? r.json() : null)
      .then(data => { setSocial(data); setSaved(data?.isSaved ?? false); })
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

  async function share() {
    const shareUrl = `${window.location.origin}/listing/${sale.id}`;
    const text = `${sale.title}${sale.price ? ` — $${parseFloat(sale.price).toFixed(2)}` : ''} on CardBeat`;
    if (navigator.share) {
      try { await navigator.share({ title: sale.title, text, url: shareUrl }); } catch {}
    } else {
      try {
        await navigator.clipboard.writeText(shareUrl);
        setShareFeedback(true);
        setTimeout(() => setShareFeedback(false), 2000);
      } catch {}
    }
  }

  async function toggleSave() {
    if (!user) return onAuthRequired();
    try {
      const r = await authFetch(`/api/social/${sale.id}/save`, {
        method: 'POST',
        body: JSON.stringify({ title: sale.title, image: sale.image, price: sale.price, sport: sale.sport, itemUrl: sale.itemUrl }),
      });
      const data = await r.json();
      setSaved(data.saved);
    } catch {}
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
      <div className="social-bar__bottom">
        <button className="comment-btn" onClick={onCommentClick}>
          💬 {commentCount > 0 ? commentCount : 'Comment'}
        </button>
        <button
          className={`save-btn ${saved ? 'save-btn--saved' : ''}`}
          onClick={toggleSave}
          title={saved ? 'Remove from saved' : 'Save listing'}
        >
          {saved ? '🔖 Saved' : '🔖 Save'}
        </button>
        <button
          className={`share-btn ${shareFeedback ? 'share-btn--copied' : ''}`}
          onClick={share}
          title="Share listing"
        >
          {shareFeedback ? '✓ Copied!' : '↑ Share'}
        </button>
      </div>
    </div>
  );
}
