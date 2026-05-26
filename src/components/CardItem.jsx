import { useState, useEffect } from 'react';

function fmt(price) {
  if (price >= 1000) return `$${price.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  return `$${price.toFixed(2)}`;
}

function timeAgo(iso) {
  const secs = Math.floor((Date.now() - new Date(iso)) / 1000);
  if (secs < 60) return `${secs}s ago`;
  if (secs < 3600) return `${Math.floor(secs / 60)}m ago`;
  return `${Math.floor(secs / 3600)}h ago`;
}

const SPORT_ICONS = {
  baseball: '⚾',
  basketball: '🏀',
  football: '🏈',
  hockey: '🏒',
};

const PLACEHOLDER_COLORS = {
  baseball: '#3d0f12',
  basketball: '#3d2008',
  football: '#0b2d28',
  hockey: '#0c1f3d',
};

export default function CardItem({ sale, isNew }) {
  const [highlight, setHighlight] = useState(isNew);

  useEffect(() => {
    if (!isNew) return;
    setHighlight(true);
    const t = setTimeout(() => setHighlight(false), 2500);
    return () => clearTimeout(t);
  }, [isNew, sale.id]);

  const arrow = sale.priceDirection === 'up' ? '▲' : sale.priceDirection === 'down' ? '▼' : null;
  const dirColor = sale.priceDirection === 'up' ? '#22c55e' : sale.priceDirection === 'down' ? '#ef4444' : null;

  return (
    <div
      className={`card-item ${highlight ? 'card-item--new' : ''}`}
      style={{ '--sport-color': sale.sportColor }}
    >
      <div className="card-item__img-wrap">
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
          style={{
            background: PLACEHOLDER_COLORS[sale.sport],
            display: sale.image ? 'none' : 'flex',
          }}
        >
          <span className="card-item__placeholder-icon">{SPORT_ICONS[sale.sport]}</span>
          <span className="card-item__placeholder-title">{sale.title}</span>
        </div>
        <span className="card-item__sport-tag">{sale.sport}</span>
      </div>

      <div className="card-item__body">
        <p className="card-item__title">
          {sale.itemUrl && sale.itemUrl !== '#' ? (
            <a href={sale.itemUrl} target="_blank" rel="noreferrer">{sale.title}</a>
          ) : (
            sale.title
          )}
        </p>

        <div className="card-item__meta">
          <span className="card-item__condition">{sale.condition}</span>
          <span className="card-item__time">{timeAgo(sale.soldAt)}</span>
        </div>

        <div className="card-item__price-row">
          <span className="card-item__price">{fmt(sale.price)}</span>

          {sale.pctChange !== null && arrow && (
            <span className="card-item__change" style={{ color: dirColor }}>
              {arrow} {Math.abs(sale.pctChange)}%
              <span className="card-item__vs">vs avg {fmt(sale.prevAvgPrice)}</span>
            </span>
          )}
          {sale.pctChange === null && (
            <span className="card-item__first-sale">first sale</span>
          )}
        </div>
      </div>
    </div>
  );
}
