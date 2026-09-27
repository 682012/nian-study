// 数学生成器数值回归：防止 10.666… 这类乱码小数、重复选项、越界答案再次出现。
import { describe, it, expect } from 'vitest';
import { MATH_BUILDERS } from './math-builders';
import { MATH_BUILDERS_2 } from './math-builders-2';
import { mathFillQuestion } from './math-fill';
import { seeded } from './rng';
import { checkAnswer } from './engine';

const BAD = /NaN|Infinity|undefined|\d\.\d{4,}/;

describe('数学生成器数值扫描', () => {
  it('选择题：无乱码小数、选项不重复、答案下标合法', () => {
    const all = [...MATH_BUILDERS, ...MATH_BUILDERS_2] as Array<(r: () => number) => {
      topic: string; prompt: string; choices: string[]; answer: number; explanation: string;
    }>;
    all.forEach((fn, bi) => {
      for (let i = 0; i < 200; i++) {
        const b = fn(seeded(`sweep${bi}:${i}`));
        const tag = `${bi}:${b.topic}:${b.prompt}`;
        expect(new Set(b.choices).size, tag).toBe(b.choices.length);
        expect(b.choices.some((c) => BAD.test(c)), tag).toBe(false);
        expect(BAD.test(b.prompt + b.explanation), tag).toBe(false);
        expect(b.answer >= 0 && b.answer < b.choices.length, tag).toBe(true);
      }
    });
  });

  it('填空题：标准答案无乱码小数且能判对', () => {
    for (let i = 0; i < 1500; i++) {
      const q = mathFillQuestion(seeded(`mfsweep${i}`));
      const acc = q.answer as string[];
      expect(acc.some((a) => BAD.test(a)), q.prompt).toBe(false);
      expect(checkAnswer(q, acc[0]), q.prompt).toBe(true);
    }
  });

  it('球体积填空：分数与小数写法都判对', () => {
    const q = { ...mathFillQuestion(seeded('x')), type: 'blank' as const, answer: ['32/3'] };
    expect(checkAnswer(q, '32/3')).toBe(true);
    expect(checkAnswer(q, '10.6666667')).toBe(true);  // 足够精确的小数在 1e-6 容差内，判对
    expect(checkAnswer(q, '10.67')).toBe(false);      // 四舍五入近似值不判对，引导写分数
    expect(checkAnswer(q, '12')).toBe(false);
  });
});
