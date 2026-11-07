"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { itemById, storeById } from "@/lib/catalog";
import { travelMinutes } from "@/lib/geo";
import { appleMapsUrl, googleMapsUrl, legs, orderUrl } from "@/lib/handoff";
import { clock, load, loadReceipts, save, toTrip, type Saved } from "@/lib/session";
import type { Goal, LineItem, Plan, Trip } from "@/lib/types";
import { CHEVRON, GOALS, Icon, Segments, TopBar } from "../ui";

type State = { status: "loading" } | { status: "error"; message: string } | { status: "ok"; plans: Plan[] };

const CHANNEL: Record<string, string> = { instacart: "Instacart", amazon: "Amazon", doordash: "DoorDash", ubereats: "Uber Eats" };
const money = (n: number) => `$${n.toFixed(2)}`;
/** "Walmart Supercenter (South Salt Lake)" -> "Walmart" for buttons and strata labels. */
const shortName = (id: string) => storeById(id)?.name.split(" ")[0] ?? id;
const planKey = (p: Plan) => JSON.stringify([p.stops.map((s) => s.storeId), p.onlineOrders.map((o) => o.storeId + o.channel)]);

export default function PlanPage() {
  const [saved, setSaved] = useState<Saved | null>(null);
  const [state, setState] = useState<State>({ status: "loading" });
  const rail = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const s = load();
    setSaved(s);
    fetch("/api/plan", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ list: s.list, trip: toTrip(s.trip), memberships: {}, quotes: loadReceipts() }),
    })
      .then(async (r) => (r.ok ? setState({ status: "ok", plans: (await r.json()).plans }) : Promise.reject((await r.json()).error)))
      .catch((err) => setState({ status: "error", message: typeof err === "string" ? err : "Couldn't reach the planner. Check your connection and try again." }));
  }, []);

  // The chosen goal owns the screen; the other plans are one swipe away.
  const goal = saved?.goal ?? "savings";
  const index = GOALS.findIndex((g) => g.id === goal);
  useEffect(() => {
    const el = rail.current;
    if (el && state.status === "ok") el.scrollTo({ left: index * el.clientWidth, behavior: "instant" as ScrollBehavior });
  }, [state.status]); // eslint-disable-line react-hooks/exhaustive-deps

  const pickGoal = (g: Goal) => {
    if (!saved) return;
    const next = { ...saved, goal: g };
    setSaved(next);
    save(next);
    const el = rail.current;
    el?.scrollTo({ left: GOALS.findIndex((x) => x.id === g) * el.clientWidth, behavior: "smooth" });
  };
  const onScroll = () => {
    const el = rail.current;
    if (!el || !saved) return;
    const g = GOALS[Math.round(el.scrollLeft / el.clientWidth)]?.id;
    if (g && g !== saved.goal) setSaved({ ...saved, goal: g });
  };

  const trip = saved && toTrip(saved.trip);

  return (
    <>
      <TopBar right={<Link href="/" className="text-tan underline">Edit list</Link>} />
      {saved && trip && (
        <div className="mx-auto max-w-xl">
          <p className="flex justify-between gap-3 border-b border-varnish/25 px-4 py-3 text-body">
            <span className="truncate">{trip.start.label} → {trip.end.label}</span>
            <span className="shrink-0">{trip.mode === "car" ? "Car" : "No car"}{saved.trip.homeBy && ` · by ${clock(saved.trip.homeBy)}`}</span>
          </p>
          <div className="px-4 pt-3">
            <Segments label="Goal" options={GOALS} value={saved.goal} onChange={pickGoal} />
          </div>
        </div>
      )}

      <main className="mx-auto max-w-xl pb-10">
        {state.status === "loading" && <p className="px-4 pt-8 text-varnish-soft">Fitting your list into your trip…</p>}
        {state.status === "error" && (
          <div role="alert" className="px-4 pt-8">
            <p className="font-semibold">{state.message}</p>
            <Link href="/" className="mt-3 inline-block underline">Back to your list</Link>
          </div>
        )}
        {state.status === "ok" && state.plans.length === 0 && saved && (
          <div className="px-4 pt-8">
            <p className="text-head font-bold">No plan fits by {clock(saved.trip.homeBy)}.</p>
            <p className="mt-2">No store mix covers your whole list in that time. Try a later home-by time, switch to Car, or take an item off.</p>
            <Link href="/" className="mt-4 inline-block rounded-lg bg-varnish px-5 py-3 font-semibold text-white no-underline">Change the trip</Link>
          </div>
        )}
        {state.status === "ok" && state.plans.length > 0 && trip && (
          <div ref={rail} onScroll={onScroll} className="flex snap-x snap-mandatory overflow-x-auto [scrollbar-width:none]">
            {state.plans.map((p, i) => {
              const same = state.plans.findIndex((q) => planKey(q) === planKey(p));
              return (
                <section key={p.goal} aria-label={GOALS[i].label} className="w-full shrink-0 snap-start px-4 pt-5">
                  {same < i && <p className="mb-3 text-small font-semibold text-varnish-soft">Same plan as {GOALS[same].label}.</p>}
                  <PlanView plan={p} plans={state.plans} trip={trip} rim={saved?.trip.homeBy ? `Home by ${clock(saved.trip.homeBy)}` : "No time limit"} />
                </section>
              );
            })}
          </div>
        )}
      </main>
    </>
  );
}

