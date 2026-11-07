import { catalog } from "@/lib/catalog";
import { planTrip } from "@/lib/planner";
import type { ListEntry, Memberships, Trip } from "@/lib/types";

const num = (v: unknown) => typeof v === "number" && Number.isFinite(v);
const place = (p: unknown) => {
  const o = p as { lat?: unknown; lng?: unknown };
  return !!o && num(o.lat) && num(o.lng);
};

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as { list?: ListEntry[]; trip?: Trip; memberships?: Memberships } | null;
  const { list, trip, memberships = {} } = body ?? {};
  const validList =
    Array.isArray(list) && list.length <= 100 && list.every((e) => typeof e?.itemId === "string" && num(e.qty) && e.qty > 0 && e.qty <= 100);
  const validTrip =
    !!trip && place(trip.start) && place(trip.end) && (trip.mode === "car" || trip.mode === "no_car") &&
    num(trip.costPerMile) && num(trip.minutesPerStop) && (trip.timeLimitMin === undefined || num(trip.timeLimitMin));
  if (!validList || !validTrip || typeof memberships !== "object") {
    return Response.json({ error: "Send a list of items and a trip with start, end and mode." }, { status: 400 });
  }
  return Response.json({ plans: planTrip(list, trip, memberships, catalog) });
}
