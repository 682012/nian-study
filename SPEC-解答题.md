# 数学解答题 · 设计与派工文档（SPEC v1 · 2026-09-27）

> 用途：主代理规划 + 子代理派工的唯一依据。中断后先读本文件第 7 节「进度」。
> 所有接口均按 2026-09-27 实际代码核对过（types.ts / engine.ts / session-store.ts / QuizModal.tsx / worker.js / blank-grade.ts）。

## 0. 目标与边界

考纲数学「解答 4 题 = 50 分」是全卷最大块，目前系统只有选择和填空，**解答题完全缺失**。本期交付：

1. **分步作答**：一道大题拆成 3–5 个关键步骤，每步一个可判定的中间结果，学生逐步填写。
2. **按采分点给分**：每步有分值，汇总为「本题得分 x / 12」，贴近阅卷方式，而不是只判对错。
3. **分步提示**：每步可点「提示」，看提示则该步最多得一半分（仿阅卷“过程分”）。
4. **AI 批改（可选增强）**：学生可把完整过程写进文本框，交给念安按采分点批改；AI 不可用时回退本地关键词批改。AI 结果只作参考，**不改变本题的判分结果**（判分以分步答案为准，保证可测、可复现）。

不做：手写拍照批改（已有扫描链路，留作下期）、几何证明题（无法自动判定中间结果）。

## 1. 为什么这样设计（取舍）

| 方案 | 结论 |
|---|---|
| 纯 AI 批改整道题 | 不稳定、不可测、慢、断网就废 → 只做增强层 |
| 只判最终答案 | 等于又一道填空，丢了“过程分”这个解答题的本质 |
| **分步中间结果 + 采分点 + 可选 AI** | 本地可判、可单测、离线可用；AI 负责“讲过程写得好不好” ✅ |

题源用**参数化生成器**（同 math-builders 思路），不写死题库：无限变式、可用扫描测试兜底数值质量。

## 2. 数据模型（契约，子代理不得改名）

在 `app/src/quiz/types.ts` 扩展：

```ts
export type QuestionType = 'choice' | 'input' | 'tokens' | 'blank' | 'solve';

export interface SolveStep {
  ask: string;          // 本步要求，如「求角 C 的度数」
  accepts: string[];    // 等价答案，交给 gradeBlank 判；首项为标准写法
  unit?: string;        // 显示在输入框后，如「°」「cm」；不参与判分
  score: number;        // 本步分值
  hint: string;         // 提示（看了本步最多得 floor(score/2)）
  explain: string;      // 本步解析（交卷后显示）
}
export interface SolveData {
  topic: string;        // 与 MATH_TOPIC 同风格，如「解三角形」
  total: number;        // = steps 分值之和，必须 12 或 13
  steps: SolveStep[];   // 3–5 步
  solution: string[];   // 标准解答全过程（逐行），AI 批改与展示都用
  rubric: RubricPoint[];// 采分点（沿用现有 RubricPoint：point/score/keywords），分值和 = total
  pitfall?: string;
}
// Question 增加可选字段：
//   solve?: SolveData;   // type='solve' 时必有
// type='solve' 时 answer 填 steps.map(s => s.accepts[0])（便于错题本/正解展示复用）
```

作答格式：`respond(response: string[])`，长度 = steps.length，未填为 `''`。
看提示的记录不进 response；由 UI 以 `hintsUsed: boolean[]` 传入判分（见 §3）。

## 3. 判分（纯函数，`app/src/quiz/solve-grade.ts`）

```ts
export interface SolveStepResult { correct: boolean; got: number; max: number; hinted: boolean }
export interface SolveResult { steps: SolveStepResult[]; got: number; total: number; full: boolean }
export function gradeSolve(q: Question, responses: string[], hintsUsed?: boolean[]): SolveResult;
```

规则：
- 每步用 `gradeBlank(responses[i], step.accepts)` 判；对 → `got = hinted ? floor(score/2) : score`，错 → 0。
- 不做“后步依赖前步”的连带扣分（每步独立判，避免一步错全错；与阅卷“后续按正确思路给分”一致）。
- `full = got === total`。
- `checkAnswer(q, response)` 对 solve：`gradeSolve(q, response as string[]).full`（无提示信息时按未看提示算）。
  session 里要拿到带提示的分数，由 UI 自行调用 gradeSolve 展示；`correct` 仍取 full，用于错题本与连击。

`gradeBlank` 需要扩展（同文件或 blank-grade.ts）：
- 支持 `k√n`（`2√3`、`-3√2`、`√3/2`、`3√2/2`）、`kπ`/`π/3` 类写法与数值等价；
- 支持 `60°` 去度数符号、`x=`/`a_n=`/`S_n=` 等左侧前缀剥离；
- 通项/多项式类答案（如 `2n+1`、`3·2^(n-1)`）走**代入法**：对 n=1..6 求值比较（仅当两边都只含变量 n 时启用）。
- 现有 6 个 blank-grade 测试必须仍然全绿。

