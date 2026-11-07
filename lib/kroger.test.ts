import { describe, expect, test } from "vitest";
import { nearestGrocery, parseSize, pickQuote, pickQuotes, toItemSize, type KrogerProduct } from "./kroger";
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

describe("pickQuotes", () => {
  const berries: Item = { id: "strawberries", name: "Strawberries", unit: "oz", typicalSize: 16, aisle: "produce", must: "strawberr" };
  const p = (description: string, size: string, regular: number): KrogerProduct => ({ productId: description, description, items: [{ size, price: { regular } }] });

  test("keeps several real products, cheapest per unit first, and drops wrong kinds", () => {
    const qs = pickQuotes(berries, [
      p("Pillsbury Strawberry Frosting", "16 oz", 1.67),
      p("Fresh Strawberries", "16 oz", 3.99),
      p("Fresh Strawberries", "32 oz", 6.99),
      p("Organic Strawberries", "16 oz", 5.49),
      p("Blueberries", "16 oz", 2.99),
      p("Strawberry Fruit Snacks", "16 oz", 2.5),
    ], "smiths", "2026-11-06", 5);
    expect(qs.map((q) => `${q.product} ${q.size}`)).toEqual(["Fresh Strawberries 32", "Fresh Strawberries 16", "Organic Strawberries 16"]);
  });

  test("an item's 'not' words and processed produce are left out", () => {
    const bacon: Item = { id: "bacon", name: "Bacon", unit: "oz", typicalSize: 12, must: "bacon", not: "macaroni|salad|kit" };
    expect(pickQuotes(bacon, [p("Bacon Ranch Macaroni and Cheese", "12 oz", 2.5), p("Thick Cut Bacon", "12 oz", 5.99)], "smiths", "2026-11-06", 5)
      .map((q) => q.product)).toEqual(["Thick Cut Bacon"]);
    expect(pickQuotes(berries, [p("Strawberry Frosted Cereal", "16 oz", 2), p("Fresh Strawberries", "16 oz", 3.99)], "smiths", "2026-11-06", 5)
      .map((q) => q.product)).toEqual(["Fresh Strawberries"]);
  });

  test("caps how many products are kept", () => {
    const many = [1, 2, 3, 4, 5, 6, 7].map((i) => p(`Fresh Strawberries ${i}`, "16 oz", 3 + i));
    expect(pickQuotes(berries, many, "smiths", "2026-11-06", 5)).toHaveLength(5);
  });
});

test("Express and Fuel locations are not grocery stores", () => {
  const s = (name: string, lat: number) => ({ locationId: name, chain: "SMITHS", name, address: { addressLine1: "", city: "", state: "", zipCode: "" }, geolocation: { latitude: lat, longitude: -111.85 } });
  const pick = nearestGrocery([s("Smith's Express - South Temple Fuel", 40.765), s("Smith's Marketplace", 40.75), s("Smith's - 800 S", 40.755)], 40.765, -111.85);
  expect(pick?.name).toBe("Smith's - 800 S");
});
