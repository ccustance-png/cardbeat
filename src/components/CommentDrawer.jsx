import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext.jsx';

function timeAgo(iso) {
  const secs = Math.floor((Date.now() - new Date(iso)) / 1000);
  if (secs < 60) return `${secs}s ago`;
  if (secs < 3600) return `${Math.floor(secs / 60)}m ago`;
  if (secs < 86400) return `${Math.floor(secs / 3600)}h ago`;
  return `${Math.floor(secs / 86400)}d ago`;
}

export default function CommentDrawer({ sale, onClose, onAuthRequired }) {
  const { user, authFetch } = useAuth();
  const [comments, setComments] = useState([]);
  const [text, setText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const inputRef = useRef();

  useEffect(() => {
    if (!sale?.id) return;
    fetch(`/api/social/${sale.id}`)
      .then(r => r.json())
      .then(d => setComments(d.comments || []))
      .catch(() => {});
  }, [sale?.id]);

  async function submit(e) {
    e.preventDefault();
    if (!user) return onAuthRequired();
    if (!text.trim()) return;
    setSubmitting(true);
    try {
      const r = await authFetch(`/api/social/${sale.id}/comment`, {
        method: 'POST',
        body: JSON.stringify({ content: text, title: sale.title, image: sale.image, price: sale.price, sport: sale.sport, itemUrl: sale.itemUrl }),
      });
      const comment = await r.json();
      setComments(c => [comment, ...c]);
      setText('');
    } finally { setSubmitting(false); }
  }

  return (
    <div className="drawer-overlay" onClick={onClose}>
      <div className="drawer" onClick={e => e.stopPropagation()}>
        <div className="drawer-header">
          <div className="drawer-title">
            <span>💬 Comments</span>
            <p className="drawer-subtitle">{sale?.title?.slice(0, 60)}{sale?.title?.length > 60 ? '…' : ''}</p>
          </div>
          <button className="drawer-close" onClick={onClose}>✕</button>
        </div>

        <form className="drawer-form" onSubmit={submit}>
          <textarea
            ref={inputRef}
            className="drawer-input"
            placeholder={user ? 'Share your thoughts on this listing…' : 'Sign in to comment'}
            value={text}
            onChange={e => setText(e.target.value)}
            maxLength={500}
            rows={3}
            disabled={!user}
            onClick={!user ? onAuthRequired : undefined}
          />
          <div className="drawer-form-footer">
            <span className="char-count">{text.length}/500</span>
            {user ? (
              <button type="submit" className="drawer-submit" disabled={submitting || !text.trim()}>
                {submitting ? 'Posting…' : 'Post'}
              </button>
            ) : (
              <button type="button" className="drawer-submit" onClick={onAuthRequired}>Sign in to comment</button>
            )}
          </div>
        </form>

        <div className="drawer-comments">
          {comments.length === 0 && (
            <p className="drawer-empty">No comments yet — be the first!</p>
          )}
          {comments.map(c => (
            <div key={c.id} className="comment">
              <div className="comment-header">
                <span className="comment-username">@{c.username}</span>
                <span className="comment-time">{timeAgo(c.created_at)}</span>
              </div>
              <p className="comment-body">{c.content}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
