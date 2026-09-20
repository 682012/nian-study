// 组卷去重：同一张卷内不出现同一道题。
// - 题库题（id 稳定）按 id 去重；
// - 程序化出题（id 每次随机）按「题干+选项+答案」指纹去重。
import type { Question } from './types';

export function dedupeKey(q: Question): string {
  if (q.id && !q.id.startsWith('math-gen-')) return `id:${q.id}`;
  const choices = Array.isArray(q.choices) ? q.choices.join('|') : '';
  return `fp:${q.prompt}::${choices}::${String(q.expected ?? q.answer)}`;
}

// make 每次产一道题；产到 count 道互不重复的为止。池子穷尽（怎么抽都重复）就交当前卷。
export function uniqueFill(make: () => Question | undefined | null, count: number, maxTries = count * 4): Question[] {
  const out: Question[] = [];
  const seen = new Set<string>();
  let tries = 0;
  while (out.length < count && tries < maxTries) {
    tries++;
    const q = make();
    if (!q || !q.prompt) continue;
    const key = dedupeKey(q);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(q);
  }
  return out;
}

// 预生成队列（每日卷/错题卷）去重：保序，删掉的位次用 make 补新题，补不上就少几题。
export function dedupeQueue(queue: Question[], make?: () => Question | undefined | null): Question[] {
  const seen = new Set<string>();
  const out: Question[] = [];
  for (const q of queue) {
    if (!q || !q.prompt) continue;
    const key = dedupeKey(q);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(q);
  }
  if (make) {
    let guard = 0;
    while (out.length < queue.length && guard < queue.length * 4) {
      guard++;
      const q = make();
      if (!q || !q.prompt) continue;
      const key = dedupeKey(q);
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(q);
    }
  }
  return out;
}
