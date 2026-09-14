// 填空题判分：数值/分数/小数等价；支持“3 或 -3”“±3”多答案；全角转半角、去空格。
function halfWidth(s: string): string {
  const map: Record<string, string> = { '＝': '=', '＋': '+', '－': '-', '×': '*', '÷': '/', '，': ',', '（': '(', '）': ')' };
  return String(s)
    .replace(/[Ａ-Ｚａ-ｚ０-９]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0))
    .replace(/　/g, ' ')
    .replace(/[＝＋－×÷，（）]/g, (c) => map[c] || c);
}

// 单个表达式 → 数值；无法解析返回 null
function oneNumber(raw: string): number | null {
  let t = raw.trim().replace(/\s+/g, '');
  t = t.replace(/^[xy]=?/i, '');
  const frac = t.match(/^(-?\d+)\/(\d+)$/);
  if (frac) return Number(frac[1]) / Number(frac[2]);
  const sqrt = t.match(/^√(\d+)$/);
  if (sqrt) return Math.sqrt(Number(sqrt[1]));
  const pct = t.match(/^(-?[\d.]+)%$/);
  if (pct) return Number(pct[1]) / 100;
  const n = Number(t);
  return Number.isNaN(n) ? null : n;
}

// 一个答案文本 → 它代表的所有数值（处理 ±、或/逗号 多值）
function numbersOf(raw: string): number[] {
  let t = halfWidth(raw).replace(/[{}]/g, '');
  const out: number[] = [];
  const pieces = t.split(/[，,;；或]|or/i).map((x) => x.trim()).filter(Boolean);
  for (let p of pieces) {
    if (p.startsWith('±')) {
      const n = oneNumber(p.slice(1));
      if (n !== null) { out.push(n, -n); }
    } else {
      const n = oneNumber(p);
      if (n !== null) out.push(n);
    }
  }
  return out;
}

export function gradeBlank(response: string, accepted: string[] | string): boolean {
  const user0 = halfWidth(String(response)).replace(/\s+/g, '').replace(/[。.]$/, '');
  if (!user0) return false;
  const answers = Array.isArray(accepted) ? accepted : [accepted];
  for (const ansRaw of answers) {
    const ans0 = halfWidth(String(ansRaw)).replace(/\s+/g, '');
    if (user0 === ans0) return true;
    const u = numbersOf(user0);
    const a = numbersOf(ansRaw);
    if (u.length && a.length && a.some((x) => u.some((y) => Math.abs(x - y) < 1e-6))) return true;
  }
  return false;
}
