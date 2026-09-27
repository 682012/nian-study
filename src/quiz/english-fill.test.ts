// 英语 Ⅴ 语法填空 / Ⅵ 完成句子：题库结构、正解判对、错解判错、容错、配卷接入。
import { describe, it, expect } from 'vitest';
import { GRAMMAR_FILL_BANK, COMPLETE_SENTENCE_BANK, gradeEnglish, normalizeEnglish } from './english-fill';
import { questionForType, checkAnswer, adaptiveCycle } from './engine';
import { seeded } from './rng';
import type { Question } from './types';

const banks = [
  { kind: 'grammar-fill' as const, bank: GRAMMAR_FILL_BANK, min: 40 },
  { kind: 'complete-sentence' as const, bank: COMPLETE_SENTENCE_BANK, min: 30 },
];

describe('英语填空题库结构', () => {
  for (const { kind, bank, min } of banks) {
    it(`${kind}：题量、id 唯一、恰一个空、答案非空`, () => {
      expect(bank.length).toBeGreaterThanOrEqual(min);
      expect(new Set(bank.map((q) => q.id)).size).toBe(bank.length);
      for (const q of bank) {
        expect(q.sentence.split('____').length - 1, q.id).toBe(1);
        expect(q.accepts.length, q.id).toBeGreaterThan(0);
        expect(q.accepts.every((a) => a.trim() && !a.includes('____')), q.id).toBe(true);
        expect(q.point && q.explain, q.id).toBeTruthy();
      }
    });
    it(`${kind}：每个标准答案都经 checkAnswer 判对`, () => {
      for (const q of bank) {
        const Q: Question = { id: q.id, subject: 'english', kind, type: 'blank', eyebrow: '', prompt: q.sentence, answer: q.accepts, explanation: '' };
        for (const a of q.accepts) expect(checkAnswer(Q, a), `${q.id}:${a}`).toBe(true);
      }
    });
  }
});

describe('英语判分容错', () => {
  it('大小写、首尾空格、句末标点、全角', () => {
    expect(gradeEnglish('  Bought. ', ['bought'])).toBe(true);
    expect(gradeEnglish('As Soon As You Get Home', ['as soon as you get home'])).toBe(true);
    expect(gradeEnglish('ｂｏｕｇｈｔ', ['bought'])).toBe(true);
    expect(gradeEnglish('are   playing', ['are playing'])).toBe(true);
  });
  it('缩写与全写等价', () => {
    expect(gradeEnglish("didn't finish until last night", ['did not finish until last night'])).toBe(true);
    expect(gradeEnglish("it's important to learn", ['it is important to learn'])).toBe(true);
    expect(gradeEnglish('can not', ['cannot'])).toBe(true);
    expect(normalizeEnglish('I’m')).toBe('i am');
  });
  it('错解判错', () => {
    expect(gradeEnglish('buyed', ['bought'])).toBe(false);
    expect(gradeEnglish('buy', ['bought'])).toBe(false);
    expect(gradeEnglish('', ['bought'])).toBe(false);
    expect(gradeEnglish('playing', ['are playing'])).toBe(false);
    expect(gradeEnglish('a', ['an'])).toBe(false);
  });
});

describe('出题与配卷接入', () => {
  it('questionForType 产出英语 blank 题且答案能判对', () => {
    for (const kind of ['grammar-fill', 'complete-sentence'] as const) {
      for (let i = 0; i < 50; i++) {
        const q = questionForType(kind, {}, seeded(`${kind}${i}`));
        expect(q.subject).toBe('english');
        expect(q.type).toBe('blank');
        expect(checkAnswer(q, (q.answer as string[])[0])).toBe(true);
        expect(checkAnswer(q, 'zzz wrong')).toBe(false);
      }
    }
  });
  it('数学填空仍走数值判分（不被英语判分劫持）', () => {
    const q: Question = { id: 'm', subject: 'math', kind: 'math-fill', type: 'blank', eyebrow: '', prompt: '', answer: ['0.5'], explanation: '' };
    expect(checkAnswer(q, '1/2')).toBe(true);
  });
  it('英语最薄时，私塾配卷包含两种新题型', () => {
    const cycle = adaptiveCycle({ english: { attempts: 10, correct: 2 }, math: { attempts: 10, correct: 9 }, chinese: { attempts: 10, correct: 9 } });
    expect(cycle).toContain('grammar-fill');
    expect(cycle).toContain('complete-sentence');
  });
});
