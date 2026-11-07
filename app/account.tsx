"use client";

import { useEffect, useState } from "react";
import { SYNC_KEYS } from "@/lib/session";

/** Who is logged in (null = guest). `configured` is false until Upstash is set up in Vercel. */
export type Account = { configured: boolean; user: { email: string } | null };

let cached: Promise<Account> | null = null;
const fetchMe = () =>
  (cached ??= fetch("/api/auth/me", { cache: "no-store" }).then((r) => r.json()).catch(() => ({ configured: false, user: null })));

export function useAccount(): Account | null {
  const [a, setA] = useState<Account | null>(null);
  useEffect(() => { fetchMe().then(setA); }, []);
  return a;
}

/** This browser's synced keys as one object (missing keys left out). */
function snapshot(): Record<string, string> {
  const out: Record<string, string> = {};
  try {
    for (const k of SYNC_KEYS) {
      const v = localStorage.getItem(k);
      if (v !== null) out[k] = v;
    }
  } catch {}
  return out;
}
const same = (a: Record<string, string>, b: Record<string, string>) => SYNC_KEYS.every((k) => (a[k] ?? null) === (b[k] ?? null));

function apply(data: Record<string, string>) {
  try {
    for (const k of SYNC_KEYS) {
      if (typeof data[k] === "string") localStorage.setItem(k, data[k]);
      else localStorage.removeItem(k);
    }
  } catch {}
}

const push = (data: Record<string, string>) =>
  fetch("/api/account", { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify({ data }) }).then((r) => r.ok).catch(() => false);
const pull = () =>
  fetch("/api/account", { cache: "no-store" }).then((r) => (r.ok ? r.json() : null)).then((j) => (j?.data ?? null) as Record<string, string> | null).catch(() => null);

let last: Record<string, string> | null = null;

/**
 * Keeps a logged-in user's list, wallet, receipts and saved trips in their account.
 * On load: take the account's copy (reloading once if it differs). Then: push whenever this browser's copy changes.
 */
export function AccountSync() {
  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | undefined;
    let stop = false;
    fetchMe().then(async (a) => {
      if (!a.user || stop) return;
      const server = await pull();
      if (server && !same(server, snapshot())) {
        apply(server);
        last = server;
        location.reload();
        return;
      }
      last = server ?? {};
      // ponytail: polls localStorage every 3 s (cheap, local); swap for save-time hooks if it ever matters.
      timer = setInterval(async () => {
        const now = snapshot();
        if (last && !same(now, last)) {
          const was = last;
          last = now;
          if (!(await push(now))) last = was; // retry next tick
        }
      }, 3000);
    });
    const flush = () => {
      const now = snapshot();
      if (last && !same(now, last)) navigator.sendBeacon?.("/api/account", new Blob([JSON.stringify({ data: now })], { type: "application/json" }));
    };
    addEventListener("pagehide", flush);
    return () => { stop = true; clearInterval(timer); removeEventListener("pagehide", flush); };
  }, []);
  return null;
}

async function post(path: string, body?: unknown): Promise<{ ok: boolean; error?: string }> {
  const r = await fetch(path, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body ?? {}) }).catch(() => null);
  if (!r) return { ok: false, error: "Couldn't reach BeeLow. Check your connection." };
  const j = await r.json().catch(() => ({}));
  return r.ok ? { ok: true } : { ok: false, error: j.error ?? "Something went wrong. Try again." };
}

/** Log in, then load the account's saved data into this browser (or upload this browser's if the account has none). */
export async function logIn(email: string, password: string) {
  const r = await post("/api/auth/login", { email, password });
  if (!r.ok) return r;
  const server = await pull();
  if (server) apply(server);
  else await push(snapshot());
  cached = null;
  return r;
}

/** Create an account; what's in this browser now becomes the account's starting data. */
export async function signUp(email: string, password: string) {
  const r = await post("/api/auth/signup", { email, password });
  if (r.ok) { await push(snapshot()); cached = null; }
  return r;
}

/** Log out and clear this browser's copy, so the next person on this device starts fresh. */
export async function logOut() {
  await post("/api/auth/logout");
  apply({});
  cached = null;
  last = null;
}
