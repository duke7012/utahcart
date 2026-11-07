import { expect, test } from "vitest";
import { planTrip } from "./planner";
import type { CatalogData, ListEntry, Trip } from "./types";
import stores from "../data/stores.json";
import items from "../data/items.json";
import prices from "../data/prices.json";
import channels from "../data/channels.json";
import places from "../data/places.json";

const data = { stores, items, prices, channels } as CatalogData;

test("demo scenario: 3 roommates, leaving the U at 5, no car, home by 6:30", () => {
  const [campus, home] = places;
  const trip: Trip = { start: campus, end: home, mode: "no_car", timeLimitMin: 90, costPerMile: 0, minutesPerStop: 15 };
  const list: ListEntry[] = items.map((i) => ({ itemId: i.id, qty: 1, bulkOk: false }));
  const plans = planTrip(list, trip, {}, data);
  expect(plans.map((p) => p.goal)).toEqual(["savings", "fewest_stops", "time"]);
  for (const p of plans) expect(p.minutes).toBeLessThanOrEqual(90);
  expect(plans[0].savingsVsOneStore).toBeGreaterThanOrEqual(0);
});
