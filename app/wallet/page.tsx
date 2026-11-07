"use client";

import { useEffect, useState } from "react";
import { CalendarCheck, Lock, Smartphone, Trash2 } from "lucide-react";
import memberships from "@/data/memberships.json";
import channels from "@/data/channels.json";
import { load, loadMemberships, planRequest, saveMemberships } from "@/lib/session";
import type { Memberships } from "@/lib/types";
import type { Worth } from "@/lib/worth";
import { Intro, PriceNote, Screen, Toggle, card, fine, money } from "../ui";

type Id = keyof Memberships;
const STORE: Id[] = ["costco", "samsClub", "restaurantDepot", "smithsRewards"];
const DELIVERY: Id[] = ["instacartPlus", "uberOne", "dashPass", "prime"];
const PRICED: Id[] = ["costco", "instacartPlus"];
const info = (id: Id) => memberships.find((m) => m.id === id)!;
const SUB: Record<Id, (on: boolean) => string> = {
  costco: (on) => `Warehouse access · ${on ? "Member" : "Not a member"}`,
  samsClub: () => "Warehouse access · No Sam’s Club nearby in the demo",
  restaurantDepot: () => "Business membership required",
  smithsRewards: () => "Loyalty pricing · Not warehouse access",
  instacartPlus: () => "Eligible delivery-fee benefits",
  uberOne: () => "Eligible delivery-fee benefits",
  dashPass: () => "Eligible delivery-fee benefits",
  prime: () => "Eligible Amazon grocery benefits",
};

