import { catalog } from "@/lib/catalog";
import { planTrip } from "@/lib/planner";
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
    { list?: ListEntry[]; trip?: Trip; memberships?: unknown; quotes?: unknown; worth?: unknown; goal?: unknown } | null;
  const { list, trip, quotes } = body ?? {};
  // Only known membership keys set to true count.
  const m = Object.fromEntries(
    Object.entries((body?.memberships ?? {}) as Record<string, unknown>).filter(([k, v]) => KNOWN.has(k) && v === true),
  ) as Memberships;
  const validList =
    Array.isArray(list) && list.length <= 100 && list.every((e) => typeof e?.itemId === "string" && num(e.qty) && e.qty > 0 && e.qty <= 100);
  const validTrip =
    !!trip && place(trip.start) && place(trip.end) && (trip.mode === "car" || trip.mode === "no_car") &&
    num(trip.costPerMile) && num(trip.minutesPerStop) && (trip.timeLimitMin === undefined || num(trip.timeLimitMin));
  if (!validList || !validTrip) {
    return Response.json({ error: "Send a list of items and a trip with start, end and mode." }, { status: 400 });
  }
  const data = withQuotes(catalog, cleanQuotes(quotes, catalog));
  const ids = (Array.isArray(body?.worth) ? body.worth : []).filter((id): id is keyof Memberships => KNOWN.has(id)).slice(0, 8);
  return Response.json({ plans: planTrip(list, trip, m, data), worth: worth(list, trip, m, data, ids, GOALS.has(body?.goal as Goal) ? (body?.goal as Goal) : "savings") });
}
