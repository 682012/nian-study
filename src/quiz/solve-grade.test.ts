import { describe, it, expect } from 'vitest';
import { gradeBlank } from './blank-grade';
import { gradeSolve, localGrade } from './solve-grade';
import type { Question, RubricPoint } from './types';

describe('gradeBlank: 既有行为与测试保持', () => {
  it('分数与小数数值等价 (1/2 ≡ 0.5)', () => {
    expect(gradeBlank('1/2', '0.5')).toBe(true);
    expect(gradeBlank('0.5', '1/2')).toBe(true);
    expect(gradeBlank('-1/2', '-0.5')).toBe(true);
  });

  it('多值与正负号等价 (±3 ≡ 3 或 -3)', () => {
    expect(gradeBlank('±3', ['3 或 -3'])).toBe(true);
    expect(gradeBlank('3 或 -3', ['±3'])).toBe(true);
    expect(gradeBlank('-3 或 3', ['±3'])).toBe(true);
    expect(gradeBlank('3, -3', ['±3'])).toBe(true);
  });

  it('方程形式与左侧剥离保持 (x=3 ≡ 3)', () => {
    expect(gradeBlank('x=3', '3')).toBe(true);
    expect(gradeBlank('3', 'x=3')).toBe(true);
    expect(gradeBlank('y = -2', '-2')).toBe(true);
  });

  it('多值解析不被左侧前缀破坏 (x=3 或 x=-3 ≡ ±3)', () => {
    expect(gradeBlank('x=3 或 x=-3', '±3')).toBe(true);
    expect(gradeBlank('x=3, x=-3', '±3')).toBe(true);
  });

  it('全角字符归一化 (１／２ ≡ 0.5)', () => {
    expect(gradeBlank('１／２', '0.5')).toBe(true);
    expect(gradeBlank('ｘ＝３', '3')).toBe(true);
  });

  it('非数值中文答案走精确匹配 (如 递增)', () => {
    expect(gradeBlank('递增', '递增')).toBe(true);
    expect(gradeBlank(' 递增 ', '递增')).toBe(true);
    expect(gradeBlank('递减', '递增')).toBe(false);
    expect(gradeBlank('0', '递增')).toBe(false);
  });
});

describe('gradeBlank: SPEC §8 新增写法', () => {
  it('k√n 与 √n 数值等价 (2√3 ≡ √12)', () => {
    expect(gradeBlank('2√3', '√12')).toBe(true);
    expect(gradeBlank('√12', '2√3')).toBe(true);
    expect(gradeBlank('-3√2', '-√18')).toBe(true);
  });

  it('分数根号 (3√2/2 ≡ (3/2)√2, √3/2)', () => {
    expect(gradeBlank('3√2/2', '(3/2)√2')).toBe(true);
    expect(gradeBlank('√3/2', '(1/2)√3')).toBe(true);
  });

  it('π 表达式与度数符号 (π/3, 60° ≡ 60, 但 π/3 不等价于 60°)', () => {
    expect(gradeBlank('2π', '2*π')).toBe(true);
    expect(gradeBlank('π/3', '(1/3)π')).toBe(true);
    expect(gradeBlank('60°', '60')).toBe(true);
    expect(gradeBlank('60', '60°')).toBe(true);
    // 角度与弧度不互通，按 accepts 列举
    expect(gradeBlank('π/3', '60°')).toBe(false);
  });

  it('剥离 a_n=, aₙ=, S_n=, Sₙ=, f(x)= 前缀', () => {
    expect(gradeBlank('a_n = 2n + 1', '2n + 1')).toBe(true);
    expect(gradeBlank('aₙ = 2n + 1', '2n + 1')).toBe(true);
    expect(gradeBlank('S_n = n^2 + 2n', 'n^2 + 2n')).toBe(true);
    expect(gradeBlank('Sₙ = n^2', 'n^2')).toBe(true);
    expect(gradeBlank('f(x) = 2x', '2x')).toBe(true);
  });

  it('含变量 n 表达式代入比较 (2n+1 ≡ 1+2n, 3·2^(n-1) ≡ 3*2^(n-1))', () => {
    expect(gradeBlank('2n+1', '1+2n')).toBe(true);
    expect(gradeBlank('a_n=2n+1', '1+2n')).toBe(true);
    expect(gradeBlank('3·2^(n-1)', '3*2^(n-1)')).toBe(true);
    expect(gradeBlank('3×2ⁿ⁻¹', '3*2^(n-1)')).toBe(true);
    expect(gradeBlank('n²+2n', '2n+n^2')).toBe(true);
    expect(gradeBlank('2n+1', '2n+2')).toBe(false);
  });
});

