import { categoryConflict, normalize, normalizeBrand } from "./offers";
import type { CatalogData, Channel, ChannelInfo, ListEntry, Memberships, PriceQuote, PricingMode, Store } from "./types";

// Fresh real-world quotes beat seeded and demo ones; within a rank the newest wins.
const RANK: Record<PriceQuote["source"], number> = { receipt: 3, shop: 3, seed: 2, google_shopping: 2, demo: 1, estimate: 0 };

export const round2 = (n: number) => Math.round(n * 100) / 100;

/** Keep distinct packages, but use the newest/best-evidenced observation of each product. */
export function quotesFor(data: CatalogData, entry: ListEntry, store: Store, channel: Channel, m: Memberships, mode: PricingMode = "real"): PriceQuote[] {
  const item = data.items.find((i) => i.id === entry.itemId);
  const direct = data.prices.filter((p) => {
    if (p.itemId !== entry.itemId || p.storeId !== store.id || p.channel !== channel || !item || p.unit !== item.unit ||
      !Number.isFinite(p.price) || p.price <= 0 || !Number.isFinite(p.size) || p.size <= 0) return false;
    if (mode === "demo") return true;
    if (["demo", "estimate"].includes(p.source) || p.demo || categoryConflict(item.id, p.product ?? "")) return false;
    if (p.offer) {
      if (!p.offer.matchingConfirmed || !["exact", "substitute"].includes(p.offer.match)) return false;
      if (entry.brandLock?.trim() && (!p.offer.brand || normalizeBrand(p.offer.brand) !== normalizeBrand(entry.brandLock))) return false;
      return true; // Signed offers were checked against the full current request by /api/plan.
    }
    // A receipt is confirmed by the user for its canonical item. Legacy retailer imports need matching first.
    return ["receipt", "shop"].includes(p.source) && !entry.brandLock?.trim() && !entry.productQuery?.trim();
  }).sort((a, b) => (b.demo ? 3 : RANK[b.source]) - (a.demo ? 3 : RANK[a.source]) || b.seenAt.localeCompare(a.seenAt));
  if (mode === "demo" && direct.length) return [direct[0]];
  const unique = new Map<string, PriceQuote>();
  for (const p of direct) {
    const key = JSON.stringify([normalize(p.product ?? entry.itemId), p.size, p.unit]);
    if (!unique.has(key)) unique.set(key, p);
  }
  if (unique.size || channel === "in_person" || mode !== "demo") return [...unique.values()];
  const base = quotesFor(data, entry, store, "in_person", m, mode)[0];
  const info = data.channels[channel];
  if (!base || !info) return [];
  return [{ ...base, channel, price: round2(base.price * channelTerms(info, store, m).markup), source: "estimate", link: undefined }];
}

/** Fee, minimum and markup for ordering from `store` through `info`, given the user's memberships. */
export function channelTerms(info: ChannelInfo, store: Store, m: Memberships) {
  const o = info.storeOverrides?.[store.id] ?? {};
  const channelMember = !!info.membership && !!m[info.membership];
  const storeMember = !!store.membershipRequired && !!m[store.membershipRequired];
  const freeOver = o.memberFreeOver ?? info.memberFreeOver;
  return {
    minOrder: o.minOrder ?? info.minOrder,
    markup: channelMember && storeMember && o.markupWithMembership ? o.markupWithMembership : (o.markup ?? info.markup),
    fee: (subtotal: number) => (channelMember && freeOver !== undefined && subtotal >= freeOver ? 0 : info.fee),
  };
}

/** Quote for item x store x channel; online channels fall back to in-store price x markup (source "estimate"). */
export function quoteFor(data: CatalogData, itemId: string, store: Store, channel: Channel, m: Memberships, mode: PricingMode = "real"): PriceQuote | undefined {
  return quotesFor(data, { itemId, qty: 1, bulkOk: false }, store, channel, m, mode)[0];
}
