// 「我的卷子」个人题库：扫描导入的题目存 localStorage，独立 key，不动老进度档。
import type { ScannedQ } from '../quiz/scan-parse';
import { stableScanId } from '../quiz/scan-parse';
import type { Subject } from '../quiz/types';

export const SCAN_BANK_KEY = 'nian-scan-bank-v1';
export const BANK_CAP = 300;

export interface KVLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

const memory = new Map<string, string>();
const fallbackKV: KVLike = {
  getItem: (k) => memory.get(k) ?? null,
  setItem: (k, v) => { memory.set(k, v); },
  removeItem: (k) => { memory.delete(k); },
};

function defaultKV(): KVLike {
  try {
    if (typeof localStorage !== 'undefined') return localStorage;
  } catch { /* 隐私模式等场景 */ }
  return fallbackKV;
}

const SUBJECTS: Subject[] = ['english', 'math', 'chinese'];
const str = (v: unknown, max = 2000) => (typeof v === 'string' ? v.trim().slice(0, max) : '');

// 读档时逐条校验：坏条目直接丢，不让旧数据把整个馆拖垮。
export function normalizeScannedQ(item: unknown): ScannedQ | null {
  if (!item || typeof item !== 'object') return null;
  const it = item as Record<string, unknown>;
  const subject = SUBJECTS.includes(it.subject as Subject) ? (it.subject as Subject) : null;
  const prompt = str(it.prompt, 1200);
  if (!subject || !prompt) return null;
  const explanation = str(it.explanation, 800);
  const source = str(it.source, 120);
  const id = str(it.id, 64) || stableScanId(subject, prompt);
  if (it.type === 'blank') {
    const accepts = Array.isArray(it.answer) ? it.answer.map((a) => str(a, 200)).filter(Boolean) : [];
    if (!accepts.length) return null;
    return { id, subject, type: 'blank', prompt, answer: accepts, explanation, source };
  }
  const choices = Array.isArray(it.choices) ? it.choices.map((c) => str(c, 500)).filter(Boolean) : [];
  const answer = Number(it.answer);
  if (choices.length < 2 || !Number.isInteger(answer) || answer < 0 || answer >= choices.length) return null;
  return { id, subject, type: 'choice', prompt, choices, answer, explanation, source };
}

export function loadScanBank(store: KVLike = defaultKV()): ScannedQ[] {
  let raw: string | null = null;
  try { raw = store.getItem(SCAN_BANK_KEY); } catch { return []; }
  if (!raw) return [];
  let parsed: unknown;
  try { parsed = JSON.parse(raw); } catch { return []; }
  if (!Array.isArray(parsed)) return [];
  const seen = new Set<string>();
  const out: ScannedQ[] = [];
  for (const item of parsed) {
    const q = normalizeScannedQ(item);
    if (!q || seen.has(q.id)) continue;
    seen.add(q.id);
    out.push(q);
    if (out.length >= BANK_CAP) break;
  }
  return out;
}

function persist(bank: ScannedQ[], store: KVLike): void {
  try { store.setItem(SCAN_BANK_KEY, JSON.stringify(bank)); } catch { /* 存储满就丢，不崩 */ }
}

export function saveScanQuestions(items: ScannedQ[], store: KVLike = defaultKV()): { added: number; dup: number; total: number } {
  const bank = loadScanBank(store);
  const existing = new Set(bank.map((q) => q.id));
  let added = 0;
  let dup = 0;
  for (const item of items) {
    const q = normalizeScannedQ(item);
    if (!q) continue;
    if (existing.has(q.id)) { dup++; continue; }
    existing.add(q.id);
    bank.push(q);
    added++;
  }
  // 超容丢最旧的（扫描导入的题，旧卷价值也低）
  const trimmed = bank.length > BANK_CAP ? bank.slice(bank.length - BANK_CAP) : bank;
  persist(trimmed, store);
  notifyChange();
  return { added, dup, total: trimmed.length };
}

export function removeScanQuestion(id: string, store: KVLike = defaultKV()): void {
  persist(loadScanBank(store).filter((q) => q.id !== id), store);
  notifyChange();
}

export function clearScanBank(store: KVLike = defaultKV()): void {
  persist([], store);
  notifyChange();
}

export function notifyChange(): void {
  try { window.dispatchEvent(new Event('scan-bank-change')); } catch { /* node 环境 */ }
}
