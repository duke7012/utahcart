import type { Item, PriceQuote } from "./types";

/**
 * Kroger Developer API (Smith's is a Kroger banner). Server/script use only: needs KROGER_CLIENT_ID and
 * KROGER_CLIENT_SECRET. Products return a price only when filter.locationId is given; 10,000 calls a day.
 */
const API = "https://api.kroger.com/v1";

export type KrogerProduct = {
  productId: string;
  description: string;
  brand?: string;
  productPageURI?: string;
  items?: { size?: string; price?: { regular?: number; promo?: number } }[];
};
export type KrogerStore = { locationId: string; chain: string; name: string; address: { addressLine1: string; city: string; state: string; zipCode: string }; geolocation: { latitude: number; longitude: number } };

type Base = { qty: number; unit: "oz" | "fl_oz" | "count" };

// ponytail: small unit table, enough for grocery pack sizes; extend if a staple's size doesn't parse.
const UNITS: [RegExp, Base["unit"], number][] = [
  [/^fl\.?\s*oz$/, "fl_oz", 1],
  [/^gal(lon)?s?$/, "fl_oz", 128],
  [/^qts?$|^quarts?$/, "fl_oz", 32],
  [/^pts?$|^pints?$/, "fl_oz", 16],
  [/^ml$/, "fl_oz", 1 / 29.5735],
  [/^l$|^liters?$/, "fl_oz", 33.814],
  [/^oz$/, "oz", 1],
  [/^lbs?$/, "oz", 16],
  [/^dozen$|^doz$/, "count", 12],
  [/^(ct|count|each|ea|rolls?|pk|pack|bags?|cans?|bunch|heads?)$/, "count", 1],
];

/** "1 gal" -> 128 fl_oz, "2 lb" -> 32 oz, "1 dozen" -> 12 count; null when unreadable. */
export function parseSize(text: string): Base | null {
  const clean = text.toLowerCase().replace(/\b(double|triple|mega|super|jumbo|family|giant|huge|regular|big)\b\s*/g, "");
  const m = clean.match(/(\d+\/\d+|\d+(?:\.\d+)?)\s*(fl\.?\s*oz|[a-z]+)/);
  if (!m) return null;
  const [n, d] = m[1].split("/").map(Number);
  const amount = d ? n / d : n;
  const hit = UNITS.find(([re]) => re.test(m[2].replace(/\s+/g, " ")));
  return hit ? { qty: Math.round(amount * hit[2] * 100) / 100, unit: hit[1] } : null;
}

/** Size in the catalog item's unit, or undefined when the kinds don't match (volume vs weight vs count). */
export function toItemSize(b: Base, unit: Item["unit"]): number | undefined {
  if (unit === "lb") return b.unit === "oz" ? b.qty / 16 : undefined;
  return b.unit === unit ? b.qty : undefined;
}

/** Cheapest price per unit among results that fit the item (same kind of unit, pack between 1/4 and 4x the usual size). */
export function pickQuote(item: Item, products: KrogerProduct[], storeId: string, seenAt: string): PriceQuote | undefined {
  const options = products.flatMap((p) =>
    (p.items ?? []).flatMap((it) => {
      const price = it.price?.promo && it.price.promo > 0 ? it.price.promo : it.price?.regular;
      const base = it.size ? parseSize(it.size) : null;
      // A one-each item (a frozen pizza, a head of lettuce) is one pack however the store measures it.
      const size = item.unit === "count" && item.typicalSize === 1 ? 1 : base ? toItemSize(base, item.unit) : undefined;
      if (!price || price <= 0 || !size || size < item.typicalSize / 4 || size > item.typicalSize * 4) return [];
      return [{ p, price, size }];
    }),
  );
  if (!options.length) return undefined;
  const best = options.reduce((a, b) => (b.price / b.size < a.price / a.size ? b : a));
  return {
    itemId: item.id, storeId, channel: "in_person", price: best.price, size: best.size, unit: item.unit,
    source: "seed", seenAt, product: best.p.description,
    link: best.p.productPageURI ? `https://www.smithsfoodanddrug.com${best.p.productPageURI.split("?")[0]}` : undefined,
  };
}

let cached: { token: string; until: number } | null = null;

export async function token(): Promise<string> {
  if (cached && Date.now() < cached.until) return cached.token;
  const { KROGER_CLIENT_ID: id, KROGER_CLIENT_SECRET: secret } = process.env;
  if (!id || !secret) throw new Error("Set KROGER_CLIENT_ID and KROGER_CLIENT_SECRET (developer.kroger.com) in .env.local.");
  const r = await fetch(`${API}/connect/oauth2/token`, {
    method: "POST",
    headers: { Authorization: `Basic ${Buffer.from(`${id}:${secret}`).toString("base64")}`, "Content-Type": "application/x-www-form-urlencoded" },
    body: "grant_type=client_credentials&scope=product.compact",
  });
  if (!r.ok) throw new Error(`Kroger token request failed: ${r.status} ${await r.text()}`);
  const j = (await r.json()) as { access_token: string; expires_in: number };
  cached = { token: j.access_token, until: Date.now() + (j.expires_in - 60) * 1000 };
  return j.access_token;
}

async function get<T>(path: string, params: Record<string, string>): Promise<T> {
  const r = await fetch(`${API}${path}?${new URLSearchParams(params)}`, { headers: { Accept: "application/json", Authorization: `Bearer ${await token()}` } });
  if (!r.ok) throw new Error(`Kroger ${path} failed: ${r.status} ${await r.text()}`);
  return ((await r.json()) as { data: T }).data;
}

/** Kroger-family stores near a point (Smith's in Utah), nearest first. */
export const storesNear = (lat: number, lng: number, chain?: string) =>
  get<KrogerStore[]>("/locations", { "filter.latLong.near": `${lat},${lng}`, "filter.limit": "10", "filter.radiusInMiles": "10", ...(chain ? { "filter.chain": chain } : {}) });

export const searchProducts = (term: string, locationId: string) =>
  get<KrogerProduct[]>("/products", { "filter.term": term, "filter.locationId": locationId, "filter.limit": "50" });
