import { useRef, useEffect } from 'react';
import CardItem from './CardItem.jsx';

export default function CardFeed({ sales, activeSport, newSaleIds, watchlistTerms = [], watchedOnly = false, onCommentClick, onAuthRequired, onPause, onResume }) {
  let filtered = activeSport === 'all'
    ? sales
    : sales.filter((s) => s.sport === activeSport);

  if (watchedOnly && watchlistTerms.length > 0) {
    filtered = filtered.filter(s => {
      const t = (s.title || '').toLowerCase();
      return watchlistTerms.some(term => t.includes(term));
    });
  }

  const prevCountRef = useRef(filtered.length);

  useEffect(() => {
    prevCountRef.current = filtered.length;
  });

  if (!filtered.length) {
    return (
      <div className="feed-empty">
        {watchedOnly
          ? <p>No watched listings in the feed yet — they'll appear here as they come in.</p>
          : <p>Waiting for sales data…</p>
        }
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
