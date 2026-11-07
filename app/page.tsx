"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { DEMO_SENTENCE, type AskResult } from "@/lib/ask";
import { AISLES, catalog, fromPrice, places } from "@/lib/catalog";
import type { Saved } from "@/lib/session";
import type { Item } from "@/lib/types";
import { ARROW, CART, Icon, PLUS, ProductImage, SEARCH, Stepper, TopBar, UNIT_LABEL, money, useCart } from "./ui";

export default function ShopPage() {
  const cart = useCart();
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [aisle, setAisle] = useState("all");

  const q = query.trim().toLowerCase();
  const shown = catalog.items.filter((i) => (aisle === "all" || i.aisle === aisle) && (!q || i.name.toLowerCase().includes(q)));
  const groups = useMemo(
    () => AISLES.map((a) => ({ ...a, items: shown.filter((i) => i.aisle === a.id) })).filter((g) => g.items.length),
    [shown],
  );

  const count = cart.s.list.reduce((n, e) => n + e.qty, 0);
  const estimate = cart.s.list.reduce((t, e) => t + (fromPrice(e.itemId) ?? 0) * e.qty, 0);

  return (
    <>
      <TopBar width="max-w-5xl" right={<Link href="/scan" className="text-tan underline">Scan receipt</Link>}>
        <div className="mx-auto max-w-5xl px-4 pt-3">
          <label className="flex items-center gap-2 rounded-lg border border-varnish bg-white px-3">
            <Icon d={SEARCH} className="size-5 shrink-0 text-varnish-soft" />
            <span className="sr-only">Search groceries</span>
            <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder={`Search ${catalog.items.length} groceries`}
              className="w-full bg-transparent py-2.5 text-body outline-none placeholder:text-varnish-soft" />
          </label>
          <nav aria-label="Aisles" className="-mx-4 flex gap-2 overflow-x-auto px-4 py-3 [scrollbar-width:none]">
            {[{ id: "all", label: "All" }, ...AISLES].map((a) => (
              <button key={a.id} type="button" onClick={() => setAisle(a.id)} aria-pressed={aisle === a.id}
                className={`shrink-0 rounded-lg border border-varnish px-3.5 py-1.5 text-small font-semibold ${
                  aisle === a.id ? "bg-varnish text-white" : "bg-white text-varnish hover:bg-sky-deep"
                }`}>
                {a.label}
              </button>
            ))}
          </nav>
        </div>
      </TopBar>

      <main className="mx-auto max-w-5xl px-4 pb-32 pt-4">
        {!q && aisle === "all" && <AskBox onPlanned={(next) => { cart.update(next); router.push("/plan"); }} current={cart.s} />}
        {groups.length === 0 && (
          <div className="pt-8">
            <p className="text-head font-semibold">No groceries match “{query}”.</p>
            <button type="button" onClick={() => { setQuery(""); setAisle("all"); }} className="mt-2 text-body underline">Show everything</button>
          </div>
        )}
        {groups.map((g) => (
          <section key={g.id} aria-labelledby={`aisle-${g.id}`} className="mb-7">
            <h2 id={`aisle-${g.id}`} className="mb-3 text-head font-bold">{g.label}</h2>
            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
              {g.items.map((item) => <Tile key={item.id} item={item} qty={cart.qty(item.id)} onQty={(n) => cart.setItem(item.id, n)} />)}
            </ul>
          </section>
        ))}
        <p className="text-small text-varnish-soft">
          Prices are demo prices until you <Link href="/scan" className="font-semibold text-varnish underline">scan a receipt</Link>. Pictures are illustrations.
        </p>
      </main>

      {count > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-10 px-4 pb-4">
          <Link href="/cart"
            className="mx-auto flex max-w-xl items-center gap-3 rounded-lg border border-varnish bg-wingate px-4 py-3 text-white no-underline hover:bg-varnish">
            <span className="relative">
              <Icon d={CART} className="size-6" />
              <span className="absolute -right-2 -top-2 grid min-w-5 place-items-center rounded-full bg-white px-1 text-small font-bold text-wingate">{count}</span>
            </span>
            <span className="flex-1 text-body font-semibold">View cart</span>
            <span className="text-body">about {money(estimate)}</span>
            <Icon d={ARROW} />
          </Link>
        </div>
      )}
    </>
  );
}

