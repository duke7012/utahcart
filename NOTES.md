# Notes

Decisions and assumptions made while building. Newest at the bottom.

## Phase 0

- **List quantity:** `ListEntry.qty` counts the item's `typicalSize` (qty 2 of milk = 2 x 128 fl oz).
- **Bulk rule:** a pack is "bulk overbuy" when the list uses less than 75% of what gets bought. Without `bulkOk`, the planner skips overbuy packs when another option in the same setup has the item; if only overbuy packs exist, it uses the cheapest and adds a warning.
- **Assignment:** each item goes to the lowest unit price ($/oz, $/count) in the setup; ties go to the lower total cost.
- **Redundant setups:** a setup where a chosen store ends up with no items is dropped (it's the same plan plus a stop or a fee).
- **Online orders take no trip time.** `minutes` = direct travel through the in-person stops + `minutesPerStop` per stop. A plan with only online orders still counts the start-to-end trip.
- **`savingsVsOneStore`** is 0 when no single store can cover the list (no baseline to compare with).
- **Plan type additions:** `miles` on the plan, and `packs` + `cost` on each line item, so the UI can show what gets bought.
- **Fewest stops and Most time saved often pick the same plan** when an online-only order is possible (0 stops, shortest trip). That's correct behavior; the UI should say "same as ..." instead of showing a duplicate card.
- **Travel speeds** (in `lib/geo.ts`): car 25 mph, no car 9 mph (3 mph walking x transit factor 3), road factor 1.3. Tune if demo times look off.
- **Channel memberships:** "markupWithMembership" (Costco via Instacart at 1.10) applies only when the user has both the store membership and the channel membership. Online ordering is never gated by a membership; memberships only change fees and markups.
- **Instacart fee without Instacart+:** placeholder $7.99, and the non-Costco markup is a placeholder 1.15. Team to set real numbers in `data/channels.json`.
- **Store channels:** only `in_person` and `instacart` are listed. Walmart has `in_person` only. Team to verify which delivery apps each store really uses.
- **Store coordinates are approximate** (`coordsNote: "TODO ..."` in `data/stores.json`). Team to verify.
- **All prices are `source: "demo"`**: Smith's = base, Walmart = 0.9x, Harmons = 1.18x, Costco = bulk pack at 0.78x unit price. Replace with real prices.
- **Tailwind pinned to 4.1.** Tailwind 4.3 needs Node 22.12+ (it `require()`s an ESM-only package); the dev machine runs Node 22.11.

## Phase 1

- **State lives in `localStorage`** (`utahcart:v1`: list, trip form, goal) via `lib/session.ts`; the plan page reads it and POSTs to `/api/plan`, so Phase 2 receipt prices (server memory) can change plans.
- **Demo list for 3 roommates** is preloaded; "Reset demo" restores it. Rice, paper towels and toilet paper are `bulkOk`.
- **Trip time limit** = minutes from "Leaving at" to "Home by" (wraps past midnight). Car cost $0.30/mile and 15 min per stop are constants in `toTrip` until a settings page exists.
- **No-car handoff** is one Google Maps transit link per leg ("Go to Walmart", "Then to Home"). Car mode opens the whole route in Google or Apple Maps.
- **Order links** use `orderLinks.instacart` in `data/stores.json` (`instacart.com/store/<slug>`); slugs unverified, team to check on a phone.
- **Goal tabs + swipe:** the chosen goal's plan fills the screen; the other two are one swipe away. When two goals pick the same plan, the later card says "Same plan as ...".
- **Strata column** layer heights come from `lib/geo.ts` per leg plus minutes per stop, so they can differ from the rounded total by a minute.
- **Visual direction "Red Rock Strata"** chosen on the Impeccable decision page; contract in `.impeccable/surfaces/app-page-tsx.md`.

## Phase 2

- **Scanned prices live in the browser** (`localStorage` `utahcart:receipts`), not in server memory, and are sent with every `/api/plan` request. On Vercel, separate function instances don't share memory, so a server-side in-memory store could lose a just-saved price between the scan and the plan call. `/api/plan` re-validates them (`cleanQuotes`: known store and item, positive numbers, forced to `source: "receipt"`).
- **A newer scan replaces older receipt prices** for the same store + item. Receipt prices beat demo prices (`lib/prices.ts` rank), and Instacart estimates for that store are built from the receipt price too.
- **`/api/scan`** sends the photo to `claude-opus-5-5` (effort `low`, JSON-schema structured output, `fallbacks: "default"` for safety-classifier refusals) and never stores it. The model's JSON is validated (`parseScan`); unknown item ids become "Not on the list". The browser shrinks photos to 1600px JPEG first; the server rejects non-images and files over 5 MB.
- **No API key → the saved example receipt** (`data/example-receipt.json`, a Smith's receipt). "Use the example receipt" on `/scan` always uses it, so the demo works offline. With it saved, the demo's Most savings plan goes from Walmart alone ($125.99) to Smith's + Walmart ($106.49).
- **Store on the receipt** is guessed from the first word of each store name; the user confirms it in a dropdown before saving.
- **Not verified yet:** a real Claude vision call (no `ANTHROPIC_API_KEY` on the dev machine) and a real receipt photo.

## Shop redesign (after Phase 2)

- **Shop flow like Instacart:** `/` is now a shop (search, aisle chips, product grid with Add / stepper, floating cart bar); `/cart` holds the cart, trip and goal, and "Find my best plan" opens `/plan`. Same Red Rock look.
- **Catalog grew to 48 items in 7 aisles** (`data/items.json` has `aisle`). New items get demo prices with the same store factors. The demo cart and its plans are unchanged.
- **Search is a plain substring match** on item names (no fuzzy matching, per the spec).
- **"from $X" on a tile** = cheapest in-store price for one typical pack at a store anyone can walk into (Costco excluded without a membership); the cart bar's "about $X" adds those up. The real total comes from the planner.
- **Product pictures are generated illustrations** (ElevenLabs, model gpt-image-2): three 4x4 sheets cut into 48 JPEG tiles in `public/products/`, each with its prompt embedded. Labeled "Pictures are illustrations" on the shop page. A missing picture falls back to a tan panel with the item name.

## Phase 3

- **Membership wallet** (`/wallet`, saved in `localStorage` `utahcart:memberships`) is sent with every plan request; `/api/plan` keeps only known membership keys set to `true`.
- **"Is it worth it?"** (`lib/worth.ts`, tested) = the plan for the user's chosen goal without the membership minus with it, for the current cart. Shown for Costco and Instacart+ only (the other memberships have no store or delivery option in the demo data and say so). "Worth it if you shop weekly" when one trip saves more than the fee / 52; otherwise "pays off after N trips like this a year".
- **Membership fees** in `data/memberships.json`: Sam's Club, Instacart+, DashPass, Uber One and Restaurant Depot come from the spec's verified facts. **Costco ($65) and Amazon Prime ($139) are not verified** and show "(unverified)" in the wallet. Team to confirm.
- On the demo cart, Costco saves nothing (no car, 90 minutes, small quantities); Instacart+ saves the $7.99 delivery fee on the Fewest stops plan.
- **Sentence planner** (`/api/ask`, `lib/ask.ts` tested): one sentence → cart, goal, car/no car, leave/home-by times, from/to presets, via `claude-opus-5-5` structured output with `fallbacks: "default"`. The demo sentence always returns the saved demo cart without calling the API, and with no key (or an API error) every sentence returns the demo cart. The model may only pick catalog item ids; quantities are 1-20; bad goals/modes/times fall back to defaults.
- "Plan it" on the shop fills the cart and trip and goes straight to `/plan`; "Edit cart" there shows what it picked.
- **Not verified yet:** a real Claude call for `/api/ask` (no API key on the dev machine).

## Figma redesign

- **UI rebuilt from the team's Figma file** (`KhLGKIfX5VptkGQABSubdk`): warm canvas `#f6f5ef`, forest green `#245c42`, mint `#e7efe5`, Inter, 18px cards, 12px buttons, a bottom tab bar (List / Plans / Scan / Wallet). Replaces the Red Rock Strata look, including the strata column.
- **Routes now follow the Figma screens:** `/` first-visit homepage, `/list` list and trip setup (was `/cart`, which redirects), `/add` add items with browse and search (was the shop grid at `/`), `/plan` three plans, `/plan/details?goal=` plan details with leg-by-leg directions and per-store checklists, `/scan` upload → review → saved, `/wallet`.
- **Not built from the Figma:** Log in, Create account, Trip history and Saved trip detail. The spec says no login or account linking; history could come back later stored on the device.
- **Figma copy changed where it would claim something untrue:** no "brand locked" (not modeled), no tip line (the planner has no tips), Instacart instead of "Walmart online" (Walmart has no delivery option in the data), and real plan numbers instead of the Figma's sample figures.
- **Time limit:** the Figma asks for "Leave at" + "Time limit"; the app stores home-by = leave + limit.
- **Photos** (kitchen, basket, pantry, receipt, and 7 product photos) are exported from the Figma file; the other 41 products keep the generated illustrations, so product pictures are mixed until the team adds photos.
- **Icons** are `lucide-react`, the same icon set the Figma uses.

## BeeLow rebrand

- **Name is now BeeLow** (was UtahCart) in every screen, the page title, the AI prompts, README and PRODUCT.md. Code identifiers, the repo name and `localStorage` keys (`utahcart:*`) stay, so saved carts keep working. `CLAUDE.md` (the build spec) still says UtahCart.
- **Logo** `public/beelow-logo.png` (600px PNG with transparency, from the team's `beelow_logo.png`) replaces the basket mark and wordmark in the header.
- **Palette sampled from the logo:** bee brown `#5c2d0c` (primary, selection, focus), honey `#fbb424` (highlights only, never text on light), honey tint `#fff1cc` (selected fills), carrot `#b5410f` (costs, errors), leaf `#4f7a14` (savings), cream canvas `#fffaf0`, brown-black ink `#33200f`, muted `#75604d` (5.3:1 on honey tint).

## Empty start and real prices

- **New visitors start empty:** no items, no start/end, no times, no car/no-car, no goal (`EMPTY` in `lib/session.ts`). "Find my grocery plans" stays disabled and lists what's missing (`missingSteps`); plan screens show "Finish setting up your trip". "Try an example list" on the homepage still loads the 3-roommates demo. The saved-cart key changed to `beelow:v2`, so browsers that had the old pre-filled demo start fresh too.
- **No time limit** is allowed now; picking a limit without a leave time starts the clock now (rounded up to 5 minutes).
- **Smith's prices come from the Kroger Developer API** (Smith's is a Kroger banner): `npm run prices:smiths` with `KROGER_CLIENT_ID` / `KROGER_CLIENT_SECRET` in `.env.local` (free at developer.kroger.com). It picks the Smith's nearest campus (writing its exact address and location into `data/stores.json`), searches each item's `search` term from `data/items.json`, and keeps the lowest price per unit among results of a similar pack size (`lib/kroger.ts`, tested). Run it before the demo and commit the snapshot; the app never calls Kroger live.
- **Walmart, Harmons and Costco have no public price APIs** and their sites forbid scraping, so the team fills `data/real-prices.csv` (one row per store × item, demo-cart items first) from each store's site or app, then runs `npm run prices:import`. Bad rows are skipped with a reason; blank rows keep the demo price.
- **Store locations:** Harmons Emigration Market and Walmart Supercenter (350 Hope Ave) are placed from OpenStreetMap exact matches. Smith's is set by the Kroger script. **Costco's address needs confirming** (OpenStreetMap only matched the street); fix `address` in `data/stores.json` and run `npm run prices:import`.
- **Labels:** each item in plan details says where its price came from ("Smith's price via Kroger, Nov 6", "store price, checked Nov 6", "receipt price", "estimate", "demo price") and links to the product when known; footnotes summarize the sources actually in the data.
- **Round trip by default:** the trip asks for one place ("Start & end"); `to: null` means back to the start (`toTrip` uses the start as the end). "Different end location" opens an End picker, and "End where I start instead" clears it. The setup checklist no longer asks for an end.
