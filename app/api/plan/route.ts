import { catalog } from "@/lib/catalog";
import { planTrip, priceCoverage } from "@/lib/planner";
import { DEFAULT_SEARCH_LOCATION, offerToQuote, validEntry } from "@/lib/offers";
import { verifySnapshot } from "@/lib/shopping-server";
import { cleanQuotes, withQuotes } from "@/lib/receipts";
import { worth } from "@/lib/worth";
import memberships from "@/data/memberships.json";
import type { Goal, ListEntry, Memberships, Trip } from "@/lib/types";

const num = (v: unknown) => typeof v === "number" && Number.isFinite(v);
const place = (p: unknown) => {
  const o = p as { lat?: unknown; lng?: unknown };
  return !!o && num(o.lat) && num(o.lng);
};

const KNOWN = new Set(memberships.map((m) => m.id));
const GOALS = new Set<Goal>(["savings", "fewest_stops", "time"]);

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as
    { list?: ListEntry[]; trip?: Trip; memberships?: unknown; quotes?: unknown; worth?: unknown; goal?: unknown; priceMode?: unknown; searchLocation?: unknown; offerSnapshots?: unknown } | null;
  const { list, trip, quotes } = body ?? {};
  // Only known membership keys set to true count.
  const m = Object.fromEntries(
    Object.entries((body?.memberships ?? {}) as Record<string, unknown>).filter(([k, v]) => KNOWN.has(k) && v === true),
  ) as Memberships;
  const validList =
    Array.isArray(list) && list.length > 0 && list.length <= 100 && list.every((e) => validEntry(e, catalog)) && new Set(list.map((e) => e.itemId)).size === list.length;
  const validTrip =
    !!trip && place(trip.start) && place(trip.end) && (trip.mode === "car" || trip.mode === "no_car") &&
    num(trip.costPerMile) && trip.costPerMile >= 0 && num(trip.minutesPerStop) && trip.minutesPerStop >= 0 && (trip.timeLimitMin === undefined || (num(trip.timeLimitMin) && trip.timeLimitMin >= 0));
  if (!validList || !validTrip) {
    return Response.json({ error: "Send a list of items and a trip with start, end and mode." }, { status: 400 });
  }
  const mode = body?.priceMode === "demo" ? "demo" : "real";
  const location = typeof body?.searchLocation === "string" ? body.searchLocation : DEFAULT_SEARCH_LOCATION;
  const snapshots = Array.isArray(body?.offerSnapshots) ? body.offerSnapshots.slice(0, 100) : [];
  const discovered = list.flatMap((entry) => snapshots.flatMap((snapshot) => verifySnapshot(snapshot, entry, location))
    .flatMap((offer) => {
      const item = catalog.items.find((i) => i.id === entry.itemId)!;
      const quote = offer.itemId === item.id && offerToQuote(offer, entry, item, m);
      return quote ? [quote] : [];
    }));
  const data = withQuotes(catalog, [...cleanQuotes(quotes, catalog), ...discovered]);
  const ids = (Array.isArray(body?.worth) ? body.worth : []).filter((id): id is keyof Memberships => KNOWN.has(id)).slice(0, 8);
  return Response.json({ plans: planTrip(list, trip, m, data, mode), coverage: priceCoverage(list, m, data, mode), priceMode: mode,
    worth: worth(list, trip, m, data, ids, GOALS.has(body?.goal as Goal) ? (body?.goal as Goal) : "savings", mode) });
}
