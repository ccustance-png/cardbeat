import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import SocialBar from './SocialBar.jsx';
import CommentDrawer from './CommentDrawer.jsx';
import AuthModal from './AuthModal.jsx';

const SPORT_COLORS = { baseball: '#e63946', basketball: '#f4a261', football: '#2a9d8f', hockey: '#4895ef', soccer: '#22c55e' };
const SPORT_ICONS = { baseball: '⚾', basketball: '🏀', football: '🏈', hockey: '🏒', soccer: '⚽' };

function affiliateUrl(url) {
  if (!url || url === '#') return url;
  const campId = import.meta.env.VITE_EPN_CAMPAIGN_ID;
  if (!campId) return url;
  return `https://rover.ebay.com/rover/1/711-53200-19255-0/1?ff3=4&pub=5575${campId}&toolid=10001&campid=${campId}&mpre=${encodeURIComponent(url)}`;
}

function fmt(price) {
  if (!price && price !== 0) return '';
  const n = parseFloat(price);
  if (n >= 1000) return `$${n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  return `$${n.toFixed(2)}`;
}

function timeAgo(iso) {
  const secs = Math.floor((Date.now() - new Date(iso)) / 1000);
  if (secs < 60) return `${secs}s ago`;
  if (secs < 3600) return `${Math.floor(secs / 60)}m ago`;
  if (secs < 86400) return `${Math.floor(secs / 3600)}h ago`;
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function ListingPage({ listingId }) {
  const { user } = useAuth();
  const [listing, setListing] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [commentOpen, setCommentOpen] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);

  const fetchListing = useCallback(() => {
    const headers = user ? { Authorization: `Bearer ${localStorage.getItem('cb_token')}` } : {};
    return fetch(`/api/social/listing/${listingId}`, { headers })
      .then(r => {
        if (!r.ok) return null; // 404, 500, or any error — don't parse as listing data
        return r.json();
      })
      .then(data => {
        // Only update state if we got a real listing with a title
        if (data?.title) {
          setListing(data);
          setLoading(false);
        }
        return data?.title ? data : null;
      })
      .catch(() => null);
  }, [listingId, user]);

  useEffect(() => {
    // 1. Check localStorage for an instant render — set when user clicked ticker/trending/share
    let loadedFromCache = false;
    try {
      const cached = localStorage.getItem(`cb_listing_${listingId}`);
      if (cached) {
        const meta = JSON.parse(cached);
        if (meta?.title) {
          setListing({
            id: listingId,
            title: meta.title,
            image: meta.image,
            price: meta.price,
            sport: meta.sport,
            itemUrl: meta.itemUrl,
            social: { rating: { avg: null, count: 0, myStars: null }, reactions: [], myReactions: [], comments: [], isSaved: false },
          });
          setLoading(false);
          loadedFromCache = true;
        }
      }
    } catch {}

    // 2. Always fetch from DB — updates social data (comments/reactions/saves)
    //    and handles listings that weren't cached (e.g. shared links on another device)
    fetchListing().then(data => {
      if (!data && !loadedFromCache) {
        setNotFound(true);
        setLoading(false);
      }
    });
  }, [fetchListing, listingId]);

  if (loading) {
    return (
      <div className="listing-page">
        <div className="listing-page__header">
          <a href="/" className="listing-back">← CardBeat</a>
        </div>
        <div className="listing-loading">Loading…</div>
      </div>
    );
  }

  if (notFound || !listing) {
    return (
      <div className="listing-page">
        <div className="listing-page__header">
          <a href="/" className="listing-back">← CardBeat</a>
        </div>
        <div className="listing-notfound">
          <div className="listing-notfound__icon">🃏</div>
          <h2>Listing not found</h2>
          <p>This card may have left the feed.</p>
          <a href="/" className="listing-notfound__cta">Browse live listings →</a>
        </div>
      </div>
    );
  }

  const sportColor = SPORT_COLORS[listing.sport] || '#a1a1aa';
  const href = affiliateUrl(listing.itemUrl);
  const comments = listing.social?.comments || [];
  const reactions = listing.social?.reactions?.filter(r => r.count > 0) || [];

  const sale = {
    id: listing.id,
    title: listing.title,
    image: listing.image,
    price: listing.price,
    sport: listing.sport,
    sportColor,
    itemUrl: listing.itemUrl,
  };

  return (
    <div className="listing-page" style={{ '--sport-color': sportColor }}>
      <div className="listing-page__header">
        <a href="/" className="listing-back">← CardBeat</a>
        <span className="listing-page__brand">Card<span style={{color:'var(--cb-violet)'}}>Beat</span></span>
        <span className="listing-page__tagline">Live Sports Card Market</span>
      </div>

      <div className="listing-page__body">
        <div className="listing-card">
          {/* Card image */}
          <div className="listing-card__img-wrap">
            {listing.image ? (
              <img src={listing.image} alt={listing.title} className="listing-card__img" />
            ) : (
              <div className="listing-card__img-placeholder">
                <span className="listing-card__placeholder-icon">{SPORT_ICONS[listing.sport]}</span>
              </div>
            )}
            {listing.sport && (
              <span className="listing-card__sport-tag">{listing.sport}</span>
            )}
          </div>

          {/* Card info */}
          <div className="listing-card__info">
            <h1 className="listing-card__title">{listing.title}</h1>
            <div className="listing-card__price-row">
              <span className="listing-card__price">{fmt(listing.price)}</span>
              <span className="listing-card__asking">asking price</span>
            </div>

            {href && href !== '#' && (
              <a href={href} target="_blank" rel="noreferrer" className="listing-card__ebay-btn">
                View on eBay →
              </a>
            )}

            <SocialBar
              sale={sale}
              onCommentClick={() => setCommentOpen(true)}
              onAuthRequired={() => setAuthModalOpen(true)}
            />
          </div>
        </div>

        {/* Reaction summary bar */}
        {reactions.length > 0 && (
          <div className="listing-reactions">
            {reactions.map(r => (
              <span key={r.emoji} className="listing-reaction">
                {r.emoji}
                <span className="listing-reaction__count">{r.count}</span>
              </span>
            ))}
          </div>
        )}

        {/* Inline comments */}
        <div className="listing-comments">
          <h2 className="listing-comments__heading">
            {comments.length > 0
              ? `${comments.length} Comment${comments.length !== 1 ? 's' : ''}`
              : 'No comments yet'}
          </h2>
          {comments.length === 0 && (
            <p className="listing-comments__empty">
              Be the first to comment on this listing.{' '}
              {!user && <button className="listing-comments__signin" onClick={() => setAuthModalOpen(true)}>Sign in →</button>}
            </p>
          )}
          {comments.map(c => (
            <div key={c.id} className="listing-comment">
              <div className="listing-comment__meta">
                <span className="listing-comment__user">@{c.username}</span>
                <span className="listing-comment__time">{timeAgo(c.created_at)}</span>
              </div>
              <p className="listing-comment__text">{c.content}</p>
            </div>
          ))}
        </div>
      </div>

      {commentOpen && (
        <CommentDrawer
          sale={sale}
          onClose={() => { setCommentOpen(false); fetchListing(); }}
          onAuthRequired={() => { setCommentOpen(false); setAuthModalOpen(true); }}
        />
      )}
      {authModalOpen && <AuthModal onClose={() => setAuthModalOpen(false)} />}
    </div>
  );
}
