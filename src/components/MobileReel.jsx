import { useState, useEffect } from 'react';
import SocialBar from './SocialBar.jsx';

const SPORT_COLORS = { baseball: '#e63946', basketball: '#f4a261', football: '#2a9d8f', hockey: '#4895ef', soccer: '#22c55e' };
const SPORT_ICONS  = { baseball: '⚾', basketball: '🏀', football: '🏈', hockey: '🏒', soccer: '⚽' };

function fmt(price) {
  if (!price) return '';
  const n = parseFloat(price);
  return n >= 1000
    ? `$${n.toLocaleString('en-US', { maximumFractionDigits: 0 })}`
    : `$${n.toFixed(2)}`;
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
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
  const display = h > 0 ? `${h}h ${m}m` : m > 0 ? `${m}m ${sec}s` : `${sec}s`;
  const urgency = s < 60 ? 'critical' : s < 300 ? 'urgent' : s < 3600 ? 'soon' : 'normal';
  return { expired: false, display, totalSeconds: s, urgency };
}

function Countdown({ endsAt }) {
  const [r, setR] = useState(() => getRemaining(endsAt));
  useEffect(() => {
    const id = setInterval(() => setR(getRemaining(endsAt)), r.totalSeconds < 300 ? 1000 : 10000);
    return () => clearInterval(id);
  }, [endsAt, r.totalSeconds]);
  return <span className={`countdown countdown--${r.urgency}`}>{r.display}</span>;
}

function ReelSlide({ item, isWatched, isNew, isEndingSoon, onCommentClick, onAuthRequired, isLast }) {
  const href = affiliateUrl(item.itemUrl);
  const sportColor = item.sportColor || SPORT_COLORS[item.sport] || '#a1a1aa';

  return (
    <div className="reel-slide" style={{ '--sport-color': sportColor }}>

      {/* Full-bleed image + gradient */}
      <div className="reel-slide__media">
        {item.image ? (
          <img src={item.image} alt={item.title} className="reel-slide__img" loading="lazy" />
        ) : (
          <div className="reel-slide__placeholder">
            <span className="reel-slide__placeholder-icon">{SPORT_ICONS[item.sport]}</span>
          </div>
        )}
        <div className="reel-slide__gradient" />
      </div>

      {/* Info overlay (bottom) */}
      <div className="reel-slide__info">

        {/* Badge row */}
        <div className="reel-slide__badges">
          {item.sport && <span className="reel-slide__sport-tag">{item.sport}</span>}
          {isWatched && <span className="reel-slide__watched-tag">👁 Watched</span>}
          {isNew && <span className="reel-slide__new-tag">● New</span>}
        </div>

        {/* Countdown for ending-soon */}
        {isEndingSoon && item.endsAt && (
          <div className="reel-slide__countdown-row">
            <span className="reel-slide__ends-label">Ends in</span>
            <Countdown endsAt={item.endsAt} />
          </div>
        )}

        {/* Title */}
        <p className="reel-slide__title">{item.title}</p>

        {/* Price */}
        <div className="reel-slide__price-row">
          <span className="reel-slide__price">{fmt(item.price)}</span>
          <span className="reel-slide__price-sub">
            {item.buyingOption === 'auction'
              ? (item.bidCount > 0 ? `${item.bidCount} bid${item.bidCount !== 1 ? 's' : ''}` : 'no bids yet')
              : 'buy it now'}
          </span>
        </div>

        {/* eBay CTA */}
        {href && href !== '#' && (
          <a href={href} target="_blank" rel="noreferrer" className="reel-slide__cta">
            {isEndingSoon ? 'Bid on eBay →' : 'View on eBay →'}
          </a>
        )}

        {/* Social actions */}
        <div className="reel-slide__social">
          <SocialBar
            sale={item}
            onCommentClick={() => onCommentClick(item)}
            onAuthRequired={onAuthRequired}
          />
        </div>
      </div>

      {/* Swipe hint — hide on last card */}
      {!isLast && (
        <div className="reel-slide__swipe-hint" aria-hidden="true">
          <span className="reel-slide__swipe-arrow">↑</span>
          <span className="reel-slide__swipe-label">swipe</span>
        </div>
      )}
    </div>
  );
}

export default function MobileReel({ items, watchlistTerms = [], newSaleIds, isEndingSoon = false, onCommentClick, onAuthRequired }) {
  if (!items.length) {
    return (
      <div className="feed-empty">
        <p>{isEndingSoon ? 'No auctions ending soon.' : 'Waiting for listings…'}</p>
      </div>
    );
  }

  const capped = items.slice(0, 50);

  return (
    <div className="mobile-reel">
      {capped.map((item, idx) => {
        const t = (item.title || '').toLowerCase();
        const isWatched = watchlistTerms.length > 0 && watchlistTerms.some(term => t.includes(term));
        return (
          <ReelSlide
            key={item.id || item.listing_id}
            item={item}
            isWatched={isWatched}
            isNew={newSaleIds?.has(item.id)}
            isEndingSoon={isEndingSoon}
            isLast={idx === capped.length - 1}
            onCommentClick={onCommentClick}
            onAuthRequired={onAuthRequired}
          />
        );
      })}
    </div>
  );
}
