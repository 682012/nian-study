/**
 * 念安 V10 填空题与中间步骤判分引擎
 * 支持：精确文本、全半角归一、度数符号、方程变量前缀剥离、
 * 多值解 (±, 或, 逗号)、无理数/分数/π 数值等价、含变量 n 的表达式代入求值。
 */

// 1. 全角转半角及标点清洗
export function toHalfWidth(str: string): string {
  if (!str) return '';
  return str
    .replace(/[\uFF01-\uFF5E]/g, ch => String.fromCharCode(ch.charCodeAt(0) - 0xfee0))
    .replace(/\u3000/g, ' ')
    .replace(/（/g, '(')
    .replace(/）/g, ')')
    .replace(/【/g, '[')
    .replace(/】/g, ']')
    .replace(/，/g, ',')
    .replace(/；/g, ';')
    .replace(/：/g, ':')
    .replace(/“|”/g, '"')
    .replace(/‘|’/g, "'");
}

// 2. 上标/下标转换
const SUPERSCRIPT_MAP: Record<string, string> = {
  '⁰': '0', '¹': '1', '²': '2', '³': '3', '⁴': '4',
  '⁵': '5', '⁶': '6', '⁷': '7', '⁸': '8', '⁹': '9',
  '⁺': '+', '⁻': '-', 'ⁿ': 'n',
};

const SUBSCRIPT_MAP: Record<string, string> = {
  '₀': '0', '₁': '1', '₂': '2', '₃': '3', '₄': '4',
  '₅': '5', '₆': '6', '₇': '7', '₈': '8', '₉': '9',
  'ₙ': 'n', 'ₖ': 'k',
};

export function normalizeSupSub(str: string): string {
  let s = str.replace(/[₀₁₂₃₄₅₆₇₈₉ₙₖ]/g, ch => SUBSCRIPT_MAP[ch] ?? ch);
  s = s.replace(/([⁰¹²³⁴⁵⁶⁷⁸⁹⁺⁻ⁿ]+)/g, (_, match: string) => {
    const inner = Array.from(match).map(c => SUPERSCRIPT_MAP[c] ?? c).join('');
    return `^(${inner})`;
  });
  return s;
}

// 3. 剥离方程/数列左侧变量前缀 (如 x=, y=, a_n=, aₙ=, S_n=, Sₙ=, f(x)=)
const PREFIX_REGEX = /^\s*(?:[a-zA-Z](?:_[a-zA-Z0-9]+|[\u2080-\u2089\u2090-\u209Ca-zA-Z0-9])?|[a-zA-Z]\([a-zA-Z]\))\s*=\s*/;

export function stripVariablePrefix(str: string): string {
  const trimmed = str.trim();
  const replaced = trimmed.replace(PREFIX_REGEX, '');
  return replaced.length > 0 ? replaced.trim() : trimmed;
}

// 4. 清除度数符号
export function stripDegree(str: string): string {
  return str.replace(/°/g, '').replace(/deg/gi, '').trim();
}

// 5. 小型安全表达式求值器 (支持数字、n、+ - * / ^、括号、√、π、e、隐式乘法)
type TokenType = 'num' | 'ident' | 'op' | 'lparen' | 'rparen';

interface Token {
  type: TokenType;
  val: string | number;
}