/** What this plan saves: money vs one store or vs the priciest plan, or time vs the cheapest plan. */
function savingsLine(plan: Plan, plans: Plan[]): string {
  const cheapest = plans.reduce((a, b) => (b.money < a.money ? b : a));
  const priciest = plans.reduce((a, b) => (b.money > a.money ? b : a));
  const label = (p: Plan) => GOALS.find((g) => g.id === p.goal)!.label;
  if (plan.savingsVsOneStore >= 0.5) return `${money(plan.savingsVsOneStore)} less than the cheapest single store`;
  if (plan.money <= cheapest.money + 0.005) {
    const vs = priciest.money - plan.money;
    return vs >= 0.5 ? `Cheapest plan · ${money(vs)} less than ${label(priciest)}` : "Cheapest single store for your whole list";
  }
  const mins = cheapest.minutes - plan.minutes;
  const extra = money(plan.money - cheapest.money);
  return mins > 0 ? `Saves ${mins} min vs ${label(cheapest)} · costs ${extra} more` : `${extra} more than ${label(cheapest)}`;
}

function PlanView({ plan, plans, trip, rim }: { plan: Plan; plans: Plan[]; trip: Trip; rim: string }) {
  const stopPlaces = plan.stops.map((s) => {
    const st = storeById(s.storeId)!;
    return { lat: st.lat, lng: st.lng, label: shortName(s.storeId) };
  });
  const gMode = trip.mode === "car" ? "driving" : "transit";
  const groceriesAndFees = [...plan.stops, ...plan.onlineOrders].reduce((s, g) => s + g.items.reduce((t, l) => t + l.cost, 0), 0) +
    plan.onlineOrders.reduce((s, o) => s + o.fee, 0);
  const driving = Math.max(0, plan.money - groceriesAndFees);
  return (
    <div className="flex gap-4">
      <Strata plan={plan} trip={trip} rim={rim} />
      <div className="min-w-0 flex-1">
        <p className="text-total font-bold leading-none tracking-tight">{money(plan.money)}</p>
        <p className="mt-1.5 text-body">
          About {plan.minutes} min · {plan.stopCount === 0 ? "no stops" : `${plan.stopCount} stop${plan.stopCount > 1 ? "s" : ""}`}
          {trip.mode === "car" && plan.stopCount > 0 && ` · ${plan.miles} mi, incl. ${money(driving)} driving`}
        </p>
        <p className="mt-2.5 inline-block rounded bg-sage px-2 py-1 text-small font-semibold text-white">{savingsLine(plan, plans)}</p>

        {plan.stops.map((s, i) => (
          <Group key={s.storeId} title={`${i + 1}. ${storeById(s.storeId)?.name}`} sub="In person" lines={s.items} />
        ))}
        {plan.onlineOrders.map((o) => (
          <Group key={o.storeId + o.channel} title={`${storeById(o.storeId)?.name}`} sub={`Delivered via ${CHANNEL[o.channel]} · fee ${money(o.fee)}`} lines={o.items} />
        ))}

        <div className="mt-4 flex flex-col gap-2">
          {plan.stops.length > 0 && trip.mode === "car" && (
            <>
              <Btn primary href={googleMapsUrl(trip.start, trip.end, stopPlaces, "driving")}>Open in Google Maps</Btn>
              <Btn href={appleMapsUrl(trip.start, trip.end, stopPlaces, "driving")}>Open in Apple Maps</Btn>
            </>
          )}
          {plan.stops.length > 0 && trip.mode === "no_car" &&
            legs(trip.start, trip.end, stopPlaces).map(([a, b], i) => (
              <Btn key={i} primary={i === 0} href={googleMapsUrl(a, b, [], gMode)}>
                {i === 0 ? "Go to " : "Then to "}{b.label}
              </Btn>
            ))}
          {plan.onlineOrders.map((o) => {
            const url = orderUrl(storeById(o.storeId)!, o.channel, o.items[0]?.quote.link);
            return url && (
              <Btn key={o.storeId + o.channel} primary={plan.stops.length === 0} href={url}>
                Order {shortName(o.storeId)} on {CHANNEL[o.channel]}
              </Btn>
            );
          })}
        </div>

        {plan.warnings.length > 0 && (
          <ul className="mt-4 space-y-1 border-t border-varnish/25 pt-3 text-small">
            {plan.warnings.map((w) => <li key={w}>{w}</li>)}
          </ul>
        )}
        <p className="mt-4 text-small text-varnish-soft">
          Times are estimates; your maps app shows the real time.{" "}
          <Link href="/scan" className="font-semibold text-varnish underline">Scan a receipt</Link> to use real prices.
        </p>
      </div>
    </div>
  );
}

