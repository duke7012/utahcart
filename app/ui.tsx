import Link from "next/link";
import type { Goal } from "@/lib/types";

export const GOALS: { id: Goal; label: string }[] = [
  { id: "savings", label: "Most savings" },
  { id: "fewest_stops", label: "Fewest stops" },
  { id: "time", label: "Most time" },
];

export function TopBar({ right }: { right?: React.ReactNode }) {
  return (
    <header className="sticky top-0 z-10 flex items-center justify-between bg-varnish px-4 py-3 text-tan">
      <Link href="/" className="text-xl font-bold tracking-tight text-white no-underline">
        UtahCart
      </Link>
      <div className="text-sm">{right}</div>
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
          className={`flex-1 border-l border-varnish py-2.5 text-[15px] font-semibold first:border-l-0 ${
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
