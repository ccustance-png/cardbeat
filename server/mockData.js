// Realistic mock sales for development / API fallback
const SPORT_COLORS = {
  baseball: '#e63946',
  basketball: '#f4a261',
  football: '#2a9d8f',
  hockey: '#4895ef',
  soccer: '#22c55e',
};

const MOCK_CARDS = [
  { title: '2023 Topps Chrome Mike Trout PSA 10', sport: 'baseball', basePrice: 85 },
  { title: '1952 Topps Mickey Mantle #311 SGC 4', sport: 'baseball', basePrice: 4200 },
  { title: '2018 Topps Chrome Shohei Ohtani RC PSA 10', sport: 'baseball', basePrice: 320 },
  { title: '2020 Bowman Chrome Wander Franco Auto PSA 10', sport: 'baseball', basePrice: 95 },
  { title: '1989 Upper Deck Ken Griffey Jr RC PSA 9', sport: 'baseball', basePrice: 140 },
  { title: '2003 Topps Chrome LeBron James RC PSA 9', sport: 'basketball', basePrice: 2800 },
  { title: '2019 Panini Prizm Zion Williamson RC PSA 10', sport: 'basketball', basePrice: 550 },
  { title: '2018 Panini Prizm Luka Doncic RC PSA 10', sport: 'basketball', basePrice: 1200 },
  { title: '2020 Panini Select Jaylen Brown Auto /49 BGS 9.5', sport: 'basketball', basePrice: 180 },
  { title: '1986 Fleer Michael Jordan RC PSA 8', sport: 'basketball', basePrice: 3600 },
  { title: '2000 Playoff Contenders Tom Brady RC Auto PSA 8', sport: 'football', basePrice: 18000 },
  { title: '2017 Panini Prizm Patrick Mahomes RC PSA 10', sport: 'football', basePrice: 2400 },
  { title: '2018 Donruss Optic Josh Allen RC PSA 10', sport: 'football', basePrice: 280 },
  { title: '2020 Panini Prizm Justin Herbert RC BGS 9.5', sport: 'football', basePrice: 195 },
  { title: '1979 Topps Jerry Rice RC PSA 8', sport: 'football', basePrice: 420 },
  { title: '2005 Upper Deck Young Guns Sidney Crosby RC PSA 10', sport: 'hockey', basePrice: 3200 },
  { title: '2011 Upper Deck Young Guns Connor McDavid RC PSA 9', sport: 'hockey', basePrice: 890 },
  { title: '1979 O-Pee-Chee Wayne Gretzky RC PSA 7', sport: 'hockey', basePrice: 5400 },
  { title: '2017 Upper Deck Auston Matthews Auto /25 BGS 9', sport: 'hockey', basePrice: 340 },
  { title: '2020 Upper Deck Young Guns Alexis Lafreniere RC PSA 10', sport: 'hockey', basePrice: 120 },
  { title: '2022 Panini Prizm World Cup Lionel Messi PSA 10', sport: 'soccer', basePrice: 340 },
  { title: '2021 Topps Chrome Kylian Mbappe RC PSA 10', sport: 'soccer', basePrice: 280 },
  { title: '2003 Panini Cristiano Ronaldo RC PSA 9', sport: 'soccer', basePrice: 1800 },
  { title: '2022 Topps Chrome Erling Haaland RC PSA 10', sport: 'soccer', basePrice: 190 },
  { title: '2018 Panini Prizm Neymar Jr Auto /25 BGS 9', sport: 'soccer', basePrice: 420 },
];

let saleIdCounter = 1000;

function randomVariance(base, pct = 0.25) {
  const delta = base * pct * (Math.random() * 2 - 1);
  return Math.max(1, Math.round((base + delta) * 100) / 100);
}

export function generateMockSale() {
  const card = MOCK_CARDS[Math.floor(Math.random() * MOCK_CARDS.length)];
  const price = randomVariance(card.basePrice);
  const prevPrice = randomVariance(card.basePrice);
  const pctChange = ((price - prevPrice) / prevPrice) * 100;

  return {
    id: `mock-${saleIdCounter++}`,
    title: card.title,
    image: null,
    price,
    currency: 'USD',
    soldAt: new Date().toISOString(),
    sport: card.sport,
    sportColor: SPORT_COLORS[card.sport],
    itemUrl: '#',
    condition: card.title.includes('PSA') || card.title.includes('BGS') || card.title.includes('SGC') ? 'Graded' : 'Raw',
    prevAvgPrice: prevPrice,
    pctChange: Math.round(pctChange * 10) / 10,
    priceDirection: pctChange >= 0 ? 'up' : 'down',
    buyingOption: 'fixed',
  };
}

export function generateMockSales(count = 40) {
  return Array.from({ length: count }, () => {
    const sale = generateMockSale();
    // Spread soldAt times over the past hour
    const msAgo = Math.random() * 3600000;
    sale.soldAt = new Date(Date.now() - msAgo).toISOString();
    return sale;
  }).sort((a, b) => new Date(b.soldAt) - new Date(a.soldAt));
}
