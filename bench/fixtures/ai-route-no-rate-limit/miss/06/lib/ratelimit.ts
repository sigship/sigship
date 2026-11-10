const buckets = new Map<string, number>();
export function rateLimit(key: string, max = 10) {
  const n = (buckets.get(key) ?? 0) + 1;
  buckets.set(key, n);
  return n <= max;
}
