# CardBeat — Brand & Design System

## Color palette

| Name             | Hex       | Usage                                      |
|------------------|-----------|--------------------------------------------|
| Midnight         | `#1A1245` | Dark backgrounds, depth layers             |
| CardBeat Indigo  | `#4A3AE8` | Primary brand color, buttons, headers      |
| Highlight Violet | `#7B6FFF` | Hover states, focus rings, dark mode text  |
| Gold Rush        | `#FFD166` | Live indicator, trending badges, CTAs      |
| Card White       | `#F7F7FB` | Surfaces, card backgrounds                 |

### CSS custom properties (add to index.css)

```css
:root {
  --cb-midnight:  #1A1245;
  --cb-indigo:    #4A3AE8;
  --cb-violet:    #7B6FFF;
  --cb-gold:      #FFD166;
  --cb-surface:   #F7F7FB;

  /* Sport accent colors */
  --cb-baseball:   #e63946;
  --cb-basketball: #f4a261;
  --cb-football:   #2a9d8f;
  --cb-hockey:     #4895ef;
  --cb-soccer:     #22c55e;
}
```

## Typography

| Role          | Size  | Weight | Notes                              |
|---------------|-------|--------|------------------------------------|
| Display/Logo  | 32px  | 800    | Letter-spacing: -0.5px — wordmark  |
| H1            | 22px  | 500    | Page titles                        |
| H2 / Card title | 16px | 500   | Listing titles                     |
| Body          | 14px  | 400    | Line-height: 1.6                   |
| Label/Overline | 11px | 500   | Uppercase, letter-spacing: 0.08em  |

Font stack: `system-ui, -apple-system, 'Segoe UI', sans-serif`

## Logo

**Primary lockup:** Card icon (indigo rectangle, gold EKG pulse line, gold live dot) + wordmark "Card**Beat**" where "Card" is `#1A1245` and "Beat" is `#4A3AE8`.

**On dark backgrounds:** "Card" becomes `#ffffff`, "Beat" becomes `#7B6FFF`.

**Icon/favicon only:** CB monogram on `#1A1245` rounded square. C in white, B in `#FFD166`.

**Tagline:** `LIVE SPORTS CARD MARKET` — 11px, 500 weight, letter-spacing 0.08em, muted color.

## Component patterns

### Buttons
```css
/* Primary */
background: var(--cb-indigo);
color: #fff;
border-radius: 8px;
padding: 10px 20px;
font-size: 14px;
font-weight: 500;

/* Secondary */
background: transparent;
color: var(--cb-indigo);
border: 1.5px solid var(--cb-indigo);

/* Ghost */
background: transparent;
border: 0.5px solid rgba(0,0,0,0.2);
```

### Badges & pills
```css
/* Live indicator */
background: var(--cb-indigo);
color: #fff;
border-radius: 20px;
font-size: 12px;
font-weight: 500;
padding: 4px 10px;

/* Live dot (gold pulse) */
width: 6px; height: 6px;
background: var(--cb-gold);
border-radius: 50%;

/* Trending */
background: #FFF0D6;
color: #C47A00;

/* Sport tag */
background: #EEF0FD;
color: #3528C2;
```

### Card component
- Background: `var(--cb-surface)` or `#fff`
- Border: `0.5px solid rgba(0,0,0,0.1)`
- Border-radius: `12px`
- Card header stripe: `var(--cb-indigo)` background, white text
- Price: `var(--cb-indigo)`, 22px, weight 500
- Hot badge: gold background `#FFD166`, midnight text `#1A1245`

## Design principles

1. **Indigo owns the structure** — nav, headers, primary actions, and borders use indigo. It's the brand's backbone.
2. **Gold signals live activity** — use `--cb-gold` only for real-time signals: the live dot, trending badges, top-ranked items, and primary CTAs. Scarcity = impact.
3. **Sport colors are categorical, not decorative** — each sport has one color used consistently for its tag, filter tab, and card header stripe. Don't use sport colors outside sport context.
4. **Midnight for depth** — use `#1A1245` for dark mode backgrounds, footer, and anywhere you want premium weight. It's not pure black; it has brand DNA.
5. **Thin borders everywhere** — `0.5px` strokes feel more refined than `1px`. Use `1.5px` only for the secondary button border.

## Dark mode

Swap surface colors; keep brand colors mostly the same:

```css
@media (prefers-color-scheme: dark) {
  --cb-surface: #12103A;      /* deep midnight surface */
  /* Indigo, gold, violet stay the same */
  /* "Beat" wordmark: switch to var(--cb-violet) for legibility */
}
```

## Voice / naming conventions

- App name: **CardBeat** (one word, capital C and B)
- Never: "Card Beat", "cardbeat", "CARDBEAT"
- Tagline: "Live sports card market" (sentence case in UI, all-caps in logo lockup only)
