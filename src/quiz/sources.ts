import wordsJson from '../content/words-822.json';
import englishJson from '../content/english-questions.json';
import mathPresetJson from '../content/math-questions.json';
import chineseJson from '../content/chinese-questions.json';
import appreciateJson from '../content/appreciate-questions.json';
import sentencesJson from '../content/sentences.json';
import listeningJson from '../content/listening.json';
import readingsJson from '../content/readings.json';
import type {
  Word, EnglishPreset, MathPreset, ChineseQ, AppreciateQ, SentenceQ, ListeningQ, ReadingQ,
} from './types';

export const WORDS = wordsJson as Word[];
export const ENGLISH_PRESET = englishJson as EnglishPreset[];
export const MATH_PRESET = mathPresetJson as MathPreset[];
export const CHINESE_BANK = chineseJson as ChineseQ[];
export const APPRECIATE_BANK = appreciateJson as AppreciateQ[];
export const SENTENCES = sentencesJson as SentenceQ[];
export const LISTENING_BANK = listeningJson as ListeningQ[];
export const READING_BANK = readingsJson as ReadingQ[];
import dictationJson from '../content/dictation.json';
export interface DictationQ { id: string; prompt: string; accepts: string[]; source: string }
export const DICTATION_BANK = dictationJson as DictationQ[];
