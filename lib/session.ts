import { places } from "./catalog";
import { DEFAULT_SEARCH_LOCATION } from "./offers";
import { currentSnapshots } from "./price-session";
import type { Goal, ListEntry, Memberships, Mode, Place, Plan, PriceQuote, PricingMode, Trip } from "./types";

/** Nothing is chosen for a new visitor: places, mode and goal start as null, times as "". `to: null` = back to the start. */
export type TripForm = { from: Place | null; to: Place | null; mode: Mode | null; leave: string; homeBy: string };
export type Saved = { list: ListEntry[]; trip: TripForm; goal: Goal | null; priceMode?: PricingMode; searchLocation?: string };
/** A Saved whose trip and goal are all chosen. */
export type ReadySaved = Saved & { trip: TripForm & { from: Place; mode: Mode }; goal: Goal };

const e = (itemId: string, qty: number, bulkOk = false): ListEntry => ({ itemId, qty, bulkOk });

/** "Groceries for 3 roommates this week, leaving the U at 5, no car, home by 6:30, cheapest." */
export const DEMO: ReadySaved = {
  priceMode: "demo",
  list: [
    e("eggs", 2), e("milk", 2), e("bread", 2), e("rice", 1, true), e("chicken", 3), e("ground_beef", 2),
    e("pasta", 2), e("pasta_sauce", 2), e("bananas", 1), e("apples", 1), e("onions", 1), e("potatoes", 1),
    e("lettuce", 2), e("cheese", 1), e("yogurt", 2), e("butter", 1), e("peanut_butter", 1), e("cereal", 2),
    e("paper_towels", 1, true), e("toilet_paper", 1, true),
  ],
  trip: { from: places[0], to: places[1], mode: "no_car", leave: "17:00", homeBy: "18:30" },
  goal: "savings",
};

/** A brand-new visitor: empty list, no trip, no goal. */
export const EMPTY: Saved = { list: [], trip: { from: null, to: null, mode: null, leave: "", homeBy: "" }, goal: null, priceMode: "real", searchLocation: DEFAULT_SEARCH_LOCATION };

// beelow:v2 (was utahcart:v1, which pre-filled the demo cart): every browser starts empty after the rebrand.
const KEY = "beelow:v2";

export function load(): Saved {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return { ...EMPTY, ...JSON.parse(raw) };
  } catch {}
  return EMPTY;
}

/** What's still missing before BeeLow can plan, in the order the list page asks for it. */
export function missingSteps(s: Saved): string[] {
  return [
    !s.list.length && "Add at least one item",
    !s.trip.from && "Choose where you start",
    !s.trip.mode && "Choose car or no car",
    !s.goal && "Choose what matters most",
  ].filter((x): x is string => !!x);
}

export const tripReady = (s: Saved): s is ReadySaved => missingSteps(s).length === 0;

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

export const toTrip = (f: ReadySaved["trip"]): Trip => ({
  start: f.from,
  end: f.to ?? f.from, // grocery runs usually end where they start
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

const RECEIPTS = "utahcart:receipts";

/** Scanned receipt prices, kept in this browser and sent with every plan request. */
export function loadReceipts(): PriceQuote[] {
  try {
    return JSON.parse(localStorage.getItem(RECEIPTS) ?? "[]");
  } catch {
    return [];
  }
}

/** New quotes replace older ones for the same store + item. */
export function addReceipts(quotes: PriceQuote[]): PriceQuote[] {
  const key = (q: PriceQuote) => q.storeId + "/" + q.itemId;
  const fresh = new Set(quotes.map(key));
  const all = [...loadReceipts().filter((q) => !fresh.has(key(q))), ...quotes];
  try {
    localStorage.setItem(RECEIPTS, JSON.stringify(all));
  } catch {}
  return all;
}

const MEMBERSHIPS = "utahcart:memberships";

export function loadMemberships(): Memberships {
  try {
    return JSON.parse(localStorage.getItem(MEMBERSHIPS) ?? "{}");
  } catch {
    return {};
  }
}

export function saveMemberships(m: Memberships) {
  try {
    localStorage.setItem(MEMBERSHIPS, JSON.stringify(m));
  } catch {}
}

/** Everything /api/plan needs, from this browser's saved cart, memberships and receipt prices; null until the trip is set up. */
export const planRequest = (s: Saved, worth: (keyof Memberships)[] = []) =>
  tripReady(s)
    ? JSON.stringify({ list: s.list, trip: toTrip(s.trip), memberships: loadMemberships(), quotes: loadReceipts(), worth, goal: s.goal,
      priceMode: s.priceMode ?? "real", searchLocation: s.searchLocation ?? DEFAULT_SEARCH_LOCATION,
      offerSnapshots: currentSnapshots(s.list, s.searchLocation ?? DEFAULT_SEARCH_LOCATION) })
    : null;

/** Current time rounded up to 5 minutes, "HH:MM". */
export function nowRounded(): string {
  const d = new Date();
  const m = Math.ceil((d.getHours() * 60 + d.getMinutes()) / 5) * 5;
  return addMinutes("00:00", m);
}

export function clearReceipts() {
  try {
    localStorage.removeItem(RECEIPTS);
  } catch {}
}

/** "17:00" + 90 -> "18:30" (wraps past midnight). */
export function addMinutes(t: string, mins: number): string {
  const total = (Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5)) + mins + 1440) % 1440;
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

export const ampm = (t: string) => (t ? `${clock(t)} ${Number(t.slice(0, 2)) < 12 ? "AM" : "PM"}` : "");

/** Trips saved from plan details (logged-in users; synced to the account). Newest first, at most 20. */
export type SavedTrip = { id: string; savedAt: string; goal: Goal; list: ListEntry[]; trip: TripForm; plan: Plan };
export const TRIPS = "beelow:trips";
export function loadTrips(): SavedTrip[] {
  try {
    return JSON.parse(localStorage.getItem(TRIPS) ?? "[]");
  } catch {
    return [];
  }
}
export function addTrip(t: Omit<SavedTrip, "id" | "savedAt">): SavedTrip {
  const trip = { ...t, id: Math.random().toString(36).slice(2, 10), savedAt: new Date().toISOString() };
  try {
    localStorage.setItem(TRIPS, JSON.stringify([trip, ...loadTrips()].slice(0, 20)));
  } catch {}
  return trip;
}

/** Browser keys that follow a logged-in user to other devices. */
export const SYNC_KEYS = [KEY, RECEIPTS, MEMBERSHIPS, TRIPS];
