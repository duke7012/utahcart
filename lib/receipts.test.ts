import { describe, expect, test } from "vitest";
import { planTrip as plan } from "./planner";
import { parseScan, toQuotes, withQuotes } from "./receipts";
import type { CatalogData, Trip } from "./types";
const planTrip: typeof plan = (list, trip, memberships, data) => plan(list, trip, memberships, data, "demo");

const catalog: CatalogData = {
  stores: [
    { id: "near", name: "Near", lat: 40.75, lng: -111.9, channels: ["in_person"] },
    { id: "mid", name: "Mid", lat: 40.75, lng: -111.88, channels: ["in_person"] },
  ],
  items: [
    { id: "milk", name: "Milk", unit: "fl_oz", typicalSize: 128 },
    { id: "rice", name: "Rice", unit: "oz", typicalSize: 32 },
  ],
  prices: [
    { itemId: "milk", storeId: "near", channel: "in_person", price: 4.5, size: 128, unit: "fl_oz", source: "demo", seenAt: "2026-11-06" },
    { itemId: "rice", storeId: "near", channel: "in_person", price: 4, size: 32, unit: "oz", source: "demo", seenAt: "2026-11-06" },
    { itemId: "milk", storeId: "mid", channel: "in_person", price: 3, size: 128, unit: "fl_oz", source: "demo", seenAt: "2026-11-06" },
    { itemId: "rice", storeId: "mid", channel: "in_person", price: 3, size: 32, unit: "oz", source: "demo", seenAt: "2026-11-06" },
  ],
  channels: {},
};
const trip: Trip = {
  start: { lat: 40.7, lng: -111.9, label: "Start" }, end: { lat: 40.8, lng: -111.9, label: "End" },
  mode: "car", costPerMile: 0.2, minutesPerStop: 10,
};
const list = [{ itemId: "milk", qty: 1, bulkOk: false }, { itemId: "rice", qty: 1, bulkOk: false }];

describe("receipt prices", () => {
  test("a scanned receipt price changes the savings plan", () => {
    expect(planTrip(list, trip, {}, catalog)[0].stops.map((s) => s.storeId)).toEqual(["mid"]);
    const quotes = toQuotes("near", "2026-11-05", [
      { rawName: "GV MILK 2% GAL", itemId: "milk", price: 2.19, size: 128, unit: "fl_oz" },
      { rawName: "RICE LG GRAIN", itemId: "rice", price: 1.99, size: 32, unit: "oz" },
    ]);
    const [savings] = planTrip(list, trip, {}, withQuotes(catalog, quotes));
    expect(savings.stops.map((s) => s.storeId)).toEqual(["near"]);
    expect(savings.stops[0].items[0].quote.source).toBe("receipt");
  });

  test("lines without a catalog item are not saved as quotes", () => {
    const quotes = toQuotes("near", "2026-11-05", [{ rawName: "BAG FEE", itemId: null, price: 0.1, size: 1, unit: "count" }]);
    expect(quotes).toEqual([]);
  });
});

describe("parseScan", () => {
  const ids = ["milk", "rice"];
  test("keeps valid lines, nulls unknown item ids, drops lines with no usable price", () => {
    const r = parseScan(
      JSON.stringify({
        store: "Smith's", date: "2026-11-05",
        lines: [
          { rawName: "MILK", itemId: "milk", price: 2.19, size: 128, unit: "fl_oz" },
          { rawName: "MYSTERY", itemId: "caviar", price: 9, size: 1, unit: "count" },
          { rawName: "COUPON", itemId: null, price: -1, size: 1, unit: "count" },
        ],
      }),
      ids,
    );
    expect(r?.store).toBe("Smith's");
    expect(r?.lines.map((l) => [l.rawName, l.itemId])).toEqual([["MILK", "milk"], ["MYSTERY", null]]);
  });

  test("returns null for text that isn't the expected JSON", () => {
    expect(parseScan("sorry, I can't read that", ids)).toBeNull();
    expect(parseScan(JSON.stringify({ lines: "nope" }), ids)).toBeNull();
  });
});
