"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { catalog } from "@/lib/catalog";
import { toQuotes, type ScanLine, type ScanResult } from "@/lib/receipts";
import { addReceipts, clearReceipts, loadReceipts } from "@/lib/session";
import { ARROW, Icon, TopBar } from "../ui";

type State =
  | { status: "idle" }
  | { status: "reading" }
  | { status: "error"; message: string }
  | { status: "review"; result: ScanResult & { example?: boolean } }
  | { status: "saved"; count: number; store: string };

const UNITS: ScanLine["unit"][] = ["oz", "fl_oz", "lb", "count"];
const UNIT_LABEL: Record<ScanLine["unit"], string> = { oz: "oz", fl_oz: "fl oz", lb: "lb", count: "ct" };
const field = "rounded-lg border border-varnish bg-white px-2.5 py-2 text-body";

/** Phone photos are huge; send at most 1600px JPEG. */
async function shrink(file: File): Promise<Blob> {
  const img = await createImageBitmap(file);
  const scale = Math.min(1, 1600 / Math.max(img.width, img.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(img.width * scale);
  canvas.height = Math.round(img.height * scale);
  canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
  return new Promise((ok, no) => canvas.toBlob((b) => (b ? ok(b) : no(new Error("encode"))), "image/jpeg", 0.85));
}

/** Guess the store from the receipt header: first store whose first word appears in it. */
const guessStore = (name: string) =>
  catalog.stores.find((s) => name.toLowerCase().includes(s.name.split(/[ ']/)[0].toLowerCase()))?.id ?? "";

export default function ScanPage() {
  const [state, setState] = useState<State>({ status: "idle" });
  const [storeId, setStoreId] = useState("");
  const [saved, setSaved] = useState(0);
  useEffect(() => setSaved(loadReceipts().length), []);

  const read = async (body?: FormData) => {
    setState({ status: "reading" });
    try {
      const r = await fetch(body ? "/api/scan" : "/api/scan?example=1", { method: "POST", body });
      const json = await r.json();
      if (!r.ok) return setState({ status: "error", message: json.error ?? "Couldn't read that photo." });
      setStoreId(guessStore(json.store));
      setState({ status: "review", result: json });
    } catch {
      setState({ status: "error", message: "Couldn't reach the scanner. Check your connection and try again." });
    }
  };

  const onFile = async (file?: File) => {
    if (!file) return;
    const form = new FormData();
    form.append("image", await shrink(file).catch(() => file), "receipt.jpg");
    read(form);
  };

  const setLine = (i: number, patch: Partial<ScanLine>) => {
    if (state.status !== "review") return;
    const lines = state.result.lines.map((l, j) => (j === i ? { ...l, ...patch } : l));
    setState({ ...state, result: { ...state.result, lines } });
  };

  const onSave = () => {
    if (state.status !== "review" || !storeId) return;
    const quotes = toQuotes(storeId, state.result.date, state.result.lines.filter((l) => l.price > 0 && l.size > 0));
    setSaved(addReceipts(quotes).length);
    setState({ status: "saved", count: quotes.length, store: catalog.stores.find((s) => s.id === storeId)!.name });
  };

  const matched = state.status === "review" ? state.result.lines.filter((l) => l.itemId).length : 0;

  return (
    <>
      <TopBar right={<Link href="/" className="text-tan underline">Your list</Link>} />
      <main className="mx-auto max-w-xl px-4 pb-16 pt-5">
        <h1 className="text-head font-bold">Scan a receipt</h1>
        <p className="mt-1 text-body">
          Snap a grocery receipt or a shelf tag. Real prices you save replace demo prices, and your plan updates.
        </p>

        {(state.status === "idle" || state.status === "error" || state.status === "saved") && (
          <div className="mt-5 flex flex-col gap-2">
            <label className="block cursor-pointer rounded-lg bg-wingate px-4 py-3 text-center text-body font-semibold text-white hover:bg-varnish">
              Take or choose a photo
              <input type="file" accept="image/*" capture="environment" className="sr-only" onChange={(e) => onFile(e.target.files?.[0])} />
            </label>
            <button type="button" onClick={() => read()} className="rounded-lg border border-varnish px-4 py-3 text-body font-semibold hover:bg-sky-deep">
              Use the example receipt
            </button>
            <p className="text-small text-varnish-soft">The photo is sent to Claude to read and is not stored. Only item prices are kept, in this browser.</p>
          </div>
        )}

        {state.status === "reading" && (
          <p role="status" className="mt-6 text-body font-semibold">Reading your receipt… this can take up to half a minute.</p>
        )}
        {state.status === "error" && <p role="alert" className="mt-4 text-body font-semibold text-wingate">{state.message}</p>}

        {state.status === "saved" && (
          <div className="mt-6 border-t border-varnish pt-4">
            <p className="text-head font-semibold">Saved {state.count} prices from {state.store}.</p>
            <p className="mt-1 text-body">They now beat the demo prices for those items.</p>
            <Link href="/plan" className="mt-3 inline-flex items-center gap-2 rounded-lg bg-varnish px-5 py-3 text-body font-semibold text-white no-underline hover:bg-wingate">
              See your plan <Icon d={ARROW} />
            </Link>
          </div>
        )}

        {state.status === "review" && (
          <section aria-labelledby="check" className="mt-5">
            <h2 id="check" className="text-head font-bold">Check what we read</h2>
            {state.result.example && <p className="mt-1 text-small text-varnish-soft">Example receipt: no photo was read.</p>}
            <div className="mt-3 grid grid-cols-2 gap-3">
              <label className="text-small font-semibold">
                Store
                <select value={storeId} onChange={(e) => setStoreId(e.target.value)} className={`mt-1 block w-full ${field}`}>
                  <option value="">Pick the store</option>
                  {catalog.stores.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </label>
              <label className="text-small font-semibold">
                Date
                <input type="date" value={state.result.date} onChange={(e) => setState({ ...state, result: { ...state.result, date: e.target.value } })}
                  className={`mt-1 block w-full ${field}`} />
              </label>
            </div>

            <ul className="mt-4 border-t border-varnish">
              {state.result.lines.map((l, i) => (
                <li key={i} className={`border-b border-varnish/25 py-3 ${l.itemId ? "" : "text-varnish-soft"}`}>
                  <p className="text-small font-semibold uppercase tracking-wide">{l.rawName}</p>
                  <div className="mt-1.5 grid grid-cols-[1fr_5.5rem] gap-2">
                    <select aria-label={`Item for ${l.rawName}`} value={l.itemId ?? ""} onChange={(e) => setLine(i, { itemId: e.target.value || null })} className={field}>
                      <option value="">Not on the list (skip)</option>
                      {catalog.items.map((it) => <option key={it.id} value={it.id}>{it.name}</option>)}
                    </select>
                    <label className="relative">
                      <span className="sr-only">Price</span>
                      <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-body">$</span>
                      <input type="number" inputMode="decimal" step="0.01" min="0" value={l.price} onChange={(e) => setLine(i, { price: Number(e.target.value) })}
                        className={`w-full pl-5 ${field}`} />
                    </label>
                  </div>
                  {l.itemId && (
                    <div className="mt-2 flex items-center gap-2 text-small">
                      Pack size
                      <input type="number" inputMode="decimal" min="0" aria-label={`Pack size for ${l.rawName}`} value={l.size}
                        onChange={(e) => setLine(i, { size: Number(e.target.value) })} className={`w-20 ${field}`} />
                      <select aria-label={`Unit for ${l.rawName}`} value={l.unit} onChange={(e) => setLine(i, { unit: e.target.value as ScanLine["unit"] })} className={field}>
                        {UNITS.map((u) => <option key={u} value={u}>{UNIT_LABEL[u]}</option>)}
                      </select>
                    </div>
                  )}
                </li>
              ))}
            </ul>

            <div className="mt-4 flex flex-col gap-2">
              <button type="button" disabled={!storeId || matched === 0} onClick={onSave}
                className="rounded-lg bg-wingate px-4 py-3 text-body font-semibold text-white hover:bg-varnish disabled:bg-varnish/30">
                {storeId ? `Save ${matched} prices` : "Pick the store to save"}
              </button>
              <button type="button" onClick={() => setState({ status: "idle" })} className="rounded-lg border border-varnish px-4 py-3 text-body font-semibold hover:bg-sky-deep">
                Discard
              </button>
            </div>
          </section>
        )}

        {saved > 0 && state.status !== "review" && (
          <p className="mt-8 border-t border-varnish/25 pt-3 text-small">
            {saved} scanned prices saved in this browser.{" "}
            <button type="button" onClick={() => { clearReceipts(); setSaved(0); }} className="underline">Clear them</button>
          </p>
        )}
      </main>
    </>
  );
}
