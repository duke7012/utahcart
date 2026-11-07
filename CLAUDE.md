# UtahCart: build spec for Claude Code

Crimson Hacks 2026 (University of Utah, theme "State of Utah"). Hard deadline: **keyboards down 11:30 PM Mountain**. Commits after that do not count. Features freeze at 10:45 PM.

## Hackathon rules you must follow

- Start from zero: all code is written tonight. Do not copy in code from older projects.
- Any AI and any stack is allowed. Open-source libraries are fine, but list every one in README.md under "Credits".
- The demo must run live at the team's table. Judges score: it works, it's useful to someone in Utah, it's well built, it's clear in 3 minutes.

## What UtahCart is

UtahCart fits a Utahn's groceries into their day. The user enters a shopping list, where they are, where they're going, a time limit, and whether they have a car. The app returns the best mix of **in-person stops and online orders** for their goal (**Most savings**, **Fewest stops**, or **Most time saved**), using only the stores and channels their **memberships** allow. Then it hands off: routes open in Google Maps / Apple Maps / Transit, and online orders open in the delivery app or store site.

Pitch line: "Grocery Routes finds the cheapest store. UtahCart fits your groceries into your day: on your way, in your time limit, with or without a car, in person or delivered."

Demo scenario (use this everywhere, never "tacos"): **"Groceries for 3 roommates this week, leaving the U at 5, no car, home by 6:30, cheapest."**

## Working rules for Claude Code

1. Build in the phase order below. Each phase must end with something the team can click, then commit with a clear message.
2. The planner is pure TypeScript with unit tests. Write tests first for `lib/planner.ts`.
3. Never build what another app already does (see "Don't build" below).
4. Never put API keys in code, commits or chat. Read `ANTHROPIC_API_KEY` from `.env.local` (and Vercel env vars). Add `.env.local` to `.gitignore`.
5. Every AI feature must have a fallback that works without a key (a saved example result), so the demo never breaks.
6. Prices that are not real must be labeled `source: "demo"` and shown in the UI as "demo price". Never present invented numbers as real.
7. Keep it mobile-first: judges may open it on their phones.
8. When something is ambiguous, pick the simplest option that keeps the demo working and note it in `NOTES.md`.

## Stack

- Next.js (App Router) + TypeScript + Tailwind CSS, deployed on Vercel.
- Anthropic TypeScript SDK (`@anthropic-ai/sdk`) for AI, called only from server route handlers. Use a current vision-capable Claude model (check the Anthropic docs for the model id).
- A test runner (Vitest is fine).
- Optional Tier 2: Leaflet + react-leaflet with OpenStreetMap tiles (show OSM attribution).
- Storage: JSON seed files + an in-memory store for scanned receipts and shop posts. Memberships and settings in `localStorage` (wrap in try/catch).

## File layout

```
app/
  page.tsx                 list + trip setup + goal picker
  plan/page.tsx            three plan cards + handoff buttons
  scan/page.tsx            receipt / shelf photo upload
  wallet/page.tsx          memberships + settings (Tier 2)
  shop/page.tsx            business portal (Tier 2)
  api/plan/route.ts        POST list + trip + memberships -> plans
  api/scan/route.ts        POST image -> parsed prices (Claude vision)
  api/ask/route.ts         POST sentence -> list + goal + mode + time limit (Tier 2)
lib/
  planner.ts               enumerate, assign, score, pick per goal (tested)
  prices.ts                store x channel x membership lookup, markup estimates
  geo.ts                   distance + time estimates per mode
  handoff.ts               maps links + online order links
  types.ts
data/
  stores.json              id, name, lat, lng, membershipRequired, channels
  items.json               canonical items: id, name, unit, typicalSize
  prices.json              itemId, storeId, channel, price, size, unit, source, seenAt, link?
  channels.json            fees, minimums, markup factors, membership effects
  places.json              presets: "U of U campus", "Home"
README.md                  what it does, how to run, Credits
NOTES.md                   decisions and assumptions made while building
```

## Core types

