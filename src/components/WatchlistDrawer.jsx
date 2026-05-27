import { useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';

export default function WatchlistDrawer({ terms, onAdd, onRemove, onClose, onAuthRequired }) {
  const { user } = useAuth();
  const [input, setInput] = useState('');
  const [error, setError] = useState('');

  function handleAdd(e) {
    e.preventDefault();
    const val = input.trim().toLowerCase();
    if (!val) return;
    if (val.length > 50) { setError('Max 50 characters'); return; }
    if (terms.includes(val)) { setError('Already in your watchlist'); return; }
    setError('');
    onAdd(val);
    setInput('');
  }

  return (
    <div className="drawer-overlay" onClick={onClose}>
      <div className="drawer" onClick={e => e.stopPropagation()}>
        <div className="drawer-header">
          <div className="drawer-title">
            <span>👁 Watchlist</span>
            <p className="drawer-subtitle">
              {terms.length === 0
                ? 'No terms yet — add a player or team'
                : `${terms.length} term${terms.length !== 1 ? 's' : ''} tracked`}
            </p>
          </div>
          <button className="drawer-close" onClick={onClose}>✕</button>
        </div>

        {/* Add term form */}
        <form className="drawer-form watchlist-form" onSubmit={handleAdd}>
          <input
            className="drawer-input"
            type="text"
            placeholder="e.g. Mahomes, Trout, Lakers…"
            value={input}
            onChange={e => { setInput(e.target.value); setError(''); }}
            maxLength={50}
            autoFocus
          />
          <button className="drawer-submit" type="submit" disabled={!input.trim()}>
            + Add
          </button>
        </form>
        {error && <p className="watchlist-error">{error}</p>}

        {/* Terms list */}
        <div className="watchlist-terms">
          {terms.length === 0 ? (
            <div className="watchlist-empty">
              <p className="watchlist-empty__text">
                Cards matching your terms will be highlighted with a gold glow in the live feed.
              </p>
              <p className="watchlist-empty__tip">
                Try: <span className="watchlist-tip-tag" onClick={() => onAdd('mahomes')}>Mahomes</span>
                <span className="watchlist-tip-tag" onClick={() => onAdd('trout')}>Trout</span>
                <span className="watchlist-tip-tag" onClick={() => onAdd('lakers')}>Lakers</span>
                <span className="watchlist-tip-tag" onClick={() => onAdd('psa 10')}>PSA 10</span>
              </p>
            </div>
          ) : (
            <div className="watchlist-pills">
              {terms.map(term => (
                <div key={term} className="watchlist-pill">
                  <span className="watchlist-pill__dot" />
                  <span className="watchlist-pill__label">{term}</span>
                  <button
                    className="watchlist-pill__remove"
                    onClick={() => onRemove(term)}
                    title={`Remove "${term}"`}
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer hint */}
        <div className="watchlist-footer">
          <span className="watchlist-footer__icon">👁</span>
          {user
            ? 'Your watchlist is saved to your account'
            : <>
                <span>Terms are saved locally. </span>
                <button className="watchlist-footer__signin" onClick={onAuthRequired}>
                  Sign in
                </button>
                <span> to sync across devices.</span>
              </>
          }
        </div>
      </div>
    </div>
  );
}
