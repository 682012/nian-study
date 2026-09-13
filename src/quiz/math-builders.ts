// 移植自 V9 nian-arcade-v3.js 的 19 个程序化数学出题器，逻辑逐字保留（旧版已验证选项唯一）。
import type { Rng } from './rng';
import { pick, shuffle } from './rng';

interface Built {
  topic: string;
  prompt: string;
  choices: string[];
  answer: number;
  explanation: string;
  svg?: string;
}

function numberChoices(answer: number, spread = 3, rng: Rng): { choices: string[]; answer: number } {
  const values = new Set<number>([answer]);
  let step = 1;
  while (values.size < 4) {
    const sign = values.size % 2 ? 1 : -1;
    values.add(answer + sign * step * spread);
    step += 1;
  }
  return makeChoices(String(answer), [...values].map(String), rng);
}

function makeChoices(answer: string, candidates: string[], rng: Rng): { choices: string[]; answer: number } {
  const alternatives = shuffle([...new Set(candidates.filter((item) => item !== answer))], rng).slice(0, 3);
  const choices = shuffle([answer, ...alternatives], rng);
  return { choices, answer: choices.indexOf(answer) };
}

function sup(value: number): string {
  const digits: Record<number, string> = { 0: '⁰', 1: '¹', 2: '²', 3: '³', 4: '⁴', 5: '⁵', 6: '⁶', 7: '⁷', 8: '⁸', 9: '⁹' };
  return String(value).split('').map((d) => digits[Number(d)] || d).join('');
}

