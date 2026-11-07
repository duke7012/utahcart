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
