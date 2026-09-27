import type { Question, SolveData } from './types';
import { pick, type Rng } from './rng';

export type SolveBuilder = (rng: Rng) => {
  topic: string;
  prompt: string;
  svg?: string;
  solve: SolveData;
};

// 辅助工具：去重并过滤空项
function unique(arr: string[]): string[] {
  return Array.from(new Set(arr.filter(s => s && s.trim().length > 0)));
}

// 辅助工具：最大公约数
function gcd(a: number, b: number): number {
  let x = Math.abs(a);
  let y = Math.abs(b);
  while (y !== 0) {
    const t = y;
    y = x % y;
    x = t;
  }
  return x || 1;
}

// 辅助工具：化简二次根式 √(n) -> c√rad
function simplifySqrt(n: number): { coef: number; radical: number } {
  if (n <= 0) return { coef: 0, radical: 0 };
  let coef = 1;
  let rem = n;
  for (let i = 2; i * i <= rem; i++) {
    while (rem % (i * i) === 0) {
      coef *= i;
      rem /= i * i;
    }
  }
  return { coef, radical: rem };
}

function formatSqrtStr(coef: number, radical: number): string {
  if (radical === 1) return `${coef}`;
  if (coef === 1) return `√${radical}`;
  return `${coef}√${radical}`;
}

// -------------------------------------------------------------
// 1. 解三角形
// -------------------------------------------------------------
interface TriConfig {
  A: number;
  B: number;
  C: number;
  aStr: string;
  bStr: string;
  sStr: string;
}

const TRIANGLE_PRESETS: TriConfig[] = [
  { A: 30, B: 60, C: 90, aStr: '2', bStr: '2√3', sStr: '2√3' },
  { A: 30, B: 60, C: 90, aStr: '4', bStr: '4√3', sStr: '8√3' },
  { A: 30, B: 60, C: 90, aStr: '6', bStr: '6√3', sStr: '18√3' },
  { A: 60, B: 30, C: 90, aStr: '2√3', bStr: '2', sStr: '2√3' },
  { A: 60, B: 30, C: 90, aStr: '4√3', bStr: '4', sStr: '8√3' },
  { A: 60, B: 30, C: 90, aStr: '6√3', bStr: '6', sStr: '18√3' },
  { A: 45, B: 45, C: 90, aStr: '2', bStr: '2', sStr: '2' },
  { A: 45, B: 45, C: 90, aStr: '4', bStr: '4', sStr: '8' },
  { A: 45, B: 45, C: 90, aStr: '6', bStr: '6', sStr: '18' },
  { A: 45, B: 45, C: 90, aStr: '2√2', bStr: '2√2', sStr: '4' },
  { A: 45, B: 45, C: 90, aStr: '4√2', bStr: '4√2', sStr: '16' },
  { A: 30, B: 120, C: 30, aStr: '2', bStr: '2√3', sStr: '√3' },
  { A: 30, B: 120, C: 30, aStr: '4', bStr: '4√3', sStr: '4√3' },
  { A: 30, B: 120, C: 30, aStr: '6', bStr: '6√3', sStr: '9√3' },
  { A: 120, B: 30, C: 30, aStr: '2√3', bStr: '2', sStr: '√3' },
  { A: 120, B: 30, C: 30, aStr: '4√3', bStr: '4', sStr: '4√3' },
  { A: 120, B: 30, C: 30, aStr: '6√3', bStr: '6', sStr: '9√3' },
  { A: 60, B: 60, C: 60, aStr: '2', bStr: '2', sStr: '√3' },
  { A: 60, B: 60, C: 60, aStr: '4', bStr: '4', sStr: '4√3' },
  { A: 60, B: 60, C: 60, aStr: '6', bStr: '6', sStr: '9√3' },
  { A: 60, B: 60, C: 60, aStr: '8', bStr: '8', sStr: '16√3' },
  { A: 30, B: 30, C: 120, aStr: '2', bStr: '2', sStr: '√3' },
  { A: 30, B: 30, C: 120, aStr: '4', bStr: '4', sStr: '4√3' },
  { A: 30, B: 30, C: 120, aStr: '6', bStr: '6', sStr: '9√3' },
  { A: 45, B: 90, C: 45, aStr: '2', bStr: '2√2', sStr: '2' },
  { A: 45, B: 90, C: 45, aStr: '4', bStr: '4√2', sStr: '8' },
  { A: 90, B: 45, C: 45, aStr: '4', bStr: '2√2', sStr: '4' },
  { A: 90, B: 30, C: 60, aStr: '4', bStr: '2', sStr: '2√3' },
  { A: 90, B: 60, C: 30, aStr: '4', bStr: '2√3', sStr: '2√3' },
  { A: 90, B: 30, C: 60, aStr: '6', bStr: '3', sStr: '9√3/2' },
];

