"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowLeft, ArrowRight, ArrowUpRight, Car, ChevronDown, CircleCheck, Circle, Footprints, MapPin, Sparkles, Trash2 } from "lucide-react";
import { DEMO_SENTENCE, type AskResult } from "@/lib/ask";
import { itemById, places } from "@/lib/catalog";
import { DEFAULT_SEARCH_LOCATION } from "@/lib/offers";
import { addMinutes, ampm, minutesBetween, missingSteps, nowRounded, type Saved } from "@/lib/session";
import type { Place } from "@/lib/types";
import { GOALS, PriceNote, ProductImage, Qty, Screen, Intro, SectionHead, Toggle, card, fine, primaryBtn, useCart } from "../ui";

const HERE = "here";
const LIMITS = [30, 45, 60, 75, 90, 105, 120, 150, 180];
const field = "w-full rounded-[10px] bg-canvas p-3 text-left";

export default function ListPage() {
  const cart = useCart();
  const { s, update, setItem } = cart;
  const location = s.searchLocation ?? DEFAULT_SEARCH_LOCATION;
  const patchItem = (itemId: string, patch: { brandLock?: string; productQuery?: string }) =>
    update({ ...s, list: s.list.map((e) => e.itemId === itemId ? { ...e, ...patch } : e) });
  const [open, setOpen] = useState<string | null>(null);
  const [geoError, setGeoError] = useState("");
  const count = s.list.length;
  const limit = minutesBetween(s.trip.leave, s.trip.homeBy);
  const { from, to } = s.trip;
  // Round trip unless the user asks for a different end: `to: null` means back to the start.
  const sameAsStart = !to || (!!from && from.lat === to.lat && from.lng === to.lng);
  const [differentEnd, setDifferentEnd] = useState(false);
  const showEnd = differentEnd || !sameAsStart;
  const missing = missingSteps(s);

  const placeId = (p: Place | null) => (p ? places.find((x) => x.lat === p.lat && x.lng === p.lng)?.id ?? HERE : "");
  const setPlace = (key: "from" | "to", id: string) => {
    const apply = (p: Place) => update({ ...s, trip: { ...s.trip, [key]: p } });
    if (!id) return;
    if (id !== HERE) return apply(places.find((p) => p.id === id)!);
    setGeoError("");
    navigator.geolocation?.getCurrentPosition(
      ({ coords }) => apply({ lat: coords.latitude, lng: coords.longitude, label: "Current location" }),
      () => setGeoError("Location is off. Pick a preset or allow location in your browser."),
    );
  };

  return (
    <Screen>
      <Link href="/" className="flex items-center gap-2 text-[13px] font-semibold text-bee no-underline"><ArrowLeft size={16} aria-hidden /> Back</Link>
      <Intro eyebrow="YOUR NEXT GROCERY RUN" title={count ? `${count} ${count === 1 ? "item" : "items"} on your list.` : "Start your list."}
        sub={count ? "Now fit it into your day." : "Add groceries, then tell us about your day."} />

      <AskCard current={s} onPlanned={update} />

      <section className={`${card} flex flex-col gap-3 p-[18px]`} aria-label="Price discovery">
        <SectionHead title="Prices" />
        <label className="text-[12px]">Search location
          <input value={location} maxLength={200} onChange={(e) => update({ ...s, searchLocation: e.target.value })}
            className="mt-1 w-full rounded-[10px] border border-line p-3 text-[14px]" />
        </label>
        <label className="text-[12px]">Prices used in plans
          <select value={s.priceMode ?? "real"} onChange={(e) => update({ ...s, priceMode: e.target.value as "real" | "demo" })}
            className="mt-1 w-full rounded-[10px] border border-line p-3 text-[14px]">
            <option value="real">Real observations only</option><option value="demo">Example mode · includes demo prices</option>
          </select>
        </label>
        {s.priceMode === "demo" && <p className="rounded-[10px] bg-amber-tint p-3 text-[12px]">Example mode includes invented demo prices and assumed delivery markups.</p>}
        <p className={fine}>BeeLow checks store prices when you plan your trip. Published offers, not guaranteed inventory or local branch prices.</p>
      </section>

      <section className="flex flex-col gap-[14px]">
        <SectionHead title="Your list" right={<Link href="/add" className="flex h-9 items-center gap-1 rounded-[10px] bg-bee px-3.5 text-[13px] font-semibold text-white no-underline hover:bg-bee-dark">+ Add item</Link>} />
        {count === 0 ? (
          <div className={`${card} p-[18px] text-[14px]`}>
            Your list is empty. <Link href="/add" className="font-semibold text-bee">Add items</Link> to start.
          </div>
        ) : (
          <ul className={`${card} px-4`}>
            {s.list.map((e, i) => {
              const item = itemById(e.itemId);
              if (!item) return null;
              const expanded = open === e.itemId;
              return (
                <li key={e.itemId} className={i ? "border-t border-line" : ""}>
                  <div className="flex items-center gap-2 py-3">
                    <button type="button" onClick={() => setOpen(expanded ? null : e.itemId)} aria-expanded={expanded}
                      className="flex min-w-0 flex-1 items-center gap-[10px] text-left">
                      <ProductImage id={item.id} name={item.name} className="size-11 shrink-0 rounded-[10px]" />
                      <span className="flex min-w-0 flex-col gap-[3px] leading-[1.45]">
                        <span className="line-clamp-2 text-[14px] leading-[1.3]">{item.name}</span>
                        <span className="text-[11px] text-muted">{e.brandLock ? `Brand locked: ${e.brandLock}` : "Any brand"}</span>
                        {e.productQuery && <span className="text-[11px] text-muted">{e.productQuery}</span>}
                        {e.bulkOk && <span className="text-[10px] font-semibold text-bee">✓ Larger package OK</span>}
                      </span>
                    </button>
                    <Qty item={item} qty={e.qty} onChange={(n) => setItem(e.itemId, n)} />
                    <button type="button" onClick={() => setItem(e.itemId, 0)} aria-label={`Remove ${item.name}`}
                      className="grid size-9 shrink-0 place-items-center rounded-[8px] text-carrot hover:bg-canvas">
                      <Trash2 size={16} aria-hidden />
                    </button>
                  </div>
                  {expanded && (
                    <div className="mb-3 flex flex-col gap-3 rounded-[12px] bg-canvas px-3 py-2.5">
                      <label className="text-[12px]">Product / variety
                        <input value={e.productQuery ?? ""} maxLength={200} placeholder={item.name} onChange={(ev) => patchItem(e.itemId, { productQuery: ev.target.value })} className="mt-1 w-full rounded-[8px] border border-line bg-white p-2" />
                      </label>
                      <label className="text-[12px]">Brand lock · optional
                        <input value={e.brandLock ?? ""} maxLength={100} placeholder="Any brand" onChange={(ev) => patchItem(e.itemId, { brandLock: ev.target.value })} className="mt-1 w-full rounded-[8px] border border-line bg-white p-2" />
                      </label>
                      <p className={fine}>Requested package: {item.typicalSize} {item.unit.replace("_", " ")}. Amounts count packages of this size.</p>
                      <Toggle label="Larger package OK" hint="If a bigger package costs less per unit, BeeLow may pick it." on={e.bulkOk} onChange={(b) => setItem(e.itemId, e.qty, b)} />
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
        <p className={fine}>Tap an item to edit it: product, brand, and Larger package OK. Larger packages are avoided unless you allow them, when a suitable smaller pack is available; otherwise the plan warns about overbuying.</p>
      </section>

      <section className="flex flex-col gap-[14px]">
        <SectionHead title="Fit it into your day" />
        <div className={`${card} flex flex-col gap-[14px] p-[18px]`}>
          <div className="flex flex-col gap-1 leading-[1.45]">
            <p className="text-[11px] text-muted">{showEnd ? "ONE WAY · DIFFERENT END" : "ROUND TRIP · RETURN TO START"}</p>
            <p className="text-[14px]">{showEnd ? "Start in one place, end in another." : "Start and end at the same location."}</p>
          </div>
          <PlacePicker icon label={showEnd ? "START" : "START & END"} placeholder="Choose a starting point" value={placeId(from)} onChange={(id) => setPlace("from", id)} />
          <button type="button" onClick={() => setPlace("from", HERE)} className="self-start text-[12px] font-semibold text-bee">
            Use my browser location instead
          </button>
          {geoError && <p role="alert" className="text-[12px] text-carrot">{geoError}</p>}
          <div className="h-px bg-line" />
          {showEnd ? (
            <>
              <PlacePicker label="END" placeholder="Same as start" value={sameAsStart ? "" : placeId(to)} onChange={(id) => setPlace("to", id)} />
              <button type="button" onClick={() => { setDifferentEnd(false); update({ ...s, trip: { ...s.trip, to: null } }); }}
                className="self-start text-[12px] font-semibold text-bee">
                End where I start instead
              </button>
            </>
          ) : (
            <button type="button" onClick={() => setDifferentEnd(true)} className="flex h-[52px] items-center gap-3 rounded-[12px] bg-canvas px-4 text-[14px] font-semibold">
              <ArrowRight size={16} aria-hidden /> Different end location
            </button>
          )}
          <div className="flex gap-3 leading-[1.45]">
            <label className={field}>
              <span className="block text-[10px] text-muted">LEAVE AT</span>
              <input type="time" value={s.trip.leave} aria-label="Leave at"
                onChange={(e) => update({ ...s, trip: { ...s.trip, leave: e.target.value, homeBy: e.target.value && limit ? addMinutes(e.target.value, limit) : "" } })}
                className="w-full bg-transparent text-[14px]" />
            </label>
            <label className={field}>
              <span className="block text-[10px] text-muted">TIME LIMIT</span>
              <select value={limit ?? ""} aria-label="Time limit" className="w-full bg-transparent text-[14px]"
                onChange={(e) => {
                  if (!e.target.value) return update({ ...s, trip: { ...s.trip, homeBy: "" } });
                  const leave = s.trip.leave || nowRounded();
                  update({ ...s, trip: { ...s.trip, leave, homeBy: addMinutes(leave, Number(e.target.value)) } });
                }}>
                <option value="">No limit</option>
                {[...new Set([...LIMITS, ...(limit ? [limit] : [])])].sort((a, b) => a - b).map((m) => <option key={m} value={m}>{m} min</option>)}
              </select>
            </label>
          </div>
          <div role="radiogroup" aria-label="Getting around" className="flex gap-2">
            {([["car", "Car", Car], ["no_car", "No car", Footprints]] as const).map(([id, label, Icon]) => {
              const on = s.trip.mode === id;
              return (
                <button key={id} type="button" role="radio" aria-checked={on} onClick={() => update({ ...s, trip: { ...s.trip, mode: id } })}
                  className={`flex h-11 flex-1 items-center justify-center gap-2 rounded-[10px] text-[13px] font-semibold ${on ? "bg-bee text-white" : "bg-canvas text-muted"}`}>
                  <Icon size={17} aria-hidden /> {label}
                </button>
              );
            })}
          </div>
          <p className={fine}>{s.trip.homeBy ? `Home by ${ampm(s.trip.homeBy)}.` : "No time limit: plans can take as long as they need."}</p>
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <SectionHead title="What matters most?" />
        <div role="radiogroup" aria-label="Goal" className="flex flex-col gap-3">
          {GOALS.map((g) => {
            const on = s.goal === g.id;
            return (
              <button key={g.id} type="button" role="radio" aria-checked={on} onClick={() => update({ ...s, goal: g.id })}
                className={`flex h-[52px] items-center gap-3 rounded-[12px] border px-4 text-[14px] font-semibold ${on ? "border-bee bg-honey-tint" : "border-line bg-white"}`}>
                {on ? <CircleCheck size={19} className="text-bee" aria-hidden /> : <Circle size={19} className="text-muted" aria-hidden />}
                {g.label}
              </button>
            );
          })}
        </div>
      </section>

      <div className="flex flex-col gap-3">
        <Link href="/plan" aria-disabled={missing.length > 0} className={`${primaryBtn} ${missing.length ? "pointer-events-none opacity-50" : ""}`}>
          Find my grocery plans <ArrowRight size={18} aria-hidden />
        </Link>
        {missing.length > 0 && (
          <p className="text-[12px] leading-[1.45] text-muted">To plan: {missing.join(" · ")}.</p>
        )}
        <p className={fine}>{s.priceMode === "demo" ? <PriceNote /> : "Real mode requires confirmed product matches or your confirmed receipts. Missing prices never count as zero."} No account needed. Your list and preferences stay on this device.</p>
      </div>
    </Screen>
  );
}

function PlacePicker({ label, value, onChange, icon, placeholder }: { label: string; value: string; onChange: (id: string) => void; icon?: boolean; placeholder: string }) {
  return (
    <label className="relative flex items-center gap-3">
      {icon ? <MapPin size={20} className="shrink-0" aria-hidden /> : <ArrowRight size={20} className="shrink-0" aria-hidden />}
      <span className="flex min-w-0 flex-1 flex-col gap-0.5 leading-[1.45]">
        <span className="text-[11px] text-muted">{label} · PRESET</span>
        <select value={value} onChange={(e) => onChange(e.target.value)} className={`appearance-none bg-transparent pr-6 text-[14px] ${value ? "" : "text-muted"}`}>
          <option value="" disabled>{placeholder}</option>
          {places.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
          <option value={HERE}>Current location</option>
        </select>
      </span>
      <ChevronDown size={16} className="pointer-events-none absolute right-0" aria-hidden />
    </label>
  );
}

/** "Set up with AI · optional": one sentence fills the list and trip, then shows the plans. */
function AskCard({ current, onPlanned }: { current: Saved; onPlanned: (s: Saved) => void }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [sentence, setSentence] = useState("");
  const [state, setState] = useState<{ busy: boolean; error?: string }>({ busy: false });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setState({ busy: true });
    try {
      const r = await fetch("/api/ask", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ sentence }) });
      const j = (await r.json()) as AskResult & { error?: string; example?: boolean };
      if (!r.ok) return setState({ busy: false, error: j.error ?? "Couldn't plan that. Try again." });
      const place = (id: string, fallback: Place | null) => places.find((p) => p.id === id) ?? fallback;
      onPlanned({
        ...current, priceMode: j.example ? "demo" : current.priceMode ?? "real",
        list: j.list, goal: j.goal,
        trip: { from: place(j.from, current.trip.from), to: place(j.to, current.trip.to), mode: j.mode,
          leave: j.leave || current.trip.leave, homeBy: j.homeBy || current.trip.homeBy },
      });
      router.push("/plan");
    } catch {
      setState({ busy: false, error: "Couldn't reach the planner. Check your connection and try again." });
    }
  };

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="flex items-center gap-3 rounded-[12px] bg-honey-tint p-[14px] text-left">
        <Sparkles size={20} className="shrink-0 text-bee" aria-hidden />
        <span className="flex flex-1 flex-col gap-1 text-[12px] leading-[1.45]">
          <span>Set up with AI · optional</span>
          <span>Describe your run in one sentence, like “{DEMO_SENTENCE.replace(/\.$/, "")}.”</span>
        </span>
        <ArrowUpRight size={16} className="shrink-0" aria-hidden />
      </button>
    );
  }
  return (
    <form onSubmit={submit} className="flex flex-col gap-3 rounded-[12px] bg-honey-tint p-[14px]">
      <label htmlFor="ask" className="flex items-center gap-2 text-[12px]"><Sparkles size={18} className="text-bee" aria-hidden /> Set up with AI · optional</label>
      <textarea id="ask" rows={3} value={sentence} onChange={(e) => setSentence(e.target.value)} placeholder={DEMO_SENTENCE}
        className="w-full resize-none rounded-[10px] border border-line bg-white px-3 py-2 text-[14px] leading-[1.45]" />
      {state.error && <p role="alert" className="text-[12px] font-semibold text-carrot">{state.error}</p>}
      <button type="submit" disabled={state.busy || !sentence.trim()} className={primaryBtn}>
        {state.busy ? "Planning…" : <>Fill my list and plan <ArrowRight size={18} aria-hidden /></>}
      </button>
      <p className={fine}>Replaces your list and trip with what the sentence describes.</p>
    </form>
  );
}
