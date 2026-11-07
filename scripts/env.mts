import { existsSync, readFileSync, writeFileSync } from "node:fs";

/** Load KEY=VALUE lines from .env.local into process.env (scripts run outside Next.js). */
export function loadEnv() {
  if (!existsSync(".env.local")) return;
  for (const line of readFileSync(".env.local", "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}

export const readJson = <T>(path: string): T => JSON.parse(readFileSync(path, "utf8"));
export const writeJson = (path: string, value: unknown) => writeFileSync(path, JSON.stringify(value, null, 2) + "\n");
export const today = () => new Date().toLocaleDateString("en-CA", { timeZone: "America/Denver" });
export const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// Print just the message on failure (no compiled-source dump).
for (const ev of ["uncaughtException", "unhandledRejection"] as const) {
  process.on(ev, (e: unknown) => {
    console.error(`\n✗ ${e instanceof Error ? e.message : String(e)}`);
    process.exit(1);
  });
}
