import { describe, it, expect, beforeEach } from 'vitest';
import {
  loadShots, saveShot, removeShot, clearShots, exportBankJson, SHOT_CAP, SCAN_SHOTS_KEY,
} from './scan-bank';
import { saveScanQuestions } from './scan-bank';

function memKV() {
  const m = new Map<string, string>();
  return {
    getItem: (k: string) => m.get(k) ?? null,
    setItem: (k: string, v: string) => { m.set(k, v); },
    removeItem: (k: string) => { m.delete(k); },
  };
}

const shot = (id: string, withImage = false) => ({
  id, at: Date.now(), count: 3, source: '2024 期中卷',
  thumb: 'data:image/jpeg;base64,AAAA',
  ...(withImage ? { image: 'data:image/jpeg;base64,BBBB' } : {}),
});

describe('拍过的卷子留档', () => {
  let kv: ReturnType<typeof memKV>;
  beforeEach(() => { kv = memKV(); });

  it('空档案读出来是空数组', () => {
    expect(loadShots(kv)).toEqual([]);
  });

  it('存档后读得回，原图字段保留', () => {
    saveShot(shot('s1', true), kv);
    const [s] = loadShots(kv);
    expect(s.id).toBe('s1');
    expect(s.count).toBe(3);
    expect(s.image).toBe('data:image/jpeg;base64,BBBB');
  });

  it('同 id 再存只更新不叠加', () => {
    saveShot(shot('s1'), kv);
    saveShot({ ...shot('s1'), count: 7 }, kv);
    const list = loadShots(kv);
    expect(list).toHaveLength(1);
    expect(list[0].count).toBe(7);
  });

  it('超过 12 卷淘汰最旧的', () => {
    for (let i = 0; i < SHOT_CAP + 3; i++) saveShot(shot(`s${i}`), kv);
    const list = loadShots(kv);
    expect(list).toHaveLength(SHOT_CAP);
    expect(list[0].id).toBe('s3');
    expect(list[list.length - 1].id).toBe(`s${SHOT_CAP + 2}`);
  });

  it('坏thumb（非图片）被滤掉', () => {
    kv.setItem(SCAN_SHOTS_KEY, JSON.stringify([{ id: 'bad', thumb: 'not-image', at: 1, count: 1, source: '' }, shot('ok')]));
    expect(loadShots(kv).map((s) => s.id)).toEqual(['ok']);
  });

  it('单删与清空', () => {
    saveShot(shot('a'), kv);
    saveShot(shot('b'), kv);
    removeShot('a', kv);
    expect(loadShots(kv).map((s) => s.id)).toEqual(['b']);
    clearShots(kv);
    expect(loadShots(kv)).toEqual([]);
  });

  it('导出 JSON 含全部题目、不含图片', () => {
    saveScanQuestions([{ id: 'q1', subject: 'math', type: 'choice', prompt: '1+1=?', choices: ['1', '2', '3', '4'], answer: 1, explanation: '', source: '卷' }], kv);
    saveShot(shot('s1', true), kv);
    const out = JSON.parse(exportBankJson(kv));
    expect(out.kind).toBe('scan-bank');
    expect(out.questions).toHaveLength(1);
    expect(out.questions[0].prompt).toBe('1+1=?');
    expect(JSON.stringify(out)).not.toContain('data:image');
  });
});
