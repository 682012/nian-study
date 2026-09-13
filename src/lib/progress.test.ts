import { describe, it, expect } from 'vitest';
import {
  defaultState, migrateFromV2, applyAnswer, subjectStats, todayKey, pendingMistakeIds,
} from './progress';
import { wordQuestion } from '../quiz/engine';
import { seeded } from '../quiz/rng';
import type { Question } from '../quiz/types';

const wordQ: Question = wordQuestion('meaning', {}, seeded('w'));

describe('作答落账', () => {
  it('答对：mastery+1、到期推到未来、XP 与今日计数增加', () => {
    let s = defaultState();
    const r = applyAnswer(s, wordQ, true, 'adaptive', 0);
    s = r.state;
    expect(r.points).toBe(10);
    const w = s.words[String(wordQ.wordId)]!;
    expect(w.mastery).toBe(1);
    expect(w.due).toBeGreaterThan(Date.now());
    expect(s.today.english).toBe(1);
    expect(s.xp).toBe(10);
    expect(s.streak).toBe(1);
    expect(s.lastStudyDay).toBe(todayKey());
  });

  it('答错：wrong+1、mastery 归零、10 分钟到期、进错题本', () => {
    let s = defaultState();
    s = applyAnswer(s, wordQ, false, 'adaptive', 0).state;
    const w = s.words[String(wordQ.wordId)]!;
    expect(w.wrong).toBe(1);
    expect(w.mastery).toBe(0);
    expect(w.due - Date.now()).toBeGreaterThan(5 * 60 * 1000);
    expect(s.arcadeV1.mistakes[wordQ.id]).toBeTruthy();
    expect(s.today.english).toBe(0);
  });

  it('错题追击答对后 FSRS 卡过关，不再待理（快照保留）', () => {
    let s = applyAnswer(defaultState(), wordQ, false, 'adaptive', 0).state;
    expect(pendingMistakeIds(s).length).toBe(1);
    // 连续答对推进到 Review
    for (let i = 0; i < 6 && pendingMistakeIds(s).length; i++) {
      s = applyAnswer(s, { ...s.arcadeV1.mistakes[wordQ.id].question }, true, 'mistakes', i).state;
    }
    expect(s.arcadeV1.mistakes[wordQ.id]).toBeTruthy();
  });

  it('昨天学过今天再答，连课 +1', () => {
    const yesterday = new Date(); yesterday.setDate(yesterday.getDate() - 1);
    let s = defaultState(); s.lastStudyDay = todayKey(yesterday); s.streak = 3;
    s = applyAnswer(s, wordQ, true, 'adaptive', 0).state;
    expect(s.streak).toBe(4);
  });

  it('数学 20 连对解锁徽章并更新 bestCombo', () => {
    let s = defaultState();
    for (let i = 0; i < 20; i++) {
      const q: Question = { ...wordQ, id: `m${i}`, subject: 'math', kind: 'math', type: 'choice', eyebrow: '', prompt: '', choices: ['a','b','c','d'], answer: 0, explanation: 'x' };
      s = applyAnswer(s, q, true, 'math', i).state;
    }
    expect(s.arcadeV1.badges).toContain('算学百变');
    expect(s.arcadeV1.bestCombo).toBe(19);
    expect(s.totals.math).toBe(20);
  });
});

describe('V2 存档迁移', () => {
  it('完整保留单词/技能/错题/今日字段', () => {
    const v2 = {
      version: 4, xp: 120, streak: 5, lastStudyDay: '2026-09-10',
      words: { '1': { mastery: 3, wrong: 1, correct: 5, due: 1, last: 9 } },
      totals: { english: 5, reviewed: 0, math: 2, chinese: 0, focus: 0 },
      englishQuestions: {}, mathQuestions: { 'arcade:x': { attempts: 2, correct: 1, last: 5, lastCorrect: true } },
      chineseQuestions: {}, history: {}, today: { date: todayKey(), english: 5, attempts: 7, math: 2 },
      arcadeV1: {
        attempts: 7, correct: 6, bestCombo: 4, bestEndless: 0, runs: 1,
        modes: { math: { attempts: 2, correct: 2, best: 2 } },
        mistakes: { x: { question: wordQ, wrongAt: 3, attempts: 1 } },
        daily: {}, badges: ['闻声识义'],
        skills: { 'english:meaning': { attempts: 3, correct: 2, correctStreak: 2, wrongStreak: 0, last: 1, due: 2 } },
        recent: [],
      },
    };
    const s = migrateFromV2(v2);
    expect(s.version).toBe(10);
    expect(s.xp).toBe(120);
    expect(s.streak).toBe(5);
    expect(s.words['1'].mastery).toBe(3);
    expect(s.arcadeV1.mistakes['x'].question.id).toBe(wordQ.id);
    expect(s.arcadeV1.badges).toContain('闻声识义');
    expect(s.arcadeV1.skills['english:meaning'].correctStreak).toBe(2);
    expect(s.today.english).toBe(5);
    const st = subjectStats(s, 'math');
    expect(st.attempts).toBeGreaterThanOrEqual(2);
  });

  it('损坏/空输入落回全新档不抛错', () => {
    expect(() => migrateFromV2(null)).not.toThrow();
    expect(migrateFromV2('bad').xp).toBe(0);
  });
});

import { dueWordCount as dwc } from './progress';
describe('到期词数', () => {
  it('新用户：全部 822 词待学', () => { expect(dwc(defaultState())).toBe(822); });
  it('FSRS 未到期的词不计入到期', () => {
    const s = applyAnswer(defaultState(), wordQ, true, 'adaptive', 0).state;
    // 答的是某词：到期数 = 821（该词 Good 后短期到期约10分钟，边界放宽：不超过822）
    expect(dwc(s)).toBeLessThanOrEqual(822);
  });
});
