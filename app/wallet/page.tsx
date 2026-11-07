"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import memberships from "@/data/memberships.json";
import { load, loadMemberships, planRequest, saveMemberships } from "@/lib/session";
import type { Memberships } from "@/lib/types";
import type { Worth } from "@/lib/worth";
import { TopBar, money } from "../ui";

type Id = keyof Memberships;
/** Only these change plans with the demo stores; the rest are listed so the wallet is complete. */
const PRICED: Id[] = ["costco", "instacartPlus"];

export default function WalletPage() {
  const [m, setM] = useState<Memberships>({});
  const [worth, setWorth] = useState<Record<string, Worth>>({});
  const [checking, setChecking] = useState(true);

  useEffect(() => setM(loadMemberships()), []);
  useEffect(() => {
    setChecking(true);
    fetch("/api/plan", { method: "POST", headers: { "content-type": "application/json" }, body: planRequest(load(), PRICED) })
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

  return (
    <>
      <TopBar right={<Link href="/cart" className="text-tan underline">Your cart</Link>} />
      <main className="mx-auto max-w-xl px-4 pb-16 pt-5">
        <h1 className="text-head font-bold">Memberships</h1>
        <p className="mt-1 text-body">Turn on what you have. Plans only use stores and delivery deals you can actually get.</p>

        <ul className="mt-4 border-t border-varnish">
          {memberships.map((ms) => {
            const id = ms.id as Id;
            const w = worth[id];
            const perWeek = ms.feePerYear / 52;
            return (
              <li key={id} className="border-b border-varnish/25 py-3.5">
                <label className="flex cursor-pointer items-start gap-3">
                  <input type="checkbox" role="switch" checked={!!m[id]} onChange={() => toggle(id)} className="mt-1 size-5 shrink-0" />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-baseline justify-between gap-3">
                      <span className="text-body font-semibold">{ms.name}</span>
                      <span className="shrink-0 text-small">
                        {ms.feePerYear ? `${money(ms.feePerYear)}/yr` : "Free"}
                        {!ms.verified && ms.feePerYear > 0 && <span className="text-varnish-soft"> (unverified)</span>}
                      </span>
                    </span>
                    <span className="block text-small text-varnish-soft">{ms.does}</span>
                  </span>
                </label>
                {PRICED.includes(id) && (
                  <p className="ml-8 mt-2 text-small">
                    {checking || !w ? (
                      <span className="text-varnish-soft">Checking your cart…</span>
                    ) : w.savingsPerTrip === null ? (
                      "No plan fits your trip to compare."
                    ) : w.savingsPerTrip < 0.5 ? (
                      "Saves nothing on your current cart."
                    ) : (
                      <>
                        <span className="rounded bg-sage px-1.5 py-0.5 font-semibold text-white">Saves {money(w.savingsPerTrip)} on this cart</span>
                        {ms.feePerYear > 0 && (
                          <span className="ml-1.5">
                            {w.savingsPerTrip >= perWeek
                              ? `Worth it if you shop weekly (fee is about ${money(perWeek)} a week).`
                              : `Pays off after ${Math.ceil(ms.feePerYear / w.savingsPerTrip)} trips like this a year.`}
                          </span>
                        )}
                      </>
                    )}
                  </p>
                )}
              </li>
            );
          })}
        </ul>
        <p className="mt-4 text-small text-varnish-soft">
          Savings compare the plan for your chosen goal with and without each membership, using demo prices and any receipts you scanned.
        </p>
      </main>
    </>
  );
}
