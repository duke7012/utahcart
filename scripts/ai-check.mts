/** One tiny Gemini request to confirm GEMINI_API_KEY, model and quota.  npx tsx scripts/ai-check.mts */
import { loadEnv } from "./env.mts";

loadEnv();
const model = process.env.GEMINI_MODEL?.trim() || "gemini-3.5-flash-lite";
const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
  method: "POST",
  headers: { "Content-Type": "application/json", "x-goog-api-key": process.env.GEMINI_API_KEY ?? "" },
  body: JSON.stringify({
    contents: [{ role: "user", parts: [{ text: "Say ok." }] }],
    generationConfig: { responseMimeType: "application/json", responseJsonSchema: { type: "object", properties: { ok: { type: "boolean" } }, required: ["ok"] }, maxOutputTokens: 50 },
  }),
});
const body = (await r.json().catch(() => ({}))) as { error?: { status?: string; message?: string } };
console.log(`model ${model} → HTTP ${r.status} ${body.error ? `${body.error.status}: ${body.error.message}` : "OK"}`);
