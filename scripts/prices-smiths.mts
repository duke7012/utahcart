/**
 * Real Smith's prices from the Kroger Developer API.
 *   npm run prices:smiths
 * Needs KROGER_CLIENT_ID and KROGER_CLIENT_SECRET in .env.local (free at developer.kroger.com).
 * Finds the Smith's nearest the U of U campus, then replaces the demo Smith's prices in data/prices.json
 * with the cheapest matching product per catalog item. Items with no match keep their demo price.
 */
import { pickQuote, searchProducts, storesNear } from "../lib/kroger";
import type { Item, PriceQuote, Store } from "../lib/types";
import { loadEnv, readJson, sleep, today, writeJson } from "./env.mts";

loadEnv();
const items = readJson<Item[]>("data/items.json");
const stores = readJson<Store[]>("data/stores.json");
const prices = readJson<PriceQuote[]>("data/prices.json");
const campus = readJson<{ id: string; lat: number; lng: number }[]>("data/places.json").find((p) => p.id === "campus")!;

const nearby = await storesNear(campus.lat, campus.lng);
console.log("Kroger-family stores near campus:");
for (const s of nearby) console.log(`  ${s.locationId}  ${s.chain.padEnd(10)} ${s.name} · ${s.address.addressLine1}`);
const shop = nearby.find((s) => /smith/i.test(s.chain) || /smith/i.test(s.name));
if (!shop) throw new Error("No Smith's found within 10 miles of campus; check the list above.");

const smiths = stores.find((s) => s.id === "smiths")!;
Object.assign(smiths, {
  name: `Smith's ${shop.name.replace(/^smith'?s\s*/i, "") || "Marketplace"}`.trim(),
  address: `${shop.address.addressLine1}, ${shop.address.city}, ${shop.address.state} ${shop.address.zipCode}`,
  lat: shop.geolocation.latitude,
  lng: shop.geolocation.longitude,
  krogerLocationId: shop.locationId,
});
delete smiths.coordsNote;
console.log(`\nUsing ${smiths.name} (${shop.locationId}), ${smiths.address}\n`);

const seenAt = today();
const found: PriceQuote[] = [];
const missing: string[] = [];
for (const item of items) {
  const q = pickQuote(item, await searchProducts(item.search ?? item.name, shop.locationId), "smiths", seenAt);
  if (q) {
    found.push(q);
    console.log(`  ✓ ${item.name.padEnd(24)} $${q.price.toFixed(2)} for ${q.size} ${q.unit} · ${q.product}`);
  } else {
    missing.push(item.name);
    console.log(`  – ${item.name.padEnd(24)} no matching product; keeping demo price`);
  }
  await sleep(150);
}

const replaced = new Set(found.map((q) => q.itemId));
const next = [...prices.filter((p) => !(p.storeId === "smiths" && p.channel === "in_person" && replaced.has(p.itemId))), ...found];
writeJson("data/prices.json", next);
writeJson("data/stores.json", stores);
console.log(`\n${found.length} of ${items.length} items now have real Smith's prices (checked ${seenAt}).`);
if (missing.length) console.log(`Still demo: ${missing.join(", ")}`);
