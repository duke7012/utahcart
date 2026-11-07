"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { ArrowLeft, Check, ExternalLink, House, Store, TriangleAlert } from "lucide-react";
import { itemById, storeById } from "@/lib/catalog";
import { travelMinutes } from "@/lib/geo";
import { appleMapsUrl, googleMapsUrl, legs, orderUrl } from "@/lib/handoff";
import { addMinutes, ampm } from "@/lib/session";
import type { Goal, LineItem, Plan, Trip } from "@/lib/types";
import { GOALS, Screen, UNIT_LABEL, card, fine, money, primaryBtn } from "../../ui";
import { CHANNEL, brand, breakdown, usePlans } from "../use-plans";

export default function DetailsPage() {
  return (
    <Suspense>
      <Details />
    </Suspense>
  );
}

const words = ["No", "One", "Two", "Three"];

function Details() {
  const goal = (useSearchParams().get("goal") ?? "savings") as Goal;
  const { saved, trip, state } = usePlans();
  const plan = state.status === "ok" ? state.plans.find((p) => p.goal === goal) : undefined;
  const label = GOALS.find((g) => g.id === goal)?.label ?? "Plan";

  return (
    <Screen>
      <Link href="/plan" className="flex items-center gap-2 text-[13px] font-semibold text-bee no-underline"><ArrowLeft size={16} aria-hidden /> All plans</Link>
      {state.status === "loading" && <p className="text-[14px] text-muted">Loading your plan…</p>}
      {state.status === "error" && <p role="alert" className="text-[14px] font-semibold">{state.message}</p>}
      {state.status === "ok" && !plan && <p className="text-[14px]">No plan fits this trip. <Link href="/list" className="font-semibold text-bee">Change the trip</Link></p>}
      {plan && trip && saved && <PlanDetail plan={plan} trip={trip} label={label} leave={saved.trip.leave} />}
    </Screen>
  );
}

