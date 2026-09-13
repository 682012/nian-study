import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Question } from '../quiz/types';
import {
  ProgressState, V2_KEY, V10_KEY, defaultState, migrateFromV2, applyAnswer,
} from '../lib/progress';

// 启动引导：优先 V10 档；没有则从 V2 一次性导入（V2 原档保留，作为回滚保险）。
function bootstrap(): ProgressState {
  if (typeof localStorage === 'undefined') return defaultState();
  try {
    const raw10 = localStorage.getItem(V10_KEY);
    if (raw10) {
      const parsed = JSON.parse(raw10);
      // persist 包裹 {state:{...},version}
      const state = parsed?.state?.data ?? parsed?.state ?? parsed;
      return migrateFromV2({ ...state, version: 10 });
    }
    const raw2 = localStorage.getItem(V2_KEY);
    if (raw2) {
      const migrated = migrateFromV2(JSON.parse(raw2));
      return migrated;
    }
  } catch {
    // 损坏存档不应白屏：落回全新档
  }
  return defaultState();
}

interface Actions {
  answer: (q: Question, correct: boolean, mode: string, combo: number) => number;
  recordRun: (mode: string, score: number) => void;
  replaceAll: (s: ProgressState) => void;
  resetAll: () => void;
}

export const useProgress = create<ProgressState & Actions>()(
  persist(
    (set, get) => ({
      ...bootstrap(),
      answer: (q, correct, mode, combo) => {
        const { answer: _a, recordRun: _r, replaceAll: _p, resetAll: _z, ...data } = get();
        const { state, points } = applyAnswer(data, q, correct, mode, combo);
        set(state);
        return points;
      },
      recordRun: (mode, score) => set((s) => {
        const arcade = structuredClone(s.arcadeV1);
        arcade.runs += 1;
        if (mode === 'endless') arcade.bestEndless = Math.max(arcade.bestEndless, score);
        return { arcadeV1: arcade };
      }),
      replaceAll: (next) => set({ ...next }),
      resetAll: () => set(defaultState()),
    }),
    {
      name: V10_KEY,
      // 只持久化数据，不持久化 action
      partialize: ({ answer, recordRun, replaceAll, resetAll, ...data }) => data as ProgressState,
    },
  ),
);
