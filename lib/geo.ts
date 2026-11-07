import type { Mode } from "./types";

type Point = { lat: number; lng: number };

const EARTH_MILES = 3958.8;
const ROAD_FACTOR = 1.3;
// ponytail: flat average speeds, no routing API. no_car = walking (3 mph) x transit factor 3 for TRAX/bus.
// Tune here if demo times look off; the maps app shows the real time after handoff.
const MPH: Record<Mode, number> = { car: 25, no_car: 9 };

export function haversineMiles(a: Point, b: Point): number {
  const rad = (d: number) => (d * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_MILES * Math.asin(Math.sqrt(h));
}

export const roadMiles = (a: Point, b: Point) => haversineMiles(a, b) * ROAD_FACTOR;

export const travelMinutes = (a: Point, b: Point, mode: Mode) => (roadMiles(a, b) / MPH[mode]) * 60;
