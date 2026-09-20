import { describe, it, expect, beforeEach } from 'vitest';
import {
  loadScanBank, saveScanQuestions, removeScanQuestion, clearScanBank,
  normalizeScannedQ, SCAN_BANK_KEY, BANK_CAP,
} from './scan-bank';

function memKV() {
  const m = new Map<string, string>();
  return {
    getItem: (k: string) => m.get(k) ?? null,
    setItem: (k: string, v: string) => { m.set(k, v); },
    removeItem: (k: string) => { m.delete(k); },
    dump: () => m.get(SCAN_BANK_KEY),
  };
}

const choice = (id: string, prompt = `${id} 题`) => ({
  id, subject: 'math' as const, type: 'choice' as const, prompt,
  choices: ['1', '2', '3', '4'], answer: 1, explanation: '', source: '',
});

describe('我的卷子题库', () => {
  let kv: ReturnType<typeof memKV>;
  beforeEach(() => { kv = memKV(); });

  it('空库读出来是空数组', () => {
    expect(loadScanBank(kv)).toEqual([]);
  });

  it('入库后读得回，返回新增数', () => {
    const r = saveScanQuestions([choice('a'), choice('b')], kv);
    expect(r).toEqual({ added: 2, dup: 0, total: 2 });
    expect(loadScanBank(kv)).toHaveLength(2);
  });

  it('同 id 再入库只计重复', () => {
    saveScanQuestions([choice('a')], kv);
    const r = saveScanQuestions([choice('a'), choice('c')], kv);
    expect(r.added).toBe(1);
    expect(r.dup).toBe(1);
    expect(loadScanBank(kv)).toHaveLength(2);
  });

  it('坏条目入库时被 normalizeScannedQ 挡掉', () => {
    expect(normalizeScannedQ({ id: 'x', subject: 'math', type: 'choice', prompt: 'p', choices: ['1'], answer: 0 })).toBeNull();
    expect(normalizeScannedQ({ id: 'x', subject: 'history', type: 'choice', prompt: 'p', choices: ['1', '2'], answer: 0 })).toBeNull();
    expect(normalizeScannedQ({ id: 'x', subject: 'math', type: 'blank', prompt: 'p', answer: [] })).toBeNull();
    expect(normalizeScannedQ({ subject: 'math', type: 'blank', prompt: 'p', answer: ['x'] })?.id).toBeTruthy();
  });

  it('坏 JSON / 非数组 / 坏条目混在档里：读档不炸，只丢坏的', () => {
    kv.setItem(SCAN_BANK_KEY, 'not json');
    expect(loadScanBank(kv)).toEqual([]);
    kv.setItem(SCAN_BANK_KEY, '{"a":1}');
    expect(loadScanBank(kv)).toEqual([]);
    kv.setItem(SCAN_BANK_KEY, JSON.stringify([choice('ok'), { id: 'bad' }, null, choice('ok')]));
    const bank = loadScanBank(kv);
    expect(bank).toHaveLength(1);
    expect(bank[0].id).toBe('ok');
  });

  it('超容丢最旧的', () => {
    const many = Array.from({ length: BANK_CAP + 5 }, (_, i) => choice(`q${i}`));
    saveScanQuestions(many, kv);
    const bank = loadScanBank(kv);
    expect(bank).toHaveLength(BANK_CAP);
    expect(bank[bank.length - 1].id).toBe(`q${BANK_CAP + 4}`);
    expect(bank[0].id).toBe('q5');
  });

  it('单条删除与清空', () => {
    saveScanQuestions([choice('a'), choice('b')], kv);
    removeScanQuestion('a', kv);
    expect(loadScanBank(kv).map((q) => q.id)).toEqual(['b']);
    clearScanBank(kv);
    expect(loadScanBank(kv)).toEqual([]);
  });

  it('读出的题都带齐练习必需字段', () => {
    saveScanQuestions([{ id: 'f', subject: 'chinese', type: 'blank', prompt: '默写', answer: ['答案'], explanation: '解析', source: '课本' }], kv);
    const [q] = loadScanBank(kv);
    expect(q).toMatchObject({ subject: 'chinese', type: 'blank', prompt: '默写', explanation: '解析', source: '课本' });
    expect(q.answer).toEqual(['答案']);
  });
});
