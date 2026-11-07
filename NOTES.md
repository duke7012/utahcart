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