export default function WalletPage() {
  const [m, setM] = useState<Memberships>({});
  const [worth, setWorth] = useState<Record<string, Worth>>({});
  const [checking, setChecking] = useState(true);
  const [cleared, setCleared] = useState(false);
  const [ready, setReady] = useState(true);

  useEffect(() => setM(loadMemberships()), []);
  useEffect(() => {
    const body = planRequest(load(), PRICED);
    setReady(!!body);
    if (!body) return setChecking(false);
    setChecking(true);
    fetch("/api/plan", { method: "POST", headers: { "content-type": "application/json" }, body })
      .then((r) => r.json())
      .then((j) => setWorth(Object.fromEntries((j.worth ?? []).map((w: Worth) => [w.id, w]))))
      .catch(() => setWorth({}))
      .finally(() => setChecking(false));
  }, [m]);

  const toggle = (id: Id) => {
    const next = { ...m, [id]: !m[id] };
    setM(next);
    saveMemberships(next);
  };

  const group = (ids: Id[]) => (
    <ul className={`${card} px-4`}>
      {ids.map((id, i) => {
        const ms = info(id);
        const w = worth[id];
        return (
          <li key={id} className={`py-3.5 ${i ? "border-t border-line" : ""}`}>
            <div className="flex items-center gap-3">
              <span className="grid size-8 shrink-0 place-items-center rounded-full bg-canvas text-[13px] font-semibold text-carrot">{ms.name[0]}</span>
              <Toggle label={ms.name} on={!!m[id]} onChange={() => toggle(id)} hint={SUB[id](!!m[id])} />
            </div>
            {PRICED.includes(id) && (
              <p className="ml-11 mt-1.5 text-[12px] text-muted">
                {!ready ? "Add items and a trip to see what this saves." : checking || !w ? "Checking your cart…" : w.savingsPerTrip === null ? "No plan fits your trip to compare."
                  : w.savingsPerTrip < 0.5 ? "Saves nothing on your current cart." : <span className="font-semibold text-leaf">Saves {money(w.savingsPerTrip)} on this cart</span>}
              </p>
            )}
          </li>
        );
      })}
    </ul>
  );

  const costco = worth.costco;
  const ic = worth.instacartPlus;
  const fee = info("costco").feePerYear;
  const trips = costco?.savingsPerTrip ? Math.ceil(fee / costco.savingsPerTrip) : null;

  return (
    <Screen>
      <Intro eyebrow="YOUR WALLET · ON THIS DEVICE" title="Bring your benefits." sub="Tell us what you have. We’ll use eligible savings without assuming access." />
      <p className="flex gap-3 rounded-[12px] bg-honey-tint p-[14px] text-[12px] leading-[1.45]">
        <Smartphone size={18} className="shrink-0 text-bee" aria-hidden /> Saved on this device. No account or sign-in. Membership numbers aren’t needed.
      </p>

      <section className="flex flex-col gap-3">
        <h2 className="text-[18px]">Store access & loyalty</h2>
        {group(STORE)}
        {!m.costco && (
          <div className={`${card} flex flex-col gap-2 p-[18px]`}>
            <p className="flex items-center gap-2 text-[14px]"><Lock size={16} aria-hidden /> Costco in person is locked</p>
            <p className={fine}>No warehouse membership selected. Costco via Instacart can still be used at the non-member markup. Instacart+ waives the delivery fee on bigger orders—not warehouse access.</p>
          </div>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-[18px]">Delivery-fee memberships</h2>
        {group(DELIVERY)}
        <p className={fine}>Benefits vary by retailer, minimum order and area. We only remove a fee when it applies; the retailer confirms your final charges.</p>
      </section>

      <div className="flex flex-col gap-3 rounded-[18px] bg-bee p-[22px] text-white">
        <div className="flex items-center justify-between text-[11px] tracking-[0.8px] opacity-90">
          <span>IS COSTCO WORTH IT?</span><CalendarCheck size={18} aria-hidden />
        </div>
        {!ready ? (
          <p className="text-[15px] opacity-90">Add items and a trip on your list, and BeeLow works out whether Costco pays off for you.</p>
        ) : checking || !costco ? (
          <p className="text-[15px] opacity-90">Checking your cart…</p>
        ) : trips ? (
          <>
            <p className="text-[24px] leading-[1.2]">It takes {trips} trips like this to cover the fee.</p>
            <p className="text-[12px] opacity-90">{money(fee)} annual fee ÷ {money(costco.savingsPerTrip!)} saved on this cart = {(fee / costco.savingsPerTrip!).toFixed(1)}, rounded up to {trips}.</p>
          </>
        ) : (
          <>
            <p className="text-[24px] leading-[1.2]">Not for this cart.</p>
            <p className="text-[12px] leading-[1.5] opacity-90">Costco saves nothing on your current list and trip. Bulk packs only help with Bulk OK items, and without a car the warehouse is a long way off.</p>
          </>
        )}
        {ic?.savingsPerTrip ? (
          <p className="border-t border-white/25 pt-3 text-[12px] opacity-90">Instacart+ saves {money(ic.savingsPerTrip)} on this cart; at {money(info("instacartPlus").feePerYear)}/yr it pays off after {Math.ceil(info("instacartPlus").feePerYear / ic.savingsPerTrip)} trips like this.</p>
        ) : null}
        <p className="text-[11px] leading-[1.5] opacity-80">Not a forecast. Uses your current cart, trip and goal.</p>
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="text-[18px]">Plan assumptions</h2>
        <div className={`${card} flex flex-col gap-3 p-[18px] text-[13px]`}>
          <Assume k="Instacart delivery fee per order" v={money(channels.instacart.fee)} />
          <Assume k="Instacart+ free delivery from" v={`${money(channels.instacart.memberFreeOver)} (Costco ${money(channels.instacart.storeOverrides.costco.memberFreeOver)})`} />
          {[...STORE, ...DELIVERY].filter((id) => info(id).feePerYear > 0).map((id) => (
            <Assume key={id} k={`${info(id).name} annual fee${info(id).verified ? "" : " · unverified"}`} v={money(info(id).feePerYear)} />
          ))}
          <Assume k="Costco via Instacart markup" v={`${Math.round((channels.instacart.storeOverrides.costco.markup - 1) * 100)}% demo`} />
          <Assume k="Driving · if using a car" v="$0.30/mi" />
          <Assume k="Shopping time per store" v="15 min" />
        </div>
        <p className={fine}><PriceNote /> Fees and markups are assumptions, not retailer quotes.</p>
      </section>

      <button type="button" onClick={() => {
        try { ["utahcart:v1", "utahcart:receipts", "utahcart:memberships"].forEach((k) => localStorage.removeItem(k)); } catch {}
        setM({}); setCleared(true);
      }} className="flex items-center justify-between text-[13px] font-semibold text-carrot">
        {cleared ? "Saved data cleared" : "Clear saved data on this device"} <Trash2 size={16} aria-hidden />
      </button>
    </Screen>
  );
}

function Assume({ k, v }: { k: string; v: string }) {
  return <div className="flex justify-between gap-3"><span className="text-muted">{k}</span><span className="text-right">{v}</span></div>;
}
