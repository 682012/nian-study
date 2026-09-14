# 念安学习 V10 · 续建手册（给接手的 AI 看）

> 下次更新时，第一句话把本文件路径甩给 AI：
> 「读 /workspace/nian-v10/HANDOFF.md，然后我们继续。我这次要做的是：____」

## 0. 铁律（先读）
1. **先跑测试再动手**：任何修改后必须 `tsc -b` + `vitest run` 全绿；部署后真机 Playwright 验证，不许只凭"代码看起来对"。
2. **凭证不回显、不入 git、不入记忆正文**：只用 `$(cat /workspace/.secrets/cf_token)` 这种方式引用。
3. **822 词 ID（1–822）和老进度 key `nian-study-progress-v2` 不可改动**，老用户数据迁移必须保持兼容。
4. 不确定的考纲/题型/政策事实，先联网查证再写，禁止凭印象编。
5. 面向广东「3+证书」高职高考，提分优先于炫技：优先补真题里占分大的题型。

## 1. 项目是什么
- Vite + React + TypeScript + Zustand + Tailwind/宋韵样式的学习 PWA「念安学习」。
- 线上：https://nian.682012ysh.top （Cloudflare Worker `morning-bar-1aa6`，配置 `app/wrangler.jsonc`，静态资源+反代 AI/TTS）。
- GitHub：`682012/nian-study`，main 分支即 V10（V9 在 v9-archive 分支）。
- 源码：`/workspace/nian-v10/app`（本身是 git 仓库）。
- 目录速览：`src/quiz/` 出题引擎与各题型生成器；`src/content/*.json` 静态题库；`src/components/QuizModal.tsx` 答题弹窗；`worker/` Cloudflare Worker（AI 反代+TTS 三路降级）。

## 2. 环境（/tmp 每次会被清空，必须重建）
```bash
export PATH=/workspace/.toolchain/node20/bin:$PATH
# 工具链持久位置：node20=/workspace/.toolchain/node20  yarn=/workspace/.toolchain/yarnpkg/package/bin/yarn.js
mkdir -p /tmp/nian-app
rsync -a --delete --exclude node_modules --exclude dist --exclude .git --exclude shots \
  /workspace/nian-v10/app/ /tmp/nian-app/
cd /tmp/nian-app
node /workspace/.toolchain/yarnpkg/package/bin/yarn.js install --registry https://registry.npmmirror.com --ignore-engines
```
之后每次改完源码，先 rsync 同步到 /tmp/nian-app 再跑检查。

## 3. 标准流程：改 → 测 → 构 → 部署 → 验 → 推送
```bash
cd /tmp/nian-app
node_modules/.bin/tsc -b
node_modules/.bin/vitest run
node_modules/.bin/vite build
export CLOUDFLARE_API_TOKEN=$(cat /workspace/.secrets/cf_token) \
       CLOUDFLARE_ACCOUNT_ID=22721f6cd478a327c584a2a7de726d6c
CI=1 node_modules/.bin/wrangler deploy   # 偶发 fetch failed，重试即可，认 "Version ID"
```
部署后用 Playwright（chromium 在 /tmp/nian-app/node_modules）走一遍改动点，盯 console pageerror。

GitHub 同步（api.github.com 网络慢，脚本已内置重试+并发6，给 300s+ 超时）：
```bash
rsync -a --delete --exclude .git --exclude node_modules --exclude dist --exclude shots \
  /workspace/nian-v10/app/ /workspace/nian-git/
cd /workspace/nian-git && git add -A && git commit -m "说明"
GH_TOKEN=$(cat /workspace/.secrets/gh_token) COMMIT_MSG="说明" \
  node /workspace/.toolchain/gh-push.mjs
```
源码仓库 /workspace/nian-v10/app 也正常 git commit 留痕。

## 4. 当前进度（截至 2026-09-14 夜，97 单测绿，线上 Version 484fa97a）
- 数学选择生成器 41 个（原 19 + math-builders-2.ts 新增 22），覆盖集合/充要条件/定义域/二次函数/三角/解三角形/等比数列/向量/立体几何(圆柱圆锥球)/复数/圆方程/指数对数/统计等。
- 数学填空：`src/quiz/math-fill.ts` 12 生成器；题型 `'blank'`；判分 `src/quiz/blank-grade.ts`（分数/小数/±/全角/去空格等价）。
- 语文古诗文默写：`src/content/dictation.json` 20 题，生成器类型 `'gushi'`（注意别和英文听写的 `'dictation'` 混用）。
- 练习页有「数学考点专项」6 组分区 + 数学填空专项 + 古诗文默写（模式定义在 src/quiz/modes.ts）。
- FSRS 调度、822 词迁移、Worker AI 反代（SSE/403换渠道/本地兜底）、TTS 三路降级均已在线。

## 5. 待办（按提分性价比排序）
1. 英语语法填空 + 完成句子（新题型，仿 math-fill 的 blank 机制 + 专用判分）。
2. 数学解答题：分步提示 + 采分点 + AI 批改（占 50 分，最大头）。
3. 语文/英语作文：AI 批改（要点覆盖、格式、语言，先保及格再优化）。
4. 历年真题 PDF 结构化成精编题库。
5. 题库扩容：填空题、默写继续加量；干扰项质量回归。

## 6. 新增一种题型的最小清单（照抄别漏）
1. 出题：在 src/quiz/ 加生成器，返回标准 Question（type 若新需在 engine.ts 的 QuestionType/GeneratorType 联合类型登记）。
2. 判分：选择类进 checkAnswer；填空类走 gradeBlank 或新写判分器。
3. 模式：modes.ts 加 ModeMeta（id 全局唯一！）并挂到练习页分区。
4. UI：QuizModal.tsx 确认新 type 有作答区和正解反馈区。
5. 测试：xxx.test.ts 至少验证"正解判对/错解判错/结构合法"。
6. 按第 3 节全流程走一遍。

## 7. 本沙盒的坑：.git 会腐化（2026-09-14 实测）
- 现象：该文件系统有 l2s 冷卸机制，冷门文件会被替换成指向 `.l2s.tmp_*` 的符号链接；临时文件被清理后，`git status` 报 `bad object HEAD`、objects 大面积 missing。
- **唯一可靠的真备份 = GitHub 远程**。每次开发结束必须推送；本地 `.git` 坏了不慌：
  ```bash
  export PATH=/workspace/.toolchain/node20/bin:$PATH
  rm -rf /tmp/nian-gh
  git clone "https://x-access-token:$(cat /workspace/.secrets/gh_token)@github.com/682012/nian-study.git" /tmp/nian-gh
  mv /workspace/nian-v10/app/.git /workspace/.toolchain/app-dotgit-corrupt-$(date +%Y%m%d)
  cp -a /tmp/nian-gh/.git /workspace/nian-v10/app/.git
  cd /workspace/nian-v10/app && git config core.fileMode false && git fsck
  ```
- 冷备份单文件：/workspace/.toolchain/nian-app-git-20260914.tar（解包后 fsck 验证过可用；后续可定期重制）。
- 打包 zip 时排除 `*.l2s*` 垃圾；打完立刻让用户下载，别指望 zip 在沙盒里长期保鲜。
