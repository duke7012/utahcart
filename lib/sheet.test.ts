import { expect, test } from "vitest";
import { parseCsv, rowToQuote } from "./sheet";
import type { Item } from "./types";

const items: Item[] = [{ id: "milk", name: "Milk, 2%", unit: "fl_oz", typicalSize: 128 }];
const stores = ["walmart", "harmons", "costco"];
const row = (o: Record<string, string>) => ({
  store_id: "walmart", item_id: "milk", item: "Milk, 2%", unit: "fl_oz", usual_size: "128", price: "", pack_size: "", product_name: "", url: "", checked_on: "", ...o,
});

test("parseCsv reads quoted fields with commas and quotes", () => {
  const rows = parseCsv('a,b,c\n1,"Milk, 2% ""Great Value""",x\n\n2,,y\n');
  expect(rows).toEqual([{ a: "1", b: 'Milk, 2% "Great Value"', c: "x" }, { a: "2", b: "", c: "y" }]);
});

test("a filled row becomes a store price with its product, link and date", () => {
  const r = rowToQuote(row({ price: "3.12", pack_size: "128", product_name: "Great Value 2% Milk", url: "https://www.walmart.com/ip/1", checked_on: "2026-11-06" }), items, stores, "2026-11-07");
  expect(r).toEqual({ ok: true, quote: {
    itemId: "milk", storeId: "walmart", channel: "in_person", price: 3.12, size: 128, unit: "fl_oz", source: "seed",
    seenAt: "2026-11-06", product: "Great Value 2% Milk", link: "https://www.walmart.com/ip/1",
  } });
});

test("blank price rows are skipped, not errors", () => {
  expect(rowToQuote(row({}), items, stores, "2026-11-07")).toEqual({ ok: false, skip: true });
});

test("bad rows say what's wrong", () => {
  const err = (o: Record<string, string>) => {
    const r = rowToQuote(row(o), items, stores, "2026-11-07");
    return !r.ok && "error" in r ? r.error : "";
  };
  expect(err({ price: "abc", pack_size: "128" })).toMatch(/price/);
  expect(err({ price: "3", pack_size: "0" })).toMatch(/pack size/);
  expect(err({ price: "3", pack_size: "1", unit: "gal" })).toMatch(/unit/);
  expect(err({ price: "3", pack_size: "128", store_id: "target" })).toMatch(/store/);
  expect(err({ price: "3", pack_size: "128", item_id: "caviar" })).toMatch(/item/);
});

test("a missing or odd date uses today", () => {
  const r = rowToQuote(row({ price: "$3.12", pack_size: "128", checked_on: "last week" }), items, stores, "2026-11-07");
  expect(r.ok && r.quote.seenAt).toBe("2026-11-07");
  expect(r.ok && r.quote.price).toBe(3.12);
});
