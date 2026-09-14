// V10 统一题目模型。所有题库与程序化出题器都产出这一结构，答题 UI 只认它。
export type Subject = 'english' | 'math' | 'chinese';
export type QuestionType = 'choice' | 'input' | 'tokens' | 'blank';

export interface RubricPoint {
  point: string;
  score: number;
  keywords: string[];
}

export interface Question {
  id: string;
  subject: Subject;
  kind: string;
  type: QuestionType;
  eyebrow: string;
  prompt: string;
  subprompt?: string;
  passage?: string;
  speech?: string;          // 交给语音控制器朗读（英文词/听力原文）
  phonetic?: string;
  hint?: string;
  choices?: string[];       // type=choice
  answer: number | string | string[];  // choice: 下标；input: 归一化文本；blank: 等价答案数组
  tokens?: { label: string; index: number }[]; // type=tokens 被打乱的词块
  expected?: string;        // tokens/input 的归一化答案
  svg?: string;
  explanation: string;
  skill?: string;
  rubric?: RubricPoint[] | null;
  wordId?: number;
  // 精编题七步讲解
  notes?: {
    knowledge?: string; strategy?: string; explanation?: string;
    pitfall?: string; notebook?: string;
    plain?: string; concept?: string; bridge?: string;
    steps?: string[]; transfer?: string;
    locate?: string; scoring?: string[];
  };
}

export interface Word { id: number; word: string; phonetic: string; meaning: string; }
export interface EnglishPreset {
  id: string; category: string; level: string; title: string;
  context: string; prompt: string; options: string[]; answer: number;
  knowledge: string; strategy: string; explanation: string; pitfall: string; notebook: string;
}
export interface MathPreset {
  id: string; topic: string; level: string; title: string; prompt: string;
  options: string[]; answer: number; plain: string; concept: string; bridge: string;
  steps: string[]; pitfall: string; transfer: string; notebook: string;
}
export interface ChineseQ {
  id: string; category: string; prompt: string; choices: string[]; answer: number; explanation: string;
}
export interface AppreciateQ {
  id: string; type: string; title: string; passage: string; source: string;
  question: string; options: string[]; answer: number;
  locate: string; scoring: string[]; explanation: string; pitfall: string; notebook: string;
}
export interface SentenceQ { id: string; sentence: string; meaning: string; rule: string; }
export interface ListeningQ {
  id: string; speech: string; prompt: string; choices: string[];
  answer: number; explanation: string; skill: string;
}
export interface ReadingQ {
  id: string; passage: string; prompt: string; choices: string[];
  answer: number; explanation: string; skill: string; rubric: RubricPoint[] | null;
}
