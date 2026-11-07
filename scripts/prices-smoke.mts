/** Read-only authenticated smoke test. Does not replace or write catalog prices. */
import { catalog } from "../lib/catalog";
import { DEFAULT_SEARCH_LOCATION, searchQuery } from "../lib/offers";
import { discoverPrices } from "../lib/shopping-server";
import { concurrencyLimit } from "../lib/price-cache";
import type { ListEntry } from "../lib/types";
import { loadEnv } from "./env.mts";

loadEnv();
const examples: ListEntry[] = [
  { itemId: "pasta", productQuery: "spaghetti", brandLock: "Barilla", qty: 1, bulkOk: false },
  { itemId: "peanut_butter", productQuery: "creamy peanut butter", brandLock: "Jif", qty: 1, bulkOk: false },
  { itemId: "butter", productQuery: "salted butter", brandLock: "Land O Lakes", qty: 1, bulkOk: false },
  { itemId: "yogurt", productQuery: "plain Greek yogurt", brandLock: "Chobani", qty: 1, bulkOk: false },
  { itemId: "oats", productQuery: "old fashioned oats", brandLock: "Quaker", qty: 1, bulkOk: false },
];
for (const entry of examples) console.log(searchQuery(catalog.items.find((i) => i.id === entry.itemId)!, entry));
if (!process.env.SERPAPI_API_KEY) {
  console.log("\nAuthenticated check pending: set SERPAPI_API_KEY and GEMINI_API_KEY in .env.local, then rerun npm run prices:smoke. No live requests were made.");
} else {
  if (!process.env.GEMINI_API_KEY) console.log("\nGEMINI_API_KEY is missing: offers will be retrieved but matching remains unconfirmed.");
  const slot = concurrencyLimit(3);
  let failed = false;
  await Promise.all(examples.map((entry) => slot(async () => {
    const result = await discoverPrices(catalog, entry, DEFAULT_SEARCH_LOCATION);
    console.log(JSON.stringify({ item: entry.itemId, status: result.status, matching: result.matching, message: result.message,
      offers: result.offers.map((o) => ({ title: o.title, merchant: o.merchant, priceCents: o.priceCents, match: o.match,
        reason: o.matchReason, quantity: o.packageQuantity, unit: o.packageUnit, packCount: o.packCount, channel: o.channel,
        branchVerified: o.locationVerified, source: o.sourceType, url: o.sourceUrl })) }, null, 2));
    if (result.status === "error" || result.status === "setup") failed = true;
  })));
  if (failed) process.exitCode = 1;
}