/** One sentence in, a filled cart and trip out, then straight to the plan. */
function AskBox({ current, onPlanned }: { current: Saved; onPlanned: (s: Saved) => void }) {
  const [sentence, setSentence] = useState(DEMO_SENTENCE);
  const [state, setState] = useState<{ busy: boolean; error?: string }>({ busy: false });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setState({ busy: true });
    try {
      const r = await fetch("/api/ask", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ sentence }) });
      const j = (await r.json()) as AskResult & { error?: string };
      if (!r.ok) return setState({ busy: false, error: j.error ?? "Couldn't plan that. Try again." });
      const place = (id: string, fallback: Saved["trip"]["from"]) => places.find((p) => p.id === id) ?? fallback;
      onPlanned({
        list: j.list,
        goal: j.goal,
        trip: {
          from: place(j.from, current.trip.from), to: place(j.to, current.trip.to), mode: j.mode,
          leave: j.leave || current.trip.leave, homeBy: j.homeBy || current.trip.homeBy,
        },
      });
    } catch {
      setState({ busy: false, error: "Couldn't reach the planner. Check your connection and try again." });
    }
  };

  return (
    <form onSubmit={submit} className="mb-7 rounded-lg border border-varnish bg-white p-3">
      <label htmlFor="ask" className="text-head font-bold">Or just tell UtahCart</label>
      <textarea id="ask" rows={3} value={sentence} onChange={(e) => setSentence(e.target.value)}
        className="mt-2 block w-full resize-none rounded-lg border border-varnish/40 bg-sky px-3 py-2 text-body" />
      <div className="mt-2 flex items-center gap-3">
        <p className="flex-1 text-small text-varnish-soft">Fills your cart and trip, then finds the best plan.</p>
        <button type="submit" disabled={state.busy || !sentence.trim()}
          className="flex shrink-0 items-center gap-2 rounded-lg bg-wingate px-4 py-2.5 text-body font-semibold text-white hover:bg-varnish disabled:bg-varnish/40">
          {state.busy ? "Planning…" : <>Plan it <Icon d={ARROW} /></>}
        </button>
      </div>
      {state.error && <p role="alert" className="mt-2 text-small font-semibold text-wingate">{state.error}</p>}
    </form>
  );
}

function Tile({ item, qty, onQty }: { item: Item; qty: number; onQty: (n: number) => void }) {
  const price = fromPrice(item.id);
  return (
    <li className="flex flex-col rounded-lg border border-varnish/25 bg-white p-2.5">
      <ProductImage id={item.id} name={item.name} className="aspect-square w-full rounded" />
      <p className="mt-2 text-body font-semibold leading-snug">{item.name}</p>
      <p className="text-small text-varnish-soft">{item.typicalSize} {UNIT_LABEL[item.unit]}</p>
      <p className="mt-1 text-body">
        {price !== undefined && <><span className="text-small">from </span><span className="font-bold">{money(price)}</span></>}
      </p>
      <div className="mt-auto pt-2">
        {qty > 0 ? (
          <Stepper name={item.name} qty={qty} onChange={onQty} />
        ) : (
          <button type="button" onClick={() => onQty(1)} aria-label={`Add ${item.name} to cart`}
            className="flex h-10 w-full items-center justify-center gap-1.5 rounded-lg border border-varnish text-body font-semibold hover:bg-sky-deep">
            <Icon d={PLUS} className="size-4" /> Add
          </button>
        )}
      </div>
    </li>
  );
}
