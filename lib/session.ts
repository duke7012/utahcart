import { places } from "./catalog";
import type { Goal, ListEntry, Mode, Place, Trip } from "./types";

export type TripForm = { from: Place; to: Place; mode: Mode; leave: string; homeBy: string };
export type Saved = { list: ListEntry[]; trip: TripForm; goal: Goal };

const e = (itemId: string, qty: number, bulkOk = false): ListEntry => ({ itemId, qty, bulkOk });

/** "Groceries for 3 roommates this week, leaving the U at 5, no car, home by 6:30, cheapest." */
export const DEMO: Saved = {
  list: [
    e("eggs", 2), e("milk", 2), e("bread", 2), e("rice", 1, true), e("chicken", 3), e("ground_beef", 2),
    e("pasta", 2), e("pasta_sauce", 2), e("bananas", 1), e("apples", 1), e("onions", 1), e("potatoes", 1),
    e("lettuce", 2), e("cheese", 1), e("yogurt", 2), e("butter", 1), e("peanut_butter", 1), e("cereal", 2),
    e("paper_towels", 1, true), e("toilet_paper", 1, true),
  ],
  trip: { from: places[0], to: places[1], mode: "no_car", leave: "17:00", homeBy: "18:30" },
  goal: "savings",
};

const KEY = "utahcart:v1";

export function load(): Saved {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return { ...DEMO, ...JSON.parse(raw) };
  } catch {}
  return DEMO;
}

export function save(s: Saved) {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {}
}

/** Minutes from leave to homeBy ("HH:MM"); undefined when either is blank. */
export function minutesBetween(leave: string, homeBy: string): number | undefined {
  const m = (t: string) => (t ? Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5)) : NaN);
  const d = m(homeBy) - m(leave);
  return Number.isNaN(d) ? undefined : d < 0 ? d + 24 * 60 : d;
}

export const toTrip = (f: TripForm): Trip => ({
  start: f.from,
  end: f.to,
  mode: f.mode,
  timeLimitMin: minutesBetween(f.leave, f.homeBy),
  costPerMile: 0.3, // ponytail: flat car cost; make editable in the wallet/settings page (Tier 2)
  minutesPerStop: 15,
});

export const clock = (t: string) => {
  if (!t) return "";
  const h = Number(t.slice(0, 2));
  return `${((h + 11) % 12) + 1}:${t.slice(3, 5)}`;
};