function sqrtAccepts(valStr: string): string[] {
  if (valStr.includes('√')) {
    const star = valStr.replace('√', '*√');
    return unique([valStr, star]);
  }
  return [valStr];
}

const buildTriangleSolve: SolveBuilder = rng => {
  const topic = '解三角形';
  const cfg = pick(TRIANGLE_PRESETS, rng);

  const prompt = `在 △ABC 中，内角 A、B、C 所对的边分别为 a、b、c。已知 ∠A = ${cfg.A}°，∠B = ${cfg.B}°，边 a = ${cfg.aStr}。求：\n(1) 角 C 的度数；\n(2) 边 b 的长；\n(3) △ABC 的面积 S。`;

  const bAccepts = sqrtAccepts(cfg.bStr);
  const sAccepts = sqrtAccepts(cfg.sStr);

  const solve: SolveData = {
    topic,
    total: 12,
    steps: [
      {
        ask: '求角 C 的度数（单位：度）',
        unit: '°',
        score: 3,
        accepts: [`${cfg.C}`],
        hint: '利用三角形内角和定理：A + B + C = 180°。',
        explain: `由三角形内角和定理，∠C = 180° - ∠A - ∠B = 180° - ${cfg.A}° - ${cfg.B}° = ${cfg.C}°。`,
      },
      {
        ask: '求边 b 的长',
        score: 4,
        accepts: bAccepts,
        hint: '利用正弦定理 a / sin A = b / sin B 求解。',
        explain: `由正弦定理 a / sin A = b / sin B，得 b = a · sin B / sin A = ${cfg.bStr}。`,
      },
      {
        ask: '求 △ABC 的面积 S',
        score: 5,
        accepts: sAccepts,
        hint: '利用三角形面积公式 S = (1/2) a b sin C 求解。',
        explain: `由三角形面积公式，S = (1/2) a b sin C = ${cfg.sStr}。`,
      },
    ],
    solution: [
      `解：(1) 在 △ABC 中，∠A + ∠B + ∠C = 180°，`,
      `故 ∠C = 180° - ${cfg.A}° - ${cfg.B}° = ${cfg.C}°。`,
      `(2) 由正弦定理 a / sin A = b / sin B，`,
      `可得 b = a · sin B / sin A = ${cfg.bStr}。`,
      `(3) △ABC 的面积 S = (1/2) a b sin C = ${cfg.sStr}。`,
    ],
    rubric: [
      { point: '由内角和定理求出角 C', score: 3, keywords: ['180', `${cfg.C}`, '内角和'] },
      { point: '由正弦定理求出边 b', score: 4, keywords: ['正弦定理', 'sin', `${cfg.bStr}`, 'b'] },
      { point: '应用面积公式求出三角形面积', score: 5, keywords: ['面积', 'sin', `${cfg.sStr}`, '1/2'] },
    ],
    pitfall: '注意内角和必须为 180°，正弦定理应用时角与边必须准确对应。',
  };

  return { topic, prompt, solve };
};

