const SPORTS = [
  { key: 'all', label: 'All Sports', color: '#a1a1aa' },
  { key: 'baseball', label: 'Baseball', color: '#e63946' },
  { key: 'basketball', label: 'Basketball', color: '#f4a261' },
  { key: 'football', label: 'Football', color: '#2a9d8f' },
  { key: 'hockey', label: 'Hockey', color: '#4895ef' },
  { key: 'soccer', label: 'Soccer', color: '#22c55e' },
];

export default function SportFilter({ active, onChange, counts, watchlistTerms = [], watchedOnly, watchedCount, onWatchedToggle }) {
  return (
    <div className="sport-filter">
      {SPORTS.map(({ key, label, color }) => {
        const count = key === 'all'
          ? Object.values(counts).reduce((s, n) => s + n, 0)
          : (counts[key] || 0);
        const isActive = !watchedOnly && active === key;
        return (
          <button
            key={key}
            className={`sport-btn ${isActive ? 'active' : ''}`}
            style={{ '--sport-color': color }}
            onClick={() => onChange(key)}
          >
            <span className="sport-btn-dot" />
            {label}
            {count > 0 && <span className="sport-btn-count">{count}</span>}
          </button>
        );
      })}

      {watchlistTerms.length > 0 && (
        <button
          className={`sport-btn sport-btn--watched ${watchedOnly ? 'active' : ''}`}
          onClick={onWatchedToggle}
        >
          <span className="sport-btn-dot" />
          Watched
          {watchedCount > 0 && <span className="sport-btn-count">{watchedCount}</span>}
        </button>
      )}
    </div>
  );
}
