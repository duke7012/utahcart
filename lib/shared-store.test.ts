import { beforeEach, expect, test } from "vitest";
import { fieldFor, removeShared, saveShared, sharedQuotes, sharedConfigured, _resetCache } from "./shared-store";
import type { PriceQuote } from "./types";

/** In-memory stand-in for the Upstash REST API (HSET / HGETALL / HDEL / HLEN). */
function fakeRedis() {
  const hash = new Map<string, string>();
  const calls: string[][] = [];
  const fetcher = async (_url: string, init: { body: string }) => {
    const [cmd, , ...args] = JSON.parse(init.body) as string[];
    calls.push([cmd, ...args]);
    let result: unknown = null;
    if (cmd === "HSET") { for (let i = 0; i < args.length; i += 2) hash.set(args[i], args[i + 1]); result = args.length / 2; }
    if (cmd === "HGETALL") result = [...hash].flat();
    if (cmd === "HDEL") result = args.filter((f) => hash.delete(f)).length;
    if (cmd === "HLEN") result = hash.size;
    return new Response(JSON.stringify({ result }));
  };
  return { hash, calls, fetcher: fetcher as unknown as typeof fetch };
}

const env = { UPSTASH_REDIS_REST_URL: "https://example.upstash.io", UPSTASH_REDIS_REST_TOKEN: "t" };
const q = (o: Partial<PriceQuote> = {}): PriceQuote => ({
  itemId: "milk", storeId: "walmart", channel: "in_person", price: 3.12, size: 128, unit: "fl_oz", source: "shop", seenAt: "2026-11-06", product: "Great Value 2% Milk", ...o,
});

beforeEach(() => _resetCache());

test("not configured: reads give nothing and writes say what to set up", async () => {
  expect(sharedConfigured({})).toBe(false);
  expect(await sharedQuotes({}, fetch)).toEqual([]);
  await expect(saveShared([q()], {}, fetch)).rejects.toThrow(/Upstash|database/i);
});

test("saved prices come back for everyone", async () => {
  const r = fakeRedis();
  await saveShared([q(), q({ itemId: "eggs", unit: "count", size: 12, price: 2.97, product: "Great Value Large Eggs" })], env, r.fetcher);
  _resetCache();
  const got = await sharedQuotes(env, r.fetcher);
  expect(got.map((x) => `${x.itemId} ${x.price}`).sort()).toEqual(["eggs 2.97", "milk 3.12"]);
});

test("the same product at the same store replaces its older price", async () => {
  const r = fakeRedis();
  await saveShared([q({ price: 3.5, seenAt: "2026-11-05" })], env, r.fetcher);
  await saveShared([q({ price: 3.12 })], env, r.fetcher);
  _resetCache();
  expect((await sharedQuotes(env, r.fetcher)).map((x) => x.price)).toEqual([3.12]);
});

test("a price can be removed by its field", async () => {
  const r = fakeRedis();
  await saveShared([q()], env, r.fetcher);
  await removeShared(fieldFor(q()), env, r.fetcher);
  _resetCache();
  expect(await sharedQuotes(env, r.fetcher)).toEqual([]);
});

test("Vercel KV variable names work too", () => {
  expect(sharedConfigured({ KV_REST_API_URL: "https://x", KV_REST_API_TOKEN: "t" })).toBe(true);
});
