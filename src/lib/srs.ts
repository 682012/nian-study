// FSRS v5 调度封装：单词卡与错题卡共用一套排期，替代 V9 的 +1/+3/+7 固定间隔。
import { fsrs, createEmptyCard, Rating, type Card } from 'ts-fsrs';

export type { Card };
export const wordCardId = (wordId: number) => `word:${wordId}`;
export const questionCardId = (questionId: string) => `q:${questionId}`;

export type CardMap = Record<string, Card>;

const scheduler = fsrs();

export function newCard(now: Date = new Date()): Card {
  return createEmptyCard(now);
}

// 对一张卡评分（1 Again / 2 Hard / 3 Good / 4 Easy），返回新卡。
export function rateCard(card: Card | undefined, rating: Rating, now: Date = new Date()): Card {
  return scheduler.next(card ?? createEmptyCard(now), now, rating as 1 | 2 | 3 | 4).card;
}

// 对错二分：错=Again，对=Good。
export const ratingFromCorrect = (correct: boolean): Rating => (correct ? Rating.Good : Rating.Again);

export function isDue(card: Card | undefined, now: Date = new Date()): boolean {
  if (!card) return true; // 没记录 = 新卡，待学
  return new Date(card.due).getTime() <= now.getTime();
}

// 错题卡是否“这一轮已过关”：进入 Review 且未到期，就不再出现在待理队列。
export function isMistakeCleared(card: Card | undefined, now: Date = new Date()): boolean {
  if (!card) return false;
  return card.state === 2 && new Date(card.due).getTime() > now.getTime();
}

export function dueCount(cards: CardMap, now: Date = new Date()): number {
  let n = 0;
  for (const card of Object.values(cards)) if (isDue(card, now)) n++;
  return n;
}

// 把 V9 旧单词记录（mastery 0-5 / due / correct / wrong）转成 FSRS 卡。
export function migrateWordCard(old: { mastery: number; wrong: number; correct: number; due: number; last: number }, now: Date = new Date()): Card {
  const card = createEmptyCard(old.last ? new Date(old.last) : now);
  card.reps = Math.max(0, old.correct + old.wrong);
  card.lapses = Math.max(0, old.wrong);
  if (old.due > 0) card.due = new Date(old.due).toISOString() as unknown as Date;
  if (old.mastery >= 2) {
    // 旧 mastery 2..5 粗略映射到已进入 Review 的稳定性
    card.state = 2;
    card.stability = [0, 0, 2, 4, 8, 16][Math.min(5, old.mastery)];
    card.difficulty = 5;
    const last = old.last || now.getTime();
    card.scheduled_days = Math.max(0, Math.round((old.due - last) / 86_400_000));
    card.elapsed_days = card.scheduled_days;
  } else if (old.correct > 0) {
    card.state = 1; // Learning
  }
  return card;
}
