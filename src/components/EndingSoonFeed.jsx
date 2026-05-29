import { useState, useEffect, useCallback } from 'react';
import SocialBar from './SocialBar.jsx';

const SPORT_ICONS = { baseball: '⚾', basketball: '🏀', football: '🏈', hockey: '🏒', soccer: '⚽' };
const SPORT_COLORS = { baseball: '#e63946', basketball: '#f4a261', football: '#2a9d8f', hockey: '#4895ef', soccer: '#22c55e' };
const PLACEHOLDER_COLORS = { baseball: '#3d0f12', basketball: '#3d2008', football: '#0b2d28', hockey: '#0c1f3d', soccer: '#0a2e1a' };

function fmt(price) {
  if (!price && price !== 0) return '';
  const n = parseFloat(price);
  if (n >= 1000) return `$${n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  return `$${n.toFixed(2)}`;
}

function affiliateUrl(url) {
  if (!url || url === '#') return url;
  const campId = import.meta.env.VITE_EPN_CAMPAIGN_ID;
  if (!campId) return url;
  return `https://rover.ebay.com/rover/1/711-53200-19255-0/1?ff3=4&pub=5575${campId}&toolid=10001&campid=${campId}&mpre=${encodeURIComponent(url)}`;
}

function getRemaining(endsAt) {
  const ms = new Date(endsAt) - Date.now();
  if (ms <= 0) return { expired: true, display: 'Ended', totalSeconds: 0, urgency: 'expired' };
  const totalSeconds = Math.floor(ms / 1000);
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  let display;
  if (h > 0) display = `${h}h ${m}m`;
  else if (m > 0) display = `${m}m ${s}s`;
  else display = `${s}s`;
  const urgency = totalSeconds < 60 ? 'critical' : totalSeconds < 300 ? 'urgent' : totalSeconds < 3600 ? 'soon' : 'normal';
  return { expired: false, display, totalSeconds, urgency };
}

function Countdown({ endsAt }) {
  const [remaining, setRemaining] = useState(() => getRemaining(endsAt));

  useEffect(() => {
    const tick = () => setRemaining(getRemaining(endsAt));
    // Update every second when < 5 min, otherwise every 10s
    const interval = setInterval(tick, remaining.totalSeconds < 300 ? 1000 : 10000);
    return () => clearInterval(interval);
  }, [endsAt, remaining.totalSeconds]);

  return (
    <span className={`countdown countdown--${remaining.urgency}`}>
      {remaining.urgency === 'critical' && <span className="countdown-pulse" />}
      {remaining.display}
    </span>
  );
}

function AuctionCard({ item, isWatched, onCommentClick, onAuthRequired }) {
  const href = affiliateUrl(item.itemUrl);
  const sportColor = item.sportColor || SPORT_COLORS[item.sport] || '#a1a1aa';

  return (
    <div
      className={`card-item auction-card ${isWatched ? 'card-item--watched' : ''}`}
      style={{ '--sport-color': sportColor }}
    >
      <div className="card-item__img-wrap">
        {href && href !== '#' ? (
          <a href={href} target="_blank" rel="noreferrer" className="card-item__img-link">
            {item.image ? (
              <img src={item.image} alt={item.title} className="card-item__img" loading="lazy"
                onError={e => { e.currentTarget.style.display = 'none'; e.currentTarget.nextSibling.style.display = 'flex'; }} />
            ) : null}
            <div className="card-item__img-placeholder"
              style={{ background: PLACEHOLDER_COLORS[item.sport], display: item.image ? 'none' : 'flex' }}>
              <span className="card-item__placeholder-icon">{SPORT_ICONS[item.sport]}</span>
              <span className="card-item__placeholder-title">{item.title}</span>
            </div>
          </a>
        ) : (
          <div className="card-item__img-placeholder"
            style={{ background: PLACEHOLDER_COLORS[item.sport], display: 'flex' }}>
            <span className="card-item__placeholder-icon">{SPORT_ICONS[item.sport]}</span>
            <span className="card-item__placeholder-title">{item.title}</span>
          </div>
        )}
        <span className="card-item__sport-tag">{item.sport}</span>
        {isWatched && <span className="card-item__watch-badge">👁 Watched</span>}
      </div>

      <div className="card-item__body">
        <p className="card-item__title">
          {href && href !== '#'
            ? <a href={href} target="_blank" rel="noreferrer">{item.title}</a>
            : item.title}
        </p>

        {/* Countdown — the star of this view */}
        <div className="auction-card__countdown-row">
          <span className="auction-card__ends-label">Ends in</span>
          <Countdown endsAt={item.endsAt} />
        </div>

        <div className="card-item__price-row">
          <span className="card-item__price">{fmt(item.price)}</span>
          <span className="card-item__first-sale">
            {item.bidCount > 0 ? `${item.bidCount} bid${item.bidCount !== 1 ? 's' : ''}` : 'no bids'}
          </span>
        </div>

        {href && href !== '#' && (
          <a href={href} target="_blank" rel="noreferrer" className="auction-card__bid-btn">
            Bid on eBay →
          </a>
        )}

        <SocialBar
          sale={item}
          onCommentClick={() => onCommentClick(item)}
          onAuthRequired={onAuthRequired}
        />
      </div>
    </div>
  );
}

export default function EndingSoonFeed({ activeSport, watchlistTerms = [], watchedOnly = false, onCommentClick, onAuthRequired }) {
  const [auctions, setAuctions] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    fetch('/api/ending-soon')
      .then(r => r.ok ? r.json() : [])
      .then(data => { setAuctions(Array.isArray(data) ? data : []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
    const interval = setInterval(load, 90000); // refresh every 90s
    return () => clearInterval(interval);
  }, [load]);

  let filtered = activeSport === 'all'
    ? auctions
    : auctions.filter(a => a.sport === activeSport);

  if (watchedOnly && watchlistTerms.length > 0) {
    filtered = filtered.filter(a => {
      const t = (a.title || '').toLowerCase();
      return watchlistTerms.some(term => t.includes(term));
    });
  }

  // Sort by ending soonest, expired ones at the bottom
  const sorted = [...filtered].sort((a, b) => {
    const aMs = new Date(a.endsAt) - Date.now();
    const bMs = new Date(b.endsAt) - Date.now();
    if (aMs <= 0 && bMs <= 0) return 0;
    if (aMs <= 0) return 1;
    if (bMs <= 0) return -1;
    return aMs - bMs;
  });

  if (loading) {
    return <div className="feed-empty"><p>Loading ending-soon auctions…</p></div>;
  }

  if (!sorted.length) {
    return (
      <div className="feed-empty">
        {watchedOnly
          ? <p>No watched auctions ending soon. They'll appear here when one surfaces.</p>
          : <p>No auctions ending soon{activeSport !== 'all' ? ` in ${activeSport}` : ''}.</p>
        }
        <p style={{ fontSize: '12px', marginTop: '8px', color: 'var(--text-dim)' }}>
          Auctions within 6 hours of ending appear here.
        </p>
      </div>
    );
  }

  return (
    <div className="card-feed">
      {sorted.map(item => {
        const titleLower = (item.title || '').toLowerCase();
        const isWatched = watchlistTerms.length > 0 && watchlistTerms.some(t => titleLower.includes(t));
        return (
          <AuctionCard
            key={item.id}
            item={item}
            isWatched={isWatched}
            onCommentClick={onCommentClick}
            onAuthRequired={onAuthRequired}
          />
        );
      })}
    </div>
  );
}
