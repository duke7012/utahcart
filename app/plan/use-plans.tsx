"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { storeById } from "@/lib/catalog";
import { load, missingSteps, planRequest, toTrip, tripReady, type ReadySaved } from "@/lib/session";
import type { Plan, Trip } from "@/lib/types";

export type PlansState =
  | { status: "loading" }
  | { status: "setup"; missing: string[] }
  | { status: "error"; message: string }
  | { status: "ok"; plans: Plan[] };

export const CHANNEL: Record<string, string> = { instacart: "Instacart", amazon: "Amazon", doordash: "DoorDash", ubereats: "Uber Eats" };
/** "Walmart Supercenter (South Salt Lake)" -> "Walmart" */
export const brand = (id: string) => storeById(id)?.name.split(" ")[0] ?? id;

/** Loads the saved cart and asks /api/plan for the three plans. */
export function usePlans() {
  const [saved, setSaved] = useState<ReadySaved | null>(null);
  const [state, setState] = useState<PlansState>({ status: "loading" });
  useEffect(() => {
    const s = load();
    if (!tripReady(s)) return setState({ status: "setup", missing: missingSteps(s) });
    setSaved(s);
    fetch("/api/plan", { method: "POST", headers: { "content-type": "application/json" }, body: planRequest(s) })
      .then(async (r) => (r.ok ? setState({ status: "ok", plans: (await r.json()).plans }) : Promise.reject((await r.json()).error)))
      .catch((err) => setState({ status: "error", message: typeof err === "string" ? err : "Couldn't reach the planner. Check your connection and try again." }));
  }, []);
  const trip: Trip | null = saved && toTrip(saved.trip);
  return { saved, trip, state };
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
