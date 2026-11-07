import type { Goal, ListEntry, Mode } from "./types";

export const DEMO_SENTENCE = "Groceries for 3 roommates this week, leaving the U at 5, no car, home by 6:30, cheapest.";

export type AskResult = { list: ListEntry[]; goal: Goal; mode: Mode; leave: string; homeBy: string; from: string; to: string };

const GOALS: Goal[] = ["savings", "fewest_stops", "time"];
const MODES: Mode[] = ["no_car", "car"];
const time = (t: unknown) => (typeof t === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(t) ? t : "");
const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

export const isDemoSentence = (s: string) => norm(s) === norm(DEMO_SENTENCE);

/** Validate the model's JSON; anything unknown falls back to a safe default. Null when no item survives. */
export function parseAsk(text: string, itemIds: string[], placeIds: string[]): AskResult | null {
  let r: Record<string, unknown>;
  try {
    r = JSON.parse(text);
  } catch {
    return null;
  }
  if (!r || !Array.isArray(r.items)) return null;
  const seen = new Set<string>();
  const list = (r.items as Partial<ListEntry>[]).flatMap((e): ListEntry[] => {
    if (!e || typeof e.itemId !== "string" || !itemIds.includes(e.itemId) || seen.has(e.itemId)) return [];
    if (typeof e.qty !== "number" || !Number.isInteger(e.qty) || e.qty < 1 || e.qty > 20) return [];
    seen.add(e.itemId);
    return [{ itemId: e.itemId, qty: e.qty, bulkOk: e.bulkOk === true }];
  });
  if (!list.length) return null;
  const pick = <T,>(v: unknown, ok: T[], d: T) => (ok.includes(v as T) ? (v as T) : d);
  return {
    list,
    goal: pick(r.goal, GOALS, "savings"),
    mode: pick(r.mode, MODES, "no_car"),
    leave: time(r.leave),
    homeBy: time(r.homeBy),
    from: pick(r.from, placeIds, ""),
    to: pick(r.to, placeIds, ""),
  };
}
