import { AiError, aiConfigured, generateJson } from "@/lib/ai-server";
import { isDemoSentence, parseAsk, type AskResult } from "@/lib/ask";
import { catalog, places } from "@/lib/catalog";
import { DEMO } from "@/lib/session";

export const maxDuration = 60;

const ids = catalog.items.map((i) => i.id);
const placeIds = places.map((p) => p.id);

/** Saved result for the demo sentence: the fallback whenever the AI can't run. */
const DEMO_RESULT: AskResult = {
  list: DEMO.list, goal: DEMO.goal, mode: DEMO.trip.mode, leave: DEMO.trip.leave, homeBy: DEMO.trip.homeBy, from: "campus", to: "home",
};

const SCHEMA = {
  type: "object",
  properties: {
    items: {
      type: "array",
      items: {
        type: "object",
        properties: { itemId: { type: "string", enum: ids }, qty: { type: "integer" }, bulkOk: { type: "boolean" } },
        required: ["itemId", "qty", "bulkOk"],
        additionalProperties: false,
      },
    },
    goal: { type: "string", enum: ["savings", "fewest_stops", "time"] },
    mode: { type: "string", enum: ["no_car", "car"] },
    leave: { type: "string" },
    homeBy: { type: "string" },
    from: { type: "string", enum: [...placeIds, ""] },
    to: { type: "string", enum: [...placeIds, ""] },
  },
  required: ["items", "goal", "mode", "leave", "homeBy", "from", "to"],
  additionalProperties: false,
};

const SYSTEM = `You turn one sentence about a grocery run in Salt Lake City into a shopping cart and trip for BeeLow.
Catalog (choose itemId only from here; qty counts packs of the listed size):
${catalog.items.map((i) => `- ${i.id}: ${i.name}, ${i.typicalSize} ${i.unit}`).join("\n")}
Places: campus = the University of Utah ("the U"), home = the user's home.
Rules:
- When the sentence names a meal, occasion or number of people instead of items, pick sensible staples and quantities for it (a week for 3 adults is roughly 2 eggs, 2 milk, 2 bread, 3 chicken).
- bulkOk is true only for shelf-stable or household items the user would happily store.
- goal: "savings" for cheapest, "fewest_stops" for fewest stops or least hassle, "time" for fastest. Default "savings".
- mode: "car" only when the user says they drive or have a car. Default "no_car".
- leave and homeBy: 24-hour "HH:MM" when stated (assume afternoon or evening for 1-11 without am/pm), else "".
- from and to: a place id when the sentence implies one, else "".`;

const fail = (status: number, error: string) => Response.json({ error }, { status });

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as { sentence?: unknown } | null;
  const sentence = typeof body?.sentence === "string" ? body.sentence.trim().slice(0, 500) : "";
  if (!sentence) return fail(400, "Tell BeeLow what you need, like the example.");

  // The demo never depends on the network; without a key every sentence gets the saved demo result.
  if (isDemoSentence(sentence)) return Response.json({ ...DEMO_RESULT, example: true });
  if (!aiConfigured()) return Response.json({ ...DEMO_RESULT, example: true, note: "No Gemini key is set, so this is the demo cart." });

  try {
    const res = await generateJson({ system: SYSTEM, schema: SCHEMA, prompt: sentence, maxOutputTokens: 8000 });
    const parsed = parseAsk(JSON.stringify(res), ids, placeIds);
    if (!parsed) return fail(422, "Couldn't find groceries in that. Try naming a few items or a meal.");
    return Response.json(parsed);
  } catch (err) {
    if (err instanceof AiError && err.code === "rate_limit") return fail(429, err.message);
    if (err instanceof AiError && ["refusal", "invalid_response"].includes(err.code)) return fail(422, err.message);
    if (err instanceof AiError) return Response.json({ ...DEMO_RESULT, example: true, note: `${err.message} This is the demo cart.` });
    throw err;
  }
}
