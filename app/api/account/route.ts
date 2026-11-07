import { cookies } from "next/headers";
import { loadData, saveData, sessionUser } from "@/lib/auth";
import { sharedConfigured } from "@/lib/shared-store";

export const runtime = "nodejs";
const fail = (status: number, error: string) => Response.json({ error }, { status });

async function me() {
  if (!sharedConfigured()) return null;
  return sessionUser((await cookies()).get("beelow_session")?.value).catch(() => null);
}

/** The logged-in account's synced data: { data } (null if nothing saved yet). */
export async function GET() {
  const user = await me();
  if (!user) return fail(401, "Log in to see your saved data.");
  return Response.json({ data: await loadData(user.email) }, { headers: { "Cache-Control": "no-store" } });
}

/** Replace the account's synced data with { data }. */
export async function PUT(req: Request) {
  const user = await me();
  if (!user) return fail(401, "Log in to save to your account.");
  const body = (await req.json().catch(() => null)) as { data?: unknown } | null;
  if (!body || typeof body.data !== "object" || body.data === null) return fail(400, "Nothing to save.");
  try {
    await saveData(user.email, body.data);
    return Response.json({ ok: true });
  } catch (e) {
    return fail(400, e instanceof Error ? e.message : "Couldn't save.");
  }
}

/** sendBeacon (page close) can only POST. */
export const POST = PUT;
