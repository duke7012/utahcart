"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { logOut, useAccount } from "../account";
import { itemById } from "@/lib/catalog";
import type { SavedTrip } from "@/lib/session";
import type { ListEntry } from "@/lib/types";
import { card, primaryBtn } from "../ui";

export const savedDay = (iso: string) => new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

/** "Eggs, milk & 5 more." */
export function tripTitle(list: ListEntry[]): string {
  const names = list.map((e) => itemById(e.itemId)?.name.replace(/,/g, "").toLowerCase() ?? e.itemId);
  if (!names.length) return "Empty list.";
  const first = names.slice(0, 2).join(", ");
  const rest = names.length - 2;
  return `${first[0].toUpperCase()}${first.slice(1)}${rest > 0 ? ` & ${rest} more` : ""}.`;
}

export function tripStores(t: SavedTrip): string {
  const names = [...t.plan.stops.map((s) => s.storeId), ...t.plan.onlineOrders.map((o) => o.storeId)];
  return [...new Set(names)].map((id) => t.plan.stops.some((s) => s.storeId === id) ? brandName(id) : `${brandName(id)} online`).join(" · ");
}
const brandName = (id: string) => ({ smiths: "Smith’s", walmart: "Walmart", harmons: "Harmons", costco: "Costco" } as Record<string, string>)[id] ?? id;

export const stopSummary = (t: SavedTrip) => {
  const s = t.plan.stopCount, d = t.plan.onlineOrders.length;
  return `${s} in-person ${s === 1 ? "stop" : "stops"}${d ? ` + ${d} ${d === 1 ? "delivery" : "deliveries"} planned` : " · No delivery"}`;
};

/** "J  Signed in as jamie@…   Log out" row (Figma: Trip history header). */
export function SignedInRow() {
  const account = useAccount();
  const [busy, setBusy] = useState(false);
  if (!account?.user) return null;
  const email = account.user.email;
  return (
    <div className="flex items-center gap-3 text-[13px] text-muted">
      <span aria-hidden className="grid size-8 place-items-center rounded-full bg-honey-tint text-[13px] font-bold text-bee">{email[0].toUpperCase()}</span>
      <span className="min-w-0 flex-1 truncate">Signed in as {email}</span>
      <button type="button" disabled={busy} onClick={async () => { setBusy(true); await logOut(); location.href = "/login"; }}
        className="font-semibold text-bee">{busy ? "Logging out…" : "Log out"}</button>
    </div>
  );
}

/** Shown on account pages to guests (or when accounts aren't set up yet). */
export function NeedLogin({ configured }: { configured: boolean }) {
  const router = useRouter();
  return (
    <div className={`${card} flex flex-col gap-3 p-[18px]`}>
      <p className="text-[15px] font-semibold">Log in to see your trip history.</p>
      <p className="text-[13px] leading-[1.45] text-muted">
        {configured ? "Saved trips live in your account, so they follow you to any phone." : "Accounts aren’t switched on for this site yet. Your list still works as a guest."}
      </p>
      {configured && <button type="button" onClick={() => router.push("/login")} className={primaryBtn}>Log in</button>}
      {configured && <Link href="/signup" className="text-center text-[14px] font-semibold text-bee no-underline">Create account</Link>}
    </div>
  );
}
