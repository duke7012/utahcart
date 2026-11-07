import { createHash, timingSafeEqual } from "node:crypto";
import { catalog } from "@/lib/catalog";
import { cleanQuotes } from "@/lib/receipts";
import { removeShared, saveShared, sharedConfigured, sharedRows } from "@/lib/shared-store";
import { rowToQuote } from "@/lib/sheet";

export const runtime = "nodejs";

const STORES = catalog.stores.map((s) => s.id);
const fail = (status: number, error: string) => Response.json({ error }, { status });
const today = () => new Date().toLocaleDateString("en-CA", { timeZone: "America/Denver" });

/** Team actions need TEAM_PASSCODE (set in Vercel); compared in constant time. */
function teamOk(passcode: unknown): boolean {
  const want = process.env.TEAM_PASSCODE;
  if (!want || typeof passcode !== "string") return false;
  const h = (s: string) => createHash("sha256").update(s).digest();
  return timingSafeEqual(h(passcode), h(want));
}

/** Everything shared so far (prices only; no personal data is stored). */
export async function GET() {
  if (!sharedConfigured()) return Response.json({ configured: false, rows: [] });
  try {
    return Response.json({ configured: true, rows: await sharedRows() }, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    return fail(502, e instanceof Error ? e.message : "Couldn't read shared prices.");
  }
}

/**
 * { kind: "receipt", quotes }       anyone: confirmed receipt prices (validated, forced to source "receipt")
 * { kind: "team", passcode, rows }  team: store prices typed on /team (same checks as the CSV sheet)
 */
export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as { kind?: string; quotes?: unknown; passcode?: unknown; rows?: unknown } | null;
  if (!sharedConfigured()) return fail(503, "The shared price database isn't set up yet: add Upstash Redis in Vercel → Storage, then redeploy.");
  try {
    if (body?.kind === "receipt") {
      const quotes = cleanQuotes(body.quotes, catalog).filter((q) => !q.demo).slice(0, 50);
      if (!quotes.length) return fail(400, "No receipt prices to share.");
      return Response.json({ saved: await saveShared(quotes) });
    }
    if (body?.kind === "team") {
      if (!teamOk(body.passcode)) return fail(401, "Wrong team passcode.");
      const rows = Array.isArray(body.rows) ? (body.rows as Record<string, string>[]).slice(0, 200) : [];
      const results = rows.map((r) => rowToQuote(Object.fromEntries(Object.entries(r).map(([k, v]) => [k, String(v ?? "")])), catalog.items, STORES, today()));
      const errors = results.flatMap((r, i) => (!r.ok && "error" in r ? [`Row ${i + 1}: ${r.error}`] : []));
      if (errors.length) return fail(400, errors.join(" · "));
      const quotes = results.flatMap((r) => (r.ok ? [{ ...r.quote, source: "shop" as const }] : []));
      return Response.json({ saved: await saveShared(quotes) });
    }
    return fail(400, "Unknown request.");
  } catch (e) {
    return fail(502, e instanceof Error ? e.message : "Couldn't save shared prices.");
  }
}

/** { passcode, field }  team: remove one shared price (a typo, or a bad receipt line). */
export async function DELETE(req: Request) {
  const body = (await req.json().catch(() => null)) as { passcode?: unknown; field?: unknown } | null;
  if (!sharedConfigured()) return fail(503, "The shared price database isn't set up yet.");
  if (!teamOk(body?.passcode)) return fail(401, "Wrong team passcode.");
  if (typeof body?.field !== "string" || body.field.length > 300) return fail(400, "Which price should be removed?");
  try {
    await removeShared(body.field);
    return Response.json({ removed: true });
  } catch (e) {
    return fail(502, e instanceof Error ? e.message : "Couldn't remove that price.");
  }
}
