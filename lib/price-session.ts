import { requestKey } from "./offers";
import type { ListEntry, OfferSnapshot, PriceResult } from "./types";

export const PRICE_STORAGE_KEY = "beelow:prices:v1";
export type StoredPrices = Record<string, PriceResult>;
export function loadPrices(): StoredPrices {
  try {
    const raw = JSON.parse(localStorage.getItem(PRICE_STORAGE_KEY) ?? "{}");
    return raw && typeof raw === "object" && !Array.isArray(raw) ? raw : {};
  } catch { return {}; }
}
/** Failed refreshes change the status, not the last successful observation or signed snapshot. */
export function retainPrices(previous: PriceResult | undefined, next: PriceResult): PriceResult {
  return previous && ["setup", "error"].includes(next.status)
    ? { ...previous, status: next.status, cached: false, message: next.message }
    : next;
}
export function savePriceResult(key: string, result: PriceResult): StoredPrices {
  const all = loadPrices();
  all[key] = retainPrices(all[key], result);
  const bounded = Object.fromEntries(Object.entries(all).slice(-100));
  try { localStorage.setItem(PRICE_STORAGE_KEY, JSON.stringify(bounded)); } catch {}
  return bounded;
}
export function currentSnapshots(list: ListEntry[], location: string): OfferSnapshot[] {
  const all = loadPrices();
  return list.flatMap((entry) => {
    const snapshot = all[requestKey(entry, location)]?.snapshot;
    return snapshot ? [snapshot] : [];
  });
}

/** Search published prices for one list item and keep the result in this browser. Never throws. */
export async function fetchPrices(entry: ListEntry, location: string, timeoutMs = 55_000): Promise<PriceResult> {
  let result: PriceResult;
  try {
    const response = await fetch("/api/prices", { method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ entry, location }), signal: AbortSignal.timeout(timeoutMs) });
    const body = await response.json();
    if (!Array.isArray(body.offers) || !["ok", "empty", "setup", "error"].includes(body.status)) throw new Error("response");
    result = body as PriceResult;
  } catch {
    result = { status: "error", offers: [], matching: "unconfirmed", cached: false, message: "Refresh failed. Earlier prices are still shown with their original timestamps. Retry this item." };
  }
  savePriceResult(key(entry, location), result);
  return result;
}
const key = requestKey;
