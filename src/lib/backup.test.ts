import { describe, it, expect } from 'vitest';
import { parseBackup } from './backup';
import { defaultState } from './progress';
import { todayKey } from './progress';

describe('学录备份', () => {
  it('V10 包裹格式', () => {
    const s = defaultState(); s.xp = 99;
    const out = parseBackup(JSON.stringify({ app: 'nian-study', backupVersion: 10, data: s }));
    expect(out.xp).toBe(99);
  });
  it('裸 V10 state', () => {
    const s = defaultState(); s.streak = 6;
    expect(parseBackup(JSON.stringify(s)).streak).toBe(6);
  });
  it('V9/V2 老档可导入', () => {
    const v2 = { version: 4, xp: 50, streak: 2, words: { '1': { mastery: 3, wrong: 0, correct: 4, due: Date.now() + 86400000, last: Date.now() } },
      totals: { english: 4, reviewed: 0, math: 0, chinese: 0, focus: 0 }, today: { date: todayKey(), english: 4 },
      arcadeV1: { attempts: 4, correct: 4, mistakes: {}, skills: {}, recent: [], badges: [], modes: {}, daily: {} } };
    const out = parseBackup(JSON.stringify(v2));
    expect(out.xp).toBe(50);
    expect(out.srsCards['word:1']).toBeTruthy();
    expect(out.srsCards['word:1'].state).toBe(2);
  });
  it('坏文件抛错', () => { expect(() => parseBackup('not json')).toThrow(); });
});
