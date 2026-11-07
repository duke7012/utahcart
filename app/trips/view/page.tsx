"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { ArrowLeft, RotateCcw } from "lucide-react";
import { itemById } from "@/lib/catalog";
import { ampm, addMinutes, load, loadTrips, save, type SavedTrip } from "@/lib/session";
import type { LineItem } from "@/lib/types";
import { useAccount } from "../../account";
import { GOALS, ProductImage, Screen, UNIT_LABEL, card, fine, money, primaryBtn } from "../../ui";
import { CHANNEL, brand, breakdown } from "../../plan/use-plans";
import { NeedLogin, SignedInRow, savedDay, stopSummary, tripTitle } from "../trip-bits";

export default function SavedTripPage() {
  return (
    <Suspense>
      <SavedTripView />
    </Suspense>
  );
}

function SavedTripView() {
  const id = useSearchParams().get("id");
  const account = useAccount();
  const [t, setT] = useState<SavedTrip | null | undefined>(undefined);
  useEffect(() => setT(loadTrips().find((x) => x.id === id) ?? null), [id]);

  return (
    <Screen>
      <SignedInRow />
      <Link href="/trips" className="flex items-center gap-2 text-[13px] font-semibold text-bee no-underline"><ArrowLeft size={16} aria-hidden /> Trip history</Link>
      {account && !account.user && <NeedLogin configured={account.configured} />}
      {account?.user && t === null && <p className="text-[14px]">This trip isn’t saved on this device. <Link href="/trips" className="font-semibold text-bee">See all trips</Link></p>}
      {account?.user && t && <Detail t={t} />}
    </Screen>
  );
}

function Detail({ t }: { t: SavedTrip }) {
  const router = useRouter();
  const p = t.plan;
  const b = breakdown(p);
  const goal = GOALS.find((g) => g.id === t.goal)?.label ?? "Plan";
  const items = t.list.length;
  const route = [t.trip.from?.label, ...p.stops.map((s) => brand(s.storeId)), (t.trip.to ?? t.trip.from)?.label].filter(Boolean).join(" → ");
  const reuse = () => {
    save({ ...load(), list: t.list, trip: t.trip, goal: t.goal });
    router.push("/plan");
  };

  return (
    <>
      <div className="flex flex-col gap-[9px]">
        <p className="text-[11px] font-bold tracking-[1.2px] text-bee">SAVED {savedDay(t.savedAt).toUpperCase()} · {goal.toUpperCase()}</p>
        <h1 className="text-[32px] font-bold leading-[1.12] tracking-[-1.1px]">{tripTitle(t.list)}</h1>
        <p className="text-[14px] text-muted">{stopSummary(t)}.</p>
      </div>

      <div className="flex flex-col gap-2 rounded-[18px] bg-honey-tint p-[18px]">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-[12px] text-muted">Saved planned total</p>
            <p className="text-[34px] font-bold leading-none tracking-[-1px]">{money(p.money)}</p>
          </div>
          <span className="rounded-[6px] bg-white px-2 py-1 text-[10px] font-semibold text-bee">Saved plan</span>
        </div>
        <p className="text-[13px]">{items} {items === 1 ? "item" : "items"} · {p.stopCount} in-person {p.stopCount === 1 ? "stop" : "stops"}{p.onlineOrders.length ? ` + ${p.onlineOrders.length} planned ${p.onlineOrders.length === 1 ? "delivery" : "deliveries"}` : ""}</p>
        <p className="text-[12px] text-muted">{t.trip.mode === "car" ? "Car" : "No car"} · ~{p.minutes} min to home, estimated</p>
        <p className={fine}>{route}{t.trip.leave ? ` · Planned departure ${ampm(t.trip.leave)} · home about ${ampm(addMinutes(t.trip.leave, p.minutes))}` : ""}</p>
      </div>

      <div className="flex flex-col gap-2">
        <button type="button" onClick={reuse} className={primaryBtn}>Reuse this list <RotateCcw size={17} aria-hidden /></button>
        <p className={`${fine} text-center`}>We’ll copy the groceries and recalculate with current available quotes. Old prices aren’t carried forward.</p>
      </div>

      <section className="flex flex-col gap-3">
        <div className="flex items-baseline justify-between">
          <h2 className="text-[18px]">Groceries & store assignments</h2>
          <span className="text-[12px] text-muted">{items} items</span>
        </div>
        <p className={fine}>Saved estimates from {savedDay(t.savedAt)}. Not live prices or inventory.</p>
        {p.stops.map((s, i) => (
          <Group key={s.storeId} tag={`IN PERSON · ${i === 0 ? "FIRST" : i === 1 ? "SECOND" : "THIRD"} STOP`} name={brand(s.storeId)} lines={s.items} />
        ))}
        {p.onlineOrders.map((o) => (
          <Group key={o.storeId + o.channel} tag="DELIVERY PLANNED · NOT CONFIRMED" name={`${brand(o.storeId)} via ${CHANNEL[o.channel]}`} lines={o.items} />
        ))}
      </section>

      <div className={`${card} flex flex-col gap-2.5 p-[18px] text-[13px]`}>
        <h2 className="mb-1 text-[16px]">What was planned</h2>
        <Row k="Items" v={money(b.items)} />
        <Row k="Delivery fees" v={money(b.fees)} />
        <Row k={t.trip.mode === "car" ? `Driving · ${p.miles} mi` : "Driving · no car"} v={money(b.driving)} />
        <div className="h-px bg-line" />
        <Row k="Saved planned total" v={money(p.money)} strong />
      </div>
      <p className={fine}>This is a saved plan, not a receipt. Maps and retailer checkout happen outside BeeLow; purchases and delivery aren’t tracked here.</p>
    </>
  );
}

function Group({ tag, name, lines }: { tag: string; name: string; lines: LineItem[] }) {
  return (
    <div className={`${card} px-4 py-3`}>
      <p className="text-[10px] font-semibold tracking-[0.6px] text-bee">{tag}</p>
      <p className="flex justify-between border-b border-line pb-2.5 text-[15px] font-semibold">{name} <span>{money(lines.reduce((s, l) => s + l.cost, 0))}</span></p>
      <ul>
        {lines.map((l, i) => {
          const item = itemById(l.itemId);
          return (
            <li key={l.itemId} className={`flex items-center gap-3 py-2.5 ${i ? "border-t border-line" : ""}`}>
              <ProductImage id={l.itemId} name={item?.name ?? ""} className="size-11 rounded-[8px]" />
              <span className="min-w-0 flex-1 leading-[1.4]">
                <span className="block text-[13px]">{item?.name}</span>
                <span className="block truncate text-[11px] text-muted">{l.packs} × {l.quote.size} {UNIT_LABEL[l.quote.unit]}{l.quote.product ? ` · ${l.quote.product}` : ""}</span>
              </span>
              <span className="text-[13px]">{money(l.cost)}</span>
            </li>
          );
        })}
      </ul>
    </div>
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
