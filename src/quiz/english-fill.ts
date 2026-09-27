// 英语考纲 Ⅴ 语法填空 / Ⅵ 完成句子：题库出题 + 英文文本判分（大小写、缩写、标点、��角、多空格容错）。
import type { Question } from './types';
import { pick, type Rng } from './rng';
import gfJson from '../content/grammar-fill.json';
import csJson from '../content/complete-sentence.json';

export interface EnFillQ { id: string; sentence: string; accepts: string[]; point: string; explain: string }
export const GRAMMAR_FILL_BANK = gfJson as EnFillQ[];
export const COMPLETE_SENTENCE_BANK = csJson as EnFillQ[];
export const EN_FILL_KINDS = new Set(['grammar-fill', 'complete-sentence']);

const CONTRACTIONS: Array<[RegExp, string]> = [
  [/\bcan't\b/g, 'cannot'], [/\bcan not\b/g, 'cannot'], [/\bwon't\b/g, 'will not'], [/\bshan't\b/g, 'shall not'],
  [/n't\b/g, ' not'], [/\bi'm\b/g, 'i am'], [/'re\b/g, ' are'], [/'ve\b/g, ' have'], [/'ll\b/g, ' will'],
  [/\b(it|he|she|that|there|what|who|this)'s\b/g, '$1 is'], [/'d\b/g, ' would'],
];

export function normalizeEnglish(raw: string): string {
  let t = String(raw).normalize('NFKC').toLowerCase()
    .replace(/[‘’`´]/g, "'").replace(/[“”]/g, '"')
    .replace(/[.,!?;:"。，！？；：、]+/g, ' ');
  for (const [re, to] of CONTRACTIONS) t = t.replace(re, to);
  return t.replace(/\s+/g, ' ').trim();
}

export function gradeEnglish(response: string, accepts: string[] | string): boolean {
  const user = normalizeEnglish(response);
  if (!user) return false;
  const list = Array.isArray(accepts) ? accepts : [accepts];
  return list.some((a) => normalizeEnglish(a) === user);
}

function toQuestion(q: EnFillQ, kind: 'grammar-fill' | 'complete-sentence'): Question {
  const gf = kind === 'grammar-fill';
  return {
    id: q.id, subject: 'english', kind, type: 'blank',
    eyebrow: `${gf ? '语法填空' : '完成句子'} · ${q.point}`,
    prompt: q.sentence,
    hint: gf ? '填入适当的词，或括号内词的正确形式（时态可能是两个词）' : '把括号里的汉语译成英语，只写空白处',
    answer: [...q.accepts], explanation: q.explain, skill: q.point,
  };
}

export function grammarFillQuestion(rng: Rng = Math.random): Question {
  return toQuestion(pick(GRAMMAR_FILL_BANK, rng), 'grammar-fill');
}

export function completeSentenceQuestion(rng: Rng = Math.random): Question {
  return toQuestion(pick(COMPLETE_SENTENCE_BANK, rng), 'complete-sentence');
}
