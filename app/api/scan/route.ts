import Anthropic from "@anthropic-ai/sdk";
import { catalog } from "@/lib/catalog";
import { parseScan } from "@/lib/receipts";
import example from "@/data/example-receipt.json";

export const maxDuration = 60;

const TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"] as const;
const MAX_BYTES = 5 * 1024 * 1024;
const ids = catalog.items.map((i) => i.id);

const SCHEMA = {
  type: "object",
  properties: {
    store: { type: "string" },
    date: { type: "string" },
    lines: {
      type: "array",
      items: {
        type: "object",
        properties: {
          rawName: { type: "string" },
          itemId: { anyOf: [{ type: "string", enum: ids }, { type: "null" }] },
          price: { type: "number" },
          size: { type: "number" },
          unit: { type: "string", enum: ["oz", "count", "lb", "fl_oz"] },
        },
        required: ["rawName", "itemId", "price", "size", "unit"],
        additionalProperties: false,
      },
    },
  },
  required: ["store", "date", "lines"],
  additionalProperties: false,
};

const PROMPT = `This photo is a grocery receipt or a shelf price tag from a store in Utah.
List every product line you can read. For each line:
- rawName: the product text as printed.
- itemId: the matching id from this catalog, or null when no catalog item clearly matches:
${catalog.items.map((i) => `  ${i.id}: ${i.name} (sold by ${i.unit})`).join("\n")}
- price: the price of ONE pack in dollars (if the line shows "2 @ 3.49", use 3.49).
- size, unit: the pack size in the catalog item's unit (a gallon is 128 fl_oz, a dozen eggs is 12 count). For lines with no catalog match, give your best size and unit.
Skip tax, subtotals, totals, discounts, payment and card details.
store: the store name on the receipt ("" if not shown). date: the purchase date as YYYY-MM-DD ("" if not shown).`;

const fail = (status: number, error: string) => Response.json({ error }, { status });

export async function POST(req: Request) {
  if (new URL(req.url).searchParams.has("example")) return Response.json({ ...example, example: true });

  const form = await req.formData().catch(() => null);
  const file = form?.get("image");
  if (!(file instanceof File)) return fail(400, "Add a photo of a receipt or shelf tag.");
  const type = TYPES.find((t) => t === file.type);
  if (!type) return fail(415, "That file isn't a photo. Use a JPEG, PNG or WebP image.");
  if (file.size > MAX_BYTES) return fail(413, "That photo is over 5 MB. Try a closer, smaller shot.");

  // Every AI feature works without a key: fall back to the saved example result.
  if (!process.env.ANTHROPIC_API_KEY) return Response.json({ ...example, example: true });

  // The image is only forwarded to Claude, never stored; only the parsed item lines come back.
  const data = Buffer.from(await file.arrayBuffer()).toString("base64");
  try {
    const res = await new Anthropic().beta.messages.create({
      model: "claude-opus-5-5",
      max_tokens: 16000,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      output_config: { effort: "low", format: { type: "json_schema", schema: SCHEMA } },
      messages: [{ role: "user", content: [{ type: "image", source: { type: "base64", media_type: type, data } }, { type: "text", text: PROMPT }] }],
    });
    if (res.stop_reason === "refusal") return fail(422, "Couldn't read that photo. Try another one.");
    const text = res.content.flatMap((b) => (b.type === "text" ? [b.text] : [])).join("");
    const parsed = parseScan(text, ids);
    if (!parsed || parsed.lines.length === 0) return fail(422, "No prices found in that photo. Try a sharper, flatter shot of the receipt.");
    return Response.json(parsed);
  } catch (err) {
    if (err instanceof Anthropic.RateLimitError) return fail(429, "The scanner is busy. Wait a few seconds and try again.");
    if (err instanceof Anthropic.AuthenticationError) return fail(500, "The scanner's API key isn't valid. Use the example receipt for now.");
    if (err instanceof Anthropic.APIError) return fail(502, "The scanner couldn't read the photo right now. Try again or use the example receipt.");
    throw err;
  }
}
