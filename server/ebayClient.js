import axios from 'axios';
import 'dotenv/config';

const EBAY_AUTH_URL = 'https://api.ebay.com/identity/v1/oauth2/token';
const EBAY_FINDING_URL = 'https://svcs.ebay.com/services/search/FindingService/v1';
const EBAY_BROWSE_URL = 'https://api.ebay.com/buy/browse/v1/item_summary/search';
const SPORTS_CARDS_CATEGORY = '212'; // eBay Sports Trading Cards category

// OAuth tokens for Browse API (Finding API uses App ID directly)
const tokens = {};

async function getAccessToken() {
  const cached = tokens['browse'];
  if (cached && Date.now() < cached.expiry - 60000) return cached.token;

  const credentials = Buffer.from(
    `${process.env.EBAY_CLIENT_ID}:${process.env.EBAY_CLIENT_SECRET}`
  ).toString('base64');

  const response = await axios.post(
    EBAY_AUTH_URL,
    'grant_type=client_credentials&scope=https%3A%2F%2Fapi.ebay.com%2Foauth%2Fapi_scope',
    {
      headers: {
        Authorization: `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    }
  );

  tokens['browse'] = {
    token: response.data.access_token,
    expiry: Date.now() + response.data.expires_in * 1000,
  };
  return tokens['browse'].token;
}

// eBay Browse API returns images in different fields depending on item type / query.
// Try each in order until we get a URL.
function extractImage(item) {
  return item.image?.imageUrl
    || item.thumbnailImages?.[0]?.imageUrl
    || item.additionalImages?.[0]?.imageUrl
    || null;
}

const SPORT_QUERIES = {
  baseball: 'baseball card',
  basketball: 'basketball card',
  football: 'football card',
  hockey: 'hockey card',
  soccer: 'soccer card',
};

const SPORT_COLORS = {
  baseball: '#e63946',
  basketball: '#f4a261',
  football: '#2a9d8f',
  hockey: '#4895ef',
  soccer: '#22c55e',
};

// Finding API — real completed/sold listings
export async function fetchRecentSales(sport, limit = 50) {
  const query = SPORT_QUERIES[sport];

  const response = await axios.get(EBAY_FINDING_URL, {
    params: {
      'OPERATION-NAME': 'findCompletedItems',
      'SERVICE-VERSION': '1.0.0',
      'SECURITY-APPNAME': process.env.EBAY_CLIENT_ID,
      'RESPONSE-DATA-FORMAT': 'JSON',
      'keywords': query,
      'categoryId': SPORTS_CARDS_CATEGORY,
      'itemFilter(0).name': 'SoldItemsOnly',
      'itemFilter(0).value': 'true',
      'sortOrder': 'EndTimeSoonest',
      'paginationInput.entriesPerPage': limit,
    },
  });

  const items = response.data?.findCompletedItemsResponse?.[0]
    ?.searchResult?.[0]?.item || [];

  return items.map((item) => ({
    id: item.itemId?.[0],
    title: item.title?.[0],
    image: item.galleryURL?.[0] || null,
    price: parseFloat(item.sellingStatus?.[0]?.currentPrice?.[0]?.['__value__'] || 0),
    currency: item.sellingStatus?.[0]?.currentPrice?.[0]?.['@currencyId'] || 'USD',
    soldAt: item.listingInfo?.[0]?.endTime?.[0] || new Date().toISOString(),
    sport,
    sportColor: SPORT_COLORS[sport],
    itemUrl: item.viewItemURL?.[0] || '#',
    condition: item.condition?.[0]?.conditionDisplayName?.[0] || 'Unknown',
  })).filter(item => item.price > 0);
}

export async function fetchAllSports() {
  const sports = Object.keys(SPORT_QUERIES);
  const results = await Promise.allSettled(
    sports.map((sport) => fetchRecentSales(sport, 25))
  );

  const sales = [];
  results.forEach((result, i) => {
    if (result.status === 'fulfilled') {
      sales.push(...result.value);
    } else {
      console.error(`Failed to fetch ${sports[i]}:`, result.reason?.message);
    }
  });

  return sales.sort((a, b) => new Date(b.soldAt) - new Date(a.soldAt));
}

// Browse API — active listings sorted by newly listed
// Used for both live polling and mock-mode seeding
export async function fetchBrowseListings(sport, limit = 20) {
  const token = await getAccessToken('browse');
  const query = SPORT_QUERIES[sport];

  const response = await axios.get(EBAY_BROWSE_URL, {
    headers: { Authorization: `Bearer ${token}` },
    params: {
      q: query,
      category_ids: SPORTS_CARDS_CATEGORY,
      limit,
      sort: 'newlyListed', // includes both fixed-price and auction
    },
  });

  const items = response.data.itemSummaries || [];

  return items
    .filter((item) => item.price?.value > 0)
    .map((item) => ({
      id: item.itemId,
      title: item.title,
      image: extractImage(item),
      price: parseFloat(item.price?.value || 0),
      currency: item.price?.currency || 'USD',
      soldAt: new Date().toISOString(), // time we discovered it via API
      sport,
      sportColor: SPORT_COLORS[sport],
      itemUrl: item.itemWebUrl || `https://www.ebay.com/itm/${item.itemId}`,
      condition: item.condition || 'Unknown',
      buyingOption: Array.isArray(item.buyingOptions)
        ? (item.buyingOptions.includes('AUCTION') ? 'auction' : 'fixed')
        : 'fixed',
      endsAt: item.itemEndDate || null,
      bidCount: item.bidCount || 0,
    }));
}

