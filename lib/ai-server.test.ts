import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { AiError, DEFAULT_GEMINI_MODEL, aiConfigured, generateJson } from "./ai-server";
import { POST as ask } from "@/app/api/ask/route";
import { POST as scan } from "@/app/api/scan/route";

const schema = { type: "object", properties: { ok: { type: "boolean" } }, required: ["ok"], additionalProperties: false };
const request = { system: "Follow system instructions.", prompt: "Return a JSON result.", schema };
const success = (value: unknown) => Response.json({ candidates: [{ finishReason: "STOP", content: { parts: [{ text: JSON.stringify(value) }] } }] });
beforeEach(() => { vi.stubEnv("GEMINI_API_KEY", "fake-gemini-test-key"); vi.stubEnv("GEMINI_MODEL", ""); });
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });

describe("Gemini server transport", () => {
  test("uses the default model, JSON schema and credential header without placing credentials in URLs or prompts", async () => {
    const fetcher = vi.fn(async () => success({ ok: true }));
    vi.stubGlobal("fetch", fetcher);
    expect(await generateJson(request)).toEqual({ ok: true });
    const [url, options] = fetcher.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toContain(`${DEFAULT_GEMINI_MODEL}:generateContent`);
    expect(url).not.toContain("fake-gemini-test-key");
    expect(options.headers).toMatchObject({ "x-goog-api-key": "fake-gemini-test-key" });
    const body = JSON.parse(options.body as string);
    expect(body.generationConfig).toMatchObject({ responseMimeType: "application/json", responseJsonSchema: schema });
    expect(body.systemInstruction.parts[0].text).toContain(request.system);
    expect(body.contents[0].parts).toEqual([{ text: request.prompt }]);
    expect(options.body).not.toContain("fake-gemini-test-key");
  });
  test("supports configured model IDs and inline image input", async () => {
    vi.stubEnv("GEMINI_MODEL", "gemini-test-model");
    const fetcher = vi.fn(async () => success({ ok: true }));
    vi.stubGlobal("fetch", fetcher);
    const image = { mimeType: "image/png" as const, data: "c3ludGhldGljLWltYWdl" };
    await generateJson({ ...request, image });
    const [url, options] = fetcher.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toContain("gemini-test-model:generateContent");
    expect(JSON.parse(options.body as string).contents[0].parts[0]).toEqual({ inlineData: image });
  });
  test("missing credentials and invalid model configuration never send a request", async () => {
    const fetcher = vi.fn(); vi.stubGlobal("fetch", fetcher);
    vi.stubEnv("GEMINI_API_KEY", "");
    expect(aiConfigured()).toBe(false);
    await expect(generateJson(request)).rejects.toMatchObject({ code: "setup" });
    vi.stubEnv("GEMINI_API_KEY", "fake-key"); vi.stubEnv("GEMINI_MODEL", "../wrong?key=secret");
    await expect(generateJson(request)).rejects.toMatchObject({ code: "setup" });
    expect(fetcher).not.toHaveBeenCalled();
  });
  test.each([[401, "auth"], [403, "auth"], [429, "rate_limit"], [404, "setup"], [500, "provider"]])("sanitizes HTTP %i as %s", async (status, code) => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("fake-gemini-test-key PRIVATE PROVIDER BODY", { status: status as number })));
    await expect(generateJson(request)).rejects.toMatchObject({ code });
    try { await generateJson(request); } catch (error) {
      expect(error).toBeInstanceOf(AiError);
      expect((error as Error).message).not.toMatch(/fake-gemini-test-key|PRIVATE PROVIDER BODY/);
    }
  });
  test("recognizes Gemini's HTTP 400 invalid-key response without exposing provider details", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => Response.json({ error: { details: [{ reason: "API_KEY_INVALID" }] } }, { status: 400 })));
    await expect(generateJson(request)).rejects.toMatchObject({ code: "auth" });
  });
  test("rejects blocked, truncated, missing and malformed structured responses", async () => {
    for (const [body, code] of [
      [{ promptFeedback: { blockReason: "SAFETY" } }, "refusal"],
      [{ candidates: [{ finishReason: "MAX_TOKENS" }] }, "invalid_response"],
      [{ candidates: [] }, "invalid_response"],
      [{ candidates: [{ finishReason: "STOP", content: { parts: [{ text: "not JSON" }] } }] }, "invalid_response"],
      [{ candidates: [{ finishReason: "SAFETY" }] }, "refusal"],
    ] as const) {
      vi.stubGlobal("fetch", vi.fn(async () => Response.json(body)));
      await expect(generateJson(request)).rejects.toMatchObject({ code });
    }
  });
  test("skips thought parts and maps network failures and cancellation to safe errors", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => Response.json({ candidates: [{ finishReason: "STOP", content: { parts: [
      { text: "internal text", thought: true }, { text: '{"ok":true}' },
    ] } }] })));
    expect(await generateJson(request)).toEqual({ ok: true });
    vi.stubGlobal("fetch", vi.fn(async () => { throw new Error("PRIVATE URL WITH KEY"); }));
    await expect(generateJson(request)).rejects.toMatchObject({ code: "provider" });
    vi.stubGlobal("fetch", vi.fn(async () => { throw new DOMException("timed out", "TimeoutError"); }));
    await expect(generateJson(request)).rejects.toMatchObject({ code: "timeout" });
    await expect(generateJson({ ...request, signal: AbortSignal.abort() })).rejects.toMatchObject({ code: "timeout" });
  });
});