function tokenize(input: string): Token[] {
  let s = toHalfWidth(input);
  s = normalizeSupSub(s);
  s = stripDegree(s);
  s = s.replace(/[·×•]/g, '*').replace(/÷/g, '/');

  const rawTokens: Token[] = [];
  let i = 0;
  while (i < s.length) {
    const ch = s[i];
    if (/\s/.test(ch)) {
      i++;
      continue;
    }
    if (/[0-9]/.test(ch) || (ch === '.' && i + 1 < s.length && /[0-9]/.test(s[i + 1]))) {
      let numStr = '';
      while (i < s.length && /[0-9.]/.test(s[i])) {
        numStr += s[i];
        i++;
      }
      const numVal = parseFloat(numStr);
      if (isNaN(numVal)) throw new Error(`Invalid number: ${numStr}`);
      rawTokens.push({ type: 'num', val: numVal });
      continue;
    }
    if (ch === '√') {
      rawTokens.push({ type: 'op', val: '√' });
      i++;
      continue;
    }
    if (ch === '+' || ch === '-' || ch === '*' || ch === '/' || ch === '^') {
      rawTokens.push({ type: 'op', val: ch });
      i++;
      continue;
    }
    if (ch === '(') {
      rawTokens.push({ type: 'lparen', val: '(' });
      i++;
      continue;
    }
    if (ch === ')') {
      rawTokens.push({ type: 'rparen', val: ')' });
      i++;
      continue;
    }
    if (ch === 'π') {
      rawTokens.push({ type: 'ident', val: 'pi' });
      i++;
      continue;
    }
    if (/[a-zA-Z_]/.test(ch)) {
      let idStr = '';
      while (i < s.length && /[a-zA-Z0-9_]/.test(s[i])) {
        idStr += s[i];
        i++;
      }
      rawTokens.push({ type: 'ident', val: idStr.toLowerCase() });
      continue;
    }
    // 未知字符（如非数学中文）抛错
    throw new Error(`Unexpected character: ${ch}`);
  }

  // 插入隐式乘法 (如 2n, 3(n+1), 2√3, n(n+1), )()
  const tokens: Token[] = [];
  for (let j = 0; j < rawTokens.length; j++) {
    const curr = rawTokens[j];
    if (j > 0) {
      const prev = rawTokens[j - 1];
      const prevCanEnd = prev.type === 'num' || prev.type === 'ident' || prev.type === 'rparen';
      const currCanStart =
        curr.type === 'num' ||
        curr.type === 'ident' ||
        curr.type === 'lparen' ||
        (curr.type === 'op' && curr.val === '√');

      if (prevCanEnd && currCanStart) {
        tokens.push({ type: 'op', val: '*' });
      }
    }
    tokens.push(curr);
  }
  return tokens;
}

class Parser {
  private tokens: Token[];
  private pos = 0;
  private env: Record<string, number>;

  constructor(tokens: Token[], env: Record<string, number> = {}) {
    this.tokens = tokens;
    this.env = env;
  }

  parse(): number {
    const val = this.parseAddSub();
    if (this.pos < this.tokens.length) {
      throw new Error(`Extra token: ${this.tokens[this.pos].val}`);
    }
    return val;
  }

  private peek(): Token | undefined {
    return this.tokens[this.pos];
  }

  private next(): Token {
    return this.tokens[this.pos++];
  }

  private parseAddSub(): number {
    let val = this.parseMulDiv();
    while (this.pos < this.tokens.length) {
      const t = this.peek();
      if (t && t.type === 'op' && (t.val === '+' || t.val === '-')) {
        this.next();
        const rhs = this.parseMulDiv();
        if (t.val === '+') val += rhs;
        else val -= rhs;
      } else {
        break;
      }
    }
    return val;
  }

  private parseMulDiv(): number {
    let val = this.parsePower();
    while (this.pos < this.tokens.length) {
      const t = this.peek();
      if (t && t.type === 'op' && (t.val === '*' || t.val === '/')) {
        this.next();
        const rhs = this.parsePower();
        if (t.val === '*') {
          val *= rhs;
        } else {
          if (Math.abs(rhs) < 1e-13) return NaN;
          val /= rhs;
        }
      } else {
        break;
      }
    }
    return val;
  }

  private parsePower(): number {
    let val = this.parseUnary();
    const t = this.peek();
    if (t && t.type === 'op' && t.val === '^') {
      this.next();
      const rhs = this.parsePower(); // 右结合
      val = Math.pow(val, rhs);
    }
    return val;
  }