function PlanDetail({ plan, trip, label, leave }: { plan: Plan; trip: Trip; label: string; leave: string }) {
  const [leg, setLeg] = useState(0);
  const [got, setGot] = useState<Record<string, boolean>>({});
  const b = breakdown(plan);
  const stopPts = plan.stops.map((s) => ({ lat: storeById(s.storeId)!.lat, lng: storeById(s.storeId)!.lng, label: brand(s.storeId) }));
  const allLegs = legs({ ...trip.start }, { ...trip.end }, stopPts);
  const current = allLegs[Math.min(leg, allLegs.length - 1)];
  const mode = trip.mode === "car" ? "driving" : "transit";
  const stops = plan.stopCount;
  const title = `${words[stops] ?? stops} ${stops === 1 ? "stop" : "stops"}.${plan.onlineOrders.length ? ` ${words[plan.onlineOrders.length]} ${plan.onlineOrders.length === 1 ? "delivery" : "deliveries"}.` : ""}`;
  const toggle = (k: string) => setGot((g) => ({ ...g, [k]: !g[k] }));

  return (
    <>
      <div className="flex flex-col gap-[9px]">
        <p className="text-[11px] font-bold tracking-[1.2px] text-bee">{label.toUpperCase()} · PLAN DETAILS</p>
        <h1 className="text-[32px] font-bold leading-[1.12] tracking-[-1.1px]">{title}</h1>
        <p className="text-[14px] text-muted">
          {stops ? "Fresh food on your route" : "Everything delivered"}{plan.onlineOrders.length && stops ? ", the rest sent home." : "."}
        </p>
      </div>

      <div className="flex flex-col gap-2 rounded-[18px] bg-honey-tint p-[18px]">
        <div className="flex items-start justify-between">
          <p className="text-[34px] font-bold leading-none tracking-[-1px]">{money(plan.money)}</p>
          {plan.savingsVsOneStore >= 0.5 && <span className="text-[11px] font-semibold text-leaf">SAVE {money(plan.savingsVsOneStore)}</span>}
        </div>
        <p className="text-[13px]">{stops} in-person {stops === 1 ? "stop" : "stops"} · ~{plan.minutes} min to home</p>
        <p className={fine}>Leave {ampm(leave)} → home about {ampm(addMinutes(leave, plan.minutes))}. Estimates, not live timing.</p>
      </div>

      {stops > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="text-[18px]">Your next leg</h2>
          <div className={`${card} flex flex-col gap-3 p-[18px]`}>
            <p className="flex items-center gap-2 text-[14px]"><Store size={16} aria-hidden /> {current[0].label} → {current[1].label}</p>
            <p className="text-[12px] text-muted">~{Math.round(travelMinutes(current[0], current[1], trip.mode))} min {trip.mode === "car" ? "drive" : "transit + walk"} · leg {Math.min(leg, allLegs.length - 1) + 1} of {allLegs.length}</p>
            <div className="flex gap-2 text-[11px]">
              <a href={googleMapsUrl(current[0], current[1], [], mode)} target="_blank" rel="noopener noreferrer" className="rounded-[8px] bg-honey-tint px-2.5 py-1.5 font-semibold text-bee no-underline">✓ Google Maps</a>
              <a href={appleMapsUrl(current[0], current[1], [], mode)} target="_blank" rel="noopener noreferrer" className="rounded-[8px] bg-canvas px-2.5 py-1.5 font-semibold text-ink no-underline">Apple Maps</a>
            </div>
            <a href={googleMapsUrl(current[0], current[1], [], mode)} target="_blank" rel="noopener noreferrer" className={primaryBtn}>
              {leg >= allLegs.length - 1 ? "Head home" : "Go to next stop"} <ExternalLink size={16} aria-hidden />
            </a>
            <p className={fine}>Opens directions for this leg only. Mark a stop done to get the next leg.</p>
          </div>
        </section>
      )}

      {stops > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="text-[18px]">Pick up along the way</h2>
          {plan.stops.map((s, i) => {
            const prev = i === 0 ? trip.start : storeById(plan.stops[i - 1].storeId)!;
            const mins = Math.round(travelMinutes(prev, storeById(s.storeId)!, trip.mode));
            const done = leg > i;
            return (
              <div key={s.storeId} className={`${card} flex flex-col gap-3 p-[18px] ${done ? "opacity-60" : ""}`}>
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-[10px] font-semibold tracking-[0.6px] text-bee">{i === 0 ? "FIRST STOP" : "THEN"} · ~{mins} MIN {trip.mode === "car" ? "DRIVE" : "TRANSIT"}, ~{trip.minutesPerStop} MIN SHOP</p>
                    <p className="text-[16px] font-semibold">{storeById(s.storeId)?.name}</p>
                  </div>
                  <p className="text-[16px] font-semibold">{money(s.items.reduce((t, l) => t + l.cost, 0))}</p>
                </div>
                <Lines lines={s.items} got={got} prefix={s.storeId} onToggle={toggle} />
                <button type="button" onClick={() => setLeg(i + 1)} disabled={done}
                  className="flex h-11 items-center justify-center gap-2 rounded-[10px] border border-line text-[13px] font-semibold text-bee disabled:text-muted">
                  {done ? "Done" : `Mark ${brand(s.storeId)} done`} <Check size={15} aria-hidden />
                </button>
              </div>
            );
          })}
          <p className="flex items-center gap-2 rounded-[10px] bg-canvas px-3 py-2.5 text-[12px] text-muted">
            <House size={15} aria-hidden /> Then home · ~{Math.round(travelMinutes(stopPts.at(-1)!, trip.end, trip.mode))} min. The last leg unlocks after your last stop.
          </p>
        </section>
      )}

      {plan.onlineOrders.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="text-[18px]">{stops ? "Send the rest home" : "Your delivery"}</h2>
          {plan.onlineOrders.map((o) => {
            const url = orderUrl(storeById(o.storeId)!, o.channel, o.items[0]?.quote.link);
            return (
              <div key={o.storeId + o.channel} className={`${card} flex flex-col gap-3 p-[18px]`}>
                <div className="flex items-center justify-between">
                  <p className="text-[16px] font-semibold">{brand(o.storeId)} via {CHANNEL[o.channel]}</p>
                  <span className="rounded-[6px] bg-honey-tint px-2 py-1 text-[10px] font-semibold text-bee">DELIVERY</span>
                </div>
                <Lines lines={o.items} got={got} prefix={o.storeId + o.channel} onToggle={toggle} />
                <p className="text-[12px] text-muted">Delivery fee {money(o.fee)}{o.fee === 0 ? " (membership)" : ""}</p>
                {url && <a href={url} target="_blank" rel="noopener noreferrer" className={primaryBtn}>Order on {CHANNEL[o.channel]} <ExternalLink size={16} aria-hidden /></a>}
                <p className={fine}>Opens {CHANNEL[o.channel]}. You build and pay for the order there.</p>
              </div>
            );
          })}
        </section>
      )}

      {plan.warnings.map((w) => (
        <p key={w} className="flex gap-2 rounded-[12px] bg-amber-tint p-[14px] text-[12px] leading-[1.45]">
          <TriangleAlert size={16} className="shrink-0" aria-hidden /> {w}
        </p>
      ))}

      <div className={`${card} flex flex-col gap-2.5 p-[18px] text-[13px]`}>
        <h2 className="mb-1 text-[16px]">Every dollar included</h2>
        <Row k="Items" v={money(b.items)} />
        <Row k="Delivery fees" v={money(b.fees)} />
        <Row k={trip.mode === "car" ? `Driving · ${plan.miles} mi at $0.30` : "Driving · no car"} v={money(b.driving)} />
        <div className="h-px bg-line" />
        <Row k="Estimated total" v={money(plan.money)} strong />
      </div>
      <p className={fine}>Demo prices · Nov 2026 unless marked from a receipt. No live inventory or arrival times. BeeLow doesn’t provide navigation, checkout or payment.</p>
    </>
  );
}

function Lines({ lines, got, prefix, onToggle }: { lines: LineItem[]; got: Record<string, boolean>; prefix: string; onToggle: (k: string) => void }) {
  return (
    <ul className="flex flex-col gap-2.5">
      {lines.map((l) => {
        const item = itemById(l.itemId);
        const k = prefix + l.itemId;
        return (
          <li key={l.itemId}>
            <label className="flex items-start gap-3 text-[13px]">
              <input type="checkbox" checked={!!got[k]} onChange={() => onToggle(k)} className="mt-0.5 size-4" />
              <span className={`flex-1 leading-[1.45] ${got[k] ? "text-muted line-through" : ""}`}>
                {item?.name} · {l.packs} × {l.quote.size} {UNIT_LABEL[l.quote.unit]}
                <span className="block text-[11px] text-muted no-underline">
                  {money(l.quote.price / l.quote.size)}/{UNIT_LABEL[l.quote.unit]} · {l.quote.source === "receipt" ? "receipt price" : l.quote.source === "estimate" ? "estimate" : "demo price"}
                </span>
              </span>
              <span>{money(l.cost)}</span>
            </label>
          </li>
        );
      })}
    </ul>
  );
}

function Row({ k, v, strong }: { k: string; v: string; strong?: boolean }) {
  return (
    <div className={`flex justify-between ${strong ? "text-[15px] font-bold" : ""}`}>
      <span className={strong ? "" : "text-muted"}>{k}</span>
      <span>{v}</span>
    </div>
  );
}
