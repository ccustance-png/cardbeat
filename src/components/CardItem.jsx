import { useState, useEffect } from 'react';
import SocialBar from './SocialBar.jsx';

function fmt(price) {
  if (price >= 1000) return `$${price.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  return `$${price.toFixed(2)}`;
}

function timeAgo(iso) {
  const secs = Math.floor((Date.now() - new Date(iso)) / 1000);
  if (secs < 60) return `listed ${secs}s ago`;
  if (secs < 3600) return `listed ${Math.floor(secs / 60)}m ago`;
  return `listed ${Math.floor(secs / 3600)}h ago`;
}

function affiliateUrl(url) {
  if (!url || url === '#') return url;
  const campId = import.meta.env.VITE_EPN_CAMPAIGN_ID;
  if (!campId) return url;
  return `https://rover.ebay.com/rover/1/711-53200-19255-0/1?ff3=4&pub=5575${campId}&toolid=10001&campid=${campId}&mpre=${encodeURIComponent(url)}`;
}

const SPORT_ICONS = { baseball: '⚾', basketball: '🏀', football: '🏈', hockey: '🏒', soccer: '⚽' };
const PLACEHOLDER_COLORS = { baseball: '#3d0f12', basketball: '#3d2008', football: '#0b2d28', hockey: '#0c1f3d', soccer: '#0a2e1a' };

export default function CardItem({ sale, isNew, isWatched, onCommentClick, onAuthRequired }) {
  const [highlight, setHighlight] = useState(isNew);

  useEffect(() => {
    if (!isNew) return;
    setHighlight(true);
    const t = setTimeout(() => setHighlight(false), 2500);
    return () => clearTimeout(t);
  }, [isNew, sale.id]);

  const href = affiliateUrl(sale.itemUrl);

  return (
    <div
      className={`card-item ${highlight ? 'card-item--new' : ''} ${isWatched ? 'card-item--watched' : ''}`}
      style={{ '--sport-color': sale.sportColor }}
      data-sale-id={sale.id}
    >
      <div className="card-item__img-wrap">
        {href && href !== '#' ? (
          <a href={href} target="_blank" rel="noreferrer" className="card-item__img-link">
            {sale.image ? (
              <img
                src={sale.image}
                alt={sale.title}
                className="card-item__img"
                loading="lazy"
                onError={(e) => { e.currentTarget.style.display = 'none'; e.currentTarget.nextSibling.style.display = 'flex'; }}
              />
            ) : null}
            <div
              className="card-item__img-placeholder"
              style={{ background: PLACEHOLDER_COLORS[sale.sport], display: sale.image ? 'none' : 'flex' }}
            >
              <span className="card-item__placeholder-icon">{SPORT_ICONS[sale.sport]}</span>
              <span className="card-item__placeholder-title">{sale.title}</span>
            </div>
          </a>
        ) : (
          <>
            {sale.image ? (
              <img
                src={sale.image}
                alt={sale.title}
                className="card-item__img"
                loading="lazy"
                onError={(e) => { e.currentTarget.style.display = 'none'; e.currentTarget.nextSibling.style.display = 'flex'; }}
              />
            ) : null}
            <div
              className="card-item__img-placeholder"
              style={{ background: PLACEHOLDER_COLORS[sale.sport], display: sale.image ? 'none' : 'flex' }}
            >
              <span className="card-item__placeholder-icon">{SPORT_ICONS[sale.sport]}</span>
              <span className="card-item__placeholder-title">{sale.title}</span>
            </div>
          </>
        )}
        <span className="card-item__sport-tag">{sale.sport}</span>
        {isWatched && <span className="card-item__watch-badge">👁 Watched</span>}
      </div>

      <div className="card-item__body">
        <p className="card-item__title">
          {href && href !== '#' ? (
            <a href={href} target="_blank" rel="noreferrer">{sale.title}</a>
          ) : sale.title}
        </p>

        <div className="card-item__meta">
          <span className="card-item__condition">{sale.condition}</span>
          <span className="card-item__time">{timeAgo(sale.soldAt)}</span>
        </div>

        <div className="card-item__price-row">
          <span className="card-item__price">{fmt(sale.price)}</span>
          <span className="card-item__first-sale">asking price</span>
        </div>

        <SocialBar
          sale={sale}
          onCommentClick={() => onCommentClick(sale)}
          onAuthRequired={onAuthRequired}
        />
      </div>
    </div>
  );
}
