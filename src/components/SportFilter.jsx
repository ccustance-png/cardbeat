const SPORTS = [
  { key: 'all', label: 'All Sports', color: '#a1a1aa' },
  { key: 'baseball', label: 'Baseball', color: '#e63946' },
  { key: 'basketball', label: 'Basketball', color: '#f4a261' },
  { key: 'football', label: 'Football', color: '#2a9d8f' },
  { key: 'hockey', label: 'Hockey', color: '#4895ef' },
  { key: 'soccer', label: 'Soccer', color: '#22c55e' },
];

export default function SportFilter({ active, onChange, counts, watchlistTerms = [], watchedOnly, watchedCount, onWatchedToggle }) {
  const total = Object.values(counts).reduce((s, n) => s + n, 0);
  const activeConfig = SPORTS.find(s => s.key === active) || SPORTS[0];

  return (
    <>
      {/* ── Desktop: pill buttons ── */}
      <div className="sport-filter sport-filter--desktop">
        {SPORTS.map(({ key, label, color }) => {
          const count = key === 'all' ? total : (counts[key] || 0);
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

      {/* ── Mobile: dropdown ── */}
      <div className="sport-filter sport-filter--mobile">
        <div
          className="sport-select-wrap"
          style={{ '--sport-color': watchedOnly ? 'var(--cb-gold)' : activeConfig.color }}
        >
          <span className="sport-btn-dot" />
          <select
            className="sport-select"
            value={active}
            onChange={e => onChange(e.target.value)}
          >
            {SPORTS.map(({ key, label }) => {
              const count = key === 'all' ? total : (counts[key] || 0);
              return (
                <option key={key} value={key}>
                  {label}{count > 0 ? ` (${count})` : ''}
                </option>
              );
            })}
          </select>
          <span className="sport-select-chevron">▾</span>
        </div>

        {watchlistTerms.length > 0 && (
          <button
            className={`sport-btn sport-btn--watched ${watchedOnly ? 'active' : ''}`}
            onClick={onWatchedToggle}
            style={{ flexShrink: 0 }}
          >
            <span className="sport-btn-dot" />
            Watched
            {watchedCount > 0 && watchedCount != null && (
              <span className="sport-btn-count">{watchedCount}</span>
            )}
          </button>
        )}
      </div>
    </>
  );
}
