// 第二批：按 3+证书考纲补全覆盖的程序化生成器。全部为原创仿真训练题。
import type { Rng } from './rng';
import { pick, shuffle } from './rng';

export interface Built2 {
  topic: string;
  prompt: string;
  choices: string[];
  answer: number;
  explanation: string;
}

function numChoices(answer: number, spread = 1, decimals = 0, rng?: Rng): { choices: string[]; answer: number } {
  const vals = new Set<number>([answer]);
  let step = spread, guard = 0;
  const offsets = shuffle([1, -1, 2, -2, 3, -3], rng ?? Math.random);
  for (const o of offsets) { if (vals.size >= 4) break; vals.add(answer + o * step); }
  while (vals.size < 4) { vals.add(answer + (guard++ + 4) * step); }
  const arr = shuffle([...vals], rng ?? Math.random);
  const fmt = (n: number) => (decimals ? Number(n.toFixed(decimals)).toString() : String(n));
  const choices = arr.map(fmt);
  return { choices, answer: choices.indexOf(fmt(answer)) };
}

// 从答案文本提取数字并平移，生成“像但错”的兜底干扰项
function mutateAnswer(answer: string, shift: number): string {
  return answer.replace(/-?\d+/g, (m) => String(Number(m) + shift));
}

function choice(answer: string, distractors: string[], rng: Rng): { choices: string[]; answer: number } {
  const pool = new Set<string>();
  // 先加给定干扰项，强制排除正确答案
  for (const d of distractors) if (d !== answer && d.trim()) pool.add(d);
  // 不足 3 个：用数字平移兜底
  let shift = 1;
  const guardShifts = [1, -1, 2, -2, 3, -3, 4, 5, 6];
  let gi = 0;
  while (pool.size < 3 && gi < guardShifts.length) {
    const cand = mutateAnswer(answer, guardShifts[gi++]);
    if (cand !== answer) pool.add(cand);
  }
  let guard = 10;
  while (pool.size < 3 && guard-- > 0) pool.add(`${answer}（误${guard}）`);
  const uniq = [...pool].slice(0, 3);
  const choices = shuffle([answer, ...uniq], rng);
  return { choices, answer: choices.indexOf(answer) };
}

