/** Server-only Gemini transport. Credentials stay in headers, never URLs or error messages. */
export const DEFAULT_GEMINI_MODEL = "gemini-3.5-flash-lite";
export const aiConfigured = () => !!process.env.GEMINI_API_KEY?.trim();

export class AiError extends Error {
  constructor(public code: "setup" | "auth" | "rate_limit" | "timeout" | "refusal" | "invalid_response" | "provider", message: string) { super(message); }
}

type JsonRequest = {
  system: string;
  prompt: string;
  schema: Record<string, unknown>;
  image?: { mimeType: "image/jpeg" | "image/png" | "image/webp"; data: string };
  maxOutputTokens?: number;
  timeoutMs?: number;
  signal?: AbortSignal;
};
const object = (value: unknown): value is Record<string, unknown> => !!value && typeof value === "object" && !Array.isArray(value);

/** Callers still validate the returned JSON against their domain schema. No automatic paid fallback. */
export async function generateJson(request: JsonRequest): Promise<unknown> {
  const key = process.env.GEMINI_API_KEY?.trim();
  if (!key) throw new AiError("setup", "Set GEMINI_API_KEY in the server environment to enable AI.");
  const model = process.env.GEMINI_MODEL?.trim() || DEFAULT_GEMINI_MODEL;
  if (!/^[a-zA-Z0-9._-]+$/.test(model)) throw new AiError("setup", "GEMINI_MODEL must be a Gemini model ID.");
  const deadline = AbortSignal.timeout(request.timeoutMs ?? 40_000);
  const signal = request.signal ? AbortSignal.any([deadline, request.signal]) : deadline;
  try {
    const parts: ({ text: string } | { inlineData: { mimeType: string; data: string } })[] = [];
    if (request.image) parts.push({ inlineData: request.image });
    parts.push({ text: request.prompt });
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
      method: "POST", cache: "no-store", signal,
      headers: { "Content-Type": "application/json", "x-goog-api-key": key },
      body: JSON.stringify({ systemInstruction: { parts: [{ text: `${request.system}\nReturn JSON matching the provided schema.` }] },
        contents: [{ role: "user", parts }],
        generationConfig: { responseMimeType: "application/json", responseJsonSchema: request.schema, maxOutputTokens: request.maxOutputTokens ?? 8000 } }),
    });
    if (response.status === 400) {
      const failure: unknown = await response.json().catch(() => null);
      const details = object(failure) && object(failure.error) && Array.isArray(failure.error.details) ? failure.error.details : [];
      if (details.some((detail) => object(detail) && typeof detail.reason === "string" && /^API_KEY_/.test(detail.reason)))
        throw new AiError("auth", "Gemini rejected the server’s API key. Check GEMINI_API_KEY and its project permissions.");
    }
    if (response.status === 401 || response.status === 403) throw new AiError("auth", "Gemini rejected the server’s API key. Check GEMINI_API_KEY and its project permissions.");
    if (response.status === 429) throw new AiError("rate_limit", "Gemini’s free-tier quota or rate limit has been reached. Wait and retry, or check the project’s quota.");
    if (response.status === 404) throw new AiError("setup", "The configured Gemini model is unavailable. Check GEMINI_MODEL.");
    if (!response.ok) throw new AiError("provider", "Gemini could not process the request. Check the server configuration or retry.");
    const raw: unknown = await response.json();
    if (!object(raw)) throw new AiError("invalid_response", "Gemini returned an unreadable response.");
    if (object(raw.promptFeedback) && raw.promptFeedback.blockReason) throw new AiError("refusal", "Gemini could not process that input. Try another description or photo.");
    const candidate = Array.isArray(raw.candidates) ? raw.candidates[0] : undefined;
    if (!object(candidate)) throw new AiError("invalid_response", "Gemini returned no result. Retry the request.");
    if (candidate.finishReason === "MAX_TOKENS") throw new AiError("invalid_response", "Gemini’s response was incomplete. Try fewer items or a closer receipt photo.");
    if (candidate.finishReason !== "STOP") throw new AiError("refusal", "Gemini could not complete that request. Try another description or photo.");
    const output = object(candidate.content) && Array.isArray(candidate.content.parts) ? candidate.content.parts : [];
    const text = output.flatMap((part) => object(part) && typeof part.text === "string" && part.thought !== true ? [part.text] : []).join("");
    try { return JSON.parse(text); }
    catch { throw new AiError("invalid_response", "Gemini returned invalid structured data. Retry the request."); }
  } catch (error) {
    if (error instanceof AiError) throw error;
    if (signal.aborted || (error instanceof Error && ["AbortError", "TimeoutError"].includes(error.name)))
      throw new AiError("timeout", "Gemini timed out. Retry the request.");
    throw new AiError("provider", "Couldn’t reach Gemini. Check the connection and retry.");
  }
}