export const MATH_BUILDERS: Array<(rng: Rng) => Built> = [
  (rng) => {
    const x = 2 + Math.floor(rng() * 9), a = 2 + Math.floor(rng() * 7), b = 1 + Math.floor(rng() * 12);
    const c = a * x + b, options = numberChoices(x, 1, rng);
    return { topic: '一元一次方程', prompt: `解方程：${a}x + ${b} = ${c}`, ...options, explanation: `移项得 ${a}x=${c - b}，所以 x=${x}。` };
  },
  (rng) => {
    const a1 = 1 + Math.floor(rng() * 8), d = 2 + Math.floor(rng() * 7), n = 5 + Math.floor(rng() * 8);
    const answer = a1 + (n - 1) * d, options = numberChoices(answer, d, rng);
    return { topic: '等差数列', prompt: `等差数列首项为 ${a1}，公差为 ${d}，第 ${n} 项是？`, ...options, explanation: `aₙ=a₁+(n-1)d=${a1}+${n - 1}×${d}=${answer}。` };
  },
  (rng) => {
    const red = 2 + Math.floor(rng() * 7), blue = 2 + Math.floor(rng() * 7), total = red + blue;
    const answer = `${red}/${total}`;
    const choices = shuffle([red, red - 1, red + 1, 0].map((n) => `${n}/${total}`), rng);
    return { topic: '古典概率', prompt: `袋中有 ${red} 个红球和 ${blue} 个蓝球，随机取 1 个，取到红球的概率是？`, choices, answer: choices.indexOf(answer), explanation: `等可能结果共 ${total} 个，红球有 ${red} 个，概率为 ${answer}。` };
  },
  (rng) => {
    const price = (5 + Math.floor(rng() * 16)) * 10, discount = pick([8, 9, 75] as const, rng);
    const rate = discount === 75 ? 0.75 : discount / 10, answer = price * rate;
    const options = numberChoices(answer, 10, rng);
    return { topic: '百分数', prompt: `一件商品原价 ${price} 元，打${discount === 75 ? '七五' : discount}折后售价多少元？`, ...options, explanation: `${price}×${rate}=${answer}（元）。` };
  },
  (rng) => {
    const k = 1 + Math.floor(rng() * 6), b = Math.floor(rng() * 8), x = 2 + Math.floor(rng() * 7);
    const answer = k * x + b, options = numberChoices(answer, k, rng);
    return { topic: '一次函数', prompt: `函数 y=${k}x+${b}，当 x=${x} 时，y 等于？`, svg: mathSvg('linear', { k, b }), ...options, explanation: `代入 x=${x}：y=${k}×${x}+${b}=${answer}。` };
  },
  (rng) => {
    const length = 4 + Math.floor(rng() * 10), width = 3 + Math.floor(rng() * 8);
    const answer = 2 * (length + width), options = numberChoices(answer, 2, rng);
    return { topic: '平面几何', prompt: `长方形长 ${length}、宽 ${width}，周长是？`, svg: mathSvg('rect', { l: length, w: width }), ...options, explanation: `周长=2×(长+宽)=2×(${length}+${width})=${answer}。` };
  },
  (rng) => {
    const base = pick([2, 3, 5] as const, rng), m = 2 + Math.floor(rng() * 4), n = 1 + Math.floor(rng() * 3);
    const answer = base ** (m + n), options = numberChoices(answer, base ** Math.max(1, m + n - 2), rng);
    return { topic: '指数运算', prompt: `${base}${sup(m)} × ${base}${sup(n)} = ?`, ...options, explanation: `同底数幂相乘，指数相加：${base}${sup(m + n)}=${answer}。` };
  },
  (rng) => {
    const a = 1 + Math.floor(rng() * 8);
    const correct = `x > ${a}`;
    const choices = shuffle([correct, `x < ${a}`, `x ≥ ${a}`, `x ≤ ${a}`], rng);
    return { topic: '不等式', prompt: `下列哪一项表示“x 比 ${a} 大”？`, choices, answer: choices.indexOf(correct), explanation: `“比 ${a} 大”不包含 ${a}，写作 x>${a}。` };
  },
  (rng) => {
    const a = 1 + Math.floor(rng() * 5), b = 1 + Math.floor(rng() * 5);
    const answer = Math.sqrt(a * a + b * b).toFixed(2);
    const candidates = [answer, String(a + b), String(a * b), Math.abs(a - b).toFixed(2)];
    const choices = shuffle([...new Set(candidates)], rng);
    while (choices.length < 4) choices.push(String(Number(answer) + choices.length));
    return { topic: '向量长度', prompt: `向量 a=(${a}, ${b}) 的模约为？（保留两位小数）`, svg: mathSvg('vector', { a, b }), choices, answer: choices.indexOf(answer), explanation: `|a|=√(${a}²+${b}²)≈${answer}。` };
  },
  (rng) => {
    const total = 5 + Math.floor(rng() * 8);
    const answer = (total * (total - 1)) / 2, options = numberChoices(answer, total - 2, rng);
    return { topic: '排列组合', prompt: `从 ${total} 人中任选 2 人，有多少种选法？`, ...options, explanation: `组合数 C(${total},2)=${total}×${total - 1}÷2=${answer}。` };
  },
  (rng) => {
    const a = 1 + Math.floor(rng() * 5), b = a + 1 + Math.floor(rng() * 5);
    const correct = `x=${a} 或 x=${b}`;
    const choices = shuffle([correct, `x=${a + b}`, `x=${a * b}`, `x=${b - a}`], rng);
    return { topic: '二次方程', prompt: `解方程：(x-${a})(x-${b})=0`, svg: mathSvg('parabola', { a, b }), choices, answer: choices.indexOf(correct), explanation: `两个因式至少一个为 0，所以 x=${a} 或 x=${b}。` };
  },
  (rng) => {
    const a1 = 1 + Math.floor(rng() * 6), d = 1 + Math.floor(rng() * 5), n = 5 + Math.floor(rng() * 6);
    const last = a1 + (n - 1) * d, answer = (n * (a1 + last)) / 2;
    const options = numberChoices(answer, n, rng);
    return { topic: '数列求和', prompt: `等差数列首项 ${a1}、公差 ${d}，前 ${n} 项和为？`, ...options, explanation: `第 ${n} 项为 ${last}，Sₙ=${n}×(${a1}+${last})÷2=${answer}。` };
  },
  (rng) => {
    const base = (4 + Math.floor(rng() * 9)) * 10, rate = pick([10, 20, 25, 50] as const, rng);
    const answer = Number((base * (1 + rate / 100)).toFixed(2)), options = numberChoices(answer, 10, rng);
    return { topic: '增长率', prompt: `某数为 ${base}，增长 ${rate}% 后是多少？`, ...options, explanation: `${base}×(1+${rate}%)=${answer}。` };
  },
  (rng) => {
    const start = 2 + Math.floor(rng() * 7), values = [start, start + 2, start + 4, start + 6];
    const answer = start + 3, options = numberChoices(answer, 1, rng);
    return { topic: '平均数', prompt: `数据 ${values.join('、')} 的平均数是？`, ...options, explanation: `总和为 ${values.reduce((sum, v) => sum + v, 0)}，除以 4 得 ${answer}。` };
  },
  (rng) => {
    const x1 = Math.floor(rng() * 6), y1 = Math.floor(rng() * 6);
    const x2 = x1 + 2 * (1 + Math.floor(rng() * 4)), y2 = y1 + 2 * (1 + Math.floor(rng() * 4));
    const correct = `(${(x1 + x2) / 2}, ${(y1 + y2) / 2})`;
    const mx = (x1 + x2) / 2, my = (y1 + y2) / 2;
    const choices = shuffle([correct, `(${mx + 1}, ${my})`, `(${mx}, ${my + 1})`, `(${mx - 1}, ${my - 1})`], rng);
    return { topic: '坐标中点', prompt: `A(${x1}, ${y1})、B(${x2}, ${y2}) 的中点坐标是？`, svg: mathSvg('midpoint', { x1, y1, x2, y2 }), choices, answer: choices.indexOf(correct), explanation: `横、纵坐标分别取平均，得到 ${correct}。` };
  },
  (rng) => {
    const base = pick([2, 3, 5] as const, rng), exponent = 2 + Math.floor(rng() * 4), value = base ** exponent;
    const options = numberChoices(exponent, 1, rng);
    const subBase = String(base).replace(/\d/g, (n) => '₀₁₂₃₄₅₆₇₈₉'[Number(n)]);
    return { topic: '对数', prompt: `log${subBase} ${value} = ?`, ...options, explanation: `因为 ${base}${sup(exponent)}=${value}，所以 log${subBase} ${value}=${exponent}。` };
  },
  (rng) => {
    const x = 2 + Math.floor(rng() * 6), y = 1 + Math.floor(rng() * 5), sum = x + y, difference = x - y;
    const correct = `x=${x}, y=${y}`;
    const choices = shuffle([correct, `x=${x + 1}, y=${y}`, `x=${x}, y=${y + 1}`, `x=${x - 1}, y=${y - 1}`], rng);
    return { topic: '方程组', prompt: `已知 x+y=${sum}，x-y=${difference}，则？`, svg: mathSvg('lines', { x, y }), choices, answer: choices.indexOf(correct), explanation: `两式相加得 2x=${sum + difference}，所以 x=${x}，再得 y=${y}。` };
  },
  (rng) => {
    const values = shuffle([3, 5, 7, 9].map((step) => step + Math.floor(rng() * 4)), rng);
    const answer = Math.max(...values) - Math.min(...values), options = numberChoices(answer, 1, rng);
    return { topic: '极差', prompt: `数据 ${values.join('、')} 的极差是？`, ...options, explanation: `极差=最大值 ${Math.max(...values)}-最小值 ${Math.min(...values)}=${answer}。` };
  },
];