const askRequest = () => new Request("http://localhost/api/ask", { method: "POST", body: JSON.stringify({ sentence: "Buy two gallons of milk, by car, cheapest." }) });
const scanRequest = () => {
  const form = new FormData();
  form.append("image", new File(["synthetic test image"], "receipt.png", { type: "image/png" }));
  return new Request("http://localhost/api/scan", { method: "POST", body: form });
};
describe("Gemini AI routes", () => {
  test("sentence planning validates Gemini output and does not mark real output as a demo", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => success({ items: [{ itemId: "milk", qty: 2, bulkOk: false }], goal: "savings", mode: "car", leave: "", homeBy: "", from: "campus", to: "home" })));
    const response = await ask(askRequest());
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.list).toEqual([{ itemId: "milk", qty: 2, bulkOk: false }]);
    expect(body.example).toBeUndefined();
  });
  test("receipt scanning sends inline data and keeps existing validated receipt format", async () => {
    const fetcher = vi.fn(async () => success({ store: "Smith's", date: "2026-11-06", lines: [{ rawName: "MILK", itemId: "milk", price: 2.49, size: 128, unit: "fl_oz" }] }));
    vi.stubGlobal("fetch", fetcher);
    const response = await scan(scanRequest());
    expect((await response.json()).lines[0]).toMatchObject({ itemId: "milk", price: 2.49, size: 128 });
    const options = (fetcher.mock.calls[0] as unknown as [string, RequestInit])[1];
    expect(JSON.parse(options.body as string).contents[0].parts[0].inlineData.mimeType).toBe("image/png");
  });
  test("missing Gemini key preserves explicitly labeled example fallbacks", async () => {
    vi.stubEnv("GEMINI_API_KEY", "");
    const fetcher = vi.fn(); vi.stubGlobal("fetch", fetcher);
    expect((await (await ask(askRequest())).json()).example).toBe(true);
    expect((await (await scan(scanRequest())).json()).example).toBe(true);
    expect(fetcher).not.toHaveBeenCalled();
  });
  test("quota failures report a retryable error, while auth failure cannot masquerade as a scanned receipt", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("", { status: 429 })));
    expect((await ask(askRequest())).status).toBe(429);
    expect((await scan(scanRequest())).status).toBe(429);
    vi.stubGlobal("fetch", vi.fn(async () => new Response("", { status: 403 })));
    const response = await scan(scanRequest());
    expect(response.status).toBe(503);
    expect((await response.json()).error).toContain("Gemini");
    const fallback = await (await ask(askRequest())).json();
    expect(fallback.example).toBe(true);
    expect(fallback.note).toContain("demo cart");
  });
});
