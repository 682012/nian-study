// 卷子扫描：把模型返回的文本解析成结构化题目。纯函数，全部可单测。
// 设计原则：模型可能返回围栏、废话、坏字段——解析层一律「能救则救，不能救就丢并记账」。
import type { Question, Subject } from './types';

export interface ScannedQ {
  id: string;
  subject: Subject;
  type: 'choice' | 'blank';
  prompt: string;
  choices?: string[];          // type=choice
  answer: number | string[];   // choice: 选项下标；blank: 等价答案数组
  explanation: string;
  source: string;              // 出处，如「2023 年真题」
}

const SUBJECTS: Subject[] = ['english', 'math', 'chinese'];
export const MAX_SCAN_QUESTIONS = 20;

const str = (v: unknown, max = 2000): string => (typeof v === 'string' ? v.trim().slice(0, max) : '');

// 稳定 id：同卷同题永远同一 id（FNV-1a），入库去重、错题记录都靠它。
export function stableScanId(subject: string, prompt: string): string {
  let h = 2166136261;
  const s = `${subject}:${prompt.trim()}`;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return `scan-${(h >>> 0).toString(36)}`;
}

// 从模型回复里抠出 JSON 数组：容忍 ```json 围栏和前后解释文字。
export function extractJsonArray(raw: string): unknown[] | null {
  const text = String(raw || '');
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  for (const candidate of [fenced?.[1], text]) {
    if (!candidate) continue;
    const start = candidate.indexOf('[');
    const end = candidate.lastIndexOf(']');
    if (start < 0 || end <= start) continue;
    try {
      const parsed = JSON.parse(candidate.slice(start, end + 1));
      if (Array.isArray(parsed)) return parsed;
    } catch { /* 换下一个候选 */ }
  }
  return null;
}

export interface ParseResult { questions: ScannedQ[]; issues: string[] }

export function parseScanResult(raw: string): ParseResult {
  const issues: string[] = [];
  const arr = extractJsonArray(raw);
  if (!arr) return { questions: [], issues: ['回复里找不到题目列表'] };
  const out: ScannedQ[] = [];
  const seen = new Set<string>();
  for (const [i, item] of arr.entries()) {
    if (out.length >= MAX_SCAN_QUESTIONS) { issues.push(`一卷最多取前 ${MAX_SCAN_QUESTIONS} 题`); break; }
    if (!item || typeof item !== 'object' || Array.isArray(item)) { issues.push(`第 ${i + 1} 条不是题目对象，跳过`); continue; }
    const it = item as Record<string, unknown>;
    const subject = SUBJECTS.includes(it.subject as Subject) ? (it.subject as Subject) : null;
    const prompt = str(it.prompt ?? it.question, 1200);
    if (!subject || !prompt) { issues.push(`第 ${i + 1} 条缺科目或题干，跳过`); continue; }
    const explanation = str(it.explanation, 800);
    const source = str(it.source, 120);
    const id = stableScanId(subject, prompt);
    if (seen.has(id)) { issues.push(`第 ${i + 1} 题与前面重复，跳过`); continue; }
    if (it.type === 'blank') {
      const rawAccepts = Array.isArray(it.accepts) ? it.accepts : Array.isArray(it.answer) ? it.answer : [it.answer];
      const accepts = rawAccepts.map((a) => str(a, 200)).filter(Boolean);
      if (!accepts.length) { issues.push(`第 ${i + 1} 条填空缺答案，跳过`); continue; }
      seen.add(id);
      out.push({ id, subject, type: 'blank', prompt, answer: accepts, explanation, source });
    } else {
      const rawChoices = Array.isArray(it.choices) ? it.choices : Array.isArray(it.options) ? it.options : [];
      const choices = rawChoices.map((c) => str(c, 500)).filter(Boolean);
      const answer = Number(it.answer);
      if (choices.length < 2 || !Number.isInteger(answer) || answer < 0 || answer >= choices.length) {
        issues.push(`第 ${i + 1} 条选项或答案下标不完整，跳过`); continue;
      }
      seen.add(id);
      out.push({ id, subject, type: 'choice', prompt, choices, answer, explanation, source });
    }
  }
  if (!out.length && !issues.length) issues.push('没有识别出可练的题目');
  return { questions: out, issues };
}

// 扫描题 → 统一 Question（choice/blank 两种，答题 UI 直接支持）
export function scanQToQuestion(q: ScannedQ): Question {
  const base = {
    id: q.id,
    subject: q.subject,
    kind: '扫卷',
    eyebrow: `我的卷子 · ${q.source || '扫描导入'}`,
    prompt: q.prompt,
    explanation: q.explanation || '这道题由卷子扫描导入，正解以卷面为准。',
    skill: `扫卷·${q.subject}`,
  };
  if (q.type === 'blank') return { ...base, type: 'blank', answer: q.answer as string[] };
  return { ...base, type: 'choice', choices: q.choices!, answer: q.answer as number };
}
