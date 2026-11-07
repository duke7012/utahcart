import type { CatalogData, Channel, ChannelInfo, Memberships, PriceQuote, Store } from "./types";

// Fresh real-world quotes beat seeded and demo ones; within a rank the newest wins.
const RANK: Record<PriceQuote["source"], number> = { receipt: 3, shop: 3, seed: 2, demo: 1, estimate: 0 };

export const round2 = (n: number) => Math.round(n * 100) / 100;

function bestQuote(prices: PriceQuote[], itemId: string, storeId: string, channel: Channel) {
  return prices
    .filter((p) => p.itemId === itemId && p.storeId === storeId && p.channel === channel)
    .sort((a, b) => RANK[b.source] - RANK[a.source] || b.seenAt.localeCompare(a.seenAt))[0];
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
export function quoteFor(data: CatalogData, itemId: string, store: Store, channel: Channel, m: Memberships): PriceQuote | undefined {
  const direct = bestQuote(data.prices, itemId, store.id, channel);
  if (direct || channel === "in_person") return direct;
  const base = bestQuote(data.prices, itemId, store.id, "in_person");
  const info = data.channels[channel];
  if (!base || !info) return undefined;
  const { markup } = channelTerms(info, store, m);
  return { ...base, channel, price: round2(base.price * markup), source: "estimate", link: undefined };
}