const builders2: Array<(rng: Rng) => Built2> = [
  // 集合运算
  (rng) => {
    const a = new Set<number>(), b = new Set<number>();
    const pool = [1, 2, 3, 4, 5, 6, 7, 8];
    while (a.size < 4) a.add(pool[Math.floor(rng() * pool.length)]);
    while (b.size < 4) b.add(pool[Math.floor(rng() * pool.length)]);
    const op = pick(['∩', '∪'] as const, rng);
    const res = op === '∩' ? [...a].filter((x) => b.has(x)) : [...new Set([...a, ...b])];
    const ans = `{${res.sort((x, y) => x - y).join(',')}}`;
    const wrong = [
      `{${[...a].sort((x, y) => x - y).join(',')}}`,
      `{${[...b].sort((x, y) => x - y).join(',')}}`,
      `{${[...a].filter((x) => !b.has(x)).sort((x, y) => x - y).join(',')}}`,
    ];
    const o = choice(ans, wrong, rng);
    const A = `{${[...a].sort((x, y) => x - y).join(',')}}`, B = `{${[...b].sort((x, y) => x - y).join(',')}}`;
    return { topic: '集合运算', prompt: `已知集合 A=${A}，B=${B}，则 A ${op} B =？`, ...o, explanation: `交集取两集合共有的元素，并不重复地合并；A ${op} B=${ans}。` };
  },
  // 充要条件
  (rng) => {
    const pairs = [
      ['x=2', 'x²=4', '充分不必要'], ['两个角是对顶角', '两个角相等', '充分不必要'],
      ['四边形是正方形', '四边形是矩形', '充分不必要'], ['a>b', 'a+c>b+c', '充要'],
      ['x>0', 'x²>0', '充分不必要'], ['三角形三边相等', '三角形三个角相等', '充要'],
    ];
    const [p, q, rel] = pick(pairs, rng);
    const o = choice(rel, ['必要不充分', '充要', '既不充分也不必要'], rng);
    return { topic: '充要条件', prompt: `“${p}”是“${q}”的（　）条件。`, ...o, explanation: `由前者能推出后者看充分性，反推看必要性；本题为${rel}条件。` };
  },
  // 函数定义域
  (rng) => {
    const k = pick([2, 3, 4, 5] as const, rng);
    const ans = `x≠${k}`;
    const o = choice(ans, [`x>${k}`, `x<${k}`, `x=${k}`], rng);
    return { topic: '函数定义域', prompt: `函数 f(x)=1/(x-${k}) 的定义域是？`, ...o, explanation: `分母不能为 0，即 x-${k}≠0，所以 x≠${k}。` };
  },
  // 二次函数顶点/最值
  (rng) => {
    const h = pick([1, 2, 3, -1, -2] as const, rng);
    const k2 = pick([-2, 0, 2, 4] as const, rng);
    const ans = `(${h}, ${k2})`;
    const o = choice(ans, [`(${h}, ${-k2})`, `(${-h}, ${k2})`, `(${k2}, ${h})`], rng);
    return { topic: '二次函数顶点', prompt: `二次函数 y=(x${h >= 0 ? '-' : '+'}${Math.abs(h)})²${k2 >= 0 ? '+' : '-'}${Math.abs(k2)} 的顶点坐标是？`, ...o, explanation: `顶点式 y=a(x-h)²+k 的顶点是 (h, k)，本题为 (${h}, ${k2})。` };
  },
  // 特殊角三角函数
  (rng) => {
    const table: Array<[string, string]> = [
      ['sin 30°', '1/2'], ['cos 60°', '1/2'], ['sin 45°', '√2/2'], ['cos 45°', '√2/2'],
      ['tan 45°', '1'], ['sin 60°', '√3/2'], ['cos 30°', '√3/2'], ['sin 90°', '1'], ['cos 0°', '1'],
    ];
    const [expr, val] = pick(table, rng);
    const o = choice(val, ['√3/2', '√2/2', '1/2', '1', '0'].filter((x) => x !== val).slice(0, 3), rng);
    return { topic: '特殊角三角函数', prompt: `${expr} =？`, ...o, explanation: `特殊角函数值要记牢：${expr}=${val}。` };
  },
  // 同角关系
  (rng) => {
    const sin = pick(['3/5', '5/13'] as const, rng);
    const map: Record<string, string> = { '3/5': '4/5', '5/13': '12/13' };
    const cos = map[sin];
    const o = choice(cos, Object.values(map).filter((x) => x !== cos).concat(['3/4']).slice(0, 3), rng);
    return { topic: '同角三角函数关系', prompt: `已知角 α 是锐角，sin α=${sin}，则 cos α=？`, ...o, explanation: `由 sin²α+cos²α=1，锐角取正根：cos α=${cos}。` };
  },
  // 周期
  (rng) => {
    const k = pick([2, 3, 4] as const, rng);
    const ans = `${360 / k}°`;
    const o = choice(ans, [`${360 * k}°`, '180°', '90°'], rng);
    return { topic: '三角函数周期', prompt: `函数 y=sin ${k}x 的最小正周期是？`, ...o, explanation: `y=sin(kx) 的周期 T=360°/k=360°/${k}=${ans}。` };
  },
  // 解三角形-余弦定理
  (rng) => {
    // 勾股数：3-4-5, 5-12-13, 6-8-10
    const tri = pick([[3, 4, 5], [5, 12, 13], [6, 8, 10]] as const, rng);
    const [a, b, c] = tri;
    const o = numChoices(c, 1, 0, rng);
    return { topic: '解三角形', prompt: `在 △ABC 中，C=90°，a=${a}，b=${b}，则 c=？`, ...o, explanation: `直角三角形用勾股定理：c=√(${a}²+${b}²)=√(${a * a + b * b})=${c}。` };
  },
  // 等比数列通项
  (rng) => {
    const a1 = pick([2, 3] as const, rng);
    const q = pick([2, 3] as const, rng);
    const n = pick([3, 4] as const, rng);
    const ans = a1 * q ** (n - 1);
    const o = numChoices(ans, q === 2 ? 2 : 3, 0, rng);
    return { topic: '等比数列通项', prompt: `等比数列首项 a₁=${a1}，公比 q=${q}，则 a${n}=？`, ...o, explanation: `等比通项 aₙ=a₁·qⁿ⁻¹=${a1}×${q}^${n - 1}=${ans}。` };
  },
  // 等比求和
  (rng) => {
    const q = 2, n = pick([3, 4] as const, rng), a1 = 1;
    const ans = q ** n - 1;
    const o = numChoices(ans, 2, 0, rng);
    return { topic: '等比数列求和', prompt: `等比数列 1,2,4,… 的前 ${n} 项和 S${n}=？`, ...o, explanation: `Sₙ=a₁(qⁿ-1)/(q-1)=2^${n}-1=${ans}。` };
  },
  // 向量数量积
  (rng) => {
    const x1 = pick([1, 2, 3] as const, rng), y1 = pick([2, -1, 3] as const, rng);
    const x2 = pick([2, 3] as const, rng), y2 = pick([1, 2] as const, rng);
    const dot = x1 * x2 + y1 * y2;
    const o = numChoices(dot, 2, 0, rng);
    return { topic: '向量数量积', prompt: `已知 a=(${x1}, ${y1})，b=(${x2}, ${y2})，则 a·b=？`, ...o, explanation: `数量积 a·b=${x1}×${x2}+(${y1})×${y2}=${dot}。` };
  },
  // 向量加减
  (rng) => {
    const x1 = pick([1, 2] as const, rng), y1 = pick([3, 4] as const, rng);
    const x2 = pick([2, 3] as const, rng), y2 = pick([1, -2] as const, rng);
    const ans = `(${x1 + x2}, ${y1 + y2})`;
    const o = choice(ans, [`(${x1 - x2}, ${y1 - y2})`, `(${x1 * x2}, ${y1 * y2})`, `(${x2}, ${y2})`], rng);
    return { topic: '向量加法', prompt: `已知 a=(${x1}, ${y1})，b=(${x2}, ${y2})，则 a+b=？`, ...o, explanation: `坐标对应相加：a+b=(${x1}+${x2}, ${y1}+(${y2}))=(${x1 + x2}, ${y1 + y2})。` };
  },
  // 圆柱体积
  (rng) => {
    const r = pick([2, 3] as const, rng), h = pick([5, 6] as const, rng);
    const ans = Math.PI * r * r * h;
    const o = choice(`${ans / Math.PI}π`, [`${2 * r * h}π`, `${r * h}π`, `${r * r + 2 * r * h}π`], rng);
    return { topic: '圆柱体积', prompt: `圆柱底面半径 r=${r}，高 h=${h}，体积 V=？（结果保留 π）`, ...o, explanation: `V=πr²h=π×${r}²×${h}=${ans / Math.PI}π。` };
  },
  // 球的体积/表面积
  (rng) => {
    const r = pick([2, 3] as const, rng);
    const want = pick(['V', 'S'] as const, rng);
    if (want === 'V') {
      const ans = (4 / 3) * r ** 3;
      const o = choice(`${ans}π`, [`4×${r}²π`, `${r ** 3}π`, `${(4 / 3) * r ** 2}π`], rng);
      return { topic: '球的体积', prompt: `球的半径 R=${r}，体积 V=？（保留 π）`, ...o, explanation: `V=(4/3)πR³=(4/3)×${r}³π=${ans}π。` };
    }
    const ans = 4 * r ** 2;
    const o = choice(`${ans}π`, [`${(4 / 3) * r ** 3}π`, `${r ** 2}π`, `2×${r}²π`], rng);
    return { topic: '球的表面积', prompt: `球的半径 R=${r}，表面积 S=？（保留 π）`, ...o, explanation: `S=4πR²=4×${r}²π=${ans}π。` };
  },
  // 圆锥体积
  (rng) => {
    const r = pick([3] as const, rng), h = pick([4, 5] as const, rng);
    const ans = (1 / 3) * r * r * h;
    const o = choice(`${ans}π`, [`${r * r * h}π`, `${(1 / 2) * r * r * h}π`, `${3 * r * r * h}π`], rng);
    return { topic: '圆锥体积', prompt: `圆锥底面半径 r=${r}，高 h=${h}，体积 V=？（保留 π）`, ...o, explanation: `V=(1/3)πr²h=(1/3)×${r}²×${h}π=${ans}π。` };
  },
  // 复数运算
  (rng) => {
    const a = pick([1, 2, 3] as const, rng), b = pick([2, 3, 4] as const, rng);
    const ans = `${a + b}i`;
    const o = choice(ans, [`${a * b}i`, `${a - b}i`, `${a}+${b}i`], rng);
    return { topic: '复数加法', prompt: `计算 ${a}i + ${b}i =？`, ...o, explanation: `虚部相加：${a}i+${b}i=${a + b}i。` };
  },
  // 复数 i 幂
  (rng) => {
    const n = pick([2, 3, 4] as const, rng);
    const map: Record<number, string> = { 2: '-1', 3: '-i', 4: '1' };
    const ans = map[n];
    const o = choice(ans, ['i', '1', '-1', '-i'].filter((x) => x !== ans).slice(0, 3), rng);
    return { topic: '虚数单位的幂', prompt: `i^${n} =？`, ...o, explanation: `i²=-1，i³=-i，i⁴=1 循环；i^${n}=${ans}。` };
  },
  // 方差/平均数
  (rng) => {
    const base = pick([4, 5, 6] as const, rng);
    const data = [base - 1, base, base + 1];
    const mean = base;
    const o = numChoices(mean, 1, 0, rng);
    return { topic: '平均数', prompt: `数据 ${data.join('，')} 的平均数是？`, ...o, explanation: `平均数=((${data.join('+')}))/3=${mean}。` };
  },
  // 直线斜率
  (rng) => {
    const x1 = 1, y1 = pick([1, 2] as const, rng), x2 = 3, y2 = y1 + pick([2, 4] as const, rng);
    const k = (y2 - y1) / (x2 - x1);
    const o = numChoices(k, 1, 0, rng);
    return { topic: '直线斜率', prompt: `过点 (${x1}, ${y1})、(${x2}, ${y2}) 的直线斜率 k=？`, ...o, explanation: `k=(y₂-y₁)/(x₂-x₁)=(${y2}-${y1})/(${x2}-${x1})=${k}。` };
  },
  // 圆的方程
  (rng) => {
    const a0 = pick([1, 2] as const, rng), b0 = pick([0, 3] as const, rng), rr = pick([2, 3, 5] as const, rng);
    const ans = `(${a0}, ${b0})，${rr}`;
    const o = choice(ans, [`(${-a0}, ${-b0})，${rr}`, `(${a0}, ${b0})，${rr * rr}`, `(${b0}, ${a0})，${rr}`], rng);
    return { topic: '圆的标准方程', prompt: `圆 (x-${a0})²+(y-${b0})²=${rr * rr} 的圆心和半径是？`, ...o, explanation: `标准式 (x-a)²+(y-b)²=r²，圆心 (${a0}, ${b0})，半径 r=${rr}。` };
  },
  // 指数运算
  (rng) => {
    const a = pick([2, 3] as const, rng), m = pick([2, 3] as const, rng);
    const ans = a ** (m + 1);
    const o = numChoices(ans, a === 2 ? 4 : 6, 0, rng);
    return { topic: '指数运算', prompt: `${a}^${m} × ${a} =？`, ...o, explanation: `同底幂相乘指数相加：${a}^${m}×${a}=${a}^${m + 1}=${ans}。` };
  },
  // 对数运算
  (rng) => {
    const b = pick([2, 3] as const, rng), n = pick([2, 3] as const, rng);
    const val = b ** n;
    const o = numChoices(n, 1, 0, rng);
    return { topic: '对数运算', prompt: `log${b} ${val} =？`, ...o, explanation: `${b} 的几次方等于 ${val}？${b}^${n}=${val}，所以 log${b} ${val}=${n}。` };
  },
];

export const MATH_BUILDERS_2 = builders2;