  private parseUnary(): number {
    const t = this.peek();
    if (t && t.type === 'op') {
      if (t.val === '+') {
        this.next();
        return this.parseUnary();
      }
      if (t.val === '-') {
        this.next();
        return -this.parseUnary();
      }
      if (t.val === '√') {
        this.next();
        const inner = this.parseUnary();
        if (inner < 0) return NaN;
        return Math.sqrt(inner);
      }
    }
    return this.parsePrimary();
  }

  private parsePrimary(): number {
    const t = this.peek();
    if (!t) throw new Error('Unexpected end of expression');

    if (t.type === 'num') {
      this.next();
      return t.val as number;
    }
    if (t.type === 'ident') {
      this.next();
      const id = String(t.val).toLowerCase();
      if (id === 'pi') return Math.PI;
      if (id === 'e') return Math.E;
      if (this.env[id] !== undefined) return this.env[id];
      throw new Error(`Unknown variable: ${id}`);
    }
    if (t.type === 'lparen') {
      this.next();
      const val = this.parseAddSub();
      const nextT = this.next();
      if (!nextT || nextT.type !== 'rparen') {
        throw new Error('Missing closing parenthesis');
      }
      return val;
    }
    throw new Error(`Unexpected token: ${t.val}`);
  }
}

export function evaluateSafe(expr: string, env: Record<string, number> = {}): number {
  try {
    const tokens = tokenize(expr);
    const parser = new Parser(tokens, env);
    return parser.parse();
  } catch {
    return NaN;
  }
}

// 6. 检测是否含且仅含合法变量 n
function hasVariableN(expr: string): boolean {
  try {
    const tokens = tokenize(expr);
    let hasN = false;
    for (const t of tokens) {
      if (t.type === 'ident') {
        const id = String(t.val).toLowerCase();
        if (id === 'n') hasN = true;
        else if (id !== 'pi' && id !== 'e') return false; // 含有其他非法变量
      }
    }
    return hasN;
  } catch {
    return false;
  }
}

// 7. 多值拆分 (支持 ± 扩展、或/or 拆分、非坐标括号外的逗号拆分)
export function splitMultiAnswers(input: string): string[] {
  let s = toHalfWidth(input).trim();
  if (!s) return [];

  // 扩展 ± 符号: "±3" -> "3 或 -3", "x=±3" -> "x=3 或 x=-3"
  if (s.includes('±') || s.includes('+-')) {
    const parts = s.split(/\s*(?:或|\bor\b)\s*/i);
    const expanded: string[] = [];
    for (const part of parts) {
      if (part.includes('±') || part.includes('+-')) {
        const p1 = part.replace(/±|\+-/g, '+');
        const p2 = part.replace(/±|\+-/g, '-');
        expanded.push(p1, p2);
      } else {
        expanded.push(part);
      }
    }
    s = expanded.join(' 或 ');
  }

  // 按 "或" / "or" 分割
  const orParts = s.split(/\s*(?:或|\bor\b)\s*/i);
  const result: string[] = [];

  for (const part of orParts) {
    // 检查是否有括号外的逗号（非坐标）
    let inParen = 0;
    let segStart = 0;
    for (let i = 0; i < part.length; i++) {
      const ch = part[i];
      if (ch === '(') inParen++;
      else if (ch === ')') inParen = Math.max(0, inParen - 1);
      else if (ch === ',' && inParen === 0) {
        const seg = part.slice(segStart, i).trim();
        if (seg) result.push(seg);
        segStart = i + 1;
      }
    }
    const finalSeg = part.slice(segStart).trim();
    if (finalSeg) result.push(finalSeg);
  }

  return result.map(stripVariablePrefix).map(stripDegree).filter(Boolean);
}

