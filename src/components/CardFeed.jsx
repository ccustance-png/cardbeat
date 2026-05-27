import { useRef, useEffect } from 'react';
import CardItem from './CardItem.jsx';

export default function CardFeed({ sales, activeSport, newSaleIds, onCommentClick, onAuthRequired, onPause, onResume }) {
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
      {filtered.map((sale) => (
        <CardItem
          key={sale.id}
          sale={sale}
          isNew={newSaleIds.has(sale.id)}
          onCommentClick={onCommentClick}
          onAuthRequired={onAuthRequired}
        />
      ))}
    </div>
  );
}
