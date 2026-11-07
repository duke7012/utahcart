"use client";

import { useCallback, useEffect, useState } from "react";
import { Lock, Plus, Trash2 } from "lucide-react";
import { catalog, itemById, storeById } from "@/lib/catalog";
import type { PriceQuote } from "@/lib/types";
import { Intro, Screen, UNIT_LABEL, card, fine, money, primaryBtn } from "../ui";

type Row = { field: string; quote: PriceQuote };
const input = "mt-1 w-full rounded-[10px] border border-line bg-white px-3 py-2.5 text-[14px] text-ink";
const PASS = "beelow:team";
const blank = { store_id: "walmart", item_id: "eggs", price: "", pack_size: "", product_name: "", url: "" };

export default function TeamPage() {
  const [passcode, setPasscode] = useState("");
  const [rows, setRows] = useState<Row[]>([]);
  const [configured, setConfigured] = useState(true);
  const [form, setForm] = useState(blank);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    try { setPasscode(sessionStorage.getItem(PASS) ?? ""); } catch {}
  }, []);
  const refresh = useCallback(() =>
    fetch("/api/shared").then((r) => r.json()).then((j) => { setConfigured(j.configured !== false); setRows(j.rows ?? []); }).catch(() => {}), []);
  useEffect(() => { refresh(); }, [refresh]);

  const item = itemById(form.item_id)!;
  const set = (k: keyof typeof blank) => (e: { target: { value: string } }) => setForm({ ...form, [k]: e.target.value });
  const remember = () => { try { sessionStorage.setItem(PASS, passcode); } catch {} };

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    remember();
    const r = await fetch("/api/shared", {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ kind: "team", passcode, rows: [{ ...form, unit: item.unit, checked_on: new Date().toLocaleDateString("en-CA") }] }),
    }).catch(() => null);
    const j = r ? await r.json().catch(() => ({})) : { error: "Couldn't reach BeeLow. Check your connection." };
    setBusy(false);
    if (r?.ok) {
      setMsg({ ok: true, text: `Saved ${item.name} at ${storeById(form.store_id)?.name}. Plans use it now.` });
      setForm({ ...blank, store_id: form.store_id });
      refresh();
    } else setMsg({ ok: false, text: j.error ?? "Couldn't save that price." });
  };

  const remove = async (field: string) => {
    remember();
    const r = await fetch("/api/shared", { method: "DELETE", headers: { "content-type": "application/json" }, body: JSON.stringify({ passcode, field }) }).catch(() => null);
    if (r?.ok) refresh();
    else setMsg({ ok: false, text: r ? (await r.json().catch(() => ({}))).error ?? "Couldn't remove it." : "Couldn't reach BeeLow." });
  };

  const shown = rows.filter((r) => filter === "all" || r.quote.storeId === filter)
    .sort((a, b) => a.quote.storeId.localeCompare(b.quote.storeId) || a.quote.itemId.localeCompare(b.quote.itemId));

  return (
    <Screen>
      <Intro eyebrow="TEAM · SHARED PRICES" title="Add real store prices." sub="Prices saved here go live for every BeeLow user right away. Check each one on the store’s website or app." />

      {!configured && (
        <p role="alert" className="rounded-[12px] bg-amber-tint p-[14px] text-[13px] leading-[1.45]">
          The shared price database isn’t set up yet. In Vercel, open this project → Storage → add Upstash Redis, set TEAM_PASSCODE, then redeploy.
        </p>
      )}

      <label className="text-[11px] text-muted">TEAM PASSCODE
        <span className="relative block">
          <Lock size={15} className="absolute left-3 top-1/2 mt-0.5 -translate-y-1/2 text-muted" aria-hidden />
          <input type="password" value={passcode} onChange={(e) => setPasscode(e.target.value)} autoComplete="current-password" className={`${input} pl-9`} />
        </span>
      </label>

      <form onSubmit={add} className={`${card} flex flex-col gap-3 p-[18px]`}>
        <h2 className="text-[18px]">New price</h2>
        <div className="grid grid-cols-2 gap-3">
          <label className="text-[11px] text-muted">STORE
            <select value={form.store_id} onChange={set("store_id")} className={input}>
              {catalog.stores.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </label>
          <label className="text-[11px] text-muted">ITEM
            <select value={form.item_id} onChange={set("item_id")} className={input}>
              {catalog.items.map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}
            </select>
          </label>
          <label className="text-[11px] text-muted">PRICE ($)
            <input required inputMode="decimal" value={form.price} onChange={set("price")} placeholder="3.12" className={input} />
          </label>
          <label className="text-[11px] text-muted">PACK SIZE ({UNIT_LABEL[item.unit]})
            <input required inputMode="decimal" value={form.pack_size} onChange={set("pack_size")} placeholder={String(item.typicalSize)} className={input} />
          </label>
        </div>
        <label className="text-[11px] text-muted">PRODUCT NAME
          <input value={form.product_name} onChange={set("product_name")} placeholder="Great Value 2% Milk, 1 gal" className={input} />
        </label>
        <label className="text-[11px] text-muted">LINK (optional)
          <input type="url" value={form.url} onChange={set("url")} placeholder="https://www.walmart.com/ip/…" className={input} />
        </label>
        <p className={fine}>Pack size is in {UNIT_LABEL[item.unit]} (a gallon is 128 fl oz, a dozen eggs is 12 ct, a pound is 16 oz).</p>
        {msg && <p role={msg.ok ? "status" : "alert"} className={`text-[13px] font-semibold ${msg.ok ? "text-leaf" : "text-carrot"}`}>{msg.text}</p>}
        <button type="submit" disabled={busy || !passcode} className={primaryBtn}>
          {busy ? "Saving…" : <><Plus size={18} aria-hidden /> Save for everyone</>}
        </button>
      </form>

      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-[18px]">Shared prices · {rows.length}</h2>
          <select value={filter} onChange={(e) => setFilter(e.target.value)} aria-label="Filter by store" className="rounded-[8px] border border-line bg-white px-2 py-1.5 text-[12px]">
            <option value="all">All stores</option>
            {catalog.stores.map((s) => <option key={s.id} value={s.id}>{s.name.split(" ")[0]}</option>)}
          </select>
        </div>
        {shown.length === 0 ? <p className={`${card} p-[18px] text-[14px] text-muted`}>No shared prices yet.</p> : (
          <ul className={`${card} px-4`}>
            {shown.map(({ field, quote: q }, i) => (
              <li key={field} className={`flex items-center gap-3 py-3 ${i ? "border-t border-line" : ""}`}>
                <div className="min-w-0 flex-1 leading-[1.45]">
                  <p className="truncate text-[14px]">{itemById(q.itemId)?.name} · {storeById(q.storeId)?.name.split(" ")[0]}</p>
                  <p className="truncate text-[11px] text-muted">
                    {money(q.price)} for {q.size} {UNIT_LABEL[q.unit]} · {q.source === "receipt" ? "receipt" : "team"} · {q.seenAt}{q.product ? ` · ${q.product}` : ""}
                  </p>
                </div>
                <button type="button" onClick={() => remove(field)} disabled={!passcode} aria-label={`Remove ${itemById(q.itemId)?.name} at ${storeById(q.storeId)?.name}`}
                  className="grid size-9 place-items-center rounded-[8px] text-carrot hover:bg-canvas disabled:opacity-40">
                  <Trash2 size={16} aria-hidden />
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </Screen>
  );
}
