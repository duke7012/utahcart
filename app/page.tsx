"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { catalog, places } from "@/lib/catalog";
import { clock, DEMO, load, minutesBetween, save, type Saved } from "@/lib/session";
import type { Place } from "@/lib/types";
import { ARROW, GOALS, Icon, MINUS, PLUS, Segments, TopBar } from "./ui";

const UNIT: Record<string, string> = { oz: "oz", fl_oz: "fl oz", lb: "lb", count: "ct" };
const HERE = "here";

export default function ListPage() {
  const [s, setS] = useState<Saved>(DEMO);
  const [geoError, setGeoError] = useState("");
  useEffect(() => setS(load()), []);
  const update = (next: Saved) => {
    setS(next);
    save(next);
  };

  const qty = (id: string) => s.list.find((e) => e.itemId === id)?.qty ?? 0;
  const bulkOk = (id: string) => s.list.find((e) => e.itemId === id)?.bulkOk ?? false;
  const setItem = (itemId: string, q: number, b = bulkOk(itemId)) => {
    const rest = s.list.filter((e) => e.itemId !== itemId);
    update({ ...s, list: q > 0 ? [...rest, { itemId, qty: q, bulkOk: b }] : rest });
  };

  const setPlace = (key: "from" | "to", id: string) => {
    if (id !== HERE) return update({ ...s, trip: { ...s.trip, [key]: places.find((p) => p.id === id)! } });
    setGeoError("");
    navigator.geolocation?.getCurrentPosition(
      ({ coords }) => update({ ...s, trip: { ...s.trip, [key]: { lat: coords.latitude, lng: coords.longitude, label: "Current location" } } }),
      () => setGeoError("Location is off. Pick a preset or allow location in your browser."),
    );
  };
  const placeId = (p: Place) => places.find((x) => x.lat === p.lat && x.lng === p.lng)?.id ?? HERE;

  const count = s.list.length;
  const limit = minutesBetween(s.trip.leave, s.trip.homeBy);

  return (
    <>
      <TopBar right={<button onClick={() => update(DEMO)} className="underline">Reset demo</button>} />
      <main className="mx-auto max-w-xl px-4 pb-32">
        <section aria-labelledby="trip" className="pt-5">
          <h2 id="trip" className="text-head font-bold">Your trip</h2>
          <div className="mt-3 grid grid-cols-2 gap-3">
            {(["from", "to"] as const).map((k) => (
              <label key={k} className="text-small font-semibold">
                {k === "from" ? "From" : "To"}
                <select
                  value={placeId(s.trip[k])}
                  onChange={(ev) => setPlace(k, ev.target.value)}
                  className="mt-1 block w-full rounded-lg border border-varnish bg-white px-3 py-2.5 text-body font-normal"
                >
                  {places.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
                  <option value={HERE}>Current location</option>
                </select>
              </label>
            ))}
            <label className="text-small font-semibold">
              Leaving at
              <input type="time" value={s.trip.leave} onChange={(ev) => update({ ...s, trip: { ...s.trip, leave: ev.target.value } })}
                className="mt-1 block w-full rounded-lg border border-varnish bg-white px-3 py-2 text-body font-normal" />
            </label>
            <label className="text-small font-semibold">
              Home by
              <input type="time" value={s.trip.homeBy} onChange={(ev) => update({ ...s, trip: { ...s.trip, homeBy: ev.target.value } })}
                className="mt-1 block w-full rounded-lg border border-varnish bg-white px-3 py-2 text-body font-normal" />
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
        </section>

        <section aria-labelledby="list" className="pt-6">
          <div className="flex items-baseline justify-between">
            <h2 id="list" className="text-head font-bold">Your list</h2>
            <span className="text-small text-varnish-soft">{count} of {catalog.items.length} staples</span>
          </div>
          <ul className="mt-2 border-t border-varnish">
            {catalog.items.map((item) => {
              const q = qty(item.id);
              return (
                <li key={item.id} className={`flex items-center gap-3 border-b border-varnish/25 py-2.5 ${q ? "" : "text-varnish-soft"}`}>
                  <div className="min-w-0 flex-1">
                    <p className={`truncate text-body ${q ? "font-semibold" : ""}`}>{item.name}</p>
                    <p className="text-small text-varnish-soft">
                      {item.typicalSize} {UNIT[item.unit]} each
                      {q > 0 && (
                        <label className="ml-3 inline-flex items-center gap-1.5">
                          <input type="checkbox" checked={bulkOk(item.id)} onChange={(ev) => setItem(item.id, q, ev.target.checked)} className="size-4" />
                          Bulk OK
                        </label>
                      )}
                    </p>
                  </div>
                  <div className="flex items-center rounded-lg border border-varnish bg-white">
                    <button type="button" aria-label={`Fewer ${item.name}`} disabled={!q} onClick={() => setItem(item.id, q - 1)}
                      className="grid size-10 place-items-center disabled:opacity-30"><Icon d={MINUS} /></button>
                    <span className="w-7 text-center text-body font-semibold" aria-live="polite">{q}</span>
                    <button type="button" aria-label={`More ${item.name}`} onClick={() => setItem(item.id, q + 1)}
                      className="grid size-10 place-items-center"><Icon d={PLUS} /></button>
                  </div>
                </li>
              );
            })}
          </ul>
          <p className="mt-3 text-small text-varnish-soft">All prices are demo prices until the team adds real ones.</p>
        </section>
      </main>

      <div className="fixed inset-x-0 bottom-0 border-t border-varnish bg-sky px-4 py-3">
        <div className="mx-auto flex max-w-xl items-center gap-3">
          <p className="flex-1 text-small leading-tight">
            <span className="font-semibold">{count} items</span>
            <br />
            {limit !== undefined ? `${limit} min, home by ${clock(s.trip.homeBy)}` : "No time limit"}
          </p>
          {count > 0 ? (
            <Link href="/plan" className="flex items-center gap-2 rounded-lg bg-wingate px-5 py-3 text-body font-semibold text-white no-underline hover:bg-varnish">
              Plan my trip <Icon d={ARROW} />
            </Link>
          ) : (
            <span className="rounded-lg border border-varnish/40 px-5 py-3 text-body text-varnish-soft">Add an item to plan</span>
          )}
        </div>
      </div>
    </>
  );
}
