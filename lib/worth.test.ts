import { expect, test } from "vitest";
import { worth as compare } from "./worth";
import type { CatalogData, Trip } from "./types";
const worth: typeof compare = (list, trip, m, data, ids, goal) => compare(list, trip, m, data, ids, goal, "demo");

const q = (storeId: string, itemId: string, price: number, size: number) =>
  ({ itemId, storeId, channel: "in_person" as const, price, size, unit: "lb" as const, source: "demo" as const, seenAt: "2026-11-06" });

const data: CatalogData = {
  stores: [
    { id: "shop", name: "Shop", lat: 40.75, lng: -111.9, channels: ["in_person"] },
    { id: "club", name: "Club", lat: 40.76, lng: -111.9, membershipRequired: "costco", channels: ["in_person"] },
  ],
  items: [{ id: "chicken", name: "Chicken", unit: "lb", typicalSize: 2 }],
  prices: [q("shop", "chicken", 10, 2), q("club", "chicken", 18, 6)],
  channels: {},
};
const trip: Trip = {
  start: { lat: 40.7, lng: -111.9, label: "A" }, end: { lat: 40.8, lng: -111.9, label: "B" },
  mode: "car", costPerMile: 0, minutesPerStop: 10,
};

test("a membership that unlocks a cheaper store shows what it saves on this trip", () => {
  const [costco] = worth([{ itemId: "chicken", qty: 3, bulkOk: false }], trip, {}, data, ["costco"]);
  // 3 x 2 lb at Shop = $30; one 6 lb pack at Club = $18
  expect(costco).toMatchObject({ id: "costco", member: false });
  expect(costco.savingsPerTrip).toBeCloseTo(12);
});

test("a membership with nothing to unlock saves nothing", () => {
  const [prime] = worth([{ itemId: "chicken", qty: 3, bulkOk: false }], trip, {}, data, ["prime"]);
  expect(prime.savingsPerTrip).toBe(0);
});

test("savings are measured the same way when the user already has the membership", () => {
  const [costco] = worth([{ itemId: "chicken", qty: 3, bulkOk: false }], trip, { costco: true }, data, ["costco"]);
  expect(costco).toMatchObject({ id: "costco", member: true });
  expect(costco.savingsPerTrip).toBeCloseTo(12);
});
