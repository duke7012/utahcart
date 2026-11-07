import { createHash, randomBytes, scrypt as scryptCb, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { redis, type Env } from "./shared-store";

/**
 * BeeLow accounts, server only. Email + password, kept in the same Upstash Redis as shared prices.
 * Passwords: scrypt with a random salt. Sessions: a random token in an httpOnly cookie; Redis keeps only its sha256.
 */
const scrypt = promisify(scryptCb) as (pw: string, salt: Buffer, len: number) => Promise<Buffer>;
const userKey = (email: string) => `beelow:user:${email}`;
const sessionKey = (token: string) => `beelow:session:${createHash("sha256").update(token).digest("hex")}`;
const failKey = (email: string) => `beelow:fails:${email}`;
const dataKey = (email: string) => `beelow:data:${email}`;
export const SESSION_DAYS = 30;
const MAX_FAILS = 10;
const MAX_DATA = 200_000;

export type User = { email: string };
type F = typeof fetch;
export const cleanEmail = (email: unknown) => (typeof email === "string" ? email.trim().toLowerCase() : "");

export async function hashPassword(pw: string): Promise<string> {
  const salt = randomBytes(16);
  return `scrypt$${salt.toString("hex")}$${(await scrypt(pw, salt, 32)).toString("hex")}`;
}

export async function verifyPassword(pw: string, stored: string): Promise<boolean> {
  const [kind, salt, hash] = stored.split("$");
  if (kind !== "scrypt" || !salt || !hash) return false;
  const got = await scrypt(pw, Buffer.from(salt, "hex"), 32);
  return timingSafeEqual(got, Buffer.from(hash, "hex"));
}

export async function createUser(emailIn: unknown, password: unknown, env: Env = process.env, fetcher: F = fetch): Promise<User> {
  const email = cleanEmail(emailIn);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 200) throw new Error("Enter a valid email address.");
  if (typeof password !== "string" || password.length < 8) throw new Error("Use at least 8 characters for your password.");
  if (password.length > 200) throw new Error("That password is too long.");
  const record = JSON.stringify({ email, hash: await hashPassword(password), createdAt: new Date().toISOString() });
  const ok = await redis(["SET", userKey(email), record, "NX"], env, fetcher);
  if (ok !== "OK") throw new Error("An account with this email already exists. Log in instead.");
  return { email };
}

/** The user if the password is right, null if not. Throws after too many wrong tries (15-minute lock). */
export async function authenticate(emailIn: unknown, password: unknown, env: Env = process.env, fetcher: F = fetch): Promise<User | null> {
  const email = cleanEmail(emailIn);
  if (!email || typeof password !== "string") return null;
  if (Number(await redis(["GET", failKey(email)], env, fetcher)) >= MAX_FAILS) throw new Error("Too many tries. Wait 15 minutes, then try again.");
  const raw = (await redis(["GET", userKey(email)], env, fetcher)) as string | null;
  const rec = raw ? (JSON.parse(raw) as { hash: string }) : null;
  if (rec && (await verifyPassword(password, rec.hash))) return { email };
  await redis(["INCR", failKey(email)], env, fetcher);
  await redis(["EXPIRE", failKey(email), 15 * 60], env, fetcher);
  return null;
}

export async function createSession(email: string, env: Env = process.env, fetcher: F = fetch): Promise<string> {
  const token = randomBytes(32).toString("base64url");
  await redis(["SET", sessionKey(token), email, "EX", SESSION_DAYS * 86400], env, fetcher);
  return token;
}

export async function sessionUser(token: string | undefined, env: Env = process.env, fetcher: F = fetch): Promise<User | null> {
  if (!token || token.length > 100) return null;
  const email = (await redis(["GET", sessionKey(token)], env, fetcher)) as string | null;
  return email ? { email } : null;
}

export async function destroySession(token: string | undefined, env: Env = process.env, fetcher: F = fetch): Promise<void> {
  if (token && token.length <= 100) await redis(["DEL", sessionKey(token)], env, fetcher);
}

/** Each account's synced data (list, trip, wallet, receipts, saved trips) as one JSON value. */
export async function loadData(email: string, env: Env = process.env, fetcher: F = fetch): Promise<unknown> {
  const raw = (await redis(["GET", dataKey(email)], env, fetcher)) as string | null;
  return raw ? JSON.parse(raw) : null;
}

export async function saveData(email: string, data: unknown, env: Env = process.env, fetcher: F = fetch): Promise<void> {
  const json = JSON.stringify(data);
  if (json.length > MAX_DATA) throw new Error("Your saved data is too large. Remove a few saved trips first.");
  await redis(["SET", dataKey(email), json], env, fetcher);
}
