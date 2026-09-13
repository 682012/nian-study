// V10 出题引擎：把题库与数学出题器统一为 Question。阶段1先做纯函数，存档适配在 store 层注入。
import type { Question, Subject, Word } from './types';
import {
  WORDS, SENTENCES, LISTENING_BANK, READING_BANK, CHINESE_BANK,
  ENGLISH_PRESET, MATH_PRESET, APPRECIATE_BANK,
} from './sources';
import { MATH_BUILDERS } from './math-builders';
import { pick, pickWeighted, shuffle, seeded, normalizeAnswer, type Rng } from './rng';

export interface WordRecord { mastery: number; wrong: number; due: number; last?: number; correct?: number; }
export interface EngineContext {
  words?: Word[];
  getWordRecord?: (id: number) => Partial<WordRecord> | undefined;
}

function makeChoices(answer: string, candidates: string[], rng: Rng) {
  const alternatives = shuffle([...new Set(candidates.filter((c) => c !== answer))], rng).slice(0, 3);
  const choices = shuffle([answer, ...alternatives], rng);
  return { choices, answer: choices.indexOf(answer) };
}

function adaptiveWord(words: Word[], getRecord: EngineContext['getWordRecord'], rng: Rng): Word {
  const now = Date.now();
  return pickWeighted(words, (word) => {
    const r = getRecord?.(word.id) ?? {};
    const mastery = Math.max(0, Math.min(5, Number(r.mastery) || 0));
    const wrong = Number(r.wrong) || 0;
    const due = Number(r.due) || 0;
    const unseen = !r.last && !r.correct && !r.wrong;
    const overdue = due > 0 && due <= now;
    return 1 + (5 - mastery) * 1.2 + Math.min(wrong, 5) * 1.8 + Number(unseen) * 2.2 + Number(overdue) * 7;
  }, rng);
}

export function wordQuestion(kind: 'meaning' | 'listen' | 'dictation', ctx: EngineContext = {}, rng: Rng = Math.random): Question {
  const words = ctx.words ?? WORDS;
  const word = adaptiveWord(words, ctx.getWordRecord, rng);
  const head = word.word.split('/')[0];
  const others = words.filter((w) => w.id !== word.id);
  if (kind === 'listen') {
    const o = makeChoices(word.meaning, others.map((w) => w.meaning), rng);
    return {
      id: `listen-${word.id}`, subject: 'english', kind, type: 'choice', wordId: word.id,
      eyebrow: '不显示英文 · 先用耳朵作答', prompt: '听清发音，选出正确释义。',
      speech: head, phonetic: word.phonetic, choices: o.choices, answer: o.answer,
      explanation: `${word.word} /${word.phonetic}/：${word.meaning}`,
    };
  }
  if (kind === 'dictation') {
    return {
      id: `dictation-${word.id}`, subject: 'english', kind, type: 'input', wordId: word.id,
      eyebrow: '听写 · 不给首字母', prompt: '播放发音，把完整英文写下来。',
      speech: head, phonetic: word.phonetic, hint: `${word.meaning} · ${head.length} 个字母`,
      answer: normalizeAnswer(head), expected: head,
      explanation: `${head} /${word.phonetic}/：${word.meaning}`,
    };
  }
  const o = makeChoices(word.meaning, others.map((w) => w.meaning), rng);
  return {
    id: `meaning-${word.id}`, subject: 'english', kind: 'meaning', type: 'choice', wordId: word.id,
    eyebrow: `NO.${String(word.id).padStart(3, '0')} · 识义`, prompt: word.word,
    subprompt: `/${word.phonetic}/`, choices: o.choices, answer: o.answer,
    explanation: `${word.word}：${word.meaning}`,
  };
}

export function sentenceQuestion(rng: Rng = Math.random): Question {
  const item = pick(SENTENCES, rng);
  const tokens = item.sentence.split(' ');
  return {
    id: item.id, subject: 'english', kind: 'sentence', type: 'tokens',
    eyebrow: '句阵重排 · 语序', prompt: item.meaning,
    tokens: shuffle(tokens.map((label, index) => ({ label, index })), rng),
    answer: normalizeAnswer(item.sentence), expected: item.sentence,
    explanation: `${item.sentence}. ${item.rule}。`,
  };
}

export function listeningQuestion(rng: Rng = Math.random): Question {
  const item = pick(LISTENING_BANK, rng);
  return {
    id: item.id, subject: 'english', kind: 'listening', type: 'choice',
    eyebrow: `听句寻意 · ${item.skill || '关键信息'}`, prompt: item.prompt,
    speech: item.speech, choices: [...item.choices], answer: item.answer, explanation: item.explanation,
    skill: item.skill,
  };
}

export function readingQuestion(rng: Rng = Math.random): Question {
  const item = pick(READING_BANK, rng);
  return {
    id: item.id, subject: 'chinese', kind: 'reading', type: 'choice',
    eyebrow: `短章取证 · ${item.skill || '阅读'}`, passage: item.passage, prompt: item.prompt,
    choices: [...item.choices], answer: item.answer, skill: item.skill, rubric: item.rubric,
    explanation: item.explanation,
  };
}

export function chineseQuestion(rng: Rng = Math.random): Question {
  const item = pick(CHINESE_BANK, rng);
  return {
    ...item, id: item.id, subject: 'chinese', kind: 'chinese', type: 'choice', eyebrow: `经史百问 · ${item.category}`,
    prompt: item.prompt, choices: [...item.choices], answer: item.answer, explanation: item.explanation,
  };
}

