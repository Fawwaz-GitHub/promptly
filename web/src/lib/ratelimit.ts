/**
 * Tiny fixed-window rate limiter per key (IP). Per server instance only — good enough
 * to slow down abuse of the anonymous quota; swap for Upstash/Redis in production at scale.
 */
const g = globalThis as unknown as { __promptlyRl?: Map<string, { n: number; reset: number }> };
const buckets = (g.__promptlyRl ??= new Map());

export function rateLimit(key: string, max = 20, windowMs = 60_000): boolean {
  const now = Date.now();
  const b = buckets.get(key);
  if (!b || b.reset < now) {
    buckets.set(key, { n: 1, reset: now + windowMs });
    if (buckets.size > 10_000) for (const [k, v] of buckets) if (v.reset < now) buckets.delete(k);
    return true;
  }
  b.n++;
  return b.n <= max;
}