// Browse API — auctions sorted by ending soonest, filtered to next N hours
export async function fetchEndingSoon(sport, hoursAhead = 6, limit = 50) {
  const token = await getAccessToken('browse');
  const query = SPORT_QUERIES[sport];
  const endWindow = new Date(Date.now() + hoursAhead * 3600 * 1000).toISOString();

  const response = await axios.get(EBAY_BROWSE_URL, {
    headers: { Authorization: `Bearer ${token}` },
    params: {
      q: query,
      category_ids: SPORTS_CARDS_CATEGORY,
      filter: `buyingOptions:{AUCTION},endDate:[${new Date().toISOString()}..${endWindow}]`,
      sort: 'endingSoonest',
      limit,
      fieldgroups: 'EXTENDED', // ensures thumbnailImages and additionalImages are returned
    },
  });

  const items = response.data.itemSummaries || [];

  return items
    .filter(item => item.itemEndDate) // must have an end date to show countdown
    .map(item => ({
      id: item.itemId,
      title: item.title,
      image: extractImage(item), // tries image, thumbnailImages, additionalImages
      price: parseFloat(item.currentBidPrice?.value || item.price?.value || 0),
      currency: item.currentBidPrice?.currency || item.price?.currency || 'USD',
      soldAt: new Date().toISOString(),
      sport,
      sportColor: SPORT_COLORS[sport],
      itemUrl: item.itemWebUrl || `https://www.ebay.com/itm/${item.itemId}`,
      condition: item.condition || 'Unknown',
      buyingOption: 'auction',
      endsAt: item.itemEndDate,
      bidCount: item.bidCount || 0,
    }));
}

export async function fetchEndingSoonAllSports(hoursAhead = 6, limit = 50) {
  const sports = Object.keys(SPORT_QUERIES);
  const results = await Promise.allSettled(
    sports.map(sport => fetchEndingSoon(sport, hoursAhead, limit))
  );
  const listings = [];
  results.forEach((result, i) => {
    if (result.status === 'fulfilled') listings.push(...result.value);
    else console.warn(`[Ending Soon] ${sports[i]} failed:`, result.reason?.message);
  });
  // Sort by ending soonest first
  return listings.sort((a, b) => new Date(a.endsAt) - new Date(b.endsAt));
}

export async function fetchBrowseAllSports(limitPerSport = 15) {
  const sports = Object.keys(SPORT_QUERIES);
  const results = await Promise.allSettled(
    sports.map((sport) => fetchBrowseListings(sport, limitPerSport))
  );

  const listings = [];
  results.forEach((result, i) => {
    if (result.status === 'fulfilled') {
      listings.push(...result.value);
    } else {
      console.warn(`[Browse] ${sports[i]} failed:`, result.reason?.message);
    }
  });

  return listings.sort((a, b) => new Date(b.soldAt) - new Date(a.soldAt));
}

export { SPORT_COLORS };
