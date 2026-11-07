import { expect, test } from "vitest";
import { authenticate, createSession, createUser, destroySession, hashPassword, loadData, saveData, sessionUser, verifyPassword } from "./auth";

/** In-memory stand-in for the Upstash REST API (GET / SET / DEL / INCR / EXPIRE). */
function fakeRedis() {
  const kv = new Map<string, string>();
  const fetcher = async (_url: string, init: { body: string }) => {
    const [cmd, key, ...args] = JSON.parse(init.body) as string[];
    let result: unknown = null;
    if (cmd === "GET") result = kv.get(key) ?? null;
    if (cmd === "SET") {
      if (args.includes("NX") && kv.has(key)) result = null;
      else { kv.set(key, String(args[0])); result = "OK"; }
    }
    if (cmd === "DEL") result = kv.delete(key) ? 1 : 0;
    if (cmd === "INCR") { const n = Number(kv.get(key) ?? 0) + 1; kv.set(key, String(n)); result = n; }
    if (cmd === "EXPIRE") result = 1;
    return new Response(JSON.stringify({ result }));
  };
  return { kv, env: { UPSTASH_REDIS_REST_URL: "https://x", UPSTASH_REDIS_REST_TOKEN: "t" }, fetcher: fetcher as unknown as typeof fetch };
}

test("passwords are hashed with a salt and verify only with the right password", async () => {
  const h = await hashPassword("correct horse");
  expect(h).not.toContain("correct horse");
  expect(await hashPassword("correct horse")).not.toBe(h); // salted
  expect(await verifyPassword("correct horse", h)).toBe(true);
  expect(await verifyPassword("wrong", h)).toBe(false);
});

test("sign up, log in, and the session finds the user", async () => {
  const r = fakeRedis();
  const user = await createUser("Jamie@Example.com ", "password123", r.env, r.fetcher);
  expect(user).toEqual({ email: "jamie@example.com" });
  expect(await authenticate("jamie@example.com", "password123", r.env, r.fetcher)).toEqual(user);
  expect(await authenticate("jamie@example.com", "nope-nope", r.env, r.fetcher)).toBeNull();
  const token = await createSession(user.email, r.env, r.fetcher);
  expect(await sessionUser(token, r.env, r.fetcher)).toEqual(user);
  await destroySession(token, r.env, r.fetcher);
  expect(await sessionUser(token, r.env, r.fetcher)).toBeNull();
});

test("the same email can't sign up twice, and bad input is refused", async () => {
  const r = fakeRedis();
  await createUser("a@b.co", "password123", r.env, r.fetcher);
  await expect(createUser("A@B.co", "password123", r.env, r.fetcher)).rejects.toThrow(/already/i);
  await expect(createUser("not-an-email", "password123", r.env, r.fetcher)).rejects.toThrow(/email/i);
  await expect(createUser("x@y.co", "short", r.env, r.fetcher)).rejects.toThrow(/8 characters/);
});

test("too many wrong passwords lock the email for a while", async () => {
  const r = fakeRedis();
  await createUser("a@b.co", "password123", r.env, r.fetcher);
  for (let i = 0; i < 10; i++) await authenticate("a@b.co", "wrong-pass", r.env, r.fetcher);
  await expect(authenticate("a@b.co", "password123", r.env, r.fetcher)).rejects.toThrow(/too many/i);
});

test("each account's saved data round-trips", async () => {
  const r = fakeRedis();
  expect(await loadData("a@b.co", r.env, r.fetcher)).toBeNull();
  await saveData("a@b.co", { saved: { list: [] }, trips: [] }, r.env, r.fetcher);
  expect(await loadData("a@b.co", r.env, r.fetcher)).toEqual({ saved: { list: [] }, trips: [] });
  await expect(saveData("a@b.co", { big: "x".repeat(300_000) }, r.env, r.fetcher)).rejects.toThrow(/too large/i);
});
