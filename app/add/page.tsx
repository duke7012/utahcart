"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowLeft, ArrowRight, ListChecks, Plus, Search, XCircle } from "lucide-react";
import { AISLES, catalog, itemById } from "@/lib/catalog";
import type { Item } from "@/lib/types";
import { Intro, Qty, Screen, SectionHead, Toggle, UNIT_LABEL, card, fine, primaryBtn, useCart } from "../ui";

const STAPLES = ["black_beans", "pasta", "oats"];

export default function AddPage() {
  const cart = useCart();
  const [query, setQuery] = useState("");
  const [aisle, setAisle] = useState<string | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const q = query.trim().toLowerCase();
  const results = q || aisle ? catalog.items.filter((i) => (!aisle || i.aisle === aisle) && (!q || i.name.toLowerCase().includes(q))) : [];
  const count = cart.s.list.length;
  const aisleLabel = AISLES.find((a) => a.id === aisle)?.label;

  const row = (item: Item, i: number) => {
    const qty = cart.qty(item.id);
    return (
      <li key={item.id} className={i ? "border-t border-line" : ""}>
        <div className="flex items-center gap-3 py-[18px]">
          <button type="button" disabled={!qty} onClick={() => setOpen(open === item.id ? null : item.id)} className="min-w-0 flex-1 text-left">
            <span className="block text-[14px]">{item.name}</span>
            <span className={`block text-[11px] ${qty ? "font-semibold text-forest" : "text-muted"}`}>
              {qty ? "✓ Added" : AISLES.find((a) => a.id === item.aisle)?.label} · {item.typicalSize} {UNIT_LABEL[item.unit]}
            </span>
          </button>
          {qty ? (
            <Qty item={item} qty={qty} onChange={(n) => cart.setItem(item.id, n)} />
          ) : (
            <button type="button" onClick={() => cart.setItem(item.id, 1)} aria-label={`Add ${item.name}`}
              className="flex h-[42px] items-center gap-1.5 rounded-[10px] bg-mint px-3.5 text-[13px] font-semibold text-forest">
              <Plus size={15} aria-hidden /> Add
            </button>
          )}
        </div>
        {qty > 0 && open === item.id && (
          <div className="mb-4 rounded-[12px] bg-canvas px-3.5 py-3">
            <p className="mb-2 text-[12px] font-semibold">Item preferences</p>
            <Toggle label="Bulk OK" hint="Allow a larger pack for this item." on={cart.bulkOk(item.id)} onChange={(b) => cart.setItem(item.id, qty, b)} />
            <p className="mt-2 text-[10px] font-semibold text-forest">✓ Preferences saved to your list</p>
          </div>
        )}
      </li>
    );
  };

  return (
    <Screen>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {!results.length && !q && <img src="/figma/kitchen.jpg" alt="Groceries on a kitchen counter" className="h-[168px] w-full rounded-[18px] object-cover" />}
      <Link href="/list" className="flex items-center gap-2 text-[13px] font-semibold text-forest no-underline">
        <ArrowLeft size={16} aria-hidden /> Your list · {count} items
      </Link>
      <Intro title="Add items" sub="A week of staples. For 3 roommates." />

      <div className="flex flex-col gap-3">
        <label className="flex h-14 items-center gap-3 rounded-[12px] border-2 border-forest bg-white px-4">
          <Search size={20} className="shrink-0 text-muted" aria-hidden />
          <span className="sr-only">Search groceries</span>
          <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search groceries"
            className="w-full bg-transparent text-[16px] outline-none placeholder:text-muted [&::-webkit-search-cancel-button]:hidden" />
          {query && (
            <button type="button" onClick={() => setQuery("")} aria-label="Clear search"><XCircle size={18} className="text-muted" aria-hidden /></button>
          )}
        </label>
        <p className={fine}>Search the UtahCart catalog, not live store inventory.</p>
      </div>

      {q || aisle ? (
        <section className="flex flex-col gap-3">
          <SectionHead title={q ? `Results for “${query.trim()}”` : aisleLabel!}
            right={<span className="text-[11px] text-muted">{results.length} matches</span>} />
          {aisle && !q && <button type="button" onClick={() => setAisle(null)} className="self-start text-[12px] font-semibold text-forest">← All categories</button>}
          {results.length ? <ul className={`${card} px-4`}>{results.map(row)}</ul> : (
            <p className={`${card} p-[18px] text-[14px]`}>Nothing matches “{query.trim()}”. Try another word, like “milk” or “beans”.</p>
          )}
          <p className={fine}>Tap an added item to change its preferences. Bulk OK only applies to that item.</p>
        </section>
      ) : (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/figma/basket.jpg" alt="A basket of fresh vegetables and fruit" className="h-[132px] w-full rounded-[18px] object-cover" />
          <section className="flex flex-col gap-3">
            <SectionHead title="Browse by category" />
            <div className="grid grid-cols-3 gap-2.5">
              {AISLES.map((a) => (
                <button key={a.id} type="button" onClick={() => setAisle(a.id)}
                  className="h-[46px] rounded-[10px] border border-line bg-white text-[13px] text-forest hover:bg-mint">{a.label}</button>
              ))}
            </div>
          </section>
          <section className="flex flex-col gap-3">
            <div>
              <h2 className="text-[18px]">Round out your week</h2>
              <p className="text-[13px] text-muted">Easy staples for the three of you.</p>
            </div>
            <div className={`${card} p-4`}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/figma/pantry.jpg" alt="Pantry staples on a table" className="h-[112px] w-full rounded-[16px] object-cover" />
              <ul>{STAPLES.map((id) => itemById(id)!).map(row)}</ul>
            </div>
            <p className={fine}>Add an item, then tap it to set Bulk OK.</p>
          </section>
          {count > 0 && (
            <div className="flex gap-3 rounded-[12px] bg-mint p-[14px]">
              <ListChecks size={20} className="shrink-0 text-forest" aria-hidden />
              <div className="text-[12px] leading-[1.45]">
                <p className="font-semibold text-forest">Already on your list · {count} items</p>
                <p className="text-muted">{cart.s.list.map((e) => itemById(e.itemId)?.name).join(", ")}</p>
              </div>
            </div>
          )}
        </>
      )}

      <div className="flex flex-col gap-2">
        <p className="text-center text-[11px] text-muted">{count} items on your list · Add more anytime</p>
        <Link href="/list" className={primaryBtn}>View list · {count} items <ArrowRight size={18} aria-hidden /></Link>
      </div>
    </Screen>
  );
}
