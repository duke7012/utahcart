"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Footprints, WalletCards } from "lucide-react";
import { DEMO, save } from "@/lib/session";
import { ProductImage, Screen, card, fine, primaryBtn, secondaryBtn } from "./ui";

const STEPS = [
  ["Add what you need", "Pick your groceries, quantities and Bulk OK."],
  ["Tell us about your day", "Set your start, end, time limit and car or no car."],
  ["Choose what matters most", "Compare store stops and online orders together."],
];

export default function HomePage() {
  const router = useRouter();
  const tryExample = () => {
    save(DEMO);
    router.push("/plan");
  };

  return (
    <Screen nav={false}>
      <div className="flex flex-col gap-[9px]">
        <p className="text-[11px] font-bold tracking-[1.2px] text-bee">GROCERIES, ON YOUR TERMS</p>
        <h1 className="text-[32px] font-bold leading-[1.12] tracking-[-1.1px]">Your groceries.<br />Fitted to your day.</h1>
        <p className="text-[14px] leading-[1.45] text-muted">
          Store stops, online orders, or a little of both. Make a grocery plan that fits your time, budget and way home.
        </p>
      </div>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/figma/kitchen.jpg" alt="Fresh groceries on a kitchen counter" className="h-[202px] w-full rounded-[18px] object-cover" />
      <div className="flex flex-col gap-3">
        <Link href="/list" className={primaryBtn}>Start my list <ArrowRight size={18} aria-hidden /></Link>
        <p className={`${fine} text-center`}>No account needed. Your list stays on this device. <Link href="/login" className="font-semibold text-bee">Log in</Link> to keep trips on any phone.</p>
        <button type="button" onClick={tryExample} className="flex items-center justify-center gap-2 text-[13px] font-semibold text-bee">
          Just exploring? Try an example list <ArrowRight size={15} aria-hidden />
        </button>
      </div>

      <section className="-mx-6 flex flex-col gap-4 bg-white px-6 py-8">
        <div>
          <h2 className="text-[22px] font-bold tracking-[-0.5px]">One list. A plan that fits.</h2>
          <p className="text-[13px] text-muted">You bring the list. We help with the where and how.</p>
        </div>
        <ol className="flex flex-col gap-4">
          {STEPS.map(([t, d], i) => (
            <li key={t} className="flex gap-3">
              <span className="grid size-6 shrink-0 place-items-center rounded-full bg-honey-tint text-[11px] font-bold text-bee">{i + 1}</span>
              <span className="leading-[1.45]">
                <span className="block text-[14px] font-semibold">{t}</span>
                <span className="block text-[12px] text-muted">{d}</span>
              </span>
            </li>
          ))}
        </ol>
        <div className="grid grid-cols-3 gap-2">
          {["Most savings", "Fewest stops", "Most time saved"].map((g) => (
            <span key={g} className="rounded-[8px] bg-honey-tint py-2 text-center text-[11px] font-semibold text-bee">{g}</span>
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <p className="text-[11px] font-bold tracking-[1.2px] text-bee">A LITTLE OF BOTH</p>
          <h2 className="text-[24px] font-bold leading-[1.12] tracking-[-0.6px]">Fresh on the way. Bulky to your door.</h2>
          <p className="text-[13px] leading-[1.45] text-muted">A quick stop for the essentials. An online order for the things you’d rather not carry.</p>
        </div>
        <div className={`${card} flex flex-col gap-4 p-[18px]`}>
          <div className="flex items-center justify-between text-[10px] font-bold tracking-[0.8px] text-muted">
            <span>EXAMPLE PLAN · NOT YOUR LIST</span>
            <span className="flex items-center gap-1 font-normal"><Footprints size={13} aria-hidden /> No car</span>
          </div>
          <ExampleLeg kind="PICK UP IN PERSON" store="Smith’s" note="Campus → store → home" items={[["eggs", "Eggs"], ["bananas", "Bananas"]]} />
          <div className="h-px bg-line" />
          <ExampleLeg kind="ORDER ONLINE" store="Costco via Instacart" note="Delivered separately" items={[["rice", "Rice"], ["paper_towels", "Paper towels"]]} />
          <p className={fine}>Illustration only. Your options depend on your route, time, memberships and delivery availability.</p>
        </div>
        <button type="button" onClick={tryExample} className={secondaryBtn}>Explore this example list <ArrowRight size={16} aria-hidden /></button>
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-[22px] font-bold tracking-[-0.5px]">Your day sets the plan.</h2>
        <Benefit icon={<Footprints size={18} aria-hidden />} title="No car? You’re in the right place." text="Plan around walking, transit and delivery—not a car you don’t have." />
        <Benefit icon={<WalletCards size={18} aria-hidden />} title="Use the memberships you already have." text="Tell us your store and delivery memberships. No new subscription needed to start." />
        <p className="text-[11px] font-semibold text-bee">Smith’s · Harmons · Walmart · Costco</p>
        <p className={fine}>Store options, not official partnerships.</p>
      </section>

      <section className="-mx-6 flex flex-col gap-3 bg-honey-tint px-6 py-8">
        <h2 className="text-[22px] font-bold tracking-[-0.5px]">What’s on your list?</h2>
        <p className="text-[13px] leading-[1.45] text-muted">A few essentials for the whole week. Start as a guest; your list and trip stay on this device.</p>
        <Link href="/list" className={primaryBtn}>Build my first list <ArrowRight size={18} aria-hidden /></Link>
      </section>

      <p className={fine}>
        Plan here, go from there. Open directions in your maps app and place orders with the store. No checkout or payment in BeeLow.
      </p>
    </Screen>
  );
}

function ExampleLeg({ kind, store, note, items }: { kind: string; store: string; note: string; items: [string, string][] }) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 leading-[1.45]">
        <p className="text-[10px] text-muted">{kind}</p>
        <p className="text-[15px] font-semibold">{store}</p>
        <p className="text-[11px] text-muted">{note}</p>
      </div>
      {items.map(([id, name]) => (
        <figure key={id} className="flex w-[56px] flex-col items-center gap-1">
          <ProductImage id={id} name={name} className="size-[52px] rounded-[10px]" />
          <figcaption className="text-[10px] text-muted">{name}</figcaption>
        </figure>
      ))}
    </div>
  );
}

function Benefit({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) {
  return (
    <div className="flex gap-3">
      <span className="grid size-8 shrink-0 place-items-center rounded-[10px] bg-honey-tint text-bee">{icon}</span>
      <span className="leading-[1.45]">
        <span className="block text-[14px] font-semibold">{title}</span>
        <span className="block text-[12px] text-muted">{text}</span>
      </span>
    </div>
  );
}