// 7 种数学示意图，随参数实时重绘。
function mathSvg(type: string, p: Record<string, number>): string {
  if (type === 'parabola') return `<svg viewBox="0 0 280 120" class="nian-math-svg" aria-hidden="true">
<line x1="20" y1="80" x2="260" y2="80" stroke="#7698ad" stroke-width="1.2" stroke-dasharray="3,3"/><line x1="140" y1="10" x2="140" y2="110" stroke="#7698ad" stroke-width="1.2" stroke-dasharray="3,3"/>
<path d="M 40,25 Q 140,115 240,25" fill="none" stroke="#255e58" stroke-width="2.5"/>
<circle cx="80" cy="80" r="4" fill="#c89443"/><text x="80" y="96" font-size="11" fill="#143739" text-anchor="middle">x₁=${p.a}</text>
<circle cx="200" cy="80" r="4" fill="#c89443"/><text x="200" y="96" font-size="11" fill="#143739" text-anchor="middle">x₂=${p.b}</text>
<text x="140" y="112" font-size="11" fill="#8f4f3c" text-anchor="middle">y=(x-${p.a})(x-${p.b})</text></svg>`;
  if (type === 'rect') return `<svg viewBox="0 0 280 110" class="nian-math-svg" aria-hidden="true">
<rect x="50" y="20" width="180" height="65" rx="5" fill="rgba(116,168,145,0.18)" stroke="#255e58" stroke-width="2"/>
<text x="140" y="15" font-size="11" fill="#143739" font-weight="bold" text-anchor="middle">长 = ${p.l}</text>
<text x="35" y="58" font-size="11" fill="#143739" font-weight="bold" text-anchor="middle">宽 = ${p.w}</text>
<text x="140" y="58" font-size="12" fill="#74a891" font-weight="bold" text-anchor="middle">周长=2×(${p.l}+${p.w})</text></svg>`;
  if (type === 'vector') return `<svg viewBox="0 0 280 120" class="nian-math-svg" aria-hidden="true">
<line x1="30" y1="95" x2="250" y2="95" stroke="#7698ad" stroke-width="1.2"/><line x1="50" y1="10" x2="50" y2="110" stroke="#7698ad" stroke-width="1.2"/>
<line x1="50" y1="95" x2="200" y2="35" stroke="#255e58" stroke-width="2.5" marker-end="url(#arrow)"/>
<line x1="50" y1="95" x2="200" y2="95" stroke="#c89443" stroke-dasharray="3,3" stroke-width="1.5"/>
<line x1="200" y1="95" x2="200" y2="35" stroke="#c89443" stroke-dasharray="3,3" stroke-width="1.5"/>
<text x="125" y="55" font-size="11" fill="#255e58" font-weight="bold">|a|=√(${p.a}²+${p.b}²)</text></svg>`;
  if (type === 'midpoint') return `<svg viewBox="0 0 280 110" class="nian-math-svg" aria-hidden="true">
<line x1="40" y1="80" x2="240" y2="25" stroke="#255e58" stroke-width="2"/>
<circle cx="40" cy="80" r="4" fill="#c89443"/><text x="40" y="98" font-size="10" fill="#143739" text-anchor="middle">A(${p.x1},${p.y1})</text>
<circle cx="240" cy="25" r="4" fill="#c89443"/><text x="240" y="18" font-size="10" fill="#143739" text-anchor="middle">B(${p.x2},${p.y2})</text>
<circle cx="140" cy="52.5" r="5" fill="#b56d58"/><text x="140" y="72" font-size="11" fill="#b56d58" font-weight="bold" text-anchor="middle">M(中点)</text></svg>`;
  if (type === 'linear') return `<svg viewBox="0 0 280 110" class="nian-math-svg" aria-hidden="true">
<line x1="30" y1="90" x2="250" y2="90" stroke="#7698ad" stroke-width="1.2"/><line x1="60" y1="10" x2="60" y2="105" stroke="#7698ad" stroke-width="1.2"/>
<line x1="40" y1="95" x2="220" y2="18" stroke="#255e58" stroke-width="2.2"/>
<text x="140" y="42" font-size="11" fill="#255e58" font-weight="bold">y=${p.k}x+${p.b}</text></svg>`;
  if (type === 'lines') return `<svg viewBox="0 0 280 110" class="nian-math-svg" aria-hidden="true">
<line x1="30" y1="85" x2="250" y2="85" stroke="#7698ad" stroke-width="1.2" stroke-dasharray="2,2"/><line x1="140" y1="10" x2="140" y2="105" stroke="#7698ad" stroke-width="1.2" stroke-dasharray="2,2"/>
<line x1="40" y1="90" x2="230" y2="18" stroke="#255e58" stroke-width="2"/><line x1="40" y1="18" x2="230" y2="90" stroke="#b56d58" stroke-width="2"/>
<circle cx="135" cy="54" r="5" fill="#c89443"/><text x="135" y="42" font-size="11" fill="#143739" font-weight="bold" text-anchor="middle">交点(${p.x},${p.y})</text></svg>`;
  return '';
}
