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
import ListingPage from './components/ListingPage.jsx';

const SOCKET_URL = import.meta.env.DEV ? 'http://localhost:3001' : window.location.origin;
const NEW_SALE_FLASH_MS = 3000;

function HeaderAuth({ onSignIn, onSavedOpen }) {
  const { user, logout } = useAuth();
  return user ? (
    <div className="header-user">
      <button className="header-saved-btn" onClick={onSavedOpen}>🔖 Saved</button>
      <span className="header-username">@{user.username}</span>
      <button className="header-signout" onClick={logout}>Sign out</button>
    </div>
  ) : (
    <button className="header-signin" onClick={onSignIn}>Sign in</button>
  );
}

function AppInner() {
  const [sales, setSales] = useState([]);
  const [activeSport, setActiveSport] = useState('all');
  const [newSaleIds, setNewSaleIds] = useState(new Set());
  const [connected, setConnected] = useState(false);
  const [totalSeen, setTotalSeen] = useState(0);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [commentSale, setCommentSale] = useState(null);
  const [savedOpen, setSavedOpen] = useState(false);
  const socketRef = useRef(null);
  const newIdsTimers = useRef({});
  const feedPausedRef = useRef(false);
  const pendingRef = useRef([]);

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
          <h1 className="app-logo">CardBeat</h1>
          <span className="app-tagline">Live eBay Sports Card Market</span>
        </div>
        <div className="app-header__right">
          <div className={`status-dot ${connected ? 'status-dot--live' : 'status-dot--offline'}`} />
          <span className="status-label">{connected ? 'Live' : 'Connecting…'}</span>
          {totalSeen > 0 && (
            <span className="total-seen">{totalSeen.toLocaleString()} listings</span>
          )}
          <HeaderAuth onSignIn={() => setAuthModalOpen(true)} onSavedOpen={() => setSavedOpen(true)} />
        </div>
      </header>

      <Ticker sales={sales} onItemClick={(sale) => {
        // Scroll the card into view if it's in the feed
        const el = document.querySelector(`[data-sale-id="${sale.id}"]`);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          el.classList.add('card-item--pulse');
          setTimeout(() => el.classList.remove('card-item--pulse'), 1800);
        }
        // Open comment drawer
        setCommentSale(sale);
      }} />

      <div className="app-body">
        <div className="app-main">
          <SportFilter active={activeSport} onChange={setActiveSport} counts={counts} />
          <CardFeed
            sales={sales}
            activeSport={activeSport}
            newSaleIds={newSaleIds}
            onCommentClick={setCommentSale}
            onAuthRequired={() => setAuthModalOpen(true)}
            onPause={pauseFeed}
            onResume={resumeFeed}
          />
        </div>
        <TrendingSidebar onCardClick={(item) => {
          // Try to find the live card in the feed first (for scroll + pulse)
          const liveSale = sales.find(s => s.id === item.listing_id);
          if (liveSale) {
            const el = document.querySelector(`[data-sale-id="${liveSale.id}"]`);
            if (el) {
              el.scrollIntoView({ behavior: 'smooth', block: 'center' });
              el.classList.add('card-item--pulse');
              setTimeout(() => el.classList.remove('card-item--pulse'), 1800);
            }
            setCommentSale(liveSale);
          } else {
            // Card not in current feed — build from trending item's stored metadata
            const SPORT_COLORS = { baseball: '#e63946', basketball: '#f4a261', football: '#2a9d8f', hockey: '#4895ef' };
            setCommentSale({
              id: item.listing_id,
              title: item.title,
              image: item.image,
              price: parseFloat(item.price) || 0,
              sport: item.sport,
              sportColor: SPORT_COLORS[item.sport] || '#a1a1aa',
              itemUrl: item.item_url,
              condition: '',
              soldAt: new Date().toISOString(),
            });
          }
        }} />
      </div>

      {savedOpen && (
        <SavedDrawer
          onClose={() => setSavedOpen(false)}
          onCommentClick={(sale) => { setSavedOpen(false); setCommentSale(sale); }}
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