function Group({ title, sub, lines }: { title: string; sub: string; lines: LineItem[] }) {
  const total = lines.reduce((s, l) => s + l.cost, 0);
  return (
    <details className="group mt-4 border-t border-varnish pt-2.5">
      <summary className="cursor-pointer list-none [&::-webkit-details-marker]:hidden">
        <span className="block text-head font-semibold text-balance">{title}</span>
        <span className="block text-small">
          {sub} · {money(total)}
          {lines.some((l) => l.quote.source === "demo") && " · demo prices"}
        </span>
        <span className="mt-1 inline-flex items-center gap-1 text-small font-semibold underline">
          <span className="group-open:hidden">Show {lines.length} items</span>
          <span className="hidden group-open:inline">Hide items</span>
          <Icon d={CHEVRON} className="size-4 transition-transform group-open:rotate-180" />
        </span>
      </summary>
      <ul className="mt-2 space-y-1 text-small">
        {lines.map((l) => (
          <li key={l.itemId} className="flex justify-between gap-2">
            <span className="min-w-0 truncate">{itemById(l.itemId)?.name}{l.packs > 1 && ` ×${l.packs}`}</span>
            <span className="shrink-0">
              {money(l.cost)}
              {l.quote.source !== "demo" && <span className="text-varnish-soft"> {l.quote.source}</span>}
            </span>
          </li>
        ))}
      </ul>
    </details>
  );
}

function Btn({ href, primary, children }: { href: string; primary?: boolean; children: React.ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer"
      className={`block rounded-lg px-3 py-3 text-center text-body font-semibold no-underline ${
        primary ? "bg-varnish text-white hover:bg-wingate" : "border border-varnish text-varnish hover:bg-sky-deep"
      }`}>
      {children}
    </a>
  );
}

/** Signature: the trip's minutes stacked as sandstone layers up to the rim (the time limit); spare time is sky. */
function Strata({ plan, trip, rim }: { plan: Plan; trip: Trip; rim: string }) {
  const pts = [trip.start, ...plan.stops.map((s) => ({ ...storeById(s.storeId)!, label: shortName(s.storeId) })), trip.end];
  const layers: { label: string; min: number; kind: "travel" | "shop" }[] = [];
  for (let i = 1; i < pts.length; i++) {
    layers.push({ kind: "travel", min: travelMinutes(pts[i - 1], pts[i], trip.mode), label: `${trip.mode === "car" ? "Drive" : "Ride"} ${i === pts.length - 1 ? "home" : `to ${pts[i].label}`}` });
    if (i < pts.length - 1) layers.push({ kind: "shop", min: trip.minutesPerStop, label: "Shop" });
  }
  const used = layers.reduce((s, l) => s + l.min, 0);
  const cap = Math.max(trip.timeLimitMin ?? used, used);
  const spare = Math.round(cap - used);
  const travelTone = ["bg-navajo", "bg-tan"];
  let t = 0;
  return (
    <figure aria-label={`About ${plan.minutes} of ${cap} minutes used; ${rim}`} className="w-[104px] shrink-0">
      <figcaption className="pb-1 text-small font-semibold leading-tight">{rim}</figcaption>
      <div className="flex h-[min(56vh,450px)] flex-col-reverse overflow-hidden border border-t-2 border-varnish [border-top-style:dashed]">
      {layers.map((l, i) => (
        <div key={i} style={{ flexGrow: l.min, animationDelay: `${i * 70}ms` }} title={`${l.label} · ${Math.round(l.min)} min`}
          className={`stratum flex min-h-0 items-center border-t border-varnish px-1.5 text-small font-semibold leading-tight ${
            l.kind === "shop" ? "bg-wingate text-white" : travelTone[t++ % 2]
          }`}>
          {l.min / cap > 0.07 && <span className="line-clamp-2">{l.label} {Math.round(l.min)}</span>}
        </div>
      ))}
      {spare > 0 && (
        <div style={{ flexGrow: cap - used }} className="flex min-h-0 items-end bg-sky px-1.5 pb-1 text-small leading-tight">
          {spare} min to spare
        </div>
      )}
      </div>
    </figure>
  );
}