export function mathQuestion(rng: Rng = Math.random): Question {
  const built = pick(MATH_BUILDERS, rng)(rng);
  return {
    id: `math-gen-${built.topic}-${Math.floor(rng() * 1e8)}`, subject: 'math', kind: 'math', type: 'choice',
    eyebrow: `算学千变 · ${built.topic}`, prompt: built.prompt, choices: built.choices, answer: built.answer,
    svg: built.svg, explanation: built.explanation,
  };
}

export function englishPresetQuestion(rng: Rng = Math.random): Question {
  const q = pick(ENGLISH_PRESET, rng);
  return {
    id: q.id, subject: 'english', kind: q.category, type: 'choice', eyebrow: `${q.category} · ${q.level}`,
    prompt: q.context, subprompt: q.prompt, choices: [...q.options], answer: q.answer,
    explanation: q.explanation,
    notes: { knowledge: q.knowledge, strategy: q.strategy, explanation: q.explanation, pitfall: q.pitfall, notebook: q.notebook },
  };
}

export function mathPresetQuestion(rng: Rng = Math.random): Question {
  const q = pick(MATH_PRESET, rng);
  return {
    id: q.id, subject: 'math', kind: `七步·${q.topic}`, type: 'choice', eyebrow: `${q.topic} · ${q.title}`,
    prompt: q.prompt, choices: [...q.options], answer: q.answer, explanation: q.plain,
    notes: { plain: q.plain, concept: q.concept, bridge: q.bridge, steps: q.steps, explanation: q.notebook, transfer: q.transfer, pitfall: q.pitfall, notebook: q.notebook },
  };
}

export function appreciateQuestion(rng: Rng = Math.random): Question {
  const q = pick(APPRECIATE_BANK, rng);
  return {
    id: q.id, subject: 'chinese', kind: q.type, type: 'choice', eyebrow: q.type, passage: q.passage,
    prompt: q.question, subprompt: q.source, choices: [...q.options], answer: q.answer,
    explanation: q.explanation,
    notes: { locate: q.locate, scoring: q.scoring, explanation: q.explanation, pitfall: q.pitfall, notebook: q.notebook },
  };
}

export type GeneratorType =
  | 'meaning' | 'listen' | 'dictation' | 'sentence' | 'listening'
  | 'math' | 'chinese' | 'reading' | 'english-preset' | 'math-preset' | 'appreciate';

export function questionForType(type: GeneratorType, ctx: EngineContext, rng: Rng): Question {
  switch (type) {
    case 'meaning': case 'listen': case 'dictation': return wordQuestion(type, ctx, rng);
    case 'sentence': return sentenceQuestion(rng);
    case 'listening': return listeningQuestion(rng);
    case 'reading': return readingQuestion(rng);
    case 'chinese': return chineseQuestion(rng);
    case 'math': return mathQuestion(rng);
    case 'english-preset': return englishPresetQuestion(rng);
    case 'math-preset': return mathPresetQuestion(rng);
    case 'appreciate': return appreciateQuestion(rng);
  }
}

export interface SubjectStat { attempts: number; correct: number; }

// 薄弱排序的三科配卷：与 V9 adaptiveCycle 同构（最薄科目占比最高）。
export function adaptiveCycle(stats: Record<Subject, SubjectStat>): GeneratorType[] {
  const rate = (s: SubjectStat) => (s.attempts ? s.correct / s.attempts : 0.58);
  const ordered = (['english', 'math', 'chinese'] as Subject[])
    .map((subject) => ({ subject, rate: rate(stats[subject]), attempts: stats[subject].attempts }))
    .sort((a, b) => a.rate - b.rate || a.attempts - b.attempts)
    .map((x) => x.subject);
  const pools: Record<Subject, GeneratorType[]> = {
    english: ['listening', 'dictation', 'sentence', 'listen', 'meaning'],
    math: ['math'],
    chinese: ['reading', 'chinese'],
  };
  const positions = [0, 1, 0, 2, 0, 1, 0, 2, 1, 0];
  const offsets: Record<Subject, number> = { english: 0, math: 0, chinese: 0 };
  return positions.map((rank) => {
    const subject = ordered[rank];
    const pool = pools[subject];
    return pool[offsets[subject]++ % pool.length];
  });
}

export const MODE_COUNTS: Record<string, number> = {
  adaptive: 12, listen: 12, listening: 10, dictation: 10, sentence: 8,
  math: 12, chinese: 12, reading: 8, mixed: 15, daily: 20, endless: 100, mistakes: 12,
};

export function todayKey(d: Date = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// 每日固定卷：同一天同一进度得到同一张卷（V9 行为：作答改变权重后不会变成另一张卷）。
export function buildDailyPaper(dateKey: string, stats: Record<Subject, SubjectStat>, ctx: EngineContext = {}): Question[] {
  const rng = seeded(`daily:${dateKey}`);
  const cycle = adaptiveCycle(stats);
  return Array.from({ length: MODE_COUNTS.daily }, (_, i) => questionForType(cycle[i % cycle.length], ctx, rng));
}

export function checkAnswer(q: Question, response: string | number | string[]): boolean {
  if (q.type === 'choice') return Number(response) === q.answer;
  if (q.type === 'input') return normalizeAnswer(String(response)) === normalizeAnswer(q.expected ?? q.answer);
  if (q.type === 'tokens') {
    const ordered = (response as string[]);
    return normalizeAnswer(ordered.join(' ')) === normalizeAnswer(q.expected ?? q.answer);
  }
  return false;
}
