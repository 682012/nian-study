// 与 V9 arcade 完全一致的确定性 RNG：每日卷靠种子复现，不随作答变化。
export function hash(value: string | number): number {
  let result = 2166136261;
  for (const char of String(value)) {
    result ^= char.charCodeAt(0);
    result = Math.imul(result, 16777619);
  }
  return result >>> 0;
}

export type Rng = () => number;

export function seeded(seedValue: string | number): Rng {
  let seed = hash(seedValue) || 1;
  return () => {
    seed += 0x6d2b79f5;
    let value = seed;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

export function pick<T>(items: T[], rng: Rng = Math.random): T {
  return items[Math.floor(rng() * items.length)];
}

export function shuffle<T>(items: T[], rng: Rng = Math.random): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export function pickWeighted<T>(items: T[], getWeight: (item: T) => number, rng: Rng = Math.random): T {
  if (!items.length) throw new Error('pickWeighted: empty');
  const weighted = items.map((item) => ({ item, weight: Math.max(0.01, Number(getWeight(item)) || 0.01) }));
  const total = weighted.reduce((sum, e) => sum + e.weight, 0);
  let cursor = rng() * total;
  for (const e of weighted) {
    cursor -= e.weight;
    if (cursor <= 0) return e.item;
  }
  return weighted[weighted.length - 1].item;
}

export function normalizeAnswer(value: unknown): string {
  return String(value ?? '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}
