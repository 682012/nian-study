// 学习进度：V2 存档迁移、作答计分、统计。纯函数，不碰 localStorage，便于单测。
import type { Question, Subject } from '../quiz/types';

export const DAY_MS = 86_400_000;
export const V2_KEY = 'nian-study-progress-v2';
export const V10_KEY = 'nian-study-progress-v10';

export interface WordRec { mastery: number; wrong: number; correct: number; due: number; last: number; }
export interface SkillRec { attempts: number; correct: number; correctStreak: number; wrongStreak: number; last: number; due: number; }
export interface QRec { attempts: number; correct: number; last: number; lastCorrect: boolean; }
export interface MistakeRec { question: Question; wrongAt: number; attempts: number; }
export interface Today {
  date: string; english: number; attempts: number; reviewed: number;
  math: number; chinese: number; focus: number; boss: number; ticketMilestones: number;
}
export interface Arcade {
  attempts: number; correct: number; bestCombo: number; bestEndless: number; runs: number;
  modes: Record<string, { attempts: number; correct: number; best: number }>;
  mistakes: Record<string, MistakeRec>;
  daily: Record<string, unknown>;
  dailyQueue?: { date: string; questions: Question[] };
  badges: string[];
  skills: Record<string, SkillRec>;
  recent: Array<{ id: string; skill: string; subject: Subject; correct: boolean; at: number }>;
}
export interface ProgressState {
  version: number;
  xp: number;
  streak: number;
  lastStudyDay?: string;
  mutuality: number;
  gameMinutes: number;
  words: Record<string, WordRec>;
  totals: { english: number; reviewed: number; math: number; chinese: number; focus: number };
  englishQuestions: Record<string, QRec>;
  mathQuestions: Record<string, QRec>;
  chineseQuestions: Record<string, QRec>;
  history: Record<string, unknown>;
  today: Today;
  arcadeV1: Arcade;
}

