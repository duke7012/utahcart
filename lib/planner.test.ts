import { describe, expect, test } from "vitest";
import { planTrip } from "./planner";
import type { CatalogData, ListEntry, PriceQuote, Trip } from "./types";

// Straight north-south trip; "near" sits on the line, "far" is a ~6 mi detour east.
const trip: Trip = {
  start: { lat: 40.7, lng: -111.9, label: "Start" },
  end: { lat: 40.8, lng: -111.9, label: "End" },
  mode: "car",
  costPerMile: 0.2,
  minutesPerStop: 10,
};

const q = (storeId: string, itemId: string, price: number, size: number, unit: PriceQuote["unit"]): PriceQuote => ({
  itemId, storeId, channel: "in_person", price, size, unit, source: "demo", seenAt: "2026-11-06",
});

function catalog(withOnline = false): CatalogData {
  return {
    stores: [
      { id: "near", name: "Near", lat: 40.75, lng: -111.9, channels: ["in_person"] },
      { id: "mid", name: "Mid", lat: 40.75, lng: -111.88, channels: ["in_person"] },
      { id: "far", name: "Far", lat: 40.75, lng: -111.78, channels: ["in_person"] },
      { id: "club", name: "Club", lat: 40.76, lng: -111.9, membershipRequired: "costco", channels: ["in_person", "instacart"] },
    ],
    items: [
      { id: "milk", name: "Milk", unit: "fl_oz", typicalSize: 128 },
      { id: "rice", name: "Rice", unit: "oz", typicalSize: 32 },
      { id: "chicken", name: "Chicken", unit: "lb", typicalSize: 2 },
      { id: "saffron", name: "Saffron", unit: "count", typicalSize: 1 },
      { id: "towels", name: "Paper towels", unit: "count", typicalSize: 1 },
    ],
    prices: [
      q("near", "milk", 4.5, 128, "fl_oz"), q("near", "rice", 4, 32, "oz"), q("near", "chicken", 10, 2, "lb"),
      q("mid", "milk", 3.8, 128, "fl_oz"), q("mid", "rice", 3.2, 32, "oz"), q("mid", "chicken", 8, 2, "lb"),
      q("far", "rice", 2, 32, "oz"), q("far", "chicken", 5, 2, "lb"), q("far", "saffron", 6, 1, "count"),
      q("club", "milk", 5.5, 256, "fl_oz"), q("club", "chicken", 13.5, 6, "lb"), q("club", "towels", 20, 12, "count"),
    ],
    channels: withOnline
      ? { instacart: { name: "Instacart", fee: 7.99, minOrder: 10, membership: "instacartPlus", memberFreeOver: 10, markup: 1.15,
          storeOverrides: { club: { memberFreeOver: 35, markup: 1.24, markupWithMembership: 1.1 } } } }
      : {},
  };
}

const entry = (itemId: string, qty = 1, bulkOk = false): ListEntry => ({ itemId, qty, bulkOk });
const basics = [entry("milk"), entry("rice"), entry("chicken")];
const stopIds = (p: { stops: { storeId: string }[] }) => p.stops.map((s) => s.storeId);

describe("planTrip", () => {
  test("the three goals choose three different plans", () => {
    const [savings, fewest, time] = planTrip(basics, trip, {}, catalog());
    expect(savings.goal).toBe("savings");
    expect(stopIds(savings).sort()).toEqual(["far", "mid"]);
    expect(stopIds(fewest)).toEqual(["mid"]);
    expect(stopIds(time)).toEqual(["near"]);
    expect(savings.money).toBeLessThan(fewest.money);
    expect(time.minutes).toBeLessThan(fewest.minutes);
  });

  test("a list one store can't fully cover adds the store that has the missing item", () => {
    const plans = planTrip([...basics, entry("saffron")], trip, {}, catalog());
    expect(plans).toHaveLength(3);
    for (const p of plans) expect(stopIds(p)).toContain("far");
  });

  test("an item no allowed store sells gives no plans", () => {
    expect(planTrip([entry("towels")], trip, {}, catalog())).toEqual([]);
  });

  test("a warehouse membership unlocks a cheaper store", () => {
    const list = [entry("milk", 2), entry("chicken", 3)];
    const without = planTrip(list, trip, {}, catalog())[0];
    const withCostco = planTrip(list, trip, { costco: true }, catalog())[0];
    expect(stopIds(without)).not.toContain("club");
    expect(stopIds(withCostco)).toContain("club");
    expect(withCostco.money).toBeLessThan(without.money);
    expect(withCostco.savingsVsOneStore).toBeCloseTo(0); // club alone is the cheapest single store
  });

  test("a bulk pack without bulkOk adds a warning", () => {
    const [savings] = planTrip([entry("towels", 2)], trip, { costco: true }, catalog());
    expect(savings.warnings.join(" ")).toMatch(/bulk/i);
    const [ok] = planTrip([entry("towels", 2, true)], trip, { costco: true }, catalog());
    expect(ok.warnings.join(" ")).not.toMatch(/bulk/i);
  });

  test("a time limit removes a plan that runs over it", () => {
    const [savings] = planTrip(basics, trip, {}, catalog());
    const limited = planTrip(basics, { ...trip, timeLimitMin: savings.minutes - 1 }, {}, catalog());
    expect(limited).toHaveLength(3);
    for (const p of limited) expect(p.minutes).toBeLessThanOrEqual(savings.minutes - 1);
    expect(stopIds(limited[0])).not.toContain("far");
  });

  test("a time limit shorter than the direct trip gives no plans", () => {
    expect(planTrip(basics, { ...trip, timeLimitMin: 1 }, {}, catalog())).toEqual([]);
  });

  test("without a membership, Costco stays available via Instacart at the estimated markup", () => {
    const list = [entry("milk", 2), entry("chicken", 3)];
    const [, fewest] = planTrip(list, trip, {}, catalog(true));
    expect(fewest.stopCount).toBe(0);
    const order = fewest.onlineOrders[0];
    expect(order).toMatchObject({ storeId: "club", channel: "instacart", fee: 7.99 });
    const milk = order.items.find((i) => i.itemId === "milk")!;
    expect(milk.quote.source).toBe("estimate");
    expect(milk.quote.price).toBeCloseTo(5.5 * 1.24);
    expect(fewest.warnings.join(" ")).toMatch(/estimate/i);
  });

  test("Instacart+ with Costco waives the fee and uses the member markup", () => {
    const list = [entry("milk", 2), entry("chicken", 3), entry("towels", 12)];
    const [, fewest] = planTrip(list, trip, { costco: true, instacartPlus: true }, catalog(true));
    const order = fewest.onlineOrders[0];
    expect(order.fee).toBe(0);
    expect(order.items.find((i) => i.itemId === "milk")!.quote.price).toBeCloseTo(5.5 * 1.1);
  });
});