// 8. 单项等价判定
function gradeSingle(userRaw: string, acceptRaw: string): boolean {
  const uClean = toHalfWidth(userRaw).trim();
  const aClean = toHalfWidth(acceptRaw).trim();

  // 纯文本直接相同 (忽略大小写)
  if (uClean.toLowerCase() === aClean.toLowerCase()) return true;

  // 纯中文无运算符概念（如 "递增"、"增函数"）严格走字符串匹配
  const isPureChineseA = /^[\u4e00-\u9fa5]+$/.test(aClean);
  const isPureChineseU = /^[\u4e00-\u9fa5]+$/.test(uClean);
  if (isPureChineseA || isPureChineseU) {
    return uClean.replace(/\s+/g, '') === aClean.replace(/\s+/g, '');
  }

  // 剥离变量前缀与度数
  const uStripped = stripDegree(stripVariablePrefix(uClean));
  const aStripped = stripDegree(stripVariablePrefix(aClean));

  if (uStripped.toLowerCase() === aStripped.toLowerCase()) return true;

  // 判断是否为含变量 n 的表达式代入比较
  const uHasN = hasVariableN(uStripped);
  const aHasN = hasVariableN(aStripped);

  if (uHasN && aHasN) {
    let allMatch = true;
    for (let n = 1; n <= 6; n++) {
      const valU = evaluateSafe(uStripped, { n });
      const valA = evaluateSafe(aStripped, { n });
      if (isNaN(valU) || isNaN(valA) || !isFinite(valU) || !isFinite(valA)) {
        allMatch = false;
        break;
      }
      if (Math.abs(valU - valA) > 1e-6) {
        allMatch = false;
        break;
      }
    }
    if (allMatch) return true;
  }

  // 常量数值求值比较 (支持 2√3 ≡ √12, 1/2 ≡ 0.5, π/3, 3√2/2 等)
  const valU = evaluateSafe(uStripped);
  const valA = evaluateSafe(aStripped);

  if (!isNaN(valU) && !isNaN(valA) && isFinite(valU) && isFinite(valA)) {
    return Math.abs(valU - valA) < 1e-6;
  }

  return false;
}

// 9. 核心入口函数 gradeBlank
export function gradeBlank(response: string, accepts: string | string[]): boolean {
  if (response === undefined || response === null) return false;
  const rawList = Array.isArray(accepts) ? accepts : [accepts];
  const acceptList = rawList.filter(a => a !== undefined && a !== null);
  if (acceptList.length === 0) return false;

  const trimmedResponse = response.trim();

  // 第一层：若存在任一标准答案在文本或全半角层完全吻合，直接通过
  for (const acc of acceptList) {
    if (trimmedResponse === acc.trim()) return true;
    if (toHalfWidth(trimmedResponse).toLowerCase() === toHalfWidth(acc).trim().toLowerCase()) {
      return true;
    }
  }

  // 第二层：尝试多值解析与单项匹配
  const userItems = splitMultiAnswers(response);
  if (userItems.length === 0) return false;

  for (const acc of acceptList) {
    const accItems = splitMultiAnswers(acc);

    if (accItems.length > 1 || userItems.length > 1) {
      // 兼容旧判分：标准答案多值（如 ±3）、学生只写其中一个值，也算对（旧 blank-grade 测试约定）
      if (userItems.length === 1 && accItems.length > 1) {
        if (accItems.some((a) => gradeSingle(userItems[0], a))) return true;
        continue;
      }
      if (accItems.length === userItems.length) {
        // 双射匹配
        const used = new Array<boolean>(accItems.length).fill(false);
        let matchedCount = 0;

        for (const u of userItems) {
          for (let i = 0; i < accItems.length; i++) {
            if (!used[i] && gradeSingle(u, accItems[i])) {
              used[i] = true;
              matchedCount++;
              break;
            }
          }
        }
        if (matchedCount === accItems.length) return true;
      }
    } else {
      if (gradeSingle(response, acc)) return true;
    }
  }

  return false;
}
