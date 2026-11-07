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
