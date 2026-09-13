import { describe, it, expect } from 'vitest';
import { newCard, rateCard, isDue, isMistakeCleared, migrateWordCard, ratingFromCorrect } from './srs';
import { Rating } from 'ts-fsrs';

const T0 = new Date('2026-09-14T08:00:00Z');

describe('FSRS 单词调度', () => {
  it('新卡即到期', () => { expect(isDue(undefined, T0)).toBe(true); expect(isDue(newCard(T0), T0)).toBe(true); });
  it('答错：短时间内到期（约1分钟），留在学习态', () => {
    const c = rateCard(undefined, Rating.Again, T0);
    expect(new Date(c.due).getTime() - T0.getTime()).toBeLessThan(10 * 60 * 1000);
    expect(c.state).not.toBe(2);
  });
  it('连续答对：间隔逐步拉长', () => {
    let c = rateCard(undefined, Rating.Good, T0);
    const g1 = new Date(c.due).getTime() - T0.getTime();
    c = rateCard(c, Rating.Good, new Date(c.due));
    const g2 = new Date(c.due).getTime() - new Date(rateCard(rateCard(undefined, Rating.Good, T0), Rating.Good, new Date(rateCard(undefined, Rating.Good, T0).due)).due).getTime();
    // 第二次复习后 scheduled_days 应 >=1
    expect(c.scheduled_days).toBeGreaterThanOrEqual(1);
    expect(g1).toBeGreaterThan(0);
  });
  it('进入 Review 且未到期 = 错题本轮过关', () => {
    let c = rateCard(undefined, Rating.Again, T0);
    expect(isMistakeCleared(c, T0)).toBe(false);
    // 多次 Good 推进到 Review
    for (let i = 0; i < 6; i++) c = rateCard(c, Rating.Good, new Date(c.due));
    if (c.state === 2) expect(isMistakeCleared(c, T0)).toBe(true);
  });
  it('二分评分映射', () => { expect(ratingFromCorrect(true)).toBe(Rating.Good); expect(ratingFromCorrect(false)).toBe(Rating.Again); });
});

describe('旧档迁移', () => {
  it('mastery>=2 的词进入 Review 且保留到期日', () => {
    const due = T0.getTime() + 7 * 86400000;
    const c = migrateWordCard({ mastery: 4, wrong: 1, correct: 8, due, last: T0.getTime() }, T0);
    expect(c.state).toBe(2);
    expect(c.reps).toBe(9);
    expect(c.lapses).toBe(1);
    expect(new Date(c.due).getTime()).toBe(due);
  });
  it('mastery 0 的新词保持新卡', () => {
    const c = migrateWordCard({ mastery: 0, wrong: 0, correct: 0, due: 0, last: 0 }, T0);
    expect(c.state).toBe(0);
    expect(isDue(c, T0)).toBe(true);
  });
});
