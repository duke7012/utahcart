import type { Channel, Store } from "./types";

type Point = { lat: number; lng: number };
export type TravelMode = "driving" | "walking" | "transit";

const ll = (p: Point) => `${p.lat},${p.lng}`;

/** Google documents up to 3 waypoints in mobile browsers (9 otherwise); waypoints with transit are not documented. */
export function googleMapsUrl(start: Point, end: Point, stops: Point[], mode: TravelMode): string {
  const q = new URLSearchParams({ api: "1", origin: ll(start), destination: ll(end), travelmode: mode });
  if (stops.length) q.set("waypoints", stops.map(ll).join("|"));
  return `https://www.google.com/maps/dir/?${q}`;
}

export function appleMapsUrl(start: Point, end: Point, stops: Point[], mode: TravelMode): string {
  const q = new URLSearchParams({ source: ll(start), destination: ll(end) });
  for (const s of stops) q.append("waypoint", ll(s));
  q.set("mode", mode);
  return `https://maps.apple.com/directions?${q}`;
}

// ponytail: Transit app deep-link format not confirmed; team tests on a phone and fills this in.
export const transitAppUrl = (): string | null => null;

/** No-car trips open one leg at a time ("Go to next stop"). */
export function legs<T extends Point>(start: T, end: T, stops: T[]): [T, T][] {
  const pts = [start, ...stops, end];
  return pts.slice(1).map((p, i) => [pts[i], p]);
}

export function orderUrl(store: Store, channel: Channel, quoteLink?: string): string | undefined {
  return quoteLink ?? store.orderLinks?.[channel] ?? store.link;
}
