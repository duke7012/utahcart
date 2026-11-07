"use client";

import { useEffect, useRef, useState } from "react";
import { ExternalLink, RefreshCw } from "lucide-react";
import { concurrencyLimit } from "@/lib/price-cache";
import { requestKey } from "@/lib/offers";
import { loadPrices, retainPrices, savePriceResult, type StoredPrices } from "@/lib/price-session";
import type { ListEntry, Offer, PriceResult } from "@/lib/types";
import { fine, money, secondaryBtn, UNIT_LABEL } from "../ui";

const slot = concurrencyLimit(3);
export function usePrices(location: string) {
  const [results, setResults] = useState<StoredPrices>({});
  const [busy, setBusy] = useState<Set<string>>(new Set());
  const running = useRef(new Set<string>());
  useEffect(() => setResults(loadPrices()), []);
  const refresh = async (entries: ListEntry[]) => {
    await Promise.all(entries.map(async (entry) => {
      const key = requestKey(entry, location);
      if (running.current.has(key)) return;
      running.current.add(key);
      setBusy((prev) => new Set(prev).add(key));
      await slot(async () => {
        let result: PriceResult;
        try {
          const response = await fetch("/api/prices", { method: "POST", headers: { "content-type": "application/json" },
            body: JSON.stringify({ entry, location }), signal: AbortSignal.timeout(55_000) });
          const body = await response.json();
          if (!Array.isArray(body.offers) || !["ok", "empty", "setup", "error"].includes(body.status)) throw new Error("response");
          result = body as PriceResult;
        } catch {
          result = { status: "error", offers: [], matching: "unconfirmed", cached: false, message: "Refresh failed. Earlier prices are still shown with their original timestamps. Retry this item." };
        }
        savePriceResult(key, result);
        setResults((prev) => ({ ...prev, [key]: retainPrices(prev[key], result) }));
      });
      running.current.delete(key);
      setBusy((prev) => { const next = new Set(prev); next.delete(key); return next; });
    }));
  };
  return { refresh, anyBusy: busy.size > 0, result: (entry: ListEntry) => results[requestKey(entry, location)],
    busy: (entry: ListEntry) => busy.has(requestKey(entry, location)) };
}

const MATCH_LABEL = { exact: "Exact match", substitute: "Acceptable substitute", uncertain: "Uncertain", reject: "Not a match" };
export function ItemPrices({ entry, result, busy, onRefresh }: { entry: ListEntry; result?: PriceResult; busy: boolean; onRefresh: () => void }) {
  const [showRejected, setShowRejected] = useState(false);
  const offers = [...(result?.offers ?? [])].sort((a, b) => Number(!!b.storeId) - Number(!!a.storeId) || a.priceCents - b.priceCents);
  const visible = offers.filter((o) => showRejected || o.match !== "reject");
  const matched = offers.some((o) => ["exact", "substitute"].includes(o.match) && o.matchingConfirmed);
  return (
    <div className="mb-3 flex flex-col gap-3 rounded-[12px] border border-line p-3" aria-label={`Prices for ${entry.itemId}`}>
      <button type="button" onClick={onRefresh} disabled={busy} className={`${secondaryBtn} !h-11`}>
        <RefreshCw size={15} className={busy ? "animate-spin" : ""} aria-hidden /> {busy ? "Checking prices…" : result ? "Refresh prices" : "Find prices"}
      </button>
      <div aria-live="polite" className="flex flex-col gap-2">
        {busy && <p className={fine}>Searching published offers and checking product matches…</p>}
        {result?.message && <p role={result.status === "error" || result.status === "setup" ? "alert" : "status"} className="rounded-[10px] bg-amber-tint p-2 text-[12px]">{result.message}</p>}
        {result && !matched && <p className="text-[12px] font-semibold">No matching price found.{visible.length > 0 ? " Browse the unconfirmed offers below." : ""}</p>}
        {result?.cached && <p className={fine}>Cached results · original check times shown.</p>}
      </div>
      {visible.map((offer) => <OfferRow key={offer.id} offer={offer} />)}
      {offers.some((o) => o.match === "reject") && <button type="button" onClick={() => setShowRejected(!showRejected)} className="text-left text-[12px] font-semibold text-bee">{showRejected ? "Hide" : "Show"} rejected products</button>}
    </div>
  );
}

function OfferRow({ offer: o }: { offer: Offer }) {
  const pkg = o.packageQuantity && o.packageUnit && o.packCount
    ? `${o.packCount > 1 ? `${o.packCount} × ` : ""}${Number(o.packageQuantity.toFixed(3))} ${UNIT_LABEL[o.packageUnit]}` : "Package size unconfirmed";
  const timestamp = new Date(o.retrievedAt);
  return (
    <article className="flex flex-col gap-1 border-t border-line pt-3 text-[12px] leading-[1.5]">
      <p className="font-semibold">{o.title}</p>
      <p>{pkg} · {o.merchant}</p>
      <p className="text-[15px] font-semibold">{money(o.priceCents / 100)}
        {o.unitPriceCents !== null && o.packageUnit && <span className="ml-2 text-[11px] font-normal text-muted">${(o.unitPriceCents / 100).toFixed(3)}/{UNIT_LABEL[o.packageUnit]}</span>}
      </p>
      <p>{o.matchingConfirmed ? MATCH_LABEL[o.match] : "Product matching unconfirmed"} · {o.channel === "unknown" ? "Shopping channel unconfirmed" : o.channel.replace("_", " ")}</p>
      {typeof o.raw.delivery === "string" && o.raw.delivery && <p className={fine}>Published fulfillment: {o.raw.delivery}</p>}
      <p className={fine}>{o.matchReason}</p>
      {!o.locationVerified && <p className="text-[11px]">Local branch price unconfirmed.</p>}
      {o.conditions.length > 0 && <p className="rounded-[8px] bg-amber-tint p-2">{o.conditions.join(" · ")}</p>}
      <p className={fine}>{o.sourceType === "google_shopping" ? `Google Shopping · checked ${timestamp.toLocaleString()}` : `${o.sourceType === "kroger_api" ? "Retailer API via Kroger" : "Team observation"} · recorded ${o.observedAt?.slice(0, 10) ?? "date unknown"}`} · retailer update time unknown</p>
      {o.sourceUrl && <a href={o.sourceUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 font-semibold text-bee">View source <ExternalLink size={12} aria-hidden /></a>}
    </article>
  );
}
