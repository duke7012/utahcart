import { roadMiles, travelMinutes } from "./geo";
import { channelTerms, quotesFor, round2 } from "./prices";
import type { CatalogData, Channel, Goal, LineItem, ListEntry, Memberships, Plan, PricingMode, Store, Trip } from "./types";

const MAX_STOPS = 3;
const MOST_OF_PACK = 0.75; // a pack is "bulk overbuy" when the list uses less than this share of it

type Option = { store: Store; channel: Channel };
type Candidate = Omit<Plan, "goal" | "savingsVsOneStore">;

function permutations<T>(xs: T[]): T[][] {
  if (xs.length <= 1) return [xs];
  return xs.flatMap((x, i) => permutations([...xs.slice(0, i), ...xs.slice(i + 1)]).map((rest) => [x, ...rest]));
}

/** Each store: skip, in person (if the user can get in), or one online channel it offers. */
function setups(data: CatalogData, m: Memberships, mode: PricingMode): Option[][] {
  let all: Option[][] = [[]];
  for (const store of data.stores) {
    const choices = store.channels.filter((ch) =>
      ch === "in_person" ? !store.membershipRequired || !!m[store.membershipRequired] : mode === "demo" && !!data.channels[ch],
    );
    all = all.flatMap((s) => [s, ...choices.map((channel) => [...s, { store, channel }])]);
  }
  return all.filter((s) => s.length > 0 && s.filter((o) => o.channel === "in_person").length <= MAX_STOPS);
}

function evaluate(setup: Option[], list: ListEntry[], trip: Trip, m: Memberships, data: CatalogData, mode: PricingMode): Candidate | null {
  const lines: LineItem[][] = setup.map(() => []);
  const warnings = new Set<string>();

  for (const entry of list) {
    const item = data.items.find((i) => i.id === entry.itemId);
    if (!item) return null;
    const needed = entry.qty * item.typicalSize;
    const cands = setup.flatMap((o, idx) => quotesFor(data, entry, o.store, o.channel, m, mode).map((quote) => {
      const packs = Math.ceil(needed / quote.size - 1e-9);
      return { idx, quote, packs, cost: packs * quote.price, unit: quote.price / quote.size, overbuy: needed / (packs * quote.size) < MOST_OF_PACK };
    }));
    if (!cands.length) return null; // this setup can't cover the list
    const fits = entry.bulkOk ? cands : cands.filter((c) => !c.overbuy);
    const pool = fits.length ? fits : cands;
    const best = pool.reduce((a, b) => (b.unit < a.unit || (b.unit === a.unit && b.cost < a.cost) ? b : a));
    if (best.overbuy && !entry.bulkOk) {
      warnings.add(`Bulk pack: ${item.name} comes in ${best.quote.size * best.packs} ${item.unit}, you need ${needed}.`);
    }
    if (best.quote.source === "estimate") warnings.add("Some online prices are estimates (in-store price x typical markup).");
    if (best.quote.offer && !best.quote.offer.locationVerified) warnings.add("Local branch price unconfirmed. Stops are proposed; totals and savings are estimates.");
    lines[best.idx].push({ itemId: item.id, qty: entry.qty, quote: best.quote, packs: best.packs, cost: round2(best.cost) });
  }

  // A store that gets no items is just a longer copy of a smaller setup.
  if (lines.some((l) => l.length === 0)) return null;

  let money = 0;
  const onlineOrders: Plan["onlineOrders"] = [];
  const inPerson: { store: Store; items: LineItem[] }[] = [];
  for (const [idx, o] of setup.entries()) {
    const subtotal = lines[idx].reduce((s, l) => s + l.cost, 0);
    money += subtotal;
    if (o.channel === "in_person") {
      inPerson.push({ store: o.store, items: lines[idx] });
      continue;
    }
    const terms = channelTerms(data.channels[o.channel]!, o.store, m);
    if (subtotal < terms.minOrder) return null;
    const fee = terms.fee(subtotal);
    money += fee;
    onlineOrders.push({ storeId: o.store.id, channel: o.channel, items: lines[idx], fee });
  }

  // Try every visit order (at most 3! = 6) and keep the shortest.
  let best = { order: inPerson, miles: Infinity, minutes: Infinity };
  for (const order of permutations(inPerson)) {
    const pts = [trip.start, ...order.map((s) => s.store), trip.end];
    let miles = 0;
    let minutes = 0;
    for (let i = 1; i < pts.length; i++) {
      miles += roadMiles(pts[i - 1], pts[i]);
      minutes += travelMinutes(pts[i - 1], pts[i], trip.mode);
    }
    if (miles < best.miles) best = { order, miles, minutes };
  }
  const minutes = best.minutes + trip.minutesPerStop * inPerson.length;
  if (trip.timeLimitMin !== undefined && minutes > trip.timeLimitMin) return null;
  if (trip.mode === "car") money += best.miles * trip.costPerMile;

  return {
    stops: best.order.map((s) => ({ storeId: s.store.id, items: s.items })),
    onlineOrders,
    money: round2(money),
    minutes: Math.round(minutes),
    miles: Math.round(best.miles * 10) / 10,
    stopCount: inPerson.length,
    estimated: mode === "demo" || lines.flat().some((l) => l.quote.source === "estimate" || (l.quote.offer && !l.quote.offer.locationVerified)),
    warnings: [...warnings],
  };
}

const PICK: Record<Goal, (a: Candidate, b: Candidate) => number> = {
  savings: (a, b) => a.money - b.money || a.minutes - b.minutes,
  fewest_stops: (a, b) => a.stopCount - b.stopCount || a.money - b.money,
  time: (a, b) => a.minutes - b.minutes || a.money - b.money,
};

/** Best plan per goal, in order [savings, fewest_stops, time]. Empty when nothing covers the list in time. */
export function planTrip(list: ListEntry[], trip: Trip, memberships: Memberships, data: CatalogData, mode: PricingMode = "real"): Plan[] {
  if (!list.length) return [];
  const cands = setups(data, memberships, mode)
    .map((s) => evaluate(s, list, trip, memberships, data, mode))
    .filter((c): c is Candidate => c !== null);
  if (!cands.length) return [];

  const singles = cands.filter((c) => c.stopCount === 1 && c.onlineOrders.length === 0).map((c) => c.money);
  const oneStore = singles.length ? Math.min(...singles) : undefined;

  return (Object.keys(PICK) as Goal[]).map((goal) => {
    const c = [...cands].sort(PICK[goal])[0];
    return { ...c, estimated: c.estimated || cands.some((s) => s.money === oneStore && s.estimated), goal, savingsVsOneStore: oneStore === undefined ? null : round2(oneStore - c.money) };
  });
}

/** Missing prices are explicit diagnostics; they never become zero or disappear from a basket. */
export function priceCoverage(list: ListEntry[], memberships: Memberships, data: CatalogData, mode: PricingMode = "real") {
  return list.map((entry) => ({ itemId: entry.itemId, available: data.stores.some((store) =>
    (!store.membershipRequired || memberships[store.membershipRequired]) && quotesFor(data, entry, store, "in_person", memberships, mode).length > 0) }));
}
