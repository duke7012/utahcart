/** Small per-instance cache. Browser snapshots preserve observations across serverless instances. */
export class PriceCache<T> {
  private values = new Map<string, { until: number; value: T }>();
  private pending = new Map<string, Promise<T>>();
  constructor(private ttlMs: number, private limit = 256) {}
  get(key: string): T | undefined {
    const hit = this.values.get(key);
    if (!hit) return undefined;
    if (hit.until <= Date.now()) { this.values.delete(key); return undefined; }
    return hit.value;
  }
  async run(key: string, work: () => Promise<T>, cacheable: (value: T) => boolean = () => true): Promise<T> {
    const hit = this.get(key);
    if (hit !== undefined) return hit;
    const running = this.pending.get(key);
    if (running) return running;
    const promise = work().then((value) => {
      if (cacheable(value)) {
        if (this.values.size >= this.limit) this.values.delete(this.values.keys().next().value!);
        this.values.set(key, { value, until: Date.now() + this.ttlMs });
      }
      return value;
    }).finally(() => this.pending.delete(key));
    this.pending.set(key, promise);
    return promise;
  }
}

export function concurrencyLimit(limit: number) {
  let active = 0;
  const waiting: (() => void)[] = [];
  return async function run<T>(work: () => Promise<T>): Promise<T> {
    if (active >= limit) await new Promise<void>((resolve) => waiting.push(resolve));
    else active++;
    try { return await work(); }
    finally { const next = waiting.shift(); if (next) next(); else active--; }
  };
}
