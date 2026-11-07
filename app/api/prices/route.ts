import { catalog } from "@/lib/catalog";
import { DEFAULT_SEARCH_LOCATION, validEntry } from "@/lib/offers";
import { discoverPrices } from "@/lib/shopping-server";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const location = body?.location ?? DEFAULT_SEARCH_LOCATION;
  if (!validEntry(body?.entry, catalog) || typeof location !== "string" || !location.trim() || location.length > 200)
    return Response.json({ error: "Choose a catalog item, quantity, preferences and search location." }, { status: 400 });
  try {
    return Response.json(await discoverPrices(catalog, body.entry, location.trim()), { headers: { "Cache-Control": "no-store" } });
  } catch {
    return Response.json({ status: "error", offers: [], matching: "unconfirmed", cached: false, message: "Price checking failed. Your earlier observations are still saved." }, { status: 502 });
  }
}
