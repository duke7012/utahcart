"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { storeById } from "@/lib/catalog";
import { load, missingSteps, planRequest, toTrip, tripReady, type ReadySaved } from "@/lib/session";
import { DEFAULT_SEARCH_LOCATION, requestKey } from "@/lib/offers";
import { concurrencyLimit } from "@/lib/price-cache";
import { fetchPrices, loadPrices } from "@/lib/price-session";
import type { Plan, Trip } from "@/lib/types";

export type PlansState =
  | { status: "loading" }
  | { status: "setup"; missing: string[] }
  | { status: "error"; message: string }
  | { status: "ok"; plans: Plan[]; coverage: { itemId: string; available: boolean }[] };

export const CHANNEL: Record<string, string> = { instacart: "Instacart", amazon: "Amazon", doordash: "DoorDash", ubereats: "Uber Eats" };
/** "Walmart Supercenter (South Salt Lake)" -> "Walmart" */
export const brand = (id: string) => storeById(id)?.name.split(" ")[0] ?? id;

const slot = concurrencyLimit(3);

/**
 * Loads the saved cart and asks /api/plan for the three plans. Plans show right away with the prices BeeLow
 * already has; then live prices are searched for list items not checked yet, and the plans update once.
 */
export function usePlans() {
  const [saved, setSaved] = useState<ReadySaved | null>(null);
  const [state, setState] = useState<PlansState>({ status: "loading" });
  const [checking, setChecking] = useState(0);
  useEffect(() => {
    const s = load();
    if (!tripReady(s)) return setState({ status: "setup", missing: missingSteps(s) });
    setSaved(s);
    const plan = () => fetch("/api/plan", { method: "POST", headers: { "content-type": "application/json" }, body: planRequest(s) })
      .then(async (r) => {
        const body = await r.json();
        if (!r.ok) throw body.error;
        setState({ status: "ok", plans: body.plans, coverage: body.coverage ?? [] });
        return true;
      })
      .catch((err) => { setState({ status: "error", message: typeof err === "string" ? err : "Couldn't reach the planner. Check your connection and try again." }); return false; });
    plan().then(async (ok) => {
      if (!ok || (s.priceMode ?? "real") !== "real") return;
      const location = s.searchLocation ?? DEFAULT_SEARCH_LOCATION;
      const stored = loadPrices();
      const missing = s.list.filter((e) => !stored[requestKey(e, location)]);
      if (!missing.length) return;
      setChecking(missing.length);
      await Promise.all(missing.map((e) => slot(() => fetchPrices(e, location, 25_000))));
      setChecking(0);
      await plan();
    });
  }, []);
  const trip: Trip | null = saved && toTrip(saved.trip);
  return { saved, trip, state, checking };
}

/** Item cost, delivery fees and driving cost that add up to plan.money. */
export function breakdown(plan: Plan) {
  const items = [...plan.stops, ...plan.onlineOrders].reduce((s, g) => s + g.items.reduce((t, l) => t + l.cost, 0), 0);
  const fees = plan.onlineOrders.reduce((s, o) => s + o.fee, 0);
  return { items, fees, driving: Math.max(0, plan.money - items - fees) };
}

/** "Smith's → Harmons + Costco online" */
export function route(plan: Plan) {
  const stops = plan.stops.map((s) => brand(s.storeId)).join(" → ");
  const online = plan.onlineOrders.map((o) => `${brand(o.storeId)} via ${CHANNEL[o.channel]}`).join(" + ");
  return [stops, online].filter(Boolean).join(" + ");
}

/** Shown on the plan screens until the list and trip are set up. */
export function SetupCard({ missing }: { missing: string[] }) {
  return (
    <div className="flex flex-col gap-3 rounded-[18px] border border-line bg-white p-[18px]">
      <p className="text-[20px] font-bold">Finish setting up your trip</p>
      <ul className="list-disc pl-5 text-[14px] leading-[1.6] text-muted">{missing.map((m) => <li key={m}>{m}</li>)}</ul>
      <Link href="/list" className="flex h-[52px] items-center justify-center rounded-[12px] bg-bee text-[14px] text-white no-underline">Go to your list</Link>
    </div>
  );
}

export const planKey =(p: Plan) => JSON.stringify([p.stops.map((s) => s.storeId), p.onlineOrders.map((o) => o.storeId + o.channel)]);
