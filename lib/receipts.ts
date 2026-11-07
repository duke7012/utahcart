import type { CatalogData, Item, PriceQuote } from "./types";

export type ScanLine = { rawName: string; itemId: string | null; price: number; size: number; unit: Item["unit"] };
export type ScanResult = { store: string; date: string; lines: ScanLine[] };

const UNITS = new Set<Item["unit"]>(["oz", "count", "lb", "fl_oz"]);
const pos = (n: unknown): n is number => typeof n === "number" && Number.isFinite(n) && n > 0 && n < 10_000;
const isDate = (d: unknown): d is string => typeof d === "string" && /^\d{4}-\d{2}-\d{2}$/.test(d);

/** Validate the model's JSON. Unknown item ids become null; lines without a usable price/size/unit are dropped. */
export function parseScan(text: string, itemIds: string[]): ScanResult | null {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return null;
  }
  const r = raw as { store?: unknown; date?: unknown; lines?: unknown };
  if (!r || !Array.isArray(r.lines)) return null;
  const lines = r.lines.flatMap((l: Partial<ScanLine> | null): ScanLine[] => {
    if (!l || typeof l.rawName !== "string" || !pos(l.price) || Math.round(l.price * 100) <= 0 || !pos(l.size) || !UNITS.has(l.unit as Item["unit"])) return [];
    const itemId = typeof l.itemId === "string" && itemIds.includes(l.itemId) ? l.itemId : null;
    return [{ rawName: l.rawName.slice(0, 80), itemId, price: l.price, size: l.size, unit: l.unit as Item["unit"] }];
  });
  return { store: typeof r.store === "string" ? r.store.slice(0, 80) : "", date: isDate(r.date) ? r.date : "", lines };
}

/** Matched lines become in-store quotes with source "receipt". */
export const toQuotes = (storeId: string, date: string, lines: ScanLine[], demo = false): PriceQuote[] =>
  lines.flatMap((l) =>
    l.itemId && pos(l.price) && Math.round(l.price * 100) > 0 && pos(l.size)
      ? [{ itemId: l.itemId, storeId, channel: "in_person" as const, price: Math.round(l.price * 100) / 100, size: l.size, unit: l.unit, source: demo ? "demo" as const : "receipt" as const,
           ...(l.rawName ? { product: l.rawName.slice(0, 80) } : {}), ...(demo ? { demo: true } : {}),
           seenAt: isDate(date) ? date : new Date().toISOString().slice(0, 10) }]
      : [],
  );

export const withQuotes = (data: CatalogData, quotes: PriceQuote[]): CatalogData => ({ ...data, prices: [...data.prices, ...quotes] });

/** Trust boundary for quotes the browser sends back: known store + item, positive numbers, forced to source "receipt". */
export function cleanQuotes(input: unknown, data: CatalogData): PriceQuote[] {
  if (!Array.isArray(input)) return [];
  return input.slice(0, 500).flatMap((q: Partial<PriceQuote> | null): PriceQuote[] => {
    if (!q || !data.stores.some((s) => s.id === q.storeId) || !data.items.some((i) => i.id === q.itemId)) return [];
    if (!pos(q.price) || !pos(q.size) || !UNITS.has(q.unit as Item["unit"])) return [];
    return toQuotes(q.storeId!, isDate(q.seenAt) ? q.seenAt : "", [{ rawName: typeof q.product === "string" ? q.product : "", itemId: q.itemId!, price: q.price, size: q.size, unit: q.unit! }], q.demo === true);
  });
}
