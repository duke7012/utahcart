import { normalize } from "./offers";
import type { PriceQuote } from "./types";

/**
 * Prices shared by everyone (receipt scans, team-entered store prices), kept in one Upstash Redis hash.
 * Server only. Works with the env names the Vercel Upstash integration sets (UPSTASH_REDIS_REST_* or KV_REST_API_*).
 * Without them, reads return nothing and the app still works from the bundled data.
 */
type Env = Record<string, string | undefined>;
const KEY = "beelow:quotes:v1";
const MAX_FIELDS = 5000;

const creds = (env: Env) => ({
  url: env.UPSTASH_REDIS_REST_URL ?? env.KV_REST_API_URL,
  token: env.UPSTASH_REDIS_REST_TOKEN ?? env.KV_REST_API_TOKEN,
});
export const sharedConfigured = (env: Env = process.env) => !!(creds(env).url && creds(env).token);

async function redis(cmd: (string | number)[], env: Env, fetcher: typeof fetch): Promise<unknown> {
  const { url, token } = creds(env);
  if (!url || !token) throw new Error("The shared price database isn't set up yet: add Upstash Redis in Vercel → Storage.");
  const r = await fetcher(url, { method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify(cmd), cache: "no-store" });
  const j = (await r.json().catch(() => ({}))) as { result?: unknown; error?: string };
  if (!r.ok || j.error) throw new Error(`Shared price database error: ${j.error ?? r.status}`);
  return j.result;
}

/** One field per store + item + source + product + pack size, so a newer price for the same product replaces the old one. */
export const fieldFor = (q: PriceQuote) => [q.storeId, q.itemId, q.source, normalize(q.product ?? ""), q.size].join("|");

// ponytail: 15-second per-instance cache keeps plan requests from hitting Redis every time; writes clear it.
let cache: { at: number; rows: { field: string; quote: PriceQuote }[] } | null = null;
export const _resetCache = () => { cache = null; };

export async function sharedRows(env: Env = process.env, fetcher: typeof fetch = fetch): Promise<{ field: string; quote: PriceQuote }[]> {
  if (!sharedConfigured(env)) return [];
  if (cache && Date.now() - cache.at < 15_000) return cache.rows;
  const flat = ((await redis(["HGETALL", KEY], env, fetcher)) as string[] | null) ?? [];
  const rows: { field: string; quote: PriceQuote }[] = [];
  for (let i = 0; i < flat.length; i += 2) {
    try {
      rows.push({ field: flat[i], quote: JSON.parse(flat[i + 1]) as PriceQuote });
    } catch {} // skip a corrupt entry rather than fail every plan
  }
  cache = { at: Date.now(), rows };
  return rows;
}

export const sharedQuotes = async (env: Env = process.env, fetcher: typeof fetch = fetch) =>
  (await sharedRows(env, fetcher)).map((r) => r.quote);

/** Save already-validated quotes. Callers validate (cleanQuotes / rowToQuote) before this. */
export async function saveShared(quotes: PriceQuote[], env: Env = process.env, fetcher: typeof fetch = fetch): Promise<number> {
  if (!quotes.length) return 0;
  if (!sharedConfigured(env)) throw new Error("The shared price database isn't set up yet: add Upstash Redis in Vercel → Storage.");
  const size = Number(await redis(["HLEN", KEY], env, fetcher));
  if (size + quotes.length > MAX_FIELDS) throw new Error("The shared price list is full. Remove old prices on the team page first.");
  await redis(["HSET", KEY, ...quotes.flatMap((q) => [fieldFor(q), JSON.stringify(q)])], env, fetcher);
  cache = null;
  return quotes.length;
}

export async function removeShared(field: string, env: Env = process.env, fetcher: typeof fetch = fetch): Promise<void> {
  await redis(["HDEL", KEY, field], env, fetcher);
  cache = null;
}
