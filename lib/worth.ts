import { planTrip } from "./planner";
import type { CatalogData, Goal, ListEntry, Memberships, PricingMode, Trip } from "./types";

export type Worth = { id: keyof Memberships; member: boolean; savingsPerTrip: number | null; estimated: boolean };

/**
 * "Is it worth it?": how much cheaper this trip's plan for `goal` is with each membership than without it.
 * null when no plan fits without it (or with it), so there's nothing to compare.
 */
export function worth(
  list: ListEntry[], trip: Trip, m: Memberships, data: CatalogData, ids: (keyof Memberships)[], goal: Goal = "savings", mode: PricingMode = "real",
): Worth[] {
  const best = (on: boolean, id: keyof Memberships) => planTrip(list, trip, { ...m, [id]: on }, data, mode).find((p) => p.goal === goal);
  return ids.map((id) => {
    const without = best(false, id);
    const withIt = best(true, id);
    const savingsPerTrip = !without || !withIt ? null : Math.round(Math.max(0, without.money - withIt.money) * 100) / 100;
    return { id, member: !!m[id], savingsPerTrip, estimated: !!(without?.estimated || withIt?.estimated) };
  });
}