export function todayKey(d: Date = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
const num = (v: unknown) => (Number.isFinite(Number(v)) ? Number(v) : 0);
const rec = (v: unknown): Record<string, any> => (v && typeof v === 'object' && !Array.isArray(v) ? v as Record<string, any> : {});

export function defaultToday(date = todayKey()): Today {
  return { date, english: 0, attempts: 0, reviewed: 0, math: 0, chinese: 0, focus: 0, boss: 0, ticketMilestones: 0 };
}

export function defaultState(): ProgressState {
  return {
    version: 10, xp: 0, streak: 0, mutuality: 0, gameMinutes: 0, words: {},
    totals: { english: 0, reviewed: 0, math: 0, chinese: 0, focus: 0 },
    englishQuestions: {}, mathQuestions: {}, chineseQuestions: {}, history: {},
    today: defaultToday(),
    arcadeV1: { attempts: 0, correct: 0, bestCombo: 0, bestEndless: 0, runs: 0,
      modes: {}, mistakes: {}, daily: {}, badges: [], skills: {}, recent: [] },
  };
}

function normalizeArcade(raw: unknown): Arcade {
  const a = rec(raw);
  const skills: Arcade['skills'] = {};
  for (const [k, v] of Object.entries(rec(a.skills))) {
    const s = rec(v);
    skills[k] = { attempts: num(s.attempts), correct: num(s.correct), correctStreak: num(s.correctStreak),
      wrongStreak: num(s.wrongStreak), last: num(s.last), due: num(s.due) };
  }
  const modes: Arcade['modes'] = {};
  for (const [k, v] of Object.entries(rec(a.modes))) {
    const m = rec(v);
    modes[k] = { attempts: num(m.attempts), correct: num(m.correct), best: num(m.best) };
  }
  const mistakes: Arcade['mistakes'] = {};
  for (const [k, v] of Object.entries(rec(a.mistakes))) {
    const m = rec(v);
    if (m.question && typeof m.question === 'object') mistakes[k] = { question: m.question as Question, wrongAt: num(m.wrongAt), attempts: num(m.attempts) || 1 };
  }
  const recent = Array.isArray(a.recent) ? a.recent.filter((x) => x && typeof x === 'object').slice(-80) : [];
  const badges = Array.isArray(a.badges) ? a.badges.filter((x) => typeof x === 'string') : [];
  const dq = rec(a.dailyQueue);
  const dailyQueue = typeof dq.date === 'string' && Array.isArray(dq.questions)
    ? { date: dq.date, questions: dq.questions as Question[] } : undefined;
  return {
    attempts: num(a.attempts), correct: num(a.correct), bestCombo: num(a.bestCombo),
    bestEndless: num(a.bestEndless), runs: num(a.runs), modes, mistakes,
    daily: rec(a.daily), dailyQueue, badges, skills, recent: recent as Arcade['recent'],
  };
}

// 从旧 V2 档（nian-study-progress-v2）迁移：保留全部已知字段，不丢数据。
export function migrateFromV2(raw: unknown): ProgressState {
  const p = rec(raw);
  const base = defaultState();
  const out: ProgressState = { ...base };
  out.xp = num(p.xp);
  out.streak = num(p.streak);
  out.lastStudyDay = typeof p.lastStudyDay === 'string' ? p.lastStudyDay : undefined;
  out.mutuality = num(p.mutuality);
  out.gameMinutes = num(p.gameMinutes);

  const words: ProgressState['words'] = {};
  for (const [k, v] of Object.entries(rec(p.words))) {
    const w = rec(v);
    words[k] = { mastery: num(w.mastery), wrong: num(w.wrong), correct: num(w.correct), due: num(w.due), last: num(w.last) };
  }
  out.words = words;

  const t = rec(p.totals);
  out.totals = { english: num(t.english), reviewed: num(t.reviewed), math: num(t.math), chinese: num(t.chinese), focus: num(t.focus) };

  const normQ = (src: unknown): Record<string, QRec> => {
    const o: Record<string, QRec> = {};
    for (const [k, v] of Object.entries(rec(src))) {
      if (k.startsWith('arcade:') || true) {
        const q = rec(v);
        o[k] = { attempts: num(q.attempts), correct: num(q.correct), last: num(q.last), lastCorrect: Boolean(q.lastCorrect) };
      }
    }
    return o;
  };
  out.englishQuestions = normQ(p.englishQuestions);
  out.mathQuestions = normQ(p.mathQuestions);
  out.chineseQuestions = normQ(p.chineseQuestions);
  out.history = rec(p.history);

  // 今日计数：跨天则归档
  const storedToday = rec(p.today);
  const td: Today = { ...defaultToday(typeof storedToday.date === 'string' ? storedToday.date : todayKey()), ...storedToday } as Today;
  for (const f of ['english', 'attempts', 'reviewed', 'math', 'chinese', 'focus', 'boss', 'ticketMilestones'] as const) td[f] = num(td[f]);
  if (td.date !== todayKey()) {
    if (td.date) out.history[td.date] = { ...td };
    out.today = defaultToday();
  } else {
    out.today = td;
  }

  out.arcadeV1 = normalizeArcade(p.arcadeV1);
  return out;
}

export function awardBadges(arcade: Arcade): void {
  const earned = new Set(arcade.badges);
  if ((arcade.modes.listen?.correct || 0) >= 10) earned.add('闻声识义');
  if ((arcade.modes.dictation?.correct || 0) >= 10) earned.add('十词听写');
  if ((arcade.modes.sentence?.correct || 0) >= 8) earned.add('句阵初成');
  if ((arcade.modes.math?.correct || 0) >= 20) earned.add('算学百变');
  if ((arcade.modes.chinese?.correct || 0) >= 20) earned.add('经史通关');
  if (arcade.bestCombo >= 10) earned.add('十连不坠');
  if (arcade.bestEndless >= 30) earned.add('百连三十关');
  arcade.badges = [...earned];
}

export function skillKeyFor(q: Question): string {
  if (q.subject === 'math') return `math:${(q as any).topic || '综合'}`;
  if (q.subject === 'chinese') return `chinese:${q.skill || (q as any).category || q.kind || '综合'}`;
  return `english:${q.skill || q.kind || '综合'}`;
}

function touchStreak(s: ProgressState): void {
  const today = todayKey();
  if (s.lastStudyDay === today) return;
  const prev = new Date(); prev.setDate(prev.getDate() - 1);
  const prevKey = todayKey(prev);
  s.streak = s.lastStudyDay === prevKey ? s.streak + 1 : 1;
  s.lastStudyDay = today;
}

// 作答落账，逻辑对齐 V9 recordAnswer；combo 为当前连击数（由答题会话维护）。
export function applyAnswer(prev: ProgressState, q: Question, correct: boolean, mode: string, combo: number): { state: ProgressState; points: number; skillKey: string } {
  const s: ProgressState = structuredClone(prev);
  const arcade = s.arcadeV1;
  touchStreak(s);
  arcade.attempts += 1;
  arcade.correct += Number(correct);
  arcade.bestCombo = Math.max(arcade.bestCombo, combo);

  const m = arcade.modes[mode] || { attempts: 0, correct: 0, best: 0 };
  arcade.modes[mode] = { attempts: m.attempts + 1, correct: m.correct + Number(correct), best: Math.max(m.best, combo) };

  s.today.attempts += 1;
  const points = correct ? 10 + Math.min(combo, 8) : 2;
  s.xp += points;
  if (correct && arcade.correct % 5 === 0) s.mutuality += 1;

  // 题目维度记录
  const records = q.subject === 'math' ? s.mathQuestions : q.subject === 'chinese' ? s.chineseQuestions : s.englishQuestions;
  const rk = `arcade:${q.id}`;
  const pr = records[rk] || { attempts: 0, correct: 0, last: 0, lastCorrect: false };
  records[rk] = { attempts: pr.attempts + 1, correct: pr.correct + Number(correct), last: Date.now(), lastCorrect: correct };

  // 技能维度
  const skillKey = skillKeyFor(q);
  const ps = arcade.skills[skillKey] || { attempts: 0, correct: 0, correctStreak: 0, wrongStreak: 0, last: 0, due: 0 };
  const correctStreak = correct ? ps.correctStreak + 1 : 0;
  arcade.skills[skillKey] = {
    attempts: ps.attempts + 1, correct: ps.correct + Number(correct),
    correctStreak, wrongStreak: correct ? 0 : ps.wrongStreak + 1, last: Date.now(),
    due: correct ? Date.now() + [DAY_MS, 3 * DAY_MS, 7 * DAY_MS, 14 * DAY_MS][Math.min(3, Math.max(0, correctStreak - 1))]
      : Date.now() + 10 * 60 * 1000,
  };
  arcade.recent.push({ id: q.id, skill: skillKey, subject: q.subject, correct, at: Date.now() });
  arcade.recent = arcade.recent.slice(-80);

  if (q.subject === 'english') {
    s.today.english += Number(correct); s.totals.english += Number(correct);
    if (q.wordId) {
      const w = s.words[String(q.wordId)] || { mastery: 0, wrong: 0, correct: 0, due: 0, last: 0 };
      w.last = Date.now();
      if (correct) {
        w.correct += 1; w.mastery = Math.min(5, w.mastery + 1);
        w.due = Date.now() + [0, DAY_MS, 3 * DAY_MS, 7 * DAY_MS, 14 * DAY_MS, 30 * DAY_MS][w.mastery];
        const milestone = Math.floor(s.today.english / 10);
        if (milestone > s.today.ticketMilestones) {
          s.gameMinutes += (milestone - s.today.ticketMilestones) * 10;
          s.today.ticketMilestones = milestone;
        }
      } else {
        w.wrong += 1; w.mastery = Math.max(0, w.mastery - 1); w.due = Date.now() + 10 * 60 * 1000;
      }
      s.words[String(q.wordId)] = w;
    }
  } else if (q.subject === 'math') { s.today.math += Number(correct); s.totals.math += Number(correct); }
  else { s.today.chinese += Number(correct); s.totals.chinese += Number(correct); }

  if (correct) { if (mode === 'mistakes') delete arcade.mistakes[q.id]; }
  else {
    const prevM = arcade.mistakes[q.id];
    arcade.mistakes[q.id] = { question: { ...q }, wrongAt: Date.now(), attempts: (prevM?.attempts || 0) + 1 };
  }
  awardBadges(arcade);
  return { state: s, points, skillKey };
}

export function subjectStats(s: ProgressState, subject: Subject): { attempts: number; correct: number; rate: number } {
  const qRecords = subject === 'math' ? s.mathQuestions : subject === 'chinese' ? s.chineseQuestions : s.englishQuestions;
  let attempts = 0, correct = 0;
  for (const [, v] of Object.entries(qRecords)) { attempts += v.attempts; correct += v.correct; }
  for (const [key, v] of Object.entries(s.arcadeV1.skills)) {
    if (!key.startsWith(`${subject}:`)) continue;
    attempts += v.attempts; correct += v.correct;
  }
  return { attempts, correct, rate: attempts ? correct / attempts : 0.58 };
}

export function dueWordCount(s: ProgressState, totalWords = 822, now = Date.now()): number {
  let due = 0;
  for (const w of Object.values(s.words)) if (!w.due || w.due <= now) due++;
  // 从未学过的新词同样待学
  return due + Math.max(0, totalWords - Object.keys(s.words).length);
}
