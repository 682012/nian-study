import { describe, it, expect } from 'vitest';
import { mathFillQuestion, FILL_TOPICS } from './math-fill';
import { seeded } from './rng';
import { gradeBlank } from './blank-grade';
import { checkAnswer } from './engine';
describe('数学填空', () => {
  it('120 组结构合法、答案可判对', () => {
    for (let i = 0; i < 120; i++) {
      const q = mathFillQuestion(seeded(`f${i}`));
      expect(q.type).toBe('blank');
      expect(Array.isArray(q.answer)).toBe(true);
      expect((q.answer as string[]).length).toBeGreaterThan(0);
      expect(q.explanation.length).toBeGreaterThan(2);
      // 标准答案必须判对
      expect(checkAnswer(q, (q.answer as string[])[0])).toBe(true);
      // 错误答案判错
      expect(gradeBlank('一个绝对不对的答案xyz', q.answer as string[])).toBe(false);
    }
  });
  it('覆盖 12 个填空考点', () => { expect(FILL_TOPICS.length).toBe(12); });
});
