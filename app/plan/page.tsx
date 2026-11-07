"use client";

import Link from "next/link";
import { ArrowLeft, ArrowRight, CircleDollarSign, ShoppingBag, Timer } from "lucide-react";
import { itemById } from "@/lib/catalog";
import { ampm } from "@/lib/session";
import type { Goal, Plan } from "@/lib/types";
import { GOALS, Intro, PriceNote, Screen, card, fine, money, primaryBtn } from "../ui";
import { SetupCard, brand, breakdown, planKey, route, usePlans } from "./use-plans";

const ICON: Record<Goal, typeof CircleDollarSign> = { savings: CircleDollarSign, fewest_stops: ShoppingBag, time: Timer };
const today = new Date().toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" }).toUpperCase();

export default function PlansPage() {
  const { saved, trip, state, checking } = usePlans();

  const ordered = state.status === "ok" && saved
    ? [...state.plans].sort((a, b) => Number(b.goal === saved.goal) - Number(a.goal === saved.goal))
    : [];
  const baseline = state.status === "ok" ? state.plans.find((p) => p.savingsVsOneStore !== null && p.savingsVsOneStore !== 0) : undefined;
  const missingPrices = state.status === "ok" ? state.coverage.filter((c) => !c.available) : [];

  return (
    <Screen>
      <Link href="/list" className="flex items-center gap-2 text-[13px] font-semibold text-bee no-underline"><ArrowLeft size={16} aria-hidden /> Back to your list</Link>
      <Intro eyebrow={`PLANS · ${today}`} title={<>A little planning.<br />More left over.</>}
        sub={saved && trip && `${saved.list.length} ${saved.list.length === 1 ? "item" : "items"} · ${trip.start.lat === trip.end.lat && trip.start.lng === trip.end.lng ? `${trip.start.label} · round trip` : `${trip.start.label} → ${trip.end.label}`} · ${trip.mode === "car" ? "Car" : "No car"}${trip.timeLimitMin ? ` · ${trip.timeLimitMin} min` : ""}`} />
      {saved && (
        <div className="-mt-2 flex flex-wrap gap-2 text-[12px]">
          {saved.trip.leave && <span className="rounded-[8px] px-2.5 py-1.5">Leave {ampm(saved.trip.leave)}</span>}
          <span className="rounded-[8px] px-2.5 py-1.5">{saved.trip.homeBy ? `Home by ${ampm(saved.trip.homeBy)}` : "No time limit"}</span>
          <Link href="/list" className="rounded-[8px] bg-honey-tint px-2.5 py-1.5 font-semibold text-bee no-underline">Edit trip</Link>
        </div>
      )}

      {state.status === "setup" && <SetupCard missing={state.missing} />}
      {saved?.priceMode === "demo" && <p className="rounded-[10px] bg-amber-tint p-3 text-[12px]">EXAMPLE MODE · Includes demo prices and assumed delivery fees and markups. <Link href="/list">Switch to real prices</Link>.</p>}
      {state.status === "loading" && <p className="text-[14px] text-muted">Fitting your list into your day…</p>}
      {checking > 0 && <p role="status" className="rounded-[10px] bg-honey-tint p-3 text-[13px]">Checking live store prices for {checking} {checking === 1 ? "item" : "items"}… your plans update when it’s done.</p>}
      {state.status === "error" && (
        <div role="alert" className={`${card} p-[18px]`}>
          <p className="text-[14px] font-semibold">{state.message}</p>
          <Link href="/list" className="mt-2 inline-block text-[13px] font-semibold text-bee">Back to your list</Link>
        </div>
      )}
      {state.status === "ok" && state.plans.length === 0 && saved && (
        <div className={`${card} flex flex-col gap-3 p-[18px]`}>
          <p className="text-[20px] font-bold">{missingPrices.length ? "Your basket is missing usable prices." : saved.trip.homeBy ? `No plan fits by ${ampm(saved.trip.homeBy)}.` : "No store mix covers your list."}</p>
          <p className="text-[14px] text-muted">{missingPrices.length ? `No matching price found for: ${missingPrices.map((c) => itemById(c.itemId)?.name ?? c.itemId).join(", ")}. Remove it from your list, scan a receipt that has it, or switch to example mode on the List page. No partial total is shown.` : "No store mix covers your whole list in that time. Try a longer time limit or switch to Car."}</p>
          <Link href="/list" className={primaryBtn}>Change the trip <ArrowRight size={18} aria-hidden /></Link>
        </div>
      )}

      {ordered.map((p, i) => {
        const same = ordered.slice(0, i).find((q) => planKey(q) === planKey(p));
        return <PlanCard key={p.goal} plan={p} chosen={p.goal === saved?.goal} sameAs={same?.goal} />;
      })}

      {baseline && (
        <div className={`${card} flex flex-col gap-3 p-[18px]`}>
          <h2 className="text-[16px]">A fair comparison, not a live quote</h2>
          <div className="flex justify-between text-[14px]">
            <span className="text-muted">Cheapest single store, in person</span>
            <span className="font-semibold">{money(baseline.money + baseline.savingsVsOneStore!)}</span>
          </div>
          <p className={fine}>
            {saved?.priceMode === "demo" ? <PriceNote /> : "Uses confirmed receipts and matched published observations."} Totals include known fees and estimated driving costs; taxes and tips are excluded. Times are estimates.
          </p>
        </div>
      )}
      <p className={fine}>Delivery plans assume an order placed after you’re home; confirm availability with the store. Times include shopping or ordering, not delivery wait.</p>
    </Screen>
  );
}

