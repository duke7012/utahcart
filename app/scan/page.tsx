"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight, Camera, Check, CircleCheck, FileImage, ScanLine, ShieldCheck, Upload } from "lucide-react";
import { catalog, itemById } from "@/lib/catalog";
import { toQuotes, type ScanLine as Line, type ScanResult } from "@/lib/receipts";
import { addReceipts, clearReceipts, load, loadReceipts, planRequest } from "@/lib/session";
import type { PriceQuote } from "@/lib/types";
import { Screen, UNIT_LABEL, card, fine, money, primaryBtn, secondaryBtn } from "../ui";

type Step = "upload" | "reading" | "review" | "saved";
type Review = ScanResult & { example?: boolean; keep: boolean[] };
type Saved = { count: number; store: string; date: string; changes: { name: string; before?: number; after: number; unit: string }[]; before?: number; after?: number };

const UNITS: Line["unit"][] = ["oz", "fl_oz", "lb", "count"];
const input = "w-full rounded-[10px] border border-line bg-white px-3 py-2.5 text-[14px]";

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

const guessStore = (name: string) =>
  catalog.stores.find((s) => name.toLowerCase().includes(s.name.split(/[ ']/)[0].toLowerCase()))?.id ?? "";

/** Current unit price BeeLow uses for this item at this store (latest receipt, else demo). */
function currentUnit(storeId: string, itemId: string): number | undefined {
  const q = [...loadReceipts(), ...catalog.prices].find((p) => p.storeId === storeId && p.itemId === itemId && p.channel === "in_person");
  return q && q.price / q.size;
}

/** Best plan total for the user's goal, optionally with extra receipt prices. */
async function bestTotal(extra: PriceQuote[] = []): Promise<number | undefined> {
  const s = load();
  const req = planRequest(s);
  if (!req) return undefined;
  const body = JSON.parse(req);
  body.quotes = [...body.quotes, ...extra];
  const r = await fetch("/api/plan", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  if (!r.ok) return undefined;
  return ((await r.json()).plans as { goal: string; money: number }[]).find((p) => p.goal === s.goal)?.money;
}

export default function ScanPage() {
  const [step, setStep] = useState<Step>("upload");
  const [kind, setKind] = useState<"receipt" | "shelf">("receipt");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [review, setReview] = useState<Review | null>(null);
  const [storeId, setStoreId] = useState("");
  const [impact, setImpact] = useState<{ before?: number; after?: number }>({});
  const [saved, setSaved] = useState<Saved | null>(null);
  const [stored, setStored] = useState(0);
  useEffect(() => setStored(loadReceipts().length), []);
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);

  const pick = (f?: File) => {
    if (!f) return;
    setFile(f);
    setPreview(URL.createObjectURL(f));
    setError("");
  };

  const read = async (useExample: boolean) => {
    setStep("reading");
    setError("");
    try {
      let body: FormData | undefined;
      if (!useExample && file) {
        body = new FormData();
        body.append("image", await shrink(file).catch(() => file), "receipt.jpg");
      }
      const r = await fetch(body ? "/api/scan" : "/api/scan?example=1", { method: "POST", body });
      const j = await r.json();
      if (!r.ok) {
        setError(j.error ?? "Couldn't read that photo.");
        return setStep("upload");
      }
      setStoreId(guessStore(j.store));
      setReview({ ...j, keep: j.lines.map((l: Line) => !!l.itemId) });
      setStep("review");
    } catch {
      setError("Couldn't reach the scanner. Check your connection and try again.");
      setStep("upload");
    }
  };

  const chosen = review && storeId ? toQuotes(storeId, review.date, review.lines.filter((l, i) => review.keep[i] && l.price > 0 && l.size > 0)) : [];
  const chosenKey = JSON.stringify(chosen);
  useEffect(() => {
    if (step !== "review") return;
    let live = true;
    Promise.all([bestTotal(), bestTotal(chosen)]).then(([before, after]) => live && setImpact({ before, after }));
    return () => { live = false; };
  }, [chosenKey, step]); // eslint-disable-line react-hooks/exhaustive-deps

  const setLine = (i: number, patch: Partial<Line>) =>
    review && setReview({ ...review, lines: review.lines.map((l, j) => (j === i ? { ...l, ...patch } : l)) });
  const setKeep = (i: number, keep: boolean) => review && setReview({ ...review, keep: review.keep.map((k, j) => (j === i ? keep : k)) });

  const onSave = () => {
    if (!review || !chosen.length) return;
    const changes = chosen.map((q) => ({ name: itemById(q.itemId)?.name ?? q.itemId, before: currentUnit(q.storeId, q.itemId), after: q.price / q.size, unit: UNIT_LABEL[q.unit] }));
    setStored(addReceipts(chosen).length);
    setSaved({ count: chosen.length, store: catalog.stores.find((s) => s.id === storeId)!.name, date: review.date, changes, ...impact });
    setFile(null);
    setPreview(null);
    setStep("saved");
  };

  const steps = ["Upload", "Review", "Saved"];
  const at = step === "saved" ? 2 : step === "review" ? 1 : 0;
  const eyebrow = `PRICE CHECK · ${steps[at].toUpperCase()}`;

  return (
    <Screen>
      <div className="flex flex-col gap-[9px]">
        <p className="text-[11px] font-bold tracking-[1.2px] text-bee">{eyebrow}</p>
        <h1 className="text-[32px] font-bold leading-[1.12] tracking-[-1.1px]">
          {step === "saved" ? <>A fresher price.<br />A better plan.</> : step === "review" ? "Check before we save." : "Your receipt can help."}
        </h1>
        <p className="text-[14px] leading-[1.45] text-muted">
          {step === "saved" ? `Your ${saved?.store.split(" ")[0]} receipt is now part of this trip’s estimate.`
            : step === "review" ? `We found ${review?.lines.length} item lines. Only your selected prices will update.`
            : "Turn a recent shop into better prices for your next grocery run."}
        </p>
      </div>

      <ol className="grid grid-cols-3 gap-2 text-[13px]">
        {steps.map((s, i) => (
          <li key={s} aria-current={i === at ? "step" : undefined}
            className={`rounded-[10px] py-2.5 text-center ${i === at ? "bg-honey-tint font-semibold text-bee" : "text-muted"}`}>
            {i < at ? "✓ " : `${i + 1} `}{s}
          </li>
        ))}
      </ol>

      {(step === "upload" || step === "reading") && (
        <>
          <div role="radiogroup" aria-label="Photo type" className="grid grid-cols-2 rounded-[12px] bg-line/60 p-1">
            {(["receipt", "shelf"] as const).map((k) => (
              <button key={k} type="button" role="radio" aria-checked={kind === k} onClick={() => setKind(k)}
                className={`rounded-[10px] py-2.5 text-[15px] ${kind === k ? "bg-white font-semibold text-bee" : "text-muted"}`}>
                {k === "receipt" ? "Receipt" : "Shelf photo"}
              </button>
            ))}
          </div>
          <div className={`${card} flex flex-col gap-3 p-[10px]`}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={preview ?? "/figma/receipt.jpg"} alt={preview ? "Your photo" : "Example: a grocery receipt on a counter"} className="h-[224px] w-full rounded-[10px] object-cover" />
            <div className="flex items-center gap-3 px-1 pb-1">
              <FileImage size={21} className="shrink-0 text-bee" aria-hidden />
              <div className="min-w-0 flex-1 leading-[1.45]">
                <p className="truncate text-[15px]">{file ? file.name : "No photo yet"}</p>
                <p className="text-[12px] text-muted">{file ? `1 photo · ${(file.size / 1048576).toFixed(1)} MB · Ready to scan` : "Take or choose a photo below"}</p>
              </div>
              {file && <CircleCheck size={20} className="text-bee" aria-hidden />}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <label className={`${secondaryBtn} cursor-pointer`}>
              <Camera size={18} aria-hidden /> Take photo
              <input type="file" accept="image/*" capture="environment" className="sr-only" onChange={(e) => pick(e.target.files?.[0])} />
            </label>
            <label className={`${secondaryBtn} cursor-pointer`}>
              <Upload size={18} aria-hidden /> Choose file
              <input type="file" accept="image/*" className="sr-only" onChange={(e) => pick(e.target.files?.[0])} />
            </label>
          </div>
          <p className="text-[13px] leading-[1.45] text-muted">
            {kind === "receipt" ? "Include the store, date and item lines in good light." : "Include the product and its price tag in good light."}
          </p>
          <div className="flex flex-col gap-2 rounded-[18px] bg-honey-tint p-[18px]">
            <p className="flex items-center gap-2 text-[15px] font-semibold text-bee"><ShieldCheck size={18} aria-hidden /> Prices, not your personal details.</p>
            <p className="text-[13px] leading-[1.5]">AI reads store, date, items and prices. You review and edit before anything is saved. We keep only the item lines you choose—not the photo or card details.</p>
          </div>
          {error && <p role="alert" className="text-[13px] font-semibold text-carrot">{error}</p>}
          <button type="button" disabled={!file || step === "reading"} onClick={() => read(false)} className={primaryBtn}>
            {step === "reading" ? "Reading your photo…" : <>Scan & review prices <ScanLine size={18} aria-hidden /></>}
          </button>
          <button type="button" disabled={step === "reading"} onClick={() => read(true)} className="text-[13px] font-semibold text-bee">
            No receipt handy? Use the example receipt
          </button>
          <p className={`${fine} text-center`}>AI can misread a receipt. Nothing updates until you confirm.</p>
        </>
      )}

      {step === "review" && review && (
        <>
          <div className={`${card} flex flex-col gap-3 p-[18px]`}>
            <h2 className="text-[16px]">Receipt details</h2>
            {review.example && <p className="text-[11px] text-muted">Example receipt: no photo was read.</p>}
            <label className="text-[11px] text-muted">STORE
              <select value={storeId} onChange={(e) => setStoreId(e.target.value)} className={`${input} mt-1 font-semibold text-ink`}>
                <option value="">Pick the store</option>
                {catalog.stores.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="text-[11px] text-muted">PURCHASE DATE
                <input type="date" value={review.date} onChange={(e) => setReview({ ...review, date: e.target.value })} className={`${input} mt-1 font-semibold text-ink`} />
              </label>
              <p className="text-[11px] text-muted">SOURCE<span className={`${input} mt-1 block font-semibold text-ink`}>{kind === "receipt" ? "Receipt" : "Shelf photo"}</span></p>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <h2 className="text-[18px]">Review item lines</h2>
            <span className="text-[12px] font-semibold text-bee">{review.keep.filter(Boolean).length} of {review.lines.length} selected</span>
          </div>
          {review.lines.map((l, i) => {
            const keep = review.keep[i];
            const before = l.itemId && storeId ? currentUnit(storeId, l.itemId) : undefined;
            const unit = l.price / l.size;
            return (
              <div key={i} className={`flex flex-col gap-3 rounded-[18px] p-[18px] ${keep ? "border-2 border-bee bg-honey-tint" : "border border-line bg-white"}`}>
                <label className="flex items-start gap-3">
                  <input type="checkbox" checked={keep} disabled={!l.itemId} onChange={(e) => setKeep(i, e.target.checked)} className="mt-1 size-4" />
                  <span className="flex-1 leading-[1.45]">
                    <span className="block text-[14px]">{l.itemId ? itemById(l.itemId)?.name : l.rawName}</span>
                    <span className="block text-[11px] text-muted">{l.itemId ? "Matched to the catalog" : "Not on the catalog · Not selected"}</span>
                  </span>
                  <span className="text-[11px] font-semibold tracking-[0.6px] text-bee">{keep ? "KEEP" : ""}</span>
                </label>
                {keep && (
                  <>
                    <label className="text-[11px] text-muted">RECEIPT ITEM NAME<span className={`${input} mt-1 block text-ink`}>{l.rawName}</span></label>
                    <label className="text-[11px] text-muted">MATCH
                      <select value={l.itemId ?? ""} onChange={(e) => setLine(i, { itemId: e.target.value || null })} className={`${input} mt-1 text-ink`}>
                        {catalog.items.map((it) => <option key={it.id} value={it.id}>{it.name}</option>)}
                      </select>
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      <label className="text-[11px] text-muted">PACK SIZE
                        <span className="mt-1 flex gap-1.5">
                          <input type="number" inputMode="decimal" min="0" value={l.size} onChange={(e) => setLine(i, { size: Number(e.target.value) })} className={`${input} min-w-0`} />
                          <select value={l.unit} aria-label="Unit" onChange={(e) => setLine(i, { unit: e.target.value as Line["unit"] })} className={`${input} w-[4.5rem] px-1.5`}>
                            {UNITS.map((u) => <option key={u} value={u}>{UNIT_LABEL[u]}</option>)}
                          </select>
                        </span>
                      </label>
                      <label className="text-[11px] text-muted">LINE PRICE
                        <input type="number" inputMode="decimal" step="0.01" min="0" value={l.price} onChange={(e) => setLine(i, { price: Number(e.target.value) })} className={`${input} mt-1 font-semibold text-ink`} />
                      </label>
                    </div>
                    <div className="flex items-end justify-between border-t border-bee/20 pt-3">
                      <span className="text-[11px] text-muted">BEFORE · DEMO<br /><span className="text-[15px] text-muted line-through">{before !== undefined ? `${money(before)}/${UNIT_LABEL[l.unit]}` : "—"}</span></span>
                      <ArrowRight size={16} className="mb-1" aria-hidden />
                      <span className="text-right text-[11px] text-bee">RECEIPT<br /><span className="text-[20px] font-bold">{money(unit)}/{UNIT_LABEL[l.unit]}</span></span>
                    </div>
                  </>
                )}
              </div>
            );
          })}

          <div className={`${card} flex flex-col gap-2 p-[18px] text-[14px]`}>
            {impact.before !== undefined && impact.after !== undefined ? (
              <>
                <p>{impact.before - impact.after >= 0.01 ? `Your plan will get ${money(impact.before - impact.after)} cheaper.` : "Your plan’s total stays about the same."}</p>
                <div className="flex justify-between text-muted"><span>Plan before</span><span>{money(impact.before)}</span></div>
                <div className="flex justify-between"><span className="text-muted">After saving these prices</span><span className="text-[18px] font-bold">{money(impact.after)}</span></div>
              </>
            ) : <p className="text-muted">{!storeId ? "Pick the store to see how your plan changes." : planRequest(load()) ? "Checking your plan…" : "Add items and a trip to see what these prices save."}</p>}
          </div>
          <button type="button" disabled={!storeId || !chosen.length} onClick={onSave} className={primaryBtn}>
            {storeId ? <>Save {chosen.length} {chosen.length === 1 ? "price" : "prices"} & refresh plan <Check size={18} aria-hidden /></> : "Pick the store to save"}
          </button>
          <button type="button" onClick={() => setStep("upload")} className="text-[13px] font-semibold text-muted">Discard and start over</button>
          <p className={fine}>Only the selected item lines, store, date and prices are saved, in this browser. The photo and any card details are discarded.</p>
        </>
      )}

      {step === "saved" && saved && (
        <>
          <div className="flex flex-col items-center gap-2 rounded-[18px] bg-bee p-6 text-center text-white">
            <CircleCheck size={32} strokeWidth={1.5} aria-hidden />
            <p className="text-[20px] font-bold">{saved.count} {saved.count === 1 ? "price" : "prices"} saved. Photo discarded.</p>
            <p className="text-[12px] leading-[1.5] opacity-90">{saved.store}{saved.date && ` · Receipt dated ${saved.date}`} · Confirmed today</p>
          </div>
          <div className={`${card} flex flex-col gap-3 p-[18px]`}>
            <h2 className="text-[18px]">What changed</h2>
            {saved.changes.slice(0, 4).map((c) => (
              <div key={c.name} className="flex items-center justify-between text-[13px]">
                <span>{c.name}</span>
                <span>
                  {c.before !== undefined && <span className="mr-2 text-muted line-through">{money(c.before)}/{c.unit}</span>}
                  <span className="font-semibold text-bee">{money(c.after)}/{c.unit}</span>
                </span>
              </div>
            ))}
            <p className={fine}>Receipt prices, not a live shelf guarantee.</p>
          </div>
          {saved.before !== undefined && saved.after !== undefined && (
            <div className="flex flex-col gap-1 rounded-[18px] bg-honey-tint p-[18px]">
              <div className="flex justify-between text-[11px] tracking-[0.6px] text-bee"><span>YOUR PLAN</span><span>UPDATED</span></div>
              <p className="text-[34px] font-bold tracking-[-1px]">{money(saved.after)} <span className="text-[16px] font-normal text-muted line-through">{money(saved.before)}</span></p>
            </div>
          )}
          <Link href="/plan" className={primaryBtn}>Back to my updated plan <ArrowRight size={18} aria-hidden /></Link>
          <button type="button" onClick={() => setStep("upload")} className={secondaryBtn}>Scan another price <ScanLine size={16} aria-hidden /></button>
        </>
      )}

      {stored > 0 && step !== "review" && (
        <p className={fine}>
          {stored} scanned prices saved in this browser.{" "}
          <button type="button" onClick={() => { clearReceipts(); setStored(0); }} className="font-semibold text-bee underline">Clear them</button>
        </p>
      )}
    </Screen>
  );
}