## 4. 生成器（`app/src/quiz/math-solve.ts`）

```ts
export type SolveBuilder = (rng: Rng) => { topic: string; prompt: string; svg?: string; solve: SolveData };
export const SOLVE_BUILDERS: SolveBuilder[];
export function mathSolveQuestion(rng?: Rng, topic?: string): Question; // type='solve'
```

首批 6 个（对应广东 3+证书 历年解答题高频）：

| # | topic | 题型骨架 | 步骤示例（分值） |
|---|---|---|---|
| 1 | 解三角形 | 已知两角一边/两边夹角，求第三角、边、面积 | 求 C(3) → 正弦定理求 b(4) → 面积(5) |
| 2 | 等差数列 | 已知 a₃、S₅ 等，求 a₁,d、通项、Sₙ 或 Sₙ 最大值 | a₁,d(4) → aₙ(4) → S₁₀(4) |
| 3 | 等比数列 | 已知 a₂、a₅，求 q、通项、前 n 项和 | q(4) → aₙ(4) → S₅(4) |
| 4 | 函数应用（利润） | 售价每涨 x 元少卖 k 件，求利润函数、最大利润 | 利润表达式代值(3) → 顶点横坐标(5) → 最大利润(5) |
| 5 | 直线与圆 | 圆心半径、点到直线距离、判定位置、弦长 | 圆心/半径(4) → 距离(4) → 弦长(5) |
| 6 | 三角函数性质 | y=A sin(ωx+φ)+B，求周期、最大值及取到时 x、单调区间端点 | 周期(4) → 最大值(4) → 对应 x(4) |

硬约束（扫描测试会检查）：
- 所有中间结果只能是：整数、最简分数、`k√n`、`kπ/m`、特殊角度数；**禁止**浮点小数（正则 `\d\.\d{3,}`、NaN、Infinity、undefined）。
- 参数反推构造：先定“好看的答案”，再倒推题目条件（如先定勾股数/特殊角/整数 a₁,d）。
- 每个 accepts[0] 必须能被 `gradeBlank` 判对；每步 score 之和 = total ∈ {12,13}；rubric 分值和 = total。
- prompt 为完整中文题干，数学符号用 Unicode（x²、√、π、≤、∠、Sₙ）。
- 同一 topic 200 次随机生成至少出现 20 种不同题干（防变式过少）。

## 5. 接线（engine / modes / session / UI）

- `engine.ts`：`GeneratorType` 加 `'math-solve'`；`questionForType` 加 case；`MODE_COUNTS['math-solve']=4`；`checkAnswer` 加 solve 分支。**不**加入 adaptiveCycle / daily（��答题耗时长，混进小卷会拖节奏）。
- `modes.ts`：新增 `SOLVE_MODE: ModeMeta = { id:'math-solve', seal:'解', title:'数学解答题', note:'考纲解答 4 题 50 分 · 分步给分', count:4, tone:'gold', subject:'math' }`，放进 `MATH_TOPIC_MODES` 首位（FILL_MODE 之前）。`ALL_MODES` 自动包含。
- `session-store.ts`：`LastResult` 增加可选 `solve?: SolveResult`；`respond` 增加可选第二参 `meta?: { hintsUsed?: boolean[] }`，solve 题时调用 `gradeSolve` 写入 `result.solve`，`correct = solve.full`。其他题型行为不变。
- `QuizModal.tsx`：新增 `SolveBody`：
  - 逐步卡片：步骤序号 + ask + 分值徽标 + 输入框（后缀 unit）+「提示」按钮（点后展开 hint，徽标变“最多 ⌊s/2⌋ 分”）。
  - 底部「交卷」按钮：至少填 1 步才可点；提交 `respond(values, { hintsUsed })`。
  - 交卷后：每步显示 ✓/✗、得分、正解 `accepts[0]+unit`、`explain`；顶部总分「x / total」；「标准解答」折叠区显示 `solution` 逐行；`pitfall` 放在易错点。
  - 「过程批改」折叠区：textarea（≤1500 字）+「请念安批改」按钮 → 调 §6 的客户端；显示逐采分点得分与评语；失败时显示本地批改结果并注明「离线批改」。
  - 反馈区现有的「正解：」行对 solve 题**不显示**（避免把 4 个答案挤成一行）。
- 移动端：输入框 `inputMode="text"`（要能输 √ π /），在输入框下方提供一排小键 `√ π ² / − °` 点击插入光标处。

## 6. AI 过程批改

