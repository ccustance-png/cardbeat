import { useRef, useEffect } from 'react';
import CardItem from './CardItem.jsx';

export default function CardFeed({ sales, activeSport, newSaleIds, watchlistTerms = [], onCommentClick, onAuthRequired, onPause, onResume }) {
  const filtered = activeSport === 'all'
    ? sales
    : sales.filter((s) => s.sport === activeSport);

  const prevCountRef = useRef(filtered.length);

  useEffect(() => {
    prevCountRef.current = filtered.length;
  });

  if (!filtered.length) {
    return (
      <div className="feed-empty">
        <p>Waiting for sales data…</p>
      </div>
    );
  }

  return (
    <div className="card-feed" onMouseEnter={onPause} onMouseLeave={onResume}>
      {filtered.map((sale) => {
        const titleLower = (sale.title || '').toLowerCase();
        const isWatched = watchlistTerms.length > 0 &&
          watchlistTerms.some(t => titleLower.includes(t));
        return (
          <CardItem
            key={sale.id}
            sale={sale}
            isNew={newSaleIds.has(sale.id)}
            isWatched={isWatched}
            onCommentClick={onCommentClick}
            onAuthRequired={onAuthRequired}
          />
        );
      })}
    </div>
  );
}