```ts
type Channel = "in_person" | "instacart" | "amazon" | "doordash" | "ubereats";
type Goal = "savings" | "fewest_stops" | "time";
type Mode = "car" | "no_car";

type Item = { id: string; name: string; unit: "oz" | "count" | "lb" | "fl_oz"; typicalSize: number };
type ListEntry = { itemId: string; qty: number; bulkOk: boolean; brandLock?: string };

type PriceQuote = {
  itemId: string; storeId: string; channel: Channel;
  price: number; size: number; unit: Item["unit"];
  source: "demo" | "seed" | "receipt" | "shop" | "estimate";
  seenAt: string; link?: string;
};

type Memberships = {
  costco?: boolean; samsClub?: boolean; restaurantDepot?: boolean; smithsRewards?: boolean;
  instacartPlus?: boolean; uberOne?: boolean; dashPass?: boolean; prime?: boolean;
};

type Trip = { start: {lat:number;lng:number;label:string}; end: {lat:number;lng:number;label:string};
              mode: Mode; timeLimitMin?: number; costPerMile: number; minutesPerStop: number };

type Plan = {
  goal: Goal;
  stops: { storeId: string; items: {itemId:string; qty:number; quote:PriceQuote}[] }[];   // in visit order
  onlineOrders: { storeId: string; channel: Channel; items: {itemId:string; qty:number; quote:PriceQuote}[]; fee: number }[];
  money: number; minutes: number; stopCount: number; savingsVsOneStore: number;
  warnings: string[];   // bulk overbuy, estimates used, etc.
};
```

## Planner algorithm (`lib/planner.ts`)

The search is exact because it is small: 4 stores, each skipped / in person / online via one channel.

1. **Filter by access.** Drop store+channel options the user can't use. Warehouse memberships (Costco, Sam's Club, Restaurant Depot) gate in-person access. Without a Costco membership, Costco via Instacart stays available at the non-member markup.
2. **Enumerate setups.** Each store gets one of: skip, in person, or one online channel it offers. Cap in-person stops at 3.
3. **Assign items.** Each list entry goes to the cheapest allowed option in that setup by **unit price** ($/oz or $/count). Use a bulk pack only if `bulkOk` or the needed quantity uses most of the pack; otherwise add a warning.
4. **Drop invalid setups:** can't cover the whole list, under an online order minimum, or over `timeLimitMin`.
5. **Route.** Order in-person stops from `trip.start` to `trip.end`; try every order (at most 3! = 6).
6. **Score.**
   - money = item costs + online fees + driving miles x `costPerMile` (car mode only)
   - minutes = travel minutes (from `lib/geo.ts`) + `minutesPerStop` x in-person stops
   - stopCount = in-person stores visited
7. **Pick per goal.** savings: lowest money. fewest_stops: fewest stops, then money. time: lowest minutes, then money. Return all three plans.
8. `savingsVsOneStore` = cheapest single-store in-person plan's money minus this plan's money.

Tests to write first: a list one store can't fully cover; a membership that unlocks a cheaper store; a bulk item without `bulkOk` (warning); a time limit that removes a plan; the three goals choosing three different plans.

## Travel times (`lib/geo.ts`)

Do not call a routing API in Tier 1. Estimate: haversine distance x 1.3 road factor, divided by an average speed per mode (car, walking; no-car mode = walking plus a transit factor). Show as "about N min". The maps app shows the real time after handoff.

## Handoff links (`lib/handoff.ts`)

- **Google Maps:** `https://www.google.com/maps/dir/?api=1&origin=LAT,LNG&destination=LAT,LNG&waypoints=LAT,LNG%7CLAT,LNG&travelmode=driving` (`walking`, `transit` also valid). Google documents up to 3 waypoints in mobile browsers and 9 otherwise. Waypoints with `transit` are not documented.
- **Apple Maps:** `https://maps.apple.com/directions?source=LAT,LNG&destination=LAT,LNG&waypoint=LAT,LNG&waypoint=LAT,LNG&mode=driving` (`walking`, `transit`, `cycling` also valid). Repeat `waypoint` per stop.
- **Transit app:** deep-link format not confirmed. Leave a stub; the team will test on a phone.
- **No-car mode:** show "Go to next stop" that opens one leg at a time.
- **Online orders:** Instacart's Developer Platform has `POST /idp/v1/products/products_link` (returns `products_link_url`), only if the team has a key. Otherwise use each store's search page link stored in `prices.json` (`link`) or `stores.json`; the team verifies these by hand.

