"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ChevronRight, Info, Plus } from "lucide-react";
import { loadTrips, type SavedTrip } from "@/lib/session";
import { useAccount } from "../account";
import { GOALS, Intro, ProductImage, Screen, card, money, primaryBtn } from "../ui";
import { NeedLogin, SignedInRow, savedDay, stopSummary, tripStores, tripTitle } from "./trip-bits";
import { itemById } from "@/lib/catalog";

export default function TripsPage() {
  const account = useAccount();
  const [trips, setTrips] = useState<SavedTrip[]>([]);
  useEffect(() => setTrips(loadTrips()), []);

  return (
    <Screen>
      <SignedInRow />
      <Intro eyebrow="YOUR GROCERY PLANS, KEPT HANDY" title="Trip history" sub="Find a familiar list. Plan it again for today." />
      {account && !account.user && <NeedLogin configured={account.configured} />}
      {account?.user && (
        <>
          <Link href="/list" className={primaryBtn}>Start a new list <Plus size={18} aria-hidden /></Link>
          <div className="flex items-baseline justify-between">
            <h2 className="text-[18px]">Saved trips</h2>
            <span className="text-[12px] text-muted">{trips.length} {trips.length === 1 ? "plan" : "plans"}</span>
          </div>
          {trips.length === 0 ? (
            <p className={`${card} p-[18px] text-[14px] leading-[1.45] text-muted`}>
              No saved trips yet. Open a plan and tap <span className="font-semibold text-ink">Save this trip</span> to keep it here.
            </p>
          ) : trips.map((t) => <TripCard key={t.id} t={t} />)}
          <p className="flex gap-2 text-[12px] leading-[1.45] text-muted">
            <Info size={15} className="mt-0.5 shrink-0" aria-hidden />
            Totals and times are saved estimates from the day you planned, not actual spend or confirmed purchases.
          </p>
        </>
      )}
    </Screen>
  );
}

function TripCard({ t }: { t: SavedTrip }) {
  const goal = GOALS.find((g) => g.id === t.goal)?.label ?? "Plan";
  return (
    <Link href={`/trips/view?id=${t.id}`} className={`${card} flex flex-col gap-3 p-[18px] text-ink no-underline hover:border-honey`}>
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-semibold tracking-[0.8px] text-muted">{savedDay(t.savedAt).toUpperCase()}</span>
        <span className="rounded-[6px] bg-honey-tint px-2 py-1 text-[10px] font-semibold text-bee">Saved plan</span>
      </div>
      <p className="flex items-center justify-between text-[18px] font-bold">{tripTitle(t.list)} <ChevronRight size={18} className="text-muted" aria-hidden /></p>
      <div className="flex items-center gap-2">
        {t.list.slice(0, 3).map((e) => (
          <ProductImage key={e.itemId} id={e.itemId} name={itemById(e.itemId)?.name ?? ""} className="size-12 rounded-[10px]" />
        ))}
        <span className="text-[13px] text-muted">{t.list.length} {t.list.length === 1 ? "item" : "items"}</span>
      </div>
      <div className="leading-[1.45]">
        <p className="text-[14px] font-semibold">{tripStores(t)}</p>
        <p className="text-[12px] text-muted">{stopSummary(t)}</p>
      </div>
      <div className="flex items-end justify-between border-t border-line pt-3">
        <div className="text-[12px] leading-[1.5]">
          <p className="text-muted">{goal} · ~{t.plan.minutes} min</p>
          <p className="font-semibold text-bee">View trip & reuse list</p>
        </div>
        <div className="text-right">
          <p className="text-[22px] font-bold leading-none text-bee">{money(t.plan.money)}</p>
          <p className="mt-1 text-[11px] text-muted">Planned total</p>
        </div>
      </div>
    </Link>
  );
}
