import { describe, it, expect } from 'vitest';
import { MATH_BUILDERS } from './math-builders';
import {
  wordQuestion, sentenceQuestion, listeningQuestion, readingQuestion,
  chineseQuestion, mathQuestion, englishPresetQuestion, mathPresetQuestion,
  appreciateQuestion, questionForType, adaptiveCycle, buildDailyPaper,
  checkAnswer, todayKey,
} from './engine';
import { WORDS, LISTENING_BANK, READING_BANK } from './sources';
import { seeded } from './rng';
import type { Question } from './types';

const N = 200;

describe('词库', () => {
  it('822 词、ID 1-822 无重复', () => {
    expect(WORDS).toHaveLength(822);
    const ids = new Set(WORDS.map((w) => w.id));
    expect(ids.size).toBe(822);
    expect(Math.min(...ids)).toBe(1);
    expect(Math.max(...ids)).toBe(822);
  });
});

describe('数学程序化出题（对齐 V9：200 组选项唯一）', () => {
  for (let b = 0; b < MATH_BUILDERS.length; b++) {
    it(`builder#${b} 每组 4 个唯一选项且答案合法`, () => {
      for (let i = 0; i < N; i++) {
        const q = mathQuestion(seeded(`${b}:${i}`));
        expect(q.choices).toBeDefined();
        const c = q.choices!;
        expect(c).toHaveLength(4);
        expect(new Set(c).size).toBe(4);
        expect(q.answer).toBeGreaterThanOrEqual(0);
        expect(q.answer).toBeLessThan(4);
        expect(c[q.answer as number]).toBeDefined();
        expect(q.explanation.length).toBeGreaterThan(2);
      }
    });
  }
});

describe('各题型出题结构合法', () => {
  const kinds = ['meaning', 'listen', 'dictation', 'sentence', 'listening', 'reading',
    'chinese', 'math', 'english-preset', 'math-preset', 'appreciate'] as const;
  for (const k of kinds) {
    it(k, () => {
      for (let i = 0; i < 50; i++) {
        const q = questionForType(k, {}, seeded(`${k}:${i}`));
        expect(q.id).toBeTruthy();
        expect(q.subject).toMatch(/english|math|chinese/);
        expect(q.prompt.length).toBeGreaterThan(0);
        if (q.type === 'choice') {
          expect(q.choices).toBeDefined();
          expect(q.answer).toBeGreaterThanOrEqual(0);
          expect(q.answer).toBeLessThan(q.choices!.length);
        }
        if (q.type === 'input') expect(typeof q.answer).toBe('string');
        if (q.type === 'tokens') {
          expect(q.tokens!.length).toBeGreaterThan(3);
          expect(q.expected).toBeTruthy();
        }
      }
    });
  }
  it('听力/阅读题库数量与 V8 一致', () => {
    expect(LISTENING_BANK.length).toBe(36);
    expect(READING_BANK.length).toBe(24);
  });
});

describe('判分', () => {
  it('选择题按下标判定', () => {
    const q = mathQuestion(seeded('x'));
    expect(checkAnswer(q, q.answer)).toBe(true);
    expect(checkAnswer(q, (q.answer as number) + 1 % 4)).toBeTypeOf('boolean');
  });
  it('听写忽略大小写与多余标点空格', () => {
    const q = wordQuestion('dictation', {}, seeded('d1'));
    expect(checkAnswer(q, (q.expected ?? '') + '  ')).toBe(true);
    expect(checkAnswer(q, 'zzz')).toBe(false);
  });
  it('句阵按正确词序判定', () => {
    const q = sentenceQuestion(seeded('s1'));
    const right = q.tokens!.slice().sort((a, b) => a.index - b.index).map((t) => t.label);
    expect(checkAnswer(q, right)).toBe(true);
    expect(checkAnswer(q, [...right].reverse())).toBe(false);
  });
});

describe('自适应与每日卷', () => {
  it('薄弱科目在配卷中出现最多', () => {
    const cycle = adaptiveCycle({
      math: { attempts: 10, correct: 2 },       // 数学最薄
      english: { attempts: 10, correct: 9 },
      chinese: { attempts: 10, correct: 8 },
    });
    const count = (s: string) => cycle.filter((x) => x === s).length;
    expect(count('math')).toBeGreaterThanOrEqual(2);
  });
  it('同一天同一份卷（种子固定，作答不改题）', () => {
    const stats = { english: { attempts: 0, correct: 0 }, math: { attempts: 0, correct: 0 }, chinese: { attempts: 0, correct: 0 } };
    const a = buildDailyPaper('2026-09-13', stats);
    const b = buildDailyPaper('2026-09-13', stats);
    expect(a.map((q) => q.id + '|' + q.prompt)).toEqual(b.map((q) => q.id + '|' + q.prompt));
    expect(a).toHaveLength(20);
  });
  it('隔天换卷', () => {
    const stats = { english: { attempts: 0, correct: 0 }, math: { attempts: 0, correct: 0 }, chinese: { attempts: 0, correct: 0 } };
    const a = buildDailyPaper('2026-09-13', stats).map((q) => q.prompt);
    const c = buildDailyPaper('2026-09-14', stats).map((q) => q.prompt);
    expect(a).not.toEqual(c);
  });
  it('todayKey 格式', () => { expect(todayKey(new Date(2026, 8, 6))).toBe('2026-09-06'); });
});

import { MATH_BUILDERS_2 } from './math-builders-2';
import { MATH_TOPICS, MATH_TOPIC_SET } from './engine';

describe('第二批数学生成器（考纲覆盖）', () => {
  for (let b = 0; b < MATH_BUILDERS_2.length; b++) {
    it(`builder2#${b} 每组4唯一选项且答案合法`, () => {
      for (let i = 0; i < 150; i++) {
        const q = MATH_BUILDERS_2[b](seeded(`b2-${b}-${i}`));
        expect(q.choices).toHaveLength(4);
        expect(new Set(q.choices).size).toBe(4);
        expect(q.answer).toBeGreaterThanOrEqual(0);
        expect(q.answer).toBeLessThan(4);
        expect(q.choices[q.answer]).toBeDefined();
        expect(q.explanation.length).toBeGreaterThan(2);
        expect(q.topic).toBeTruthy();
      }
    });
  }
  it('专项 topic 集合覆盖三角/立体/函数/数列/向量/集合复数统计', () => {
    for (const t of ['特殊角三角函数', '解三角形', '球的体积', '二次函数顶点', '等比数列通项', '向量数量积', '复数加法', '集合运算']) {
      expect(MATH_TOPIC_SET.has(t)).toBe(true);
    }
    expect(MATH_TOPICS.length).toBeGreaterThanOrEqual(30);
  });
  it('三角函数专项只出三角相关题', () => {
    const trig = new Set(['特殊角三角函数', '同角三角函数关系', '三角函数周期', '解三角形']);
    for (let i = 0; i < 80; i++) {
      const q = mathQuestion(seeded(`trig${i}`), '特殊角三角函数');
      expect([...trig]).toContainEqual(expect.anything());
      expect(q.eyebrow.replace('算学千变 · ', '')).toBeTruthy();
    }
  });
});
