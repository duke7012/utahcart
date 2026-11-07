import type { CatalogData, Item, ListEntry, Memberships, Offer, PriceQuote } from "./types";

export const DEFAULT_SEARCH_LOCATION = "Salt Lake City,Utah,United States";
export const normalize = (s: string) => s.normalize("NFKC").toLowerCase().replace(/[’®™]/g, "").replace(/\s+/g, " ").trim();
export const normalizeBrand = (s: string) => normalize(s).replace(/[^a-z0-9]/g, "");
export const requestKey = (entry: ListEntry, location: string) => JSON.stringify([
  entry.itemId, normalize(entry.productQuery ?? ""), normalize(entry.brandLock ?? ""), entry.bulkOk === true, normalize(location),
]);
export const searchQuery = (item: Item, entry: ListEntry) =>
  `${entry.brandLock?.trim() ?? ""} ${entry.productQuery?.trim() || item.search || item.name} ${item.typicalSize} ${item.unit === "fl_oz" ? "fl oz" : item.unit}`.trim();
export const validEntry = (e: unknown, data: CatalogData): e is ListEntry => {
  const x = e as Partial<ListEntry> | null;
  return !!x && data.items.some((i) => i.id === x.itemId) && typeof x.qty === "number" && Number.isInteger(x.qty) && x.qty > 0 && x.qty <= 100 &&
    typeof x.bulkOk === "boolean" && [x.brandLock, x.productQuery].every((v) => v === undefined || (typeof v === "string" && v.length <= 200));
};
export const safeUrl = (value: unknown): string | null => {
  if (typeof value !== "string" || value.length > 4000) return null;
  try { const u = new URL(value); return ["https:", "http:"].includes(u.protocol) && !u.username && !u.password ? u.href : null; } catch { return null; }
};

