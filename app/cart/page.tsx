"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import memberships from "@/data/memberships.json";
import { catalog, fromPrice, itemById, places } from "@/lib/catalog";
import { clock, DEMO, loadMemberships, minutesBetween } from "@/lib/session";
import type { Place } from "@/lib/types";
import { ARROW, GOALS, Icon, ProductImage, Segments, Stepper, TopBar, UNIT_LABEL, money, useCart } from "../ui";

const HERE = "here";
const field = "mt-1 block w-full rounded-lg border border-varnish bg-white px-3 py-2.5 text-body font-normal";

export default function CartPage() {
  const { s, update, setItem } = useCart();
  const [geoError, setGeoError] = useState("");
  const [activeMemberships, setActive] = useState<string[]>([]);
  useEffect(() => {
    const m = loadMemberships();
    setActive(memberships.filter((ms) => m[ms.id as keyof typeof m]).map((ms) => ms.name));
  }, []);

  const setPlace = (key: "from" | "to", id: string) => {
    if (id !== HERE) return update({ ...s, trip: { ...s.trip, [key]: places.find((p) => p.id === id)! } });
    setGeoError("");
    navigator.geolocation?.getCurrentPosition(
      ({ coords }) => update({ ...s, trip: { ...s.trip, [key]: { lat: coords.latitude, lng: coords.longitude, label: "Current location" } } }),
      () => setGeoError("Location is off. Pick a preset or allow location in your browser."),
    );
  };
  const placeId = (p: Place) => places.find((x) => x.lat === p.lat && x.lng === p.lng)?.id ?? HERE;

  const count = s.list.reduce((n, e) => n + e.qty, 0);
  const estimate = s.list.reduce((t, e) => t + (fromPrice(e.itemId) ?? 0) * e.qty, 0);
  const limit = minutesBetween(s.trip.leave, s.trip.homeBy);

  return (
    <>
      <TopBar right={<Link href="/" className="text-tan underline">Keep shopping</Link>} />
      <main className="mx-auto max-w-xl px-4 pb-32 pt-5">
        <div className="flex items-baseline justify-between">
          <h1 className="text-head font-bold">Your cart</h1>
          <button type="button" onClick={() => update(DEMO)} className="text-small underline">Reset demo cart</button>
        </div>

        {s.list.length === 0 ? (
          <div className="mt-6">
            <p className="text-body">Your cart is empty.</p>
            <Link href="/" className="mt-3 inline-block rounded-lg bg-wingate px-5 py-3 text-body font-semibold text-white no-underline">Start shopping</Link>
          </div>
        ) : (
          <ul className="mt-3 border-t border-varnish">
            {s.list.map((e) => {
              const item = itemById(e.itemId);
              if (!item) return null;
              return (
                <li key={e.itemId} className="flex items-center gap-3 border-b border-varnish/25 py-2.5">
                  <ProductImage id={item.id} name={item.name} className="size-14 shrink-0 rounded bg-white" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-body font-semibold">{item.name}</p>
                    <p className="text-small text-varnish-soft">{item.typicalSize} {UNIT_LABEL[item.unit]} each</p>
                    <p className="text-small">
                      <label className="mt-0.5 inline-flex items-center gap-1.5 text-varnish">
                        <input type="checkbox" checked={e.bulkOk} onChange={(ev) => setItem(e.itemId, e.qty, ev.target.checked)} className="size-4" />
                        Bulk OK
                      </label>
                    </p>
                  </div>
                  <div className="w-[7.5rem] shrink-0">
                    <Stepper name={item.name} qty={e.qty} onChange={(n) => setItem(e.itemId, n)} />
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        <section aria-labelledby="trip" className="pt-7">
          <h2 id="trip" className="text-head font-bold">Fit it into your trip</h2>
          <div className="mt-3 grid grid-cols-2 gap-3">
            {(["from", "to"] as const).map((k) => (
              <label key={k} className="text-small font-semibold">
                {k === "from" ? "From" : "To"}
                <select value={placeId(s.trip[k])} onChange={(ev) => setPlace(k, ev.target.value)} className={field}>
                  {places.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
                  <option value={HERE}>Current location</option>
                </select>
              </label>
            ))}
            <label className="text-small font-semibold">
              Leaving at
              <input type="time" value={s.trip.leave} onChange={(ev) => update({ ...s, trip: { ...s.trip, leave: ev.target.value } })} className={field} />
            </label>
            <label className="text-small font-semibold">
              Home by
              <input type="time" value={s.trip.homeBy} onChange={(ev) => update({ ...s, trip: { ...s.trip, homeBy: ev.target.value } })} className={field} />
            </label>
          </div>
          {geoError && <p role="alert" className="mt-2 text-small text-wingate">{geoError}</p>}
          <div className="mt-3">
            <Segments label="Getting around" value={s.trip.mode} onChange={(mode) => update({ ...s, trip: { ...s.trip, mode } })}
              options={[{ id: "no_car", label: "No car" }, { id: "car", label: "Car" }]} />
          </div>
        </section>

        <section aria-labelledby="goal" className="pt-6">
          <h2 id="goal" className="text-head font-bold">What matters most</h2>
          <div className="mt-3">
            <Segments label="Goal" options={GOALS} value={s.goal} onChange={(goal) => update({ ...s, goal })} />
          </div>
          <p className="mt-3 text-small text-varnish-soft">
            UtahCart checks {catalog.stores.length} stores, in person and delivered, and picks the best mix for your goal.
          </p>
        </section>

        <section aria-labelledby="memberships" className="pt-6">
          <div className="flex items-baseline justify-between">
            <h2 id="memberships" className="text-head font-bold">Memberships</h2>
            <Link href="/wallet" className="text-small font-semibold underline">Edit</Link>
          </div>
          <p className="mt-1 text-body">
            {activeMemberships.length ? activeMemberships.join(", ") : "None. Add Costco or Instacart+ to see if they're worth it."}
          </p>
        </section>
      </main>

      {s.list.length > 0 && (
        <div className="fixed inset-x-0 bottom-0 border-t border-varnish bg-sky px-4 py-3">
          <div className="mx-auto flex max-w-xl items-center gap-3">
            <p className="flex-1 text-small leading-tight">
              <span className="text-body font-semibold">{count} items · about {money(estimate)}</span>
              <br />
              {limit !== undefined ? `${limit} min, home by ${clock(s.trip.homeBy)}` : "No time limit"}
            </p>
            <Link href="/plan" className="flex items-center gap-2 rounded-lg bg-wingate px-4 py-3 text-body font-semibold text-white no-underline hover:bg-varnish">
              Find my best plan <Icon d={ARROW} />
            </Link>
          </div>
        </div>
      )}
    </>
  );
}
