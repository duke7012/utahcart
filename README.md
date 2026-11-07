# BeeLow

Fit your groceries into your day. BeeLow plans the best mix of in-person stops and online orders for your list, your route, your time limit, and the memberships you actually have. Built at Crimson Hacks 2026.

## Run

```bash
npm install
npm run dev     # http://localhost:3000
npm test        # planner unit tests
```

Copy `.env.example` to `.env.local` and add `SERPAPI_API_KEY` for Google Shopping discovery and `GEMINI_API_KEY` for product matching, receipt scanning and sentence planning. Configure the same server environment variables on Vercel. Keys never go in browser code. All AI features use Gemini through a shared server REST client; no Anthropic key is required. The default model is `gemini-3.5-flash-lite`; optionally set `GEMINI_MODEL` to another compatible model ID.

Gemini offers a [free tier](https://ai.google.dev/gemini-api/docs/pricing?hl=en) for this model, subject to your project's quotas and billing configuration. Free-tier content may be used to improve Google's products. Gemini quota errors do not trigger an automatic paid-provider fallback. Receipt photos are forwarded for processing and are never saved by BeeLow.

On **List**, choose a catalog item, tap it to enter product/variety details or a brand lock, then use **Find prices** or **Find / refresh list prices**. Requested amounts stay in multiples of the catalog package size. Search location is editable and defaults to Salt Lake City. Matching checks brand, variety, dietary attributes, size and multipacks. AI only classifies retrieved candidates; prices and source URLs remain those of the original observations.

**Real observations only** is the default. Unconfirmed product matches, unknown shopping channels, unsupported fulfillment, coupon/multibuy conditions and unknown required delivery fees remain browsable. Missing prices prevent a complete basket total. Published in-store prices without branch evidence can support a proposed stop, but its total and savings are labeled estimated. Taxes and tips are unknown and excluded; driving costs are shown separately.

**Example mode** is explicit: the homepage example and offline AI cart fallback select it, and plans show a demo banner. Only this mode uses demo prices, assumed delivery fees and calculated delivery markups. Example receipt prices remain demo data after saving. Without an AI key, new price offers stay unconfirmed; without a SerpApi key, the list shows setup instructions and saved observations. Scanning and sentence setup retain their labeled example fallbacks.

### Discovery reliability and coverage

- [SerpApi Google Shopping](https://serpapi.com/google-shopping-api) retrieves Google's published listings, including categorized results. One request per unique query; no automatic retailer-by-retailer searches. Walmart, Smith's, Harmons and Costco appear first when found; other merchants remain visible.
- Retrieval time means when the application obtained a search response, **not when a retailer updated its price**. Legacy snapshots retain their recorded date; their exact retrieval time is unknown. Listing prices may differ from checkout and do not establish inventory, a local branch, or an in-store/pickup channel. Costco via Instacart is not a warehouse price.
- Only supported, evidenced in-store offers currently enter real trip plans. Existing online channel fees are demo assumptions, so delivery/pickup/shipping listings remain browsable rather than becoming real delivery recommendations. Unit prices require usable package quantities and compatible units; fluid and weight ounces are separate.
- Searches cache for `PRICE_CACHE_TTL_MINUTES` (default 30), with at most three concurrent provider requests per server instance and three browser requests. `PRICE_SEARCH_TIMEOUT_MS` and `PRICE_MATCH_TIMEOUT_MS` default to 20,000 ms. Rate limits, invalid credentials, malformed responses and timeouts produce per-item retry states. A failed refresh retains earlier results and their original timestamps.
- The bounded application cache lives in server memory and resets between cold starts. Browser storage retains signed offer snapshots across visits and serverless instances; the planner verifies their signatures and current request preferences/location. Rotating/removing the SerpApi key invalidates those snapshots for planning; refresh after replacing it. No database is required.
- Imported retailer prices are observations, not proof of correct product matching. They pass through the same matcher before entering real plans. The old cheapest-per-unit Kroger importer can select unrelated products; those observations remain traceable but are not automatically trusted.

### Verification

```bash
npm test
npm run lint
npx tsc --noEmit --incremental false
npm run build
npm run prices:smoke
```

The read-only smoke script prepares Barilla spaghetti 16 oz, Jif creamy peanut butter 16 oz, Land O Lakes salted butter 16 oz, Chobani plain Greek yogurt 32 oz, and Quaker old-fashioned oats 42 oz. With keys configured, it makes live requests and prints prices, packages, classifications, sources and channels for manual inspection; no catalog files are written.

On Nov 6, 2026, all five authenticated searches succeeded, retrieving 162 Google Shopping offers and classifying them through Gemini. Four queries returned confirmed exact/substitute matches; the Jif request had no confirmed matching package in that run. Many offers had unknown channels or unverified branches and correctly remained browse-only. Live Gemini structured-output, sentence-planning and synthetic receipt-scanning checks also passed. The synthetic receipt returned the expected milk and spaghetti lines with their prices and package sizes; a real personal receipt has not been tested. Coverage varies between searches; these checks do not verify local inventory or checkout prices.

The production app was checked in headless Chrome at a 390px mobile viewport: product preferences, missing-key setup, empty matching results, incomplete-basket diagnostics, confirmed receipt planning, source/cost labels and explicit demo mode. No horizontal overflow or browser exceptions were found. Automated tests also exercise mocked provider/model responses, snapshot tampering, package/attribute mismatches, caching and partial failures.

### Real prices

```bash
npm run prices:smiths   # Smith's prices from the Kroger API (needs KROGER_CLIENT_ID / KROGER_CLIENT_SECRET in .env.local)
npm run prices:import   # Walmart, Harmons, Costco prices typed into data/real-prices.csv
```


## Credits

- [Next.js](https://nextjs.org), [React](https://react.dev), [TypeScript](https://www.typescriptlang.org)
- [Tailwind CSS](https://tailwindcss.com)
- [Gemini API](https://ai.google.dev/gemini-api/docs) for structured product matching, receipt image understanding and sentence planning, called server-side through the REST API
- Product illustrations generated with [ElevenLabs](https://elevenlabs.io) image generation (gpt-image-2)
- [Kroger Developer API](https://developer.kroger.com) for Smith's prices and store location
- [SerpApi](https://serpapi.com/google-shopping-api) for Google Shopping published offer discovery; merchant and original listing links are shown beside each offer
- [OpenStreetMap](https://www.openstreetmap.org/copyright) data via [Nominatim](https://nominatim.org) for store locations (© OpenStreetMap contributors, ODbL)
- [tsx](https://tsx.is) to run the price scripts
- [Vitest](https://vitest.dev)
- [ESLint](https://eslint.org) with `eslint-config-next`
- [Inter](https://rsms.me/inter/) (SIL Open Font License) via `next/font/google`
- [Lucide](https://lucide.dev) icons (`lucide-react`, ISC license)
- UI design and photos from the team's Figma file
