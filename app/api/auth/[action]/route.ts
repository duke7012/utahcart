import { cookies } from "next/headers";
import { SESSION_DAYS, authenticate, createSession, createUser, destroySession, sessionUser } from "@/lib/auth";
import { sharedConfigured } from "@/lib/shared-store";

export const runtime = "nodejs";
const COOKIE = "beelow_session";
const fail = (status: number, error: string) => Response.json({ error }, { status });
const NOT_SET_UP = "Accounts aren't set up yet: add Upstash Redis in Vercel → Storage, then redeploy. You can keep using BeeLow as a guest.";

async function startSession(email: string) {
  (await cookies()).set(COOKIE, await createSession(email), {
    httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: SESSION_DAYS * 86400,
  });
}

/** GET /api/auth/me → { configured, user } */
export async function GET(_req: Request, { params }: { params: Promise<{ action: string }> }) {
  if ((await params).action !== "me") return fail(404, "Not found.");
  if (!sharedConfigured()) return Response.json({ configured: false, user: null });
  const user = await sessionUser((await cookies()).get(COOKIE)?.value).catch(() => null);
  return Response.json({ configured: true, user }, { headers: { "Cache-Control": "no-store" } });
}

/** POST /api/auth/signup | login  { email, password }   POST /api/auth/logout */
export async function POST(req: Request, { params }: { params: Promise<{ action: string }> }) {
  const action = (await params).action;
  const jar = await cookies();
  if (action === "logout") {
    await destroySession(jar.get(COOKIE)?.value).catch(() => {});
    jar.delete(COOKIE);
    return Response.json({ ok: true });
  }
  if (action !== "signup" && action !== "login") return fail(404, "Not found.");
  if (!sharedConfigured()) return fail(503, NOT_SET_UP);
  const body = (await req.json().catch(() => null)) as { email?: unknown; password?: unknown } | null;
  try {
    const user = action === "signup" ? await createUser(body?.email, body?.password) : await authenticate(body?.email, body?.password);
    if (!user) return fail(401, "That email and password don't match.");
    await startSession(user.email);
    return Response.json({ user });
  } catch (e) {
    return fail(400, e instanceof Error ? e.message : "Something went wrong. Try again.");
  }
}
