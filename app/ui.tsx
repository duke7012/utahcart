"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { DEMO, load, save, type Saved } from "@/lib/session";
import type { Goal } from "@/lib/types";

export const GOALS: { id: Goal; label: string }[] = [
  { id: "savings", label: "Most savings" },
  { id: "fewest_stops", label: "Fewest stops" },
  { id: "time", label: "Most time" },
];

/** Sticky top bar; `children` (e.g. the shop's search) stick with it on a sky band. */
export function TopBar({ right, children, width = "max-w-xl" }: { right?: React.ReactNode; children?: React.ReactNode; width?: string }) {
  return (
    <header className="sticky top-0 z-10 bg-varnish text-tan">
      <div className={`mx-auto flex ${width} items-center justify-between px-4 py-3`}>
        <Link href="/" className="text-head font-bold tracking-tight text-white no-underline">
          UtahCart
        </Link>
        <div className="text-small">{right}</div>
      </div>
      {children && <div className="border-b border-varnish/25 bg-sky text-varnish">{children}</div>}
    </header>
  );
}

/** Segmented control; the active segment is Wingate red. */
export function Segments<T extends string>({
  options, value, onChange, label,
}: { options: { id: T; label: string }[]; value: T; onChange: (v: T) => void; label: string }) {
  return (
    <div role="radiogroup" aria-label={label} className="flex overflow-hidden rounded-lg border border-varnish">
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          role="radio"
          aria-checked={value === o.id}
          onClick={() => onChange(o.id)}
          className={`flex-1 border-l border-varnish py-2.5 text-body font-semibold first:border-l-0 ${
            value === o.id ? "bg-wingate text-white" : "bg-transparent text-varnish hover:bg-sky-deep"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Icon({ d, className = "size-5" }: { d: string; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className={className} aria-hidden>
      <path d={d} />
    </svg>
  );
}
export const PLUS = "M12 5v14M5 12h14";
export const MINUS = "M5 12h14";
export const ARROW = "M5 12h14M13 6l6 6-6 6";
export const CHEVRON = "M6 9l6 6 6-6";
export const SEARCH = "M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM20 20l-4-4";
export const CART = "M3 4h2l2.4 11h11.2L21 7H6.3M9 20a1 1 0 1 0 0-2 1 1 0 0 0 0 2zM18 20a1 1 0 1 0 0-2 1 1 0 0 0 0 2z";

export const UNIT_LABEL: Record<string, string> = { oz: "oz", fl_oz: "fl oz", lb: "lb", count: "ct" };
export const money = (n: number) => `$${n.toFixed(2)}`;

/** The cart (list + trip + goal), saved in this browser. */
export function useCart() {
  const [s, setS] = useState<Saved>(DEMO);
  useEffect(() => setS(load()), []);
  const update = (next: Saved) => {
    setS(next);
    save(next);
  };
  const entry = (id: string) => s.list.find((e) => e.itemId === id);
  const setItem = (itemId: string, qty: number, bulkOk = entry(itemId)?.bulkOk ?? false) => {
    const list = s.list.some((e) => e.itemId === itemId)
      ? s.list.map((e) => (e.itemId === itemId ? { ...e, qty, bulkOk } : e)).filter((e) => e.qty > 0)
      : qty > 0 ? [...s.list, { itemId, qty, bulkOk }] : s.list;
    update({ ...s, list });
  };
  return { s, update, qty: (id: string) => entry(id)?.qty ?? 0, bulkOk: (id: string) => entry(id)?.bulkOk ?? false, setItem };
}

/** Product illustration; falls back to a sandstone panel with the name when the picture is missing. */
export function ProductImage({ id, name, className = "" }: { id: string; name: string; className?: string }) {
  const [missing, setMissing] = useState(false);
  if (missing) {
    return (
      <div aria-hidden className={`grid place-items-center bg-tan p-2 text-center text-small font-semibold leading-tight ${className}`}>
        {name}
      </div>
    );
  }
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={`/products/${id}.jpg`} alt="" loading="lazy" onError={() => setMissing(true)} className={`object-contain ${className}`} />;
}

export function Stepper({ name, qty, onChange }: { name: string; qty: number; onChange: (q: number) => void }) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-varnish bg-white">
      <button type="button" aria-label={`Fewer ${name}`} onClick={() => onChange(qty - 1)} className="grid size-10 place-items-center">
        <Icon d={MINUS} />
      </button>
      <span className="min-w-6 text-center text-body font-semibold" aria-live="polite">{qty}</span>
      <button type="button" aria-label={`More ${name}`} onClick={() => onChange(qty + 1)} className="grid size-10 place-items-center">
        <Icon d={PLUS} />
      </button>
    </div>
  );
}
