import { describe, it, expect } from 'vitest';
import { SOLVE_BUILDERS, mathSolveQuestion } from './math-solve';
import { seeded } from './rng';

const BAD_NUMBER_RE = /NaN|Infinity|undefined|\d\.\d{3,}/;

describe('数学解答题生成器 (math-solve)', () => {
  it('包含 6 个按 SPEC 顺序排列的 SolveBuilder', () => {
    expect(SOLVE_BUILDERS.length).toBe(6);
    const expectedTopics = [
      '解三角形',
      '等差数列',
      '等比数列',
      '函数应用',
      '直线与圆',
      '三角函数性质',
    ];
    SOLVE_BUILDERS.forEach((builder, idx) => {
      const q = builder(seeded(`probe:${idx}`));
      expect(q.topic).toBe(expectedTopics[idx]);
    });
  });

  describe('6 个 Builder 质量与硬约束扫描 (各 200 次)', () => {
    SOLVE_BUILDERS.forEach((builder, bi) => {
      it(`Builder #${bi + 1} 满足 200 次随机质量断言`, () => {
        const prompts = new Set<string>();

        for (let i = 0; i < 200; i++) {
          const rng = seeded(`solve${bi}:${i}`);
          const built = builder(rng);
          const { topic, prompt, solve } = built;

          prompts.add(prompt);

          // 1. 无坏数检查（全文本扫描）
          const fullText = JSON.stringify({ topic, prompt, solve });
          expect(fullText).not.toMatch(BAD_NUMBER_RE);

          // 2. total 必须为 12 或 13
          expect([12, 13]).toContain(solve.total);

          // 3. steps 3–5 步
          expect(solve.steps.length).toBeGreaterThanOrEqual(3);
          expect(solve.steps.length).toBeLessThanOrEqual(5);

          // 4. 步分之和 = total
          const stepScoreSum = solve.steps.reduce((sum, s) => sum + s.score, 0);
          expect(stepScoreSum).toBe(solve.total);

          // 5. rubric 条目分值和 = total
          const rubricScoreSum = solve.rubric.reduce((sum, r) => sum + r.score, 0);
          expect(rubricScoreSum).toBe(solve.total);

          // 6. 每步 accepts 非空且无重复
          solve.steps.forEach(step => {
            expect(step.accepts.length).toBeGreaterThan(0);
            const acceptSet = new Set(step.accepts);
            expect(acceptSet.size).toBe(step.accepts.length);
          });
        }

        // 7. 同 builder 200 次题干去重 ≥ 20
        expect(prompts.size).toBeGreaterThanOrEqual(20);
      });
    });
  });

  describe('mathSolveQuestion 接口与字段契约', () => {
    it('正确生成 Question 对象且满足字段契约', () => {
      const rng = seeded('question-test');
      const q = mathSolveQuestion(rng);

      expect(q.type).toBe('solve');
      expect(q.subject).toBe('math');
      expect(q.kind).toBe('math-solve');
      expect(q.id).toMatch(/^solve-.+-\d+$/);
      expect(q.eyebrow).toBe(`解答题 · ${q.skill}`);
      expect(Array.isArray(q.answer)).toBe(true);

      expect(q.solve).toBeDefined();
      if (q.solve) {
        expect(q.answer).toEqual(q.solve.steps.map(s => s.accepts[0]));
        expect(q.explanation).toBe(q.solve.solution.join('\n'));
        expect(q.rubric).toEqual(q.solve.rubric);
      }
    });

    it('指定 topic 时只出该 topic 的题目', () => {
      const topics = ['解三角形', '等差数列', '等比数列', '函数应用', '直线与圆', '三角函数性质'];

      topics.forEach(topic => {
        for (let i = 0; i < 10; i++) {
          const q = mathSolveQuestion(seeded(`topic:${topic}:${i}`), topic);
          expect(q.skill).toBe(topic);
          expect(q.eyebrow).toBe(`解答题 · ${topic}`);
          expect(q.solve?.topic).toBe(topic);
        }
      });
    });
  });
});