function PlanCard({ plan, chosen, sameAs }: { plan: Plan; chosen: boolean; sameAs?: Goal }) {
  const Icon = ICON[plan.goal];
  const label = GOALS.find((g) => g.id === plan.goal)!.label;
  const b = breakdown(plan);
  const href = `/plan/details?goal=${plan.goal}`;
  const groups = [...plan.stops.map((s) => ({ id: s.storeId, items: s.items })), ...plan.onlineOrders.map((o) => ({ id: o.storeId, items: o.items }))];
  return (
    <section aria-label={label} className={`flex flex-col gap-3 rounded-[18px] p-[18px] ${chosen ? "border-2 border-bee bg-honey-tint" : "border border-line bg-white"}`}>
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-[16px] font-semibold text-bee"><Icon size={18} aria-hidden /> {label}</h2>
        {chosen && <span className="text-[11px] tracking-[0.6px] text-bee">YOUR GOAL</span>}
      </div>
      <div className="flex items-start justify-between gap-3">
        <div><p className="text-[34px] font-bold leading-none tracking-[-1px]">{money(plan.money)}</p><p className={fine}>{plan.estimated ? "Estimated total" : "Total before tax and tips"}</p></div>
        <p className="text-right text-[13px] leading-[1.45]">
          <span className="block font-semibold">{plan.stopCount} {plan.stopCount === 1 ? "stop" : "stops"} in person</span>
          <span className="text-muted">~{plan.minutes} min to home</span>
        </p>
      </div>
      {sameAs && <p className="text-[12px] text-muted">Same plan as {GOALS.find((g) => g.id === sameAs)!.label}.</p>}
      <p className="text-[14px]">{route(plan)}</p>
      <p className="text-[12px] leading-[1.45] text-muted">
        {groups.map((g) => `${brand(g.id)}: ${g.items.slice(0, 3).map((l) => itemById(l.itemId)?.name.toLowerCase()).join(", ")}${g.items.length > 3 ? ` +${g.items.length - 3} more` : ""}.`).join(" ")}
      </p>
      <p className="text-[12px] text-muted">
        Items {money(b.items)}{b.fees ? ` + delivery ${money(b.fees)}` : ""} · Travel {money(b.driving)}
      </p>
      <div className="flex items-center justify-between">
        {plan.savingsVsOneStore === null ? (
          <p className="text-[12px] text-muted">No complete one-store comparison</p>
        ) : plan.savingsVsOneStore >= 0.5 ? (
          <p className="text-[14px] font-semibold text-leaf">{plan.estimated ? "Estimated savings" : "Save"} {money(plan.savingsVsOneStore)}</p>
        ) : plan.savingsVsOneStore <= -0.5 ? (
          <p className="text-[14px] font-semibold text-carrot">{money(-plan.savingsVsOneStore)} more</p>
        ) : (
          <p className="text-[14px] font-semibold text-bee">Cheapest single store</p>
        )}
        {plan.savingsVsOneStore !== null && <span className="text-[12px] text-muted">vs. one-store shop</span>}
      </div>
      {plan.warnings.length > 0 && <p className="rounded-[10px] bg-amber-tint px-3 py-2 text-[12px] leading-[1.45]">{plan.warnings[0]}</p>}
      {chosen ? (
        <Link href={href} className={primaryBtn}>See my plan <ArrowRight size={18} aria-hidden /></Link>
      ) : (
        <Link href={href} className="flex items-center justify-between pt-1 text-[14px] text-ink no-underline">View plan <ArrowRight size={18} aria-hidden /></Link>
      )}
    </section>
  );
}
