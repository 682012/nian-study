import { describe, it, expect } from 'vitest';
import { dedupeKey, uniqueFill, dedupeQueue } from './queue';
import type { Question } from './types';

const q = (over: Partial<Question>): Question => ({
  id: 'x', subject: 'english', kind: 'k', type: 'choice', eyebrow: 'e',
  prompt: 'p', answer: 0, explanation: '', ...over,
});

const always = (item: Question) => () => item;

describe('组卷去重', () => {
  it('题库题按 id 判重：同 id 第二次不再进卷', () => {
    const out = uniqueFill(always(q({ id: 'eng-1', prompt: '第一题' })), 3);
    expect(out).toHaveLength(1);
  });

  it('程序化题 id 随机，按题干+选项指纹判重', () => {
    const a = q({ id: 'math-gen-1', prompt: '求和', choices: ['1', '2', '3', '4'] });
    const b = q({ id: 'math-gen-2', prompt: '求和', choices: ['1', '2', '3', '4'] });
    expect(dedupeKey(a)).toBe(dedupeKey(b));
    expect(uniqueFill(always(a), 2)).toHaveLength(1);
  });

  it('不同题干照常进卷，凑满 count', () => {
    let n = 0;
    const out = uniqueFill(() => q({ id: `q-${++n}`, prompt: `第 ${n} 题` }), 10);
    expect(out).toHaveLength(10);
    expect(new Set(out.map((x) => x.id)).size).toBe(10);
  });

  it('make 产出坏题（无题干）时跳过继续抽', () => {
    let n = 0;
    const out = uniqueFill(() => {
      n++;
      return n % 2 === 0 ? null : q({ id: `ok-${n}`, prompt: `第 ${n} 题` });
    }, 3);
    expect(out).toHaveLength(3);
    expect(n).toBeLessThanOrEqual(24);
  });

  it('dedupeQueue 保序去重，并用 make 补回原长度', () => {
    const base = [q({ id: 'a', prompt: '甲' }), q({ id: 'a', prompt: '甲' }), q({ id: 'b', prompt: '乙' })];
    let n = 0;
    const out = dedupeQueue(base, () => q({ id: `n-${++n}`, prompt: `补 ${n}` }));
    expect(out).toHaveLength(3);
    expect(out[0].id).toBe('a');
    expect(out[1].id).toBe('b');
    expect(out[2].id).toBe('n-1');
  });

  it('dedupeQueue 不给 make 时只去重不补', () => {
    const base = [q({ id: 'a', prompt: '甲' }), q({ id: 'a', prompt: '甲' })];
    expect(dedupeQueue(base)).toHaveLength(1);
  });
});
