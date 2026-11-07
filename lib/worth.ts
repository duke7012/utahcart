import { planTrip } from "./planner";
import type { CatalogData, Goal, ListEntry, Memberships, Trip } from "./types";

export type Worth = { id: keyof Memberships; member: boolean; savingsPerTrip: number | null };

/**
 * "Is it worth it?": how much cheaper this trip's plan for `goal` is with each membership than without it.
 * null when no plan fits without it (or with it), so there's nothing to compare.
 */
export function worth(
  list: ListEntry[], trip: Trip, m: Memberships, data: CatalogData, ids: (keyof Memberships)[], goal: Goal = "savings",
): Worth[] {
  const best = (on: boolean, id: keyof Memberships) => planTrip(list, trip, { ...m, [id]: on }, data).find((p) => p.goal === goal)?.money;
  return ids.map((id) => {
    const without = best(false, id);
    const withIt = best(true, id);
    const savingsPerTrip = without === undefined || withIt === undefined ? null : Math.round(Math.max(0, without - withIt) * 100) / 100;
    return { id, member: !!m[id], savingsPerTrip };
  });
}
