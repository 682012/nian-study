import { describe, it, expect } from 'vitest';
import { fitSize } from './image-fit';

describe('图片压缩尺寸', () => {
  it('长边不超过上限', () => {
    const r = fitSize(4000, 3000, 1600);
    expect(Math.max(r.width, r.height)).toBe(1600);
    expect(r.width).toBe(1600);
    expect(r.height).toBe(1200);
  });

  it('小图原样返回', () => {
    expect(fitSize(800, 600, 1600)).toEqual({ width: 800, height: 600 });
  });

  it('竖图按高度缩放，比例不失真', () => {
    const r = fitSize(3000, 4000, 1600);
    expect(r.height).toBe(1600);
    expect(r.width).toBe(1200);
  });

  it('极小边长也不会压成 0', () => {
    const r = fitSize(1, 3000, 1600);
    expect(r.width).toBeGreaterThanOrEqual(1);
    expect(r.height).toBe(1600);
  });

  it('脏数据不炸', () => {
    expect(fitSize(NaN, 100, 1600).width).toBeGreaterThanOrEqual(1);
    expect(fitSize(0, 0, 1600)).toEqual({ width: 1, height: 1 });
  });
});
