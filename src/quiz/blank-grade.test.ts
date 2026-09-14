import { describe, it, expect } from 'vitest';
import { gradeBlank } from './blank-grade';
describe('填空判分', () => {
  it('整数与去空格', () => { expect(gradeBlank(' 12 ', '12')).toBe(true); expect(gradeBlank('3', '5')).toBe(false); });
  it('分数=小数', () => { expect(gradeBlank('1/2', '0.5')).toBe(true); expect(gradeBlank('0.5', '1/2')).toBe(true); });
  it('x=3 接受 3', () => { expect(gradeBlank('x=3', '3')).toBe(true); });
  it('± 多答案', () => { expect(gradeBlank('-3', ['3', '-3'])).toBe(true); expect(gradeBlank('3', '±3')).toBe(true); expect(gradeBlank('-3', '±3')).toBe(true); });
  it('全角与中文或', () => { expect(gradeBlank('１２', '12')).toBe(true); expect(gradeBlank('5或-5', '±5')).toBe(true); });
  it('非数值答案精确匹配', () => { expect(gradeBlank('递增', ['递增', '增'])).toBe(true); expect(gradeBlank('减', ['递增'])).toBe(false); });
});