// -------------------------------------------------------------
// 2. 等差数列
// -------------------------------------------------------------
const buildArithmeticSolve: SolveBuilder = rng => {
  const topic = '等差数列';
  const a1List = [-5, -4, -3, -2, -1, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
  const dList = [-4, -3, -2, -1, 2, 3, 4, 5];

  const a1 = pick(a1List, rng);
  const d = pick(dList, rng);

  const a2 = a1 + d;
  const a5 = a1 + 4 * d;
  const c = a1 - d;

  let anStandard = '';
  if (c === 0) {
    anStandard = d === 1 ? 'n' : d === -1 ? '-n' : `${d}n`;
  } else if (c > 0) {
    anStandard = d === 1 ? `n+${c}` : d === -1 ? `-n+${c}` : `${d}n+${c}`;
  } else {
    anStandard = d === 1 ? `n-${Math.abs(c)}` : d === -1 ? `-n-${Math.abs(c)}` : `${d}n-${Math.abs(c)}`;
  }

  const anAcceptsList = [anStandard];
  if (c > 0) {
    anAcceptsList.push(`${c}+${d}n`, `${c}+(${d})n`);
  } else if (c < 0) {
    anAcceptsList.push(`-${Math.abs(c)}+${d}n`);
  }
  const anAccepts = unique(anAcceptsList);

  const S10 = 10 * a1 + 45 * d;

  const prompt = `已知等差数列 {aₙ} 满足 a₂ = ${a2}，a₅ = ${a5}。求：\n(1) 数列 {aₙ} 的公差 d 的值；\n(2) 数列 {aₙ} 的通项公式 aₙ；\n(3) 数列 {aₙ} 的前 10 项和 S₁₀ 的值。`;

  const solve: SolveData = {
    topic,
    total: 12,
    steps: [
      {
        ask: '求数列 {aₙ} 的公差 d 的值',
        score: 4,
        accepts: [`${d}`],
        hint: '利用通项公式作差：a₅ - a₂ = 3d。',
        explain: `由 a₅ - a₂ = 3d 得 3d = ${a5} - (${a2}) = ${a5 - a2}，解得 d = ${d}。`,
      },
      {
        ask: '求数列 {aₙ} 的通项公式 aₙ',
        score: 4,
        accepts: anAccepts,
        hint: '由 a₁ = a₂ - d 得出首项，再代入 aₙ = a₁ + (n - 1)d。',
        explain: `首项 a₁ = a₂ - d = ${a2} - (${d}) = ${a1}。故 aₙ = ${a1} + (n - 1) × (${d}) = ${anStandard}。`,
      },
      {
        ask: '求数列 {aₙ} 的前 10 项和 S₁₀ 的值',
        score: 4,
        accepts: [`${S10}`],
        hint: '利用求和公式 S₁₀ = 10a₁ + (10 × 9 / 2)d 求解。',
        explain: `由等差数列求和公式，S₁₀ = 10 × (${a1}) + 45 × (${d}) = ${S10}。`,
      },
    ],
    solution: [
      `解：(1) 设等差数列 {aₙ} 的首项为 a₁，公差为 d。`,
      `由题意知 a₅ - a₂ = 3d = ${a5} - (${a2}) = ${a5 - a2}，解得 d = ${d}。`,
      `(2) 首项 a₁ = a₂ - d = ${a2} - (${d}) = ${a1}。`,
      `所以通项公式 aₙ = a₁ + (n - 1)d = ${anStandard}。`,
      `(3) 前 10 项和 S₁₀ = 10a₁ + [10 × (10 - 1) / 2] · d = 10 × (${a1}) + 45 × (${d}) = ${S10}。`,
    ],
    rubric: [
      { point: '列方程求出公差 d', score: 4, keywords: ['公差', 'd', `${d}`, '3d', `${a5 - a2}`] },
      { point: '求出首项并写出通项公式 aₙ', score: 4, keywords: ['首项', '通项', `${a1}`, anStandard, 'an'] },
      { point: '应用求和公式计算得出 S₁₀', score: 4, keywords: ['前10项和', 'S10', `${S10}`, '求和'] },
    ],
    pitfall: '计算通项常数项时注意 a₁ - d 的正负号。',
  };

  return { topic, prompt, solve };
};

// -------------------------------------------------------------
// 3. 等比数列
// -------------------------------------------------------------
interface GeoPreset {
  a1: number;
  q: number;
  anAscii: string;
  anAlts: string[];
}

const GEO_PRESETS: GeoPreset[] = [
  { a1: 1, q: 2, anAscii: '2^(n-1)', anAlts: ['1*2^(n-1)', '1·2^(n-1)'] },
  { a1: 2, q: 2, anAscii: '2^n', anAlts: ['2*2^(n-1)', '2·2^(n-1)'] },
  { a1: 3, q: 2, anAscii: '3*2^(n-1)', anAlts: ['3·2^(n-1)', '3(2)^(n-1)'] },
  { a1: 4, q: 2, anAscii: '4*2^(n-1)', anAlts: ['4·2^(n-1)', '2^(n+1)'] },
  { a1: 5, q: 2, anAscii: '5*2^(n-1)', anAlts: ['5·2^(n-1)'] },
  { a1: 6, q: 2, anAscii: '6*2^(n-1)', anAlts: ['6·2^(n-1)', '3*2^n'] },
  { a1: 7, q: 2, anAscii: '7*2^(n-1)', anAlts: ['7·2^(n-1)'] },
  { a1: 8, q: 2, anAscii: '8*2^(n-1)', anAlts: ['8·2^(n-1)', '2^(n+2)'] },
  { a1: 1, q: 3, anAscii: '3^(n-1)', anAlts: ['1*3^(n-1)', '1·3^(n-1)'] },
  { a1: 2, q: 3, anAscii: '2*3^(n-1)', anAlts: ['2·3^(n-1)', '2(3)^(n-1)'] },
  { a1: 3, q: 3, anAscii: '3^n', anAlts: ['3*3^(n-1)', '3·3^(n-1)'] },
  { a1: 4, q: 3, anAscii: '4*3^(n-1)', anAlts: ['4·3^(n-1)'] },
  { a1: 5, q: 3, anAscii: '5*3^(n-1)', anAlts: ['5·3^(n-1)'] },
  { a1: 1, q: -2, anAscii: '(-2)^(n-1)', anAlts: ['1*(-2)^(n-1)'] },
  { a1: 2, q: -2, anAscii: '2*(-2)^(n-1)', anAlts: ['2·(-2)^(n-1)'] },
  { a1: 3, q: -2, anAscii: '3*(-2)^(n-1)', anAlts: ['3·(-2)^(n-1)'] },
  { a1: 4, q: -2, anAscii: '4*(-2)^(n-1)', anAlts: ['4·(-2)^(n-1)'] },
  { a1: 5, q: -2, anAscii: '5*(-2)^(n-1)', anAlts: ['5·(-2)^(n-1)'] },
  { a1: 6, q: -2, anAscii: '6*(-2)^(n-1)', anAlts: ['6·(-2)^(n-1)'] },
  { a1: 9, q: 2, anAscii: '9*2^(n-1)', anAlts: ['9·2^(n-1)'] },
  { a1: 10, q: 2, anAscii: '10*2^(n-1)', anAlts: ['10·2^(n-1)', '5*2^n'] },
  { a1: 12, q: 2, anAscii: '12*2^(n-1)', anAlts: ['12·2^(n-1)', '3*2^(n+1)'] },
  { a1: 1, q: 4, anAscii: '4^(n-1)', anAlts: ['1*4^(n-1)', '2^(2n-2)'] },
  { a1: 2, q: 4, anAscii: '2*4^(n-1)', anAlts: ['2·4^(n-1)', '2^(2n-1)'] },
  { a1: 3, q: 4, anAscii: '3*4^(n-1)', anAlts: ['3·4^(n-1)'] },
];

const buildGeometricSolve: SolveBuilder = rng => {
  const topic = '等比数列';
  const cfg = pick(GEO_PRESETS, rng);

  const a1 = cfg.a1;
  const q = cfg.q;
  const a2 = a1 * q;
  const a5 = a1 * Math.pow(q, 4);

  // S5 = a1 * (1 - q^5) / (1 - q)
  const S5 = Math.round((a1 * (1 - Math.pow(q, 5))) / (1 - q));

  const promptPrefix = q > 0 ? '已知正项等比数列 {aₙ}' : '已知等比数列 {aₙ}';
  const prompt = `${promptPrefix} 满足 a₂ = ${a2}，a₅ = ${a5}。求：\n(1) 数列 {aₙ} 的公比 q 的值；\n(2) 数列 {aₙ} 的通项公式 aₙ；\n(3) 数列 {aₙ} 的前 5 项和 S₅ 的值。`;

  const anAccepts = unique([cfg.anAscii, ...cfg.anAlts]);

  const solve: SolveData = {
    topic,
    total: 12,
    steps: [
      {
        ask: '求数列 {aₙ} 的公比 q 的值',
        score: 4,
        accepts: [`${q}`],
        hint: '利用 a₅ / a₂ = q³ 求解公比。',
        explain: `由 a₅ / a₂ = q³ 得 q³ = ${a5} / (${a2}) = ${Math.pow(q, 3)}，解得 q = ${q}。`,
      },
      {
        ask: '求数列 {aₙ} 的通项公式 aₙ',
        score: 4,
        accepts: anAccepts,
        hint: '先求首项 a₁ = a₂ / q，再代入 aₙ = a₁ · qⁿ⁻¹。',
        explain: `首项 a₁ = a₂ / q = ${a2} / (${q}) = ${a1}。故 aₙ = ${cfg.anAscii}。`,
      },
      {
        ask: '求数列 {aₙ} 的前 5 项和 S₅ 的值',
        score: 4,
        accepts: [`${S5}`],
        hint: '利用等比数列求和公式 S₅ = a₁(1 - q⁵) / (1 - q) 求解。',
        explain: `S₅ = ${a1} × [1 - (${q})⁵] / [1 - (${q})] = ${S5}。`,
      },
    ],
    solution: [
      `解：(1) 设等比数列 {aₙ} 的首项为 a₁，公比为 q。`,
      `由题意知 a₅ / a₂ = q³ = ${a5} / (${a2}) = ${Math.pow(q, 3)}，`,
      `因为 ${q > 0 ? '数列各项均为正数' : 'q³ = ' + Math.pow(q, 3)}，解得 q = ${q}。`,
      `(2) 首项 a₁ = a₂ / q = ${a2} / (${q}) = ${a1}。`,
      `所以通项公式 aₙ = ${cfg.anAscii}。`,
      `(3) 前 5 项和 S₅ = a₁(1 - q⁵) / (1 - q) = ${S5}。`,
    ],
    rubric: [
      { point: '由已知两项求出公比 q', score: 4, keywords: ['公比', 'q', `${q}`, 'q^3', 'a5/a2'] },
      { point: '求出首项并写出通项公式 aₙ', score: 4, keywords: ['首项', '通项', `${a1}`, cfg.anAscii, 'an'] },
      { point: '应用求和公式计算得出 S₅', score: 4, keywords: ['前5项和', 'S5', `${S5}`, '求和公式'] },
    ],
    pitfall: '等比数列求和公式分母为 1 - q，分子为 1 - q⁵，注意符号不要算反。',
  };

  return { topic, prompt, solve };
};

// -------------------------------------------------------------
// 4. 函数应用（利润）
// -------------------------------------------------------------
const buildFunctionSolve: SolveBuilder = rng => {
  const topic = '函数应用';
  const cList = [20, 30, 40, 50];
  const mList = [10, 15, 20, 25];
  const kList = [5, 10, 20];
  const x0List = [5, 10, 15, 20];

  const c = pick(cList, rng);
  const m = pick(mList, rng);
  const k = pick(kList, rng);
  const x0 = pick(x0List, rng);

  const p = c + m;
  const a = k * (2 * x0 + m);

  const xTest = x0 > 5 ? x0 - 5 : 2;
  const LTest = (m + xTest) * (a - k * xTest);
  const LMax = k * (m + x0) * (m + x0);

  const prompt = `某商场销售某种文具，每件进价为 ${c} 元，原售价为 ${p} 元，每天可售出 ${a} 件。市场调研表明，每件售价每上涨 1 元，每天少售出 ${k} 件。设每件售价上涨 x 元（x ≥ 0 且为整数）。求：\n(1) 若每件售价上涨 ${xTest} 元，商场每天的销售总利润为多少元？\n(2) 为使每天销售总利润最大，每件售价应上涨多少元？\n(3) 商场每天能获得的最大销售总利润为多少元？`;

  const solve: SolveData = {
    topic,
    total: 13,
    steps: [
      {
        ask: `若每件售价上涨 ${xTest} 元，求每天的销售总利润（单位：元）`,
        unit: '元',
        score: 3,
        accepts: [`${LTest}`],
        hint: `将 x = ${xTest} 代入利润函数 L(x) = (每件利润) × (每天销量)。`,
        explain: `上涨 ${xTest} 元时，每件利润为 ${m + xTest} 元，销量为 ${a - k * xTest} 件，总利润为 ${m + xTest} × ${a - k * xTest} = ${LTest} 元。`,
      },
      {
        ask: '为使每天销售总利润最大，每件售价应上涨多少元（单位：元）',
        unit: '元',
        score: 5,
        accepts: [`${x0}`],
        hint: '列出利润函数并利用二次函数顶点坐标公式 x = -b / (2a) 求解。',
        explain: `利润函数 L(x) = (${m} + x)(${a} - ${k}x) = -${k}x² + ${a - k * m}x + ${m * a}。其对称轴为 x = ${x0}，此时利润达到最大。`,
      },
      {
        ask: '求商场每天能获得的最大销售总利润为多少元（单位：元）',
        unit: '元',
        score: 5,
        accepts: [`${LMax}`],
        hint: `将最优上涨金额 x = ${x0} 代入利润函数计算最大值。`,
        explain: `最大销售总利润为 L(${x0}) = (${m + x0}) × (${a - k * x0}) = ${LMax} 元。`,
      },
    ],
    solution: [
      `解：设每件售价上涨 x 元，每天的销售总利润为 L(x) 元。`,
      `此时每件商品的利润为 (${p} + x - ${c}) = (${m} + x) 元，每天的销量为 (${a} - ${k}x) 件。`,
      `(1) 当 x = ${xTest} 时，`,
      `销售总利润 L(${xTest}) = (${m} + ${xTest}) × (${a} - ${k * xTest}) = ${m + xTest} × ${a - k * xTest} = ${LTest} 元。`,
      `(2) 由题意得，总利润函数为：`,
      `L(x) = (${m} + x)(${a} - ${k}x) = -${k}x² + ${a - k * m}x + ${m * a}。`,
      `因为 -${k} < 0，二次函数图象开口向下，`,
      `当 x = -(${a - k * m}) / [2 × (-${k})] = ${x0} 时，每天的销售总利润最大。`,
      `答：每件售价应上涨 ${x0} 元。`,
      `(3) 将 x = ${x0} 代入，得最大销售总利润为：`,
      `L(${x0}) = (${m} + ${x0}) × (${a} - ${k * x0}) = ${LMax} 元。`,
    ],
    rubric: [
      { point: '代入数值求出指定涨幅下的总利润', score: 3, keywords: [`${xTest}`, `${LTest}`, '利润'] },
      { point: '建立二次函数模型并求出对称轴顶点横坐标', score: 5, keywords: ['二次函数', '对称轴', `${x0}`, '开口'] },
      { point: '计算得出最大销售总利润', score: 5, keywords: [`${LMax}`, '最大利润', `${x0}`] },
    ],
    pitfall: '注意售价与进价的差才是每件单件利润，不要遗漏原每件利润。',
  };

  return { topic, prompt, solve };
};

// -------------------------------------------------------------
// 5. 直线与圆
// -------------------------------------------------------------
interface CircleConfig {
  x0: number;
  y0: number;
  r: number;
  d: number;
  A: number;
  B: number;
  Cl: number;
}

const buildCircleSolve: SolveBuilder = rng => {
  const topic = '直线与圆';

  const centers = [
    { x0: 0, y0: 0 },
    { x0: 1, y0: 1 },
    { x0: -1, y0: 2 },
    { x0: 2, y0: -1 },
    { x0: 3, y0: 1 },
    { x0: -2, y0: 0 },
    { x0: 0, y0: 3 },
    { x0: 1, y0: -2 },
  ];
  const rList = [3, 4, 5];

  const center = pick(centers, rng);
  const r = pick(rList, rng);

  const possibleD = r === 5 ? [1, 2, 3, 4] : r === 4 ? [1, 2, 3] : [1, 2];
  const d = pick(possibleD, rng);

  const A = 3;
  const B = 4;
  const Cl = 5 * d - (A * center.x0 + B * center.y0);

  const D = -2 * center.x0;
  const E = -2 * center.y0;
  const F = center.x0 * center.x0 + center.y0 * center.y0 - r * r;

  const rem = r * r - d * d;
  const { coef: cSqrt, radical } = simplifySqrt(rem);
  const chordCoef = 2 * cSqrt;
  const chordStr = formatSqrtStr(chordCoef, radical);
  const chordAccepts = sqrtAccepts(chordStr);

  const signStr = (val: number, varName: string) => {
    if (val === 0) return '';
    return val > 0 ? `+ ${val}${varName}` : `- ${Math.abs(val)}${varName}`;
  };
  const constStr = (val: number) => {
    if (val === 0) return '';
    return val > 0 ? `+ ${val}` : `- ${Math.abs(val)}`;
  };

  const circleEq = `x² + y² ${signStr(D, 'x')} ${signStr(E, 'y')} ${constStr(F)} = 0`.replace(/\s+/g, ' ');
  const lineEq = `${A}x + ${B}y ${constStr(Cl)} = 0`.replace(/\s+/g, ' ');

  const prompt = `在平面直角坐标系中，已知圆 C 的方程为 ${circleEq}，直线 l 的方程为 ${lineEq}。求：\n(1) 圆 C 的半径 r 的值；\n(2) 圆心 C 到直线 l 的距离 d 的值；\n(3) 直线 l 被圆 C 截得的弦长。`;

  const solve: SolveData = {
    topic,
    total: 13,
    steps: [
      {
        ask: '求圆 C 的半径 r 的值',
        score: 4,
        accepts: [`${r}`],
        hint: '通过配方法将圆的一般方程化为标准方程 (x - a)² + (y - b)² = r²。',
        explain: `将方程配方得 (x - ${center.x0})² + (y - ${center.y0})² = ${r * r}，故半径 r = ${r}。`,
      },
      {
        ask: '求圆心 C 到直线 l 的距离 d 的值',
        score: 4,
        accepts: [`${d}`],
        hint: '利用点到直线距离公式 d = |Ax₀ + By₀ + C| / √(A² + B²) 求解。',
        explain: `圆心为 (${center.x0}, ${center.y0})，代入距离公式得 d = |${A} × (${center.x0}) + ${B} × (${center.y0}) + (${Cl})| / √(3² + 4²) = ${5 * d} / 5 = ${d}。`,
      },
      {
        ask: '求直线 l 被圆 C 截得的弦长',
        score: 5,
        accepts: chordAccepts,
        hint: '利用垂径定理与勾股定理，弦长 L = 2√(r² - d²)。',
        explain: `由垂径定理，弦长 L = 2√(r² - d²) = 2√(${r}² - ${d}²) = 2√${rem} = ${chordStr}。`,
      },
    ],
    solution: [
      `解：(1) 将圆 C 的一般方程配方化为标准方程：`,
      `(x - ${center.x0})² + (y - ${center.y0})² = ${r * r}。`,
      `可知圆心 C 的坐标为 (${center.x0}, ${center.y0})，半径 r = ${r}。`,
      `(2) 由点到直线距离公式，圆心 C 到直线 l 的距离：`,
      `d = |${A} × (${center.x0}) + ${B} × (${center.y0}) + (${Cl})| / √(3² + 4²) = ${5 * d} / 5 = ${d}。`,
      `(3) 设直线 l 被圆 C 截得的弦长为 L。`,
      `由垂径定理及勾股定理得：(L / 2)² + d² = r²，`,
      `所以 L = 2√(r² - d²) = 2√(${r * r} - ${d * d}) = ${chordStr}。`,
    ],
    rubric: [
      { point: '配方求出圆的标准方程与半径 r', score: 4, keywords: ['配方', '圆心', `${center.x0}`, `${center.y0}`, `${r}`, '半径'] },
      { point: '应用点到直线距离公式求出 d', score: 4, keywords: ['点到直线距离', `${d}`, '距离公式', '5'] },
      { point: '利用垂径定理与勾股定理计算得出弦长', score: 5, keywords: ['垂径定理', '弦长', `${chordStr}`, '勾股定理'] },
    ],
    pitfall: '圆的标准方程中右侧为 r²，注意开平方得出半径 r。',
  };

  return { topic, prompt, solve };
};

// -------------------------------------------------------------
// 6. 三角函数性质
// -------------------------------------------------------------
interface PhiOption {
  phiStr: string;
  p: number;
  q: number;
}

const PHI_OPTIONS: PhiOption[] = [
  { phiStr: '', p: 0, q: 1 },
  { phiStr: '+ π/6', p: 1, q: 6 },
  { phiStr: '+ π/4', p: 1, q: 4 },
  { phiStr: '+ π/3', p: 1, q: 3 },
  { phiStr: '+ π/2', p: 1, q: 2 },
  { phiStr: '- π/6', p: -1, q: 6 },
  { phiStr: '- π/4', p: -1, q: 4 },
  { phiStr: '- π/3', p: -1, q: 3 },
  { phiStr: '- π/2', p: -1, q: 2 },
];

function formatFracPi(num: number, den: number): { standard: string; alts: string[] } {
  const g = gcd(num, den);
  const n = num / g;
  const d = den / g;

  if (d === 1) {
    if (n === 1) return { standard: 'π', alts: ['1π', '1*π'] };
    return { standard: `${n}π`, alts: [`${n}*π`] };
  }
  if (n === 1) {
    return { standard: `π/${d}`, alts: [`1/` + d + `π`, `1*π/${d}`] };
  }
  return { standard: `${n}π/${d}`, alts: [`${n}*π/${d}`, `${n}/${d}π`] };
}

const buildTrigSolve: SolveBuilder = rng => {
  const topic = '三角函数性质';
  const AList = [1, 2, 3];
  const BList = [-2, -1, 0, 1, 2];
  const omegaList = [1, 2, 3];

  const A = pick(AList, rng);
  const B = pick(BList, rng);
  const omega = pick(omegaList, rng);
  const phiOpt = pick(PHI_OPTIONS, rng);

  const T_num = 2;
  const T_den = omega;
  const { standard: TStr, alts: TAlts } = formatFracPi(T_num, T_den);
  const TAccepts = unique([TStr, ...TAlts]);

  const Max = A + B;

  // ωx + φ = π/2 + 2kπ => x = (1/2 - p/q + 2k)π / ω
  const subNum = 1 * phiOpt.q - 2 * phiOpt.p;
  const subDen = 2 * phiOpt.q;

  let k = 0;
  while (subNum + 2 * k * subDen <= 0) {
    k++;
  }
  const xNum = subNum + 2 * k * subDen;
  const xDen = subDen * omega;

  const { standard: xStr, alts: xAlts } = formatFracPi(xNum, xDen);
  const xAccepts = unique([xStr, ...xAlts]);

  const omegaTerm = omega === 1 ? 'x' : `${omega}x`;
  const inside = phiOpt.phiStr ? `${omegaTerm} ${phiOpt.phiStr}` : omegaTerm;
  const bTerm = B === 0 ? '' : B > 0 ? ` + ${B}` : ` - ${Math.abs(B)}`;
  const aTerm = A === 1 ? '' : `${A}`;
  const funcStr = `f(x) = ${aTerm}sin(${inside})${bTerm}`;

  const prompt = `已知函数 ${funcStr}。求：\n(1) 函数 f(x) 的最小正周期 T；\n(2) 函数 f(x) 的最大值；\n(3) f(x) 取得最大值时的最小正数 x 的值。`;

  const solve: SolveData = {
    topic,
    total: 12,
    steps: [
      {
        ask: '求函数 f(x) 的最小正周期 T',
        score: 4,
        accepts: TAccepts,
        hint: '利用正弦型函数最小正周期公式 T = 2π / ω。',
        explain: `由周期公式 T = 2π / ω，其中 ω = ${omega}，得 T = ${TStr}。`,
      },
      {
        ask: '求函数 f(x) 的最大值',
        score: 4,
        accepts: [`${Max}`],
        hint: '当正弦值取得最大值 1 时，代入计算 f(x) 的最大值。',
        explain: `当 sin(${inside}) = 1 时，f(x) 取得最大值 ${A} × 1 ${bTerm} = ${Max}。`,
      },
      {
        ask: '求 f(x) 取得最大值时的最小正数 x 的值',
        score: 4,
        accepts: xAccepts,
        hint: '令 ωx + φ = π/2 + 2kπ (k ∈ ℤ)，解出 x 并求其最小正值。',
        explain: `令 ${inside} = π/2 + 2kπ，解得最小正数 x = ${xStr}。`,
      },
    ],
    solution: [
      `解：(1) 由函数解析式知 ω = ${omega}，`,
      `所以函数 f(x) 的最小正周期 T = 2π / ω = ${TStr}。`,
      `(2) 因为 -1 ≤ sin(${inside}) ≤ 1，`,
      `所以当 sin(${inside}) = 1 时，函数 f(x) 取得最大值，`,
      `最大值为 ${A} × 1 ${bTerm} = ${Max}。`,
      `(3) 令 ${inside} = π/2 + 2kπ (k ∈ ℤ)，`,
      `解得 x = ${xStr} (当 k = ${k} 时取到最小正数)。`,
    ],
    rubric: [
      { point: '由周期公式求出最小正周期 T', score: 4, keywords: ['周期', '2π/ω', `${TStr}`, 'T'] },
      { point: '分析三角函数值域求出最大值', score: 4, keywords: ['最大值', `${Max}`, 'sin', '1'] },
      { point: '列出同界角方程求出最小正数 x', score: 4, keywords: ['π/2', `${xStr}`, '2kπ', 'x'] },
    ],
    pitfall: '求周期时注意分母为 ω，求自变量取值时注意括号内整体等于 π/2 + 2kπ。',
  };

  return { topic, prompt, solve };
};

// -------------------------------------------------------------
// 映射与统一入口
// -------------------------------------------------------------
export const SOLVE_BUILDERS: SolveBuilder[] = [
  buildTriangleSolve,
  buildArithmeticSolve,
  buildGeometricSolve,
  buildFunctionSolve,
  buildCircleSolve,
  buildTrigSolve,
];

const TOPIC_BUILDER_MAP: Record<string, SolveBuilder> = {
  解三角形: buildTriangleSolve,
  等差数列: buildArithmeticSolve,
  等比数列: buildGeometricSolve,
  函数应用: buildFunctionSolve,
  直线与圆: buildCircleSolve,
  三角函数性质: buildTrigSolve,
};

export function mathSolveQuestion(rng: Rng = Math.random, topic?: string): Question {
  let builder: SolveBuilder | undefined;
  if (topic && TOPIC_BUILDER_MAP[topic]) {
    builder = TOPIC_BUILDER_MAP[topic];
  } else {
    builder = pick(SOLVE_BUILDERS, rng);
  }

  const generated = builder(rng);
  const qTopic = generated.topic;
  const solveData = generated.solve;

  const q: Question = {
    id: `solve-${qTopic}-${Math.floor(rng() * 1e8)}`,
    type: 'solve',
    subject: 'math',
    kind: 'math-solve',
    prompt: generated.prompt,
    eyebrow: `解答题 · ${qTopic}`,
    answer: solveData.steps.map(s => s.accepts[0]),
    explanation: solveData.solution.join('\n'),
    skill: qTopic,
    rubric: solveData.rubric,
    solve: solveData,
    ...(generated.svg ? { svg: generated.svg } : {}),
  };

  return q;
}
