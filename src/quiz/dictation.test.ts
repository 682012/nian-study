import { describe, it, expect } from 'vitest';
import { DICTATION_BANK } from './sources';
import { gradeBlank } from './blank-grade';
describe('古诗文默写', () => {
  it('20 题：正解判对、错字判错', () => {
    for (const d of DICTATION_BANK) {
      expect(gradeBlank(d.accepts[0], d.accepts)).toBe(true);
      expect(gradeBlank('  ' + d.accepts[0] + ' ', d.accepts)).toBe(true); // 空格容错
      expect(gradeBlank('明显写错的句子xyz', d.accepts)).toBe(false);
    }
    expect(DICTATION_BANK.length).toBe(20);
  });
  it('同音字/漏字不判对（默写要求逐字准确）', () => {
    const d = DICTATION_BANK[0]; // 金石可镂
    expect(gradeBlank('金石可楼', d.accepts)).toBe(false);
  });
});