## Prices and markups (`lib/prices.ts`)

- Lookup by item x store x channel. Prefer the newest quote (`receipt` and `shop` beat `demo`).
- If a channel has no quote but in-store does, estimate: in-store price x the channel's markup factor from `channels.json`, `source: "estimate"`. Starting factor for Costco via Instacart: 1.24 without a Costco membership linked, 1.10 with Costco + Instacart+ linked (one 10-item sample, Oct 2026, 20somethingfinance).
- Delivery fees in `channels.json` (user-editable later): Instacart+ $0 delivery on orders as low as $10 (Costco $35+); without memberships use a flat fee the team sets.

## AI routes

- `api/scan`: accepts an image (receipt or shelf tag). Send it to Claude as an image content block with the catalog from `items.json`; ask for JSON only: `{store, date, lines:[{rawName, itemId|null, price, size, unit}]}`. Validate the JSON. Never store the image or card details; keep only item lines. Show an editable table before saving. Saved quotes get `source: "receipt"` and the plan updates.
- `api/ask` (Tier 2): sentence -> `{list:[ListEntry], goal, mode, timeLimitMin, start?, end?}` using the same catalog. Fallback: the demo sentence's saved result.

## Phases

| Phase | Target time | Done when |
| --- | --- | --- |
| 0 | 7:45 PM | Next.js + Tailwind + tests set up; seed data files; `planner.ts` passes its tests |
| 1 | 8:45 PM | List page -> trip setup -> goal -> three plan cards -> "Open in Maps" and "Order on ..." links; deployed on Vercel |
| 2 | 9:45 PM | Receipt scan works end to end and a new price changes a plan live |
| 3 | 10:30 PM | AI errand planner, membership wallet + "is it worth it?" (fee / savings per trip), bulk warnings, phone polish; Leaflet map and business portal only if time |
| Freeze | 10:45 PM | Bug fixes only; README with Credits |

## Don't build (hand off instead)

Navigation, real routing, checkout/payments/delivery, OCR, a text parser, fuzzy name matching (seed data uses canonical item ids; the AI maps receipt lines to ids), unit conversion (store seeds in $/oz or $/count), address search (browser location + presets), store lookups (hand-entered coordinates), login/account linking (membership toggles), hosting setup (Vercel).

## Inputs the team provides

- `data/stores.json`: 4 stores near campus (proposed: Smith's, Harmons, Walmart, Costco) with real coordinates and which channels each offers. Until provided, use clearly marked `TODO` coordinates and ask the team.
- `data/prices.json`: real prices for the ~20 items (a week of staples for 3 roommates: eggs, milk, bread, rice, chicken, produce, paper towels, and so on) from store websites or apps. Until provided, use `source: "demo"` prices.
- `.env.local` with `ANTHROPIC_API_KEY` (the team pastes it; never ask for it in chat).
- A real grocery receipt photo for testing `api/scan`.

## Facts already verified (for UI copy and the pitch)

- Costco: membership required in warehouse; non-members can order through Instacart at higher prices (Costco FAQ quoted by The Takeout, Apr 2025).
- Sam's Club: $60 Club, $120 Club Plus since May 1, 2026 (Doctor of Credit).
- Restaurant Depot: free membership for businesses with a resale permit or tax-exempt certificate (restaurantdepot.com).
- Instacart+: $9.99/month or $99/year; Uber One and DashPass: $9.99/month or $96/year (ShopBack, Sep 2026).
- Grocery Routes (competitor): in-store whole-list comparison, 1 to 3 stores, cheapest goal, iOS, launched Mar 2026.