Worker 新端点 `POST /api/nian/ai/grade`（worker.js，照 `handleAIScan` 的结构写）：
- 请求：`{ prompt, solution: string[], rubric: RubricPoint[], work: string(≤1500), baseUrl?, apiKey?, model? }`
- 系统提示：按 rubric 逐点判定是否体现，**只输出 JSON**：`{"points":[{"point":"...","score":n,"max":n,"comment":"..."}],"total":n,"summary":"一句话总评"}`；score 必须 ≤ max；不得超出 rubric 条目。
- 服务端校验：点数与 rubric 对齐、分数钳制到 [0,max]、total 重算；解析失败返回 `{ok:false, code:'INVALID_AI_RESPONSE'}`。超时 30s，错误码沿用 `UPSTREAM_TIMEOUT/UPSTREAM_UNAVAILABLE/UPSTREAM_AI_FAILED`。
- 客户端 `app/src/lib/grade-client.ts`：`aiGrade(settings, req)` → 成功返回 AI 结果；任何失��返回 `localGrade(rubric, work)` 结果并带 `offline:true`。
- `localGrade`（纯函数，放 solve-grade.ts）：每个 rubric 点，work 中命中其 keywords 任一（经 halfWidth+去空格、小写）即得满分，否则 0。

## 7. 派工拆分（子代理并行，主代理审计）

| 包 | 内容 | 依赖 | 交付文件 |
|---|---|---|---|
| **A 判分** | types 扩展、gradeBlank 扩展、solve-grade.ts（gradeSolve+localGrade）+ 测试 | 无 | types.ts diff、blank-grade.ts、solve-grade.ts、solve-grade.test.ts |
| **B 生成器** | math-solve.ts 6 个 builder + 扫描测试 | 只依赖 §2 契约 | math-solve.ts、math-solve.test.ts |
| **C 界面接线** | engine/modes/session/QuizModal/样式 | A、B 的导出签名 | 各文件 diff、styles 片段 |
| **D Worker** | /api/nian/ai/grade + grade-client.ts | A 的 localGrade 签名 | worker.js diff、grade-client.ts |

执行顺序：A、B、D 并行 → 主代理合入并跑测试 → C → 全量 tsc/vitest/build → 部署 → 线上验证。
子代理规则：只输出完整文件内容（或精确的替换片段），不许假设未列出的导出；主代理负责落盘、跑检查、逐行审计。

## 8. 验收清单（全部满足才算完成）

1. `tsc -b` 0 错误；`vitest run` 全绿，且新增测试至少覆盖：
   - gradeBlank 新写法：`2√3`≡`√12`、`π/3`≡`60°`?（**否**，角度与弧度不互通，按 accepts 列举）、`3√2/2`、`a_n=2n+1`≡`2n+1`≡`1+2n`、`3·2^(n-1)`≡`3*2^(n-1)`；旧 6 测试不变。
   - gradeSolve：全对=满分、错一步只扣该步、看提示减半、空答 0 分、长度不足按空处理。
   - 6 个 builder 各 200 次：无坏数、total∈{12,13}、步分和=total=rubric 和、accepts[0] 判对、题干去重 ≥20。
   - localGrade 命中/未命中；Worker 响应校验函数（抽成纯函数导出可测）。
2. `vite build` 通过；部署后从 US 节点拉线上 JS，确认含「数学解答题」且哈希与本地一致。
3. 手动流程（若可 DOM 冒烟则跑）：进模式 → 填 2 步 + 看 1 次提示 → 交卷 → 得分正确 → 批改离线回退可显示。
4. HANDOFF 更新；git commit + gh-push-delta 推送。

## 9. 进度

- [x] P0 SPEC 落盘（本文件）
- [x] P1（已合入+测试通过） A 判分包（修：测试重复键、ₙ 下标前缀、± 单值命中回退旧行为）
- [x] P2 B 生成器包
- [x] P3 D Worker 包（已合入 worker.js，语法检查通过；响应校验有钳制与重算）
- [x] P4 合入 A/B/D + 测试全绿
- [x] P5 C 界面接线
- [x] P6 全量检查 + 构建 + 部署 + 线上验证
- [x] P7 HANDOFF + 推送

### 进度日志
- 09-27 A/B 合入 app/src，tsc 0 错，vitest 19 文件 187 绿；D 的 grade-client 已合入，worker 片段待合（stage/D/worker-grade-snippet.js）
- 09-27 深夜 P1-P6 完成：子代理并行产出 A/B/D，主代理审计修 4 处（A 的 types.ts 整文件重写被整份拒用、B 的 pick 参数反序、A 测试缺 Question 必填字段、D 的 fetchUpstream URL 拼接 bug）；gradeBlank ± 回归修复（单值命中任一可接受值）；UI(SolveBody+solve-add.css) 为中断调用遗留成果，审计通过并补挂样式 import；186 测试全绿 + tsc 0 + build 过

- 09-27 派工记录：A/B/D/C 四包全部由子代理产出，主代理审计修正 4 处（types 重复键、blank-grade 下标 ₙ 正则、± 旧行为回归、worker 重复合入与重复路由）。B2 审计包判定无需采纳（B 版变式更多且判分器原生支持隐式乘法）。

- 09-27 部署 5868b2aa（线上 md5 与本地一致，grade 端点路由与入参校验实测通过）；GitHub 已推送
