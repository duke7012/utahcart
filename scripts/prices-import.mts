/**
 * Real Walmart, Harmons and Costco prices typed in by the team.
 *   1. Fill price, pack_size (in the row's unit), product_name, url, checked_on in data/real-prices.csv
 *      from walmart.com, harmonsgrocery.com, costco.com (or the store apps).
 *   2. npm run prices:import
 * Filled rows replace that store's demo price for that item; blank rows keep the demo price.
 * Also geocodes store addresses that still carry a TODO note, via OpenStreetMap Nominatim.
 */
import { readFileSync } from "node:fs";
import { parseCsv, rowToQuote } from "../lib/sheet";
import type { Item, PriceQuote, Store } from "../lib/types";
import { readJson, sleep, today, writeJson } from "./env.mts";

const items = readJson<Item[]>("data/items.json");
const stores = readJson<Store[]>("data/stores.json");
const prices = readJson<PriceQuote[]>("data/prices.json");
const rows = parseCsv(readFileSync("data/real-prices.csv", "utf8"));

const quotes: PriceQuote[] = [];
const errors: string[] = [];
rows.forEach((r, i) => {
  const res = rowToQuote(r, items, ["walmart", "harmons", "costco", "smiths"], today());
  if (res.ok) quotes.push(res.quote);
  else if ("error" in res) errors.push(`  line ${i + 2} (${r.store_id} · ${r.item}): ${res.error}`);
});

const key = (q: PriceQuote) => `${q.storeId}/${q.itemId}`;
const filled = new Set(quotes.map(key));
writeJson("data/prices.json", [...prices.filter((p) => !(p.channel === "in_person" && filled.has(key(p)))), ...quotes]);

for (const s of ["walmart", "harmons", "costco"]) {
  const n = quotes.filter((q) => q.storeId === s).length;
  console.log(`${s.padEnd(8)} ${String(n).padStart(2)} of ${items.length} items have real prices`);
}
if (errors.length) console.log(`\nSkipped ${errors.length} rows with problems (fix them and run again):\n${errors.join("\n")}`);

// Geocode addresses still marked TODO (1 request per second, per Nominatim's usage policy).
for (const s of stores.filter((s) => s.address && s.coordsNote && !s.krogerLocationId)) {
  const url = `https://nominatim.openstreetmap.org/search?${new URLSearchParams({ q: s.address!, format: "json", limit: "1", countrycodes: "us" })}`;
  const r = await fetch(url, { headers: { "User-Agent": "BeeLow-hackathon/1.0 (https://github.com/duke7012/utahcart)" } });
  const hit = r.ok ? ((await r.json()) as { lat: string; lon: string; display_name: string }[])[0] : undefined;
  if (hit) {
    Object.assign(s, { lat: Number(hit.lat), lng: Number(hit.lon) });
    delete s.coordsNote;
    console.log(`\n📍 ${s.name}: ${hit.display_name}`);
  } else console.log(`\n? ${s.name}: couldn't find "${s.address}"; fix the address in data/stores.json`);
  await sleep(1100);
}
writeJson("data/stores.json", stores);
