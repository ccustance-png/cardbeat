import { useState, useEffect, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';
import Ticker from './components/Ticker.jsx';
import SportFilter from './components/SportFilter.jsx';
import CardFeed from './components/CardFeed.jsx';

const SOCKET_URL = import.meta.env.DEV ? 'http://localhost:3001' : window.location.origin;
const NEW_SALE_FLASH_MS = 3000;

export default function App() {
  const [sales, setSales] = useState([]);
  const [activeSport, setActiveSport] = useState('all');
  const [newSaleIds, setNewSaleIds] = useState(new Set());
  const [connected, setConnected] = useState(false);
  const [totalSeen, setTotalSeen] = useState(0);
  const socketRef = useRef(null);
  const newIdsTimers = useRef({});

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
      setSales((prev) => {
        if (prev.find((s) => s.id === sale.id)) return prev;
        return [sale, ...prev].slice(0, 500);
      });
      setTotalSeen((n) => n + 1);
      flashNew(sale.id);
    });

    return () => {
      socket.disconnect();
      Object.values(newIdsTimers.current).forEach(clearTimeout);
    };
  }, [flashNew]);

  const counts = sales.reduce((acc, s) => {
    acc[s.sport] = (acc[s.sport] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="app">
      <header className="app-header">
        <div className="app-header__left">
          <h1 className="app-logo">CardBeat</h1>
          <span className="app-tagline">Live eBay Sports Card Sales</span>
        </div>
        <div className="app-header__right">
          <div className={`status-dot ${connected ? 'status-dot--live' : 'status-dot--offline'}`} />
          <span className="status-label">{connected ? 'Live' : 'Connecting…'}</span>
          {totalSeen > 0 && (
            <span className="total-seen">{totalSeen.toLocaleString()} sales</span>
          )}
        </div>
      </header>

      <Ticker sales={sales} />

      <div className="app-body">
        <SportFilter active={activeSport} onChange={setActiveSport} counts={counts} />
        <CardFeed sales={sales} activeSport={activeSport} newSaleIds={newSaleIds} />
      </div>
    </div>
  );
}
