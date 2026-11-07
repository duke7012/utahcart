"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { ListChecks, Minus, Plus, Route, ScanLine, ShoppingBasket, Wallet, type LucideIcon } from "lucide-react";
import { DEMO, load, save, type Saved } from "@/lib/session";
import type { Goal, Item } from "@/lib/types";

export const GOALS: { id: Goal; label: string }[] = [
  { id: "savings", label: "Most savings" },
  { id: "fewest_stops", label: "Fewest stops" },
  { id: "time", label: "Most time saved" },
];

export const UNIT_LABEL: Record<string, string> = { oz: "oz", fl_oz: "fl oz", lb: "lb", count: "ct" };
export const money = (n: number) => `$${n.toFixed(2)}`;
export const packLabel = (item: Item, qty: number) => `${qty} × ${item.typicalSize} ${UNIT_LABEL[item.unit]}`;

/** Brand row: basket mark + wordmark, and the Salt Lake City tag. */
export function AppHeader() {
  return (
    <header className="mx-auto flex h-[78px] w-full max-w-[480px] items-center justify-between px-6">
      <Link href="/" className="flex items-center gap-[9px] no-underline">
        <span className="grid h-[34px] w-8 place-items-center rounded-[10px] bg-forest text-white">
          <ShoppingBasket size={21} strokeWidth={1.75} aria-hidden />
        </span>
        <span className="text-[22px] tracking-[-0.8px] text-ink">UtahCart</span>
      </Link>
      <span className="flex items-center gap-[5px] text-[11px] text-muted">
        <span className="size-[5px] rounded-[2px] bg-brick" aria-hidden />
        SALT LAKE CITY
      </span>
    </header>
  );
}

const TABS: { href: string; label: string; icon: LucideIcon; match: string[] }[] = [
  { href: "/list", label: "List", icon: ListChecks, match: ["/list", "/add"] },
  { href: "/plan", label: "Plans", icon: Route, match: ["/plan"] },
  { href: "/scan", label: "Scan", icon: ScanLine, match: ["/scan"] },
  { href: "/wallet", label: "Wallet", icon: Wallet, match: ["/wallet"] },
];

export function BottomNav() {
  const path = usePathname();
  return (
    <nav aria-label="UtahCart" className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-white">
      <div className="mx-auto flex h-[86px] max-w-[480px] gap-2 px-4 pb-[14px] pt-3">
        {TABS.map((t) => {
          const on = t.match.some((m) => path.startsWith(m));
          return (
            <Link key={t.href} href={t.href} aria-current={on ? "page" : undefined}
              className={`flex flex-1 flex-col items-center justify-center gap-[5px] rounded-[12px] text-[11px] no-underline ${
                on ? "bg-mint font-bold text-forest" : "font-medium text-muted hover:bg-canvas"
              }`}>
              <t.icon size={21} strokeWidth={1.75} aria-hidden />
              {t.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

/** Page frame: header, a 24px-gutter column, room for the tab bar. */
export function Screen({ children, nav = true }: { children: React.ReactNode; nav?: boolean }) {
  return (
    <>
      <AppHeader />
      <main className={`mx-auto flex w-full max-w-[480px] flex-col gap-6 px-6 pt-3 ${nav ? "pb-[118px]" : "pb-10"}`}>{children}</main>
      {nav && <BottomNav />}
    </>
  );
}

export function Intro({ eyebrow, title, sub }: { eyebrow?: string; title: React.ReactNode; sub?: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-[9px]">
      {eyebrow && <p className="text-[11px] font-bold tracking-[1.2px] text-forest">{eyebrow}</p>}
      <h1 className="text-[32px] font-bold leading-[1.12] tracking-[-1.1px] text-ink">{title}</h1>
      {sub && <p className="text-[14px] leading-[1.45] text-muted">{sub}</p>}
    </div>
  );
}

export function SectionHead({ title, right }: { title: string; right?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between">
      <h2 className="text-[18px] text-ink">{title}</h2>
      {right}
    </div>
  );
}

export const card = "rounded-[18px] border border-line bg-white";
export const primaryBtn =
  "flex h-[52px] w-full items-center justify-center gap-3 rounded-[12px] bg-forest px-4 text-[14px] text-white no-underline hover:bg-forest-dark disabled:opacity-50";
export const secondaryBtn =
  "flex h-[52px] w-full items-center justify-center gap-3 rounded-[12px] border border-line bg-white px-4 text-[14px] text-ink no-underline hover:bg-canvas";
export const fine = "text-[11px] leading-[1.45] text-muted";

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

/** Product picture; falls back to a mint panel with the name when the picture is missing. */
export function ProductImage({ id, name, className = "" }: { id: string; name: string; className?: string }) {
  const [missing, setMissing] = useState(false);
  if (missing) {
    return <div aria-hidden className={`grid place-items-center bg-mint p-1 text-center text-[10px] text-forest ${className}`}>{name}</div>;
  }
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={`/products/${id}.jpg`} alt="" loading="lazy" onError={() => setMissing(true)} className={`bg-canvas object-contain ${className}`} />;
}

/** "− 2 × 15 oz +" quantity control. */
export function Qty({ item, qty, onChange }: { item: Item; qty: number; onChange: (q: number) => void }) {
  return (
    <div className="flex h-9 shrink-0 items-center rounded-[8px] bg-canvas">
      <button type="button" aria-label={`Fewer ${item.name}`} onClick={() => onChange(qty - 1)} className="grid h-9 w-8 place-items-center">
        <Minus size={15} aria-hidden />
      </button>
      <span className="min-w-[4.5rem] text-center text-[12px] font-semibold" aria-live="polite">{packLabel(item, qty)}</span>
      <button type="button" aria-label={`More ${item.name}`} onClick={() => onChange(qty + 1)} className="grid h-9 w-8 place-items-center">
        <Plus size={15} aria-hidden />
      </button>
    </div>
  );
}

export function Toggle({ label, hint, on, onChange }: { label: string; hint?: string; on: boolean; onChange: (b: boolean) => void }) {
  return (
    <button type="button" role="switch" aria-checked={on} onClick={() => onChange(!on)} className="flex flex-1 items-center justify-between gap-3 text-left">
      <span className="flex flex-col leading-[1.45]">
        <span className="text-[13px] font-semibold">{label}</span>
        {hint && <span className="text-[11px] text-muted">{hint}</span>}
      </span>
      <span className={`relative h-[26px] w-[46px] shrink-0 rounded-full transition-colors ${on ? "bg-forest" : "bg-line"}`}>
        <span className={`absolute top-[3px] size-5 rounded-full bg-white transition-[left] ${on ? "left-[23px]" : "left-[3px]"}`} />
      </span>
    </button>
  );
}
