import { planTrip } from "@/lib/planner";
import type { CatalogData, ListEntry, Trip } from "@/lib/types";
import stores from "@/data/stores.json";
import items from "@/data/items.json";
import prices from "@/data/prices.json";
import channels from "@/data/channels.json";
import places from "@/data/places.json";

// Phase 0 check page: runs the planner on the demo scenario. Phase 1 replaces it with the real list + trip UI.
const data = { stores, items, prices, channels } as CatalogData;
const storeName = (id: string) => stores.find((s) => s.id === id)?.name ?? id;
const itemName = (id: string) => items.find((i) => i.id === id)?.name ?? id;

export default function Home() {
  const trip: Trip = { start: places[0], end: places[1], mode: "no_car", timeLimitMin: 90, costPerMile: 0, minutesPerStop: 15 };
  const list: ListEntry[] = items.map((i) => ({ itemId: i.id, qty: 1, bulkOk: false }));
  const plans = planTrip(list, trip, {}, data);

  return (
    <main className="mx-auto max-w-xl p-4">
      <h1 className="text-2xl font-bold">UtahCart</h1>
      <p className="mt-1">Groceries for 3 roommates this week, leaving the U at 5, no car, home by 6:30, cheapest.</p>
      <p className="mt-1 text-sm">All prices are demo prices.</p>
      {plans.length === 0 && <p className="mt-4">No plan fits this time limit.</p>}
      {plans.map((p) => (
        <section key={p.goal} className="mt-4 border p-3">
          <h2 className="font-semibold">{p.goal}</h2>
          <p>
            ${p.money.toFixed(2)} · about {p.minutes} min · {p.stopCount} stops · saves ${p.savingsVsOneStore.toFixed(2)} vs one store
          </p>
          {p.stops.map((s) => (
            <p key={s.storeId}>In person: {storeName(s.storeId)} ({s.items.map((l) => itemName(l.itemId)).join(", ")})</p>
          ))}
          {p.onlineOrders.map((o) => (
            <p key={o.storeId}>
              Online: {storeName(o.storeId)} via {o.channel}, fee ${o.fee.toFixed(2)} ({o.items.length} items)
            </p>
          ))}
          {p.warnings.map((w) => (
            <p key={w} className="text-sm">⚠ {w}</p>
          ))}
        </section>
      ))}
    </main>
  );
}
