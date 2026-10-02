/** Small deterministic PRNG (mulberry32) so a seed always yields the same week. */
export function createRng(seed: number) {
  let a = seed >>> 0;
  const next = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return {
    next,
    /** Pick an index with probability proportional to weights. */
    weighted(weights: number[]): number {
      const total = weights.reduce((s, w) => s + Math.max(0, w), 0);
      if (total <= 0) return 0;
      let r = next() * total;
      for (let i = 0; i < weights.length; i++) {
        r -= Math.max(0, weights[i] ?? 0);
        if (r <= 0) return i;
      }
      return weights.length - 1;
    },
  };
}

export type Rng = ReturnType<typeof createRng>;

export function hashString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Plans are plain JSON: a JSON round-trip is a safe deep clone on every runtime. */
export function deepClone<T>(v: T): T {
  return JSON.parse(JSON.stringify(v)) as T;
}