describe('gradeSolve: 解答题分步判分 (SPEC §3)', () => {
  const dummySolveQuestion: Question = {
    id: 'solve-1',
    subject: 'math',
    kind: 'math-solve',
    eyebrow: '解答题 · 解三角形',
    explanation: '',
    type: 'solve',
    prompt: '在 △ABC 中，求角 C、边 b、面积 S',
    answer: ['60°', '2√3', '3√3'],
    solve: {
      topic: '解三角形',
      total: 12,
      steps: [
        {
          ask: '求角 C 的度数',
          accepts: ['60°', '60'],
          unit: '°',
          score: 3,
          hint: '三角形内角和 180°',
          explain: 'C = 180° - 45° - 75° = 60°',
        },
        {
          ask: '求边 b 的长',
          accepts: ['2√3', '√12'],
          score: 4,
          hint: '正弦定理 b/sinB = c/sinC',
          explain: 'b = c * sinB / sinC = 2√3',
        },
        {
          ask: '求 △ABC 面积',
          accepts: ['3√3'],
          score: 5,
          hint: 'S = 1/2 a b sinC',
          explain: 'S = 3√3',
        },
      ],
      solution: ['第一步...', '第二步...', '第三步...'],
      rubric: [
        { point: '求出 C', score: 3, keywords: ['C=60', '60°'] },
        { point: '正弦定理', score: 4, keywords: ['正弦定理', '2√3'] },
        { point: '求出面积', score: 5, keywords: ['面积', '3√3'] },
      ],
    },
  };

  it('全对且未使用提示得满分 12', () => {
    const res = gradeSolve(dummySolveQuestion, ['60°', '2√3', '3√3'], [false, false, false]);
    expect(res.full).toBe(true);
    expect(res.got).toBe(12);
    expect(res.total).toBe(12);
    expect(res.steps.every(s => s.correct)).toBe(true);
  });

  it('看提示后答对得分减半 floor(score/2)', () => {
    // 步1 分值3 -> floor(3/2) = 1; 步2 分值4 -> 4; 步3 分值5 -> 5; 总分 1+4+5=10
    const res = gradeSolve(dummySolveQuestion, ['60', '√12', '3√3'], [true, false, false]);
    expect(res.full).toBe(false);
    expect(res.got).toBe(10);
    expect(res.steps[0].got).toBe(1);
    expect(res.steps[0].hinted).toBe(true);
  });

  it('错一步只扣该步，不影响其他步骤', () => {
    const res = gradeSolve(dummySolveQuestion, ['60°', '错的', '3√3']);
    expect(res.full).toBe(false);
    expect(res.got).toBe(8);
    expect(res.steps[1].correct).toBe(false);
    expect(res.steps[1].got).toBe(0);
    expect(res.steps[0].got).toBe(3);
    expect(res.steps[2].got).toBe(5);
  });

  it('空答或未答得 0 分', () => {
    const res = gradeSolve(dummySolveQuestion, ['', '', '']);
    expect(res.full).toBe(false);
    expect(res.got).toBe(0);
  });

  it('responses 长度不足时未答步骤按空处理', () => {
    const res = gradeSolve(dummySolveQuestion, ['60°']);
    expect(res.steps).toHaveLength(3);
    expect(res.got).toBe(3);
    expect(res.steps[1].correct).toBe(false);
    expect(res.steps[2].correct).toBe(false);
  });
});

describe('localGrade: 本地采分点关键词批改 (SPEC §6)', () => {
  const rubric: RubricPoint[] = [
    { point: '求得角 C', score: 3, keywords: ['C=60', '60°'] },
    { point: '利用正弦定理求边 b', score: 4, keywords: ['正弦定理', 'b=2√3'] },
    { point: '计算面积', score: 5, keywords: ['1/2ab', '3√3'] },
  ];

  it('全部命中关键字得满分', () => {
    const work = '由三角形内角和得 C=60°，利用正弦定理算得 b=2√3，面积为 3√3。';
    const res = localGrade(rubric, work);
    expect(res.total).toBe(12);
    expect(res.max).toBe(12);
    expect(res.points.every(p => p.score === p.max)).toBe(true);
    expect(res.summary).toContain('解答完整');
  });

  it('部分命中给对应采分点分值', () => {
    const work = '角 C 是 60°，最后面积是 3√3。';
    const res = localGrade(rubric, work);
    expect(res.total).toBe(8); // 3 + 0 + 5
    expect(res.points[1].score).toBe(0);
    expect(res.summary).toContain('8/12');
  });

  it('完全未命中得 0 分', () => {
    const work = '我不会做这道题。';
    const res = localGrade(rubric, work);
    expect(res.total).toBe(0);
    expect(res.summary).toContain('未识别出');
  });
});
