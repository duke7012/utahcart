import type { Item, PriceQuote } from "./types";

/** Minimal CSV reader: header row, quoted fields, doubled quotes, blank lines skipped. */
export function parseCsv(text: string): Record<string, string>[] {
  const rows: string[][] = [];
  let row: string[] = [], field = "", quoted = false;
  const endField = () => {
    row.push(field);
    field = "";
  };
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') {
        field += '"';
        i++;
      } else if (c === '"') quoted = false;
      else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ",") endField();
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      endField();
      if (row.some((f) => f !== "")) rows.push(row);
      row = [];
    } else field += c;
  }
  if (field || row.length) {
    endField();
    rows.push(row);
  }
  const [head, ...body] = rows;
  return body.map((r) => Object.fromEntries(head.map((h, i) => [h.trim(), (r[i] ?? "").trim()])));
}

export type RowResult = { ok: true; quote: PriceQuote } | { ok: false; skip: true } | { ok: false; error: string };

/** One sheet row -> a real in-store price, or why it can't be used. Blank price = not filled yet. */
export function rowToQuote(r: Record<string, string>, items: Item[], storeIds: string[], today: string): RowResult {
  if (!r.price) return { ok: false, skip: true };
  const item = items.find((i) => i.id === r.item_id);
  if (!storeIds.includes(r.store_id)) return { ok: false, error: `unknown store "${r.store_id}"` };
  if (!item) return { ok: false, error: `unknown item "${r.item_id}"` };
  const price = Number(r.price.replace(/[$,\s]/g, ""));
  const size = Number(r.pack_size);
  if (!Number.isFinite(price) || price <= 0 || price > 500) return { ok: false, error: `price "${r.price}" isn't a dollar amount` };
  if (!Number.isFinite(size) || size <= 0) return { ok: false, error: `pack size "${r.pack_size}" must be a number above 0, in ${item.unit}` };
  if (r.unit && r.unit !== item.unit) return { ok: false, error: `unit "${r.unit}" must stay "${item.unit}" (enter the pack size in ${item.unit})` };
  return {
    ok: true,
    quote: {
      itemId: item.id, storeId: r.store_id, channel: "in_person", price, size, unit: item.unit, source: "seed",
      seenAt: /^\d{4}-\d{2}-\d{2}$/.test(r.checked_on) ? r.checked_on : today,
      ...(r.product_name ? { product: r.product_name } : {}),
      ...(/^https?:\/\//.test(r.url) ? { link: r.url } : {}),
    },
  };
}
