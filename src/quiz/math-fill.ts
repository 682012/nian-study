// 数学填空题（对应考纲第二大题，每题 5 分）。原创仿真，答案给出多个等价形式。
import type { Rng } from './rng';
import { pick } from './rng';
import type { Question } from './types';

interface Fill { topic: string; prompt: string; accepts: string[]; explain: string }

const FILL_BUILDERS: Array<(rng: Rng) => Fill> = [
  (rng) => { const a = 2 + Math.floor(rng() * 4), x = 2 + Math.floor(rng() * 5), b = a * x + 1 + Math.floor(rng() * 5);
    return { topic: '一元一次方程', prompt: `方程 ${a}x + ${b - a * x} = ${b} 的解 x = ____。`, accepts: [String(x)], explain: `移项得 ${a}x=${b - (b - a * x)}，x=${x}。` }; },
  (rng) => { const x = pick([2, 3, 4] as const, rng), c = x * x;
    return { topic: '一元二次方程', prompt: `方程 x² = ${c} 的正数解是 x = ____。`, accepts: [String(x)], explain: `开平方 x=±${x}，正数解为 ${x}。` }; },
  (rng) => { const n = pick([30, 45, 60, 90] as const, rng);
    const table: Record<number, string> = { 30: '1/2', 45: '√2/2', 60: '√3/2', 90: '1' };
    return { topic: '特殊角三角函数', prompt: `sin ${n}° = ____。`, accepts: [table[n]], explain: `特殊角值 sin ${n}°=${table[n]}。` }; },
  (rng) => { const a1 = pick([2, 3] as const, rng), d = pick([2, 3, 4] as const, rng), n = 5;
    const v = a1 + (n - 1) * d; return { topic: '等差数列通项', prompt: `等差数列 a₁=${a1}，公差 d=${d}，则 a₅ = ____。`, accepts: [String(v)], explain: `a₅=a₁+4d=${a1}+4×${d}=${v}。` }; },
  (rng) => { const a1 = 1, q = 2, n = pick([3, 4] as const, rng); const v = q ** n - 1;
    return { topic: '等比数列求和', prompt: `等比数列 1,2,4,8,… 的前 ${n} 项和 S${n} = ____。`, accepts: [String(v)], explain: `S${n}=2^${n}-1=${v}。` }; },
  (rng) => { const x = pick([1, 2, 3] as const, rng), y = pick([2, 3, 4] as const, rng);
    return { topic: '向量数量积', prompt: `a=(${x},0)，b=(0,${y}) 互相垂直，则 a·b = ____。`, accepts: ['0'], explain: `垂直向量数量积为 0（坐标相乘也是 ${x}×0+0×${y}=0）。` }; },
  (rng) => { const r = pick([2, 3] as const, rng); const v = (4 / 3) * r ** 3;
    return { topic: '球的体积', prompt: `半径为 ${r} 的球，体积 V = ____π。（填系数）`, accepts: [String(v)], explain: `V=(4/3)πR³=(4/3)×${r}³π=${v}π。` }; },
  (rng) => { const data = [2, 4, 6, 8]; return { topic: '平均数', prompt: `数据 ${data.join('，')} 的平均数是 ____。`, accepts: ['5'], explain: `(2+4+6+8)/4=5。` }; },
  (rng) => { const a = pick([3, 5] as const, rng), b = pick([4, 12] as const, rng); const c = Math.sqrt(a * a + b * b);
    return { topic: '勾股定理', prompt: `直角三角形两直角边为 ${a}、${b}，斜边为 ____。`, accepts: [String(c)], explain: `c=√(${a}²+${b}²)=${c}。` }; },
  (rng) => { const n = pick([2, 3, 4] as const, rng); const map: Record<number, string> = { 2: '-1', 3: '-i', 4: '1' };
    return { topic: '虚数单位的幂', prompt: `i^${n} = ____。`, accepts: [map[n]], explain: `i²=-1，i³=-i，i⁴=1。` }; },
  (rng) => { const k = pick([2, 3] as const, rng); return { topic: '函数定义域', prompt: `函数 f(x)=1/(x-${k}) 的定义域中，x 不能等于 ____。`, accepts: [String(k)], explain: `分母 x-${k}≠0，故 x≠${k}。` }; },
  (rng) => { const b = pick([2, 3] as const, rng); return { topic: '对数运算', prompt: `log${b} ${b ** 2} = ____。`, accepts: ['2'], explain: `${b}²=${b ** 2}，所以 log${b} ${b ** 2}=2。` }; },
];

export function mathFillQuestion(rng: Rng = Math.random): Question {
  const f = pick(FILL_BUILDERS, rng)(rng);
  return {
    id: `math-fill-${f.topic}-${Math.floor(rng() * 1e8)}`,
    subject: 'math', kind: 'math-fill', type: 'blank',
    eyebrow: `填空 · ${f.topic}`, prompt: f.prompt, answer: f.accepts,
    explanation: f.explain,
  };
}

import { seeded } from './rng';
export const FILL_TOPICS = Array.from(new Set(FILL_BUILDERS.map((fn) => fn(seeded('filltopics')).topic)));
