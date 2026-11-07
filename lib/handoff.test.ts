import { describe, expect, test } from "vitest";
import { appleMapsUrl, googleMapsUrl, legs, orderUrl } from "./handoff";
import type { Store } from "./types";

const start = { lat: 40.7649, lng: -111.8421, label: "U of U campus" };
const end = { lat: 40.7234, lng: -111.8555, label: "Home" };
const a = { lat: 40.75, lng: -111.9 };
const b = { lat: 40.76, lng: -111.91 };

describe("maps links", () => {
  test("Google Maps: origin, destination, stops as | separated waypoints, travel mode", () => {
    const u = new URL(googleMapsUrl(start, end, [a, b], "driving"));
    expect(u.origin + u.pathname).toBe("https://www.google.com/maps/dir/");
    expect(u.searchParams.get("api")).toBe("1");
    expect(u.searchParams.get("origin")).toBe("40.7649,-111.8421");
    expect(u.searchParams.get("destination")).toBe("40.7234,-111.8555");
    expect(u.searchParams.get("waypoints")).toBe("40.75,-111.9|40.76,-111.91");
    expect(u.searchParams.get("travelmode")).toBe("driving");
  });

  test("Google Maps without stops has no waypoints param", () => {
    expect(new URL(googleMapsUrl(start, end, [], "transit")).searchParams.has("waypoints")).toBe(false);
  });

  test("Apple Maps repeats waypoint once per stop", () => {
    const u = new URL(appleMapsUrl(start, end, [a, b], "driving"));
    expect(u.origin + u.pathname).toBe("https://maps.apple.com/directions");
    expect(u.searchParams.get("source")).toBe("40.7649,-111.8421");
    expect(u.searchParams.get("destination")).toBe("40.7234,-111.8555");
    expect(u.searchParams.getAll("waypoint")).toEqual(["40.75,-111.9", "40.76,-111.91"]);
    expect(u.searchParams.get("mode")).toBe("driving");
  });

  test("no-car legs go start -> each stop -> end, one leg at a time", () => {
    expect(legs(start, end, [a, b])).toEqual([[start, a], [a, b], [b, end]]);
    expect(legs(start, end, [])).toEqual([[start, end]]);
  });
});

describe("order links", () => {
  const store: Store = {
    id: "costco", name: "Costco", lat: 0, lng: 0, channels: ["in_person", "instacart"],
    link: "https://www.costco.com", orderLinks: { instacart: "https://www.instacart.com/store/costco" },
  };
  test("prefers the item quote's link, then the store's channel link, then the store site", () => {
    expect(orderUrl(store, "instacart", "https://x.test/item")).toBe("https://x.test/item");
    expect(orderUrl(store, "instacart")).toBe("https://www.instacart.com/store/costco");
    expect(orderUrl(store, "doordash")).toBe("https://www.costco.com");
  });
});
