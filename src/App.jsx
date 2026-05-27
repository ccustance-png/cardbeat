import { useState, useEffect, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';
import { AuthProvider, useAuth } from './context/AuthContext.jsx';
import Ticker from './components/Ticker.jsx';
import SportFilter from './components/SportFilter.jsx';
import CardFeed from './components/CardFeed.jsx';
import TrendingSidebar from './components/TrendingSidebar.jsx';
import AuthModal from './components/AuthModal.jsx';
import CommentDrawer from './components/CommentDrawer.jsx';
import SavedDrawer from './components/SavedDrawer.jsx';
import WatchlistDrawer from './components/WatchlistDrawer.jsx';
import ListingPage from './components/ListingPage.jsx';

const SOCKET_URL = import.meta.env.DEV ? 'http://localhost:3001' : window.location.origin;
const NEW_SALE_FLASH_MS = 3000;

// Store card metadata locally + in DB so the permalink page always loads,
// then open the listing in a new tab. localStorage is shared across same-origin
// tabs so the new tab can read it immediately before the DB write finishes.
function openListing(id, meta) {
  try { localStorage.setItem(`cb_listing_${id}`, JSON.stringify(meta)); } catch {}
  fetch(`/api/social/${id}/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(meta),
  }).catch(() => {});
  window.open(`/listing/${id}`, '_blank');
}

function HeaderAuth({ onSignIn, onSavedOpen, onWatchlistOpen }) {
  const { user, logout } = useAuth();
  return user ? (
    <div className="header-user">
      <button className="header-watchlist-btn" onClick={onWatchlistOpen}>👁 Watchlist</button>
      <button className="header-saved-btn" onClick={onSavedOpen}>🔖 Saved</button>
      <span className="header-username">@{user.username}</span>
      <button className="header-signout" onClick={logout}>Sign out</button>
    </div>
  ) : (
    <>
      <button className="header-watchlist-btn" onClick={onWatchlistOpen}>👁 Watchlist</button>
      <button className="header-signin" onClick={onSignIn}>Sign in</button>
    </>
  );
}

function AppInner() {
  const { user, authFetch } = useAuth();
  const [sales, setSales] = useState([]);
  const [activeSport, setActiveSport] = useState('all');
  const [newSaleIds, setNewSaleIds] = useState(new Set());
  const [connected, setConnected] = useState(false);
  const [totalSeen, setTotalSeen] = useState(0);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [commentSale, setCommentSale] = useState(null);
  const [savedOpen, setSavedOpen] = useState(false);
  const [watchlistOpen, setWatchlistOpen] = useState(false);
  const [watchlistTerms, setWatchlistTerms] = useState(() => {
    try { return JSON.parse(localStorage.getItem('cb_watchlist') || '[]'); } catch { return []; }
  });
  const socketRef = useRef(null);
  const newIdsTimers = useRef({});
  const feedPausedRef = useRef(false);
  const pendingRef = useRef([]);

  // Sync watchlist with server when user logs in/out
  useEffect(() => {
    if (!user) return;
    authFetch('/api/watchlist')
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data?.terms) {
          const serverTerms = data.terms.map(t => t.term);
          // Merge: push any local-only terms to server, then use server list
          const localTerms = JSON.parse(localStorage.getItem('cb_watchlist') || '[]');
          const toSync = localTerms.filter(t => !serverTerms.includes(t));
          toSync.forEach(term => {
            authFetch('/api/watchlist', {
              method: 'POST',
              body: JSON.stringify({ term }),
            }).catch(() => {});
          });
          const merged = [...new Set([...serverTerms, ...toSync])];
          setWatchlistTerms(merged);
          try { localStorage.setItem('cb_watchlist', JSON.stringify(merged)); } catch {}
        }
      })
      .catch(() => {});
  }, [user, authFetch]);

  function addWatchlistTerm(term) {
    const val = term.trim().toLowerCase();
    if (!val || watchlistTerms.includes(val)) return;
    const next = [...watchlistTerms, val];
    setWatchlistTerms(next);
    try { localStorage.setItem('cb_watchlist', JSON.stringify(next)); } catch {}
    if (user) {
      authFetch('/api/watchlist', { method: 'POST', body: JSON.stringify({ term: val }) }).catch(() => {});
    }
  }

  function removeWatchlistTerm(term) {
    const next = watchlistTerms.filter(t => t !== term);
    setWatchlistTerms(next);
    try { localStorage.setItem('cb_watchlist', JSON.stringify(next)); } catch {}
    if (user) {
      authFetch(`/api/watchlist/${encodeURIComponent(term)}`, { method: 'DELETE' }).catch(() => {});
    }
  }

  const flashNew = useCallback((id) => {
    setNewSaleIds((prev) => new Set([...prev, id]));
    if (newIdsTimers.current[id]) clearTimeout(newIdsTimers.current[id]);
    newIdsTimers.current[id] = setTimeout(() => {
      setNewSaleIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      delete newIdsTimers.current[id];
    }, NEW_SALE_FLASH_MS);
  }, []);

  const addSaleToFeed = useCallback((sale) => {
    setSales((prev) => {
      if (prev.find((s) => s.id === sale.id)) return prev;
      return [sale, ...prev].slice(0, 500);
    });
    setTotalSeen((n) => n + 1);
    flashNew(sale.id);
  }, [flashNew]);

  const pauseFeed = useCallback(() => {
    feedPausedRef.current = true;
  }, []);

  const resumeFeed = useCallback(() => {
    feedPausedRef.current = false;
    const pending = pendingRef.current.splice(0);
    pending.forEach(addSaleToFeed);
  }, [addSaleToFeed]);

  useEffect(() => {
    const socket = io(SOCKET_URL, { transports: ['websocket', 'polling'] });
    socketRef.current = socket;

    socket.on('connect', () => setConnected(true));
    socket.on('disconnect', () => setConnected(false));

    socket.on('initialSales', (initialSales) => {
      setSales(initialSales);
      setTotalSeen(initialSales.length);
    });

    socket.on('newSale', (sale) => {
      if (feedPausedRef.current) {
        pendingRef.current.push(sale);
        return;
      }
      addSaleToFeed(sale);
    });

    return () => {
      socket.disconnect();
      Object.values(newIdsTimers.current).forEach(clearTimeout);
    };
  }, [addSaleToFeed]);

  const counts = sales.reduce((acc, s) => {
    acc[s.sport] = (acc[s.sport] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="app">
      <header className="app-header">
        <div className="app-header__left">
          <h1 className="app-logo">Card<span className="app-logo__beat">Beat</span></h1>
          <span className="app-tagline">Live Sports Card Market</span>
        </div>
        <div className="app-header__right">
          <div className={`status-dot ${connected ? 'status-dot--live' : 'status-dot--offline'}`} />
          <span className="status-label">{connected ? 'Live' : 'Connecting…'}</span>
          {totalSeen > 0 && (
            <span className="total-seen">{totalSeen.toLocaleString()} listings</span>
          )}
          <HeaderAuth
            onSignIn={() => setAuthModalOpen(true)}
            onSavedOpen={() => setSavedOpen(true)}
            onWatchlistOpen={() => setWatchlistOpen(true)}
          />
        </div>
      </header>

      <Ticker sales={sales} onItemClick={(sale) => {
        openListing(sale.id, { title: sale.title, image: sale.image, price: sale.price, sport: sale.sport, itemUrl: sale.itemUrl });
      }} />

      <div className="app-body">
        <div className="app-main">
          <SportFilter active={activeSport} onChange={setActiveSport} counts={counts} />
          <CardFeed
            sales={sales}
            activeSport={activeSport}
            newSaleIds={newSaleIds}
            watchlistTerms={watchlistTerms}
            onCommentClick={setCommentSale}
            onAuthRequired={() => setAuthModalOpen(true)}
            onPause={pauseFeed}
            onResume={resumeFeed}
          />
        </div>
        <TrendingSidebar onCardClick={(item) => {
          openListing(item.listing_id, { title: item.title, image: item.image, price: item.price, sport: item.sport, itemUrl: item.item_url });
        }} />
      </div>

      {savedOpen && (
        <SavedDrawer
          onClose={() => setSavedOpen(false)}
          onCommentClick={(sale) => { setSavedOpen(false); setCommentSale(sale); }}
        />
      )}
      {watchlistOpen && (
        <WatchlistDrawer
          terms={watchlistTerms}
          onAdd={addWatchlistTerm}
          onRemove={removeWatchlistTerm}
          onClose={() => setWatchlistOpen(false)}
          onAuthRequired={() => { setWatchlistOpen(false); setAuthModalOpen(true); }}
        />
      )}
      {authModalOpen && <AuthModal onClose={() => setAuthModalOpen(false)} />}
      {commentSale && (
        <CommentDrawer
          sale={commentSale}
          onClose={() => setCommentSale(null)}
          onAuthRequired={() => { setCommentSale(null); setAuthModalOpen(true); }}
        />
      )}
    </div>
  );
}

export default function App() {
  const listingMatch = window.location.pathname.match(/^\/listing\/(.+)$/);
  return (
    <AuthProvider>
      {listingMatch ? <ListingPage listingId={listingMatch[1]} /> : <AppInner />}
    </AuthProvider>
  );
}
