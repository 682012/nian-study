// 12 种练习模式（与 V9 一致）
export interface ModeMeta { id: string; seal: string; title: string; note: string; count: number; tone: string; subject?: string }

export const MODES: ModeMeta[] = [
  { id: 'adaptive', seal: '安', title: '念安私塾', note: '按你最近的薄处，临场配一卷', count: 12, tone: 'jade' },
  { id: 'listen', seal: '听', title: '听音辨词', note: '只给发音，四选一辨义', count: 12, tone: 'jade', subject: 'english' },
  { id: 'listening', seal: '闻', title: '听句寻意', note: '句子、通知与短对话听后取意', count: 10, tone: 'blue', subject: 'english' },
  { id: 'dictation', seal: '写', title: '听写巡夜', note: '听见什么，就完整写出来', count: 10, tone: 'blue', subject: 'english' },
  { id: 'sentence', seal: '句', title: '句阵重排', note: '点词成句，练语序与语感', count: 8, tone: 'peach', subject: 'english' },
  { id: 'math', seal: '算', title: '算学千变', note: '代数、几何与统计，反复练变式', count: 12, tone: 'gold', subject: 'math' },
  { id: 'chinese', seal: '文', title: '经史百问', note: '诗文、成语、语用与阅读策略', count: 12, tone: 'rose', subject: 'chinese' },
  { id: 'reading', seal: '阅', title: '短章取证', note: '读真实短文，回到原文找证据', count: 8, tone: 'rose', subject: 'chinese' },
  { id: 'mixed', seal: '巡', title: '三馆巡考', note: '英语、数学、语文混合十五题', count: 15, tone: 'ink' },
  { id: 'daily', seal: '日', title: '念安今日卷', note: '按近期薄弱点生成的固定二十题', count: 20, tone: 'sun' },
  { id: 'endless', seal: '百', title: '百连闯关', note: '三颗心，看看能走多远', count: 100, tone: 'night' },
  { id: 'mistakes', seal: '追', title: '错题追击', note: '只追本馆里真正答错的题', count: 12, tone: 'ember' },
];

// 精编题卷：题库来自人工精编（七步讲解/采分点），非程序化生成
export const PRESET_MODES: ModeMeta[] = [
  { id: 'english-preset', seal: '译', title: '英语七步卷', note: '语法完形对话阅读 · 每题七步讲透', count: 10, tone: 'jade', subject: 'english' },
  { id: 'math-preset', seal: '算', title: '数学七步卷', note: '20 道精编变式 · 概念搭桥到举一反三', count: 8, tone: 'gold', subject: 'math' },
  { id: 'appreciate', seal: '赏', title: '赏析采分卷', note: '炼字手法与主旨 · 按采分点作答', count: 8, tone: 'rose', subject: 'chinese' },
  { id: 'exam', seal: '试', title: '明试堂', note: '三科精编混合八题，交卷后逐题复盘', count: 8, tone: 'night' },
];

export const MODE_MAP: Record<string, ModeMeta> = Object.fromEntries(MODES.map((m) => [m.id, m]));

export const ALL_MODES = [...MODES, ...PRESET_MODES];
export const FULL_MODE_MAP: Record<string, ModeMeta> = Object.fromEntries(ALL_MODES.map((m) => [m.id, m]));
