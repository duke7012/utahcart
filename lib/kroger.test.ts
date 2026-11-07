import { describe, expect, test } from "vitest";
import { parseSize, pickQuote, toItemSize, type KrogerProduct } from "./kroger";
import type { Item } from "./types";

describe("parseSize", () => {
  test.each([
    ["1 gal", { qty: 128, unit: "fl_oz" }],
    ["1/2 gal", { qty: 64, unit: "fl_oz" }],
    ["64 fl oz", { qty: 64, unit: "fl_oz" }],
    ["1 qt", { qty: 32, unit: "fl_oz" }],
    ["16 oz", { qty: 16, unit: "oz" }],
    ["2 lb", { qty: 32, unit: "oz" }],
    ["12 ct", { qty: 12, unit: "count" }],
    ["1 dozen", { qty: 12, unit: "count" }],
    ["6 rolls", { qty: 6, unit: "count" }],
    ["1 each", { qty: 1, unit: "count" }],
    ["12 double rolls", { qty: 12, unit: "count" }],
  ])("%s", (text, want) => expect(parseSize(text)).toEqual(want));

  test("unreadable sizes give null", () => {
    expect(parseSize("family size")).toBeNull();
    expect(parseSize("")).toBeNull();
  });
});

test("weights convert to the item's unit; volume never matches a weight", () => {
  expect(toItemSize({ qty: 32, unit: "oz" }, "lb")).toBe(2);
  expect(toItemSize({ qty: 32, unit: "oz" }, "oz")).toBe(32);
  expect(toItemSize({ qty: 64, unit: "fl_oz" }, "oz")).toBeUndefined();
});

describe("pickQuote", () => {
  const milk: Item = { id: "milk", name: "Milk, 2%", unit: "fl_oz", typicalSize: 128 };
  const product = (description: string, size: string, regular: number, promo = 0): KrogerProduct => ({
    productId: description, description, productPageURI: `/p/${description}`, items: [{ size, price: { regular, promo } }],
  });

  test("picks the lowest price per unit, using the promo price when there is one", () => {
    const q = pickQuote(milk, [
      product("Kroger 2% Milk", "1 gal", 3.49),
      product("Darigold 2% Milk", "1 gal", 4.29, 2.99),
      product("Kroger 2% Milk Half Gallon", "1/2 gal", 1.99),
    ], "smiths", "2026-11-06");
    expect(q).toMatchObject({ itemId: "milk", storeId: "smiths", channel: "in_person", price: 2.99, size: 128, unit: "fl_oz", source: "seed", seenAt: "2026-11-06", product: "Darigold 2% Milk" });
    expect(q?.link).toBe("https://www.smithsfoodanddrug.com/p/Darigold 2% Milk");
  });

  test("ignores wrong units, missing prices and odd pack sizes", () => {
    const q = pickQuote(milk, [
      product("Milk chocolate bar", "4 oz", 0.5),
      product("Milk single serve", "8 fl oz", 0.4),
      product("No price milk", "1 gal", 0),
      product("Kroger 2% Milk", "1 gal", 3.49),
    ], "smiths", "2026-11-06");
    expect(q?.product).toBe("Kroger 2% Milk");
  });

  test("a one-each item (frozen pizza) takes the store's pack even when it's listed by weight", () => {
    const pizza: Item = { id: "frozen_pizza", name: "Frozen pizza", unit: "count", typicalSize: 1 };
    expect(pickQuote(pizza, [product("Pepperoni Pizza", "21.6 oz", 5.99)], "smiths", "2026-11-06")).toMatchObject({ price: 5.99, size: 1, unit: "count" });
  });

  test("returns undefined when nothing fits", () => {
    expect(pickQuote(milk, [product("Milk chocolate", "4 oz", 1)], "smiths", "2026-11-06")).toBeUndefined();
  });
});
