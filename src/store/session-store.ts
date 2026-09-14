import { create } from 'zustand';
import type { Question } from '../quiz/types';
import {
  questionForType, adaptiveCycle, buildDailyPaper, checkAnswer, todayKey,
  type GeneratorType, type EngineContext, type SubjectStat,
} from '../quiz/engine';
import { FULL_MODE_MAP, MATH_TOPIC_GROUPS } from '../quiz/modes';
import type { Rng } from '../quiz/rng';
import { useProgress } from './progress-store';
import { subjectStats, dueWordIds, pendingMistakeIds } from '../lib/progress';
import { wordCardId, type Card } from '../lib/srs';

type Status = 'idle' | 'running' | 'finished';
interface LastResult { correct: boolean; points: number; response: number | string | string[] }

interface SessionState {
  status: Status;
  mode: string | null;
  queue: Question[];
  index: number;
  score: number;
  combo: number;
  bestCombo: number;
  lives: number;
  empty: boolean;
  result: LastResult | null;
  start: (mode: string) => void;
  respond: (response: number | string | string[]) => void;
  next: () => void;
  quit: () => void;
}

function statsRecord(): Record<'english' | 'math' | 'chinese', SubjectStat> {
  const p = useProgress.getState();
  return { english: subjectStats(p, 'english'), math: subjectStats(p, 'math'), chinese: subjectStats(p, 'chinese') };
}

function engineCtx(extra: Partial<EngineContext> = {}): EngineContext {
  const p = useProgress.getState();
  return {
    getWordCard: (id) => p.srsCards[wordCardId(id)] as Card | undefined,
    dueWordIds: dueWordIds(p),
    pendingMistakes: pendingMistakeIds(p).map((id) => p.arcadeV1.mistakes[id].question),
    ...extra,
  };
}

function buildQueue(mode: string): Question[] | null {
  const p = useProgress.getState();
  const meta = FULL_MODE_MAP[mode];
  if (!meta) return null;

  if (mode === 'exam') {
    const cycle: GeneratorType[] = ['english-preset', 'math-preset', 'appreciate'];
    return Array.from({ length: meta.count }, (_, i) => questionForType(cycle[i % cycle.length], engineCtx(), Math.random));
  }

  if (mode === 'mistakes') {
    const items = pendingMistakeIds(p)
      .map((id) => p.arcadeV1.mistakes[id])
      .sort((a, b) => b.wrongAt - a.wrongAt).slice(0, meta.count).map((m) => m.question);
    return items.length ? items : null;
  }

  if (mode === 'daily') {
    const dq = p.arcadeV1.dailyQueue;
    if (dq?.date === todayKey() && dq.questions.length === meta.count) return dq.questions;
    const qs = buildDailyPaper(todayKey(), statsRecord(), engineCtx());
    useProgress.setState((s) => ({ arcadeV1: { ...s.arcadeV1, dailyQueue: { date: todayKey(), questions: qs } } }));
    return qs;
  }

  if (mode === 'adaptive') {
    const cycle = adaptiveCycle(statsRecord());
    return Array.from({ length: meta.count }, (_, i) => questionForType(cycle[i % cycle.length], engineCtx(), Math.random));
  }
  if (mode === 'mixed' || mode === 'endless') {
    const cycle: GeneratorType[] = ['listen', 'math', 'reading', 'meaning', 'math', 'chinese', 'listening', 'sentence', 'dictation'];
    return Array.from({ length: meta.count }, (_, i) => questionForType(cycle[i % cycle.length], engineCtx(), Math.random));
  }
  return Array.from({ length: meta.count }, () => questionForType(mode as GeneratorType, engineCtx(), Math.random));
}

export const useSession = create<SessionState>()((set, get) => ({
  status: 'idle', mode: null, queue: [], index: 0, score: 0, combo: 0, bestCombo: 0, lives: 0, empty: false, result: null,

  start: (mode) => {
    const queue = buildQueue(mode);
    if (!queue) { set({ status: 'idle', empty: true }); return; }
    set({ status: 'running', mode, queue, index: 0, score: 0, combo: 0, bestCombo: 0, lives: mode === 'endless' ? 3 : 0, empty: false, result: null });
  },

  respond: (response) => {
    const s = get();
    if (s.status !== 'running' || s.result) return;
    const q = s.queue[s.index];
    const correct = checkAnswer(q, response);
    const points = useProgress.getState().answer(q, correct, s.mode!, s.combo);
    const combo = correct ? s.combo + 1 : 0;
    const lives = s.lives > 0 && !correct ? s.lives - 1 : s.lives;
    set({ result: { correct, points, response }, score: s.score + Number(correct), combo, bestCombo: Math.max(s.bestCombo, combo), lives });
  },

  next: () => {
    const s = get();
    const outOfLives = s.mode === 'endless' && s.lives <= 0;
    if (s.index + 1 >= s.queue.length || outOfLives) {
      useProgress.getState().recordRun(s.mode!, s.score);
      if (s.mode === 'daily') {
        useProgress.setState((p) => ({
          arcadeV1: { ...p.arcadeV1, daily: { ...p.arcadeV1.daily, [todayKey()]: { score: s.score, total: s.index + 1, finishedAt: Date.now() } } },
        }));
      }
      set({ status: 'finished' });
      return;
    }
    set({ index: s.index + 1, result: null });
  },

  quit: () => set({ status: 'idle', mode: null, queue: [], index: 0, result: null, empty: false }),
}));
