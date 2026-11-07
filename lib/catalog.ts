import type { CatalogData, Place } from "./types";
import stores from "@/data/stores.json";
import items from "@/data/items.json";
import prices from "@/data/prices.json";
import channels from "@/data/channels.json";
import placesJson from "@/data/places.json";

export const catalog = { stores, items, prices, channels } as CatalogData;
export const places = placesJson as (Place & { id: string })[];

export const storeById = (id: string) => catalog.stores.find((s) => s.id === id);
export const itemById = (id: string) => catalog.items.find((i) => i.id === id);

export const AISLES = [
  { id: "produce", label: "Produce" },
  { id: "dairy", label: "Dairy & eggs" },
  { id: "meat", label: "Meat & seafood" },
  { id: "bakery", label: "Bakery" },
  { id: "pantry", label: "Pantry" },
  { id: "frozen", label: "Frozen" },
  { id: "household", label: "Household" },
];

/** Lowest in-store price for one typical pack at a store anyone can walk into (demo until receipts say otherwise). */
export function fromPrice(itemId: string): number | undefined {
  const item = itemById(itemId);
  const open = new Set(catalog.stores.filter((s) => !s.membershipRequired).map((s) => s.id));
  const units = catalog.prices.filter((p) => p.itemId === itemId && p.channel === "in_person" && open.has(p.storeId)).map((p) => p.price / p.size);
  return item && units.length ? Math.round(Math.min(...units) * item.typicalSize * 100) / 100 : undefined;
}

const fmtDay = (d: string) => new Date(`${d}T12:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric" });

/** One line on where the prices come from, built from the quotes actually in the catalog. */
export function priceNote(): string {
  const real = catalog.prices.filter((p) => p.source === "seed");
  const latest = (ps: typeof real) => fmtDay(ps.map((p) => p.seenAt).sort().at(-1)!);
  const parts: string[] = [];
  const kroger = real.filter((p) => p.storeId === "smiths");
  if (kroger.length) parts.push(`Smith’s prices from Kroger, checked ${latest(kroger)}`);
  const team = real.filter((p) => p.storeId !== "smiths");
  if (team.length) {
    const names = [...new Set(team.map((p) => storeById(p.storeId)?.name.split(" ")[0]))].join(", ");
    parts.push(`${names} prices checked by our team ${latest(team)}`);
  }
  const demo = catalog.prices.some((p) => p.source === "demo");
  if (!parts.length) return "Demo prices, not real store prices.";
  return `${parts.join(" · ")}${demo ? " · demo prices where marked" : ""}.`;
}
