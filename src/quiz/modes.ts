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



// 填空专项（考纲第二大题）
export const DICTATION_MODE: ModeMeta = { id: 'gushi', seal: '默', title: '古诗文默写', note: '高频名篇名句 · 逐字写对', count: 10, tone: 'rose', subject: 'chinese' };
export const FILL_MODE: ModeMeta = { id: 'math-fill', seal: '空', title: '数学填空专项', note: '方程·三角·数列·几何 仿真填空', count: 10, tone: 'gold', subject: 'math' };

// 数学考点专项（程序化出题，按 topic 过滤）
export interface MathTopicGroup { id: string; title: string; seal: string; topics: string[] }
export const MATH_TOPIC_GROUPS: MathTopicGroup[] = [
  { id: 'mt-trig', title: '三角函数专项', seal: '角', topics: ['特殊角三角函数', '同角三角函数关系', '三角函数周期', '解三角形'] },
  { id: 'mt-solid', title: '立体几何专项', seal: '体', topics: ['圆柱体积', '球的体积', '球的表面积', '圆锥体积', '平面几何'] },
  { id: 'mt-func', title: '函数与不等式', seal: '函', topics: ['函数定义域', '二次函数顶点', '一次函数', '不等式', '指数运算', '对数运算', '增长率', '百分数'] },
  { id: 'mt-seq', title: '数列专项', seal: '列', topics: ['等差数列', '数列求和', '等比数列通项', '等比数列求和'] },
  { id: 'mt-vec', title: '向量与解析几何', seal: '向', topics: ['向量长度', '向量数量积', '向量加法', '坐标中点', '直线斜率', '圆的标准方程'] },
  { id: 'mt-set', title: '集合·复数·统计概率', seal: '合', topics: ['集合运算', '充要条件', '复数加法', '虚数单位的幂', '平均数', '极差', '古典概率', '排列组合'] },
];

export const MATH_TOPIC_MODES: ModeMeta[] = [FILL_MODE, DICTATION_MODE, ...MATH_TOPIC_GROUPS.map((g) => ({
  id: g.id, seal: g.seal, title: g.title, note: '按考纲考点无限仿真出题', count: 10, tone: 'gold', subject: 'math',
}))];

export const ALL_MODES = [...MODES, ...PRESET_MODES, ...MATH_TOPIC_MODES];
export const FULL_MODE_MAP: Record<string, ModeMeta> = Object.fromEntries(ALL_MODES.map((m) => [m.id, m]));