type Package = { quantity: number; unit: Item["unit"]; packCount: number };
/** Grocery units only. Never convert weight ounces into fluid ounces. Ambiguous multipacks stay unknown. */
export function parsePackage(text: string): Package | null {
  const s = normalize(text).replace(/fluid\s+ounces?/g, "fl oz").replace(/\bounces?\b/g, "oz");
  const match = s.match(/(\d+\s*\/\s*\d+|\d+(?:\.\d+)?)\s*(fl\.?\s*oz|gallons?|gal|quarts?|qt|pints?|pt|ml|liters?|litres?|l|kilograms?|kg|grams?|g|pounds?|lbs?|oz|dozen|doz|count|ct|rolls?)\b/);
  if (!match) return null;
  const [n, d] = match[1].split("/").map(Number);
  let quantity = d ? n / d : n;
  const unitText = match[2].replace(/[.\s]/g, "");
  let unit: Item["unit"];
  if (/^(fl|gal|quart|qt|pint|pt|ml|liter|litre|l$)/.test(unitText)) {
    unit = "fl_oz";
    quantity *= /^gal/.test(unitText) ? 128 : /^(quart|qt)/.test(unitText) ? 32 : /^(pint|pt)/.test(unitText) ? 16 : unitText === "ml" ? 1 / 29.5735295625 : /^(liter|litre|l$)/.test(unitText) ? 1000 / 29.5735295625 : 1;
  } else if (/^(count|ct|roll|doz)/.test(unitText)) { unit = "count"; quantity *= /^doz/.test(unitText) ? 12 : 1; }
  else { unit = "oz"; quantity *= /^(pound|lb)/.test(unitText) ? 16 : /^(kilogram|kg)/.test(unitText) ? 1000 / 28.349523125 : /^(gram|g$)/.test(unitText) ? 1 / 28.349523125 : 1; }
  const before = s.slice(0, match.index);
  const after = s.slice((match.index ?? 0) + match[0].length);
  const pack = before.match(/(\d+)\s*[x×]\s*$/) ?? before.match(/(\d+)\s*[- ]?(?:pack|pk)(?:\s+of)?\s*$/) ??
    s.match(/(?:pack of|case of)\s*(\d+)\b(?!\s*(?:fl|oz|lb|ml|g|count|ct)\b)/) ?? after.match(/^\s*[,(/-]?\s*(\d+)\s*[- ]?(?:pack|pk)\b/);
  const packCount = pack ? Number(pack[1]) : 1;
  if (!pack && /\b(multi[- ]?pack|pack|pk|case)\b/.test(s) && !/\b1\s*[- ]?(pack|pk)\b/.test(s)) return null;
  if (!(quantity > 0) || !Number.isFinite(quantity) || !Number.isInteger(packCount) || packCount < 1 || packCount > 1000) return null;
  return { quantity, unit, packCount };
}

export function packageSize(offer: Pick<Offer, "packageQuantity" | "packageUnit" | "packCount">, unit: Item["unit"]): number | null {
  if (!offer.packageQuantity || !offer.packageUnit || !offer.packCount) return null;
  const total = offer.packageQuantity * offer.packCount;
  if (offer.packageUnit === unit) return total;
  if (offer.packageUnit === "oz" && unit === "lb") return total / 16;
  if (offer.packageUnit === "lb" && unit === "oz") return total * 16;
  return null;
}
export function withUnitPrice(offer: Offer): Offer {
  const size = offer.packageUnit && packageSize(offer, offer.packageUnit);
  return { ...offer, unitPriceCents: size ? offer.priceCents / size : null };
}

/** Obvious category contradictions guard both old retailer snapshots and model mistakes. */
export function categoryConflict(itemId: string, title: string): boolean {
  const t = normalize(title);
  return (itemId === "tomatoes" && /sauce|paste|soup|juice|ketchup/.test(t)) ||
    (itemId === "strawberries" && /frosting|icing|jam|syrup|candy/.test(t)) ||
    (itemId === "butter" && /corn|vegetable|peanut|almond/.test(t)) ||
    (itemId === "bacon" && /sausage/.test(t)) || (itemId === "ground_beef" && /pork|turkey|chicken/.test(t));
}

/** Explicit dietary or milk-variety requirements need explicit supporting text. */
export function attributeIssue(item: Item, entry: ListEntry, title: string): "reject" | "uncertain" | null {
  const requested = normalize(entry.productQuery?.trim() || item.search || item.name).replace(/-/g, " ");
  const candidate = normalize(title).replace(/-/g, " ");
  for (const attribute of ["organic", "gluten free", "lactose free"]) {
    if (requested.includes(attribute) && !candidate.includes(attribute)) return "uncertain";
  }
  if (item.id === "milk") {
    if (/whole\s+milk/.test(requested) && /\b[12]\s*%|\bskim\b|\bnonfat\b|\blow\s*fat\b/.test(candidate)) return "reject";
    const percent = requested.match(/\b([12])\s*%/);
    if (percent && !candidate.includes(`${percent[1]}%`)) return /whole\s+milk|skim|nonfat|[12]\s*%/.test(candidate) ? "reject" : "uncertain";
  }
  return null;
}

/** Only evidenced in-store offers can join the current route planner. Other fulfillment remains browsable. */
export function offerToQuote(offer: Offer, entry: ListEntry, item: Item, memberships: Memberships): PriceQuote | null {
  if (!offer.matchingConfirmed || !["exact", "substitute"].includes(offer.match) || offer.currency !== "USD" ||
    offer.channel !== "in_store" || !offer.storeId || categoryConflict(item.id, offer.title)) return null;
  if (entry.brandLock?.trim() && (!offer.brand || normalizeBrand(offer.brand) !== normalizeBrand(entry.brandLock))) return null;
  if (attributeIssue(item, entry, offer.title)) return null;
  // Coupon, multibuy, subscription and unidentified membership requirements are not supported in v1.
  if (offer.conditions.some((c) => !(/^(costco membership required)$/i.test(c) && memberships.costco))) return null;
  const size = packageSize(offer, item.unit);
  if (!size || !Number.isSafeInteger(offer.priceCents) || offer.priceCents <= 0) return null;
  return { itemId: item.id, storeId: offer.storeId, channel: "in_person", price: offer.priceCents / 100, size, unit: item.unit,
    source: offer.sourceType === "google_shopping" ? "google_shopping" : offer.sourceType === "receipt" ? "receipt" : "seed",
    seenAt: offer.observedAt ?? offer.retrievedAt, link: offer.sourceUrl ?? undefined, product: offer.title, offer };
}
