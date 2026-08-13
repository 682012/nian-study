# 念安陪学项目接手说明（Manus / 其他开发助手）

> 先读完本文件，再修改项目。不要重新创建 Worker、重新绑定域名或迁移到其他托管项目。

## 1. 唯一正式项目

- GitHub：`https://github.com/682012/nian-study`
- 正式分支：`main`
- 正式网站：`https://nian.682012ysh.top/`
- Cloudflare Worker：`morning-bar-1aa6`
- Worker 默认地址：`https://morning-bar-1aa6.qmm3544.workers.dev/`
- 静态文件目录：`public/`
- Cloudflare 配置：`wrangler.jsonc`
- Android APK：`public/downloads/nian-study-android-v1.1.0.apk`

GitHub 仓库的 `main` 是唯一开发基线。当前仓库是可维护的静态成品工程，不是 React/TypeScript 原始源码；核心应用逻辑位于已构建的 `public/assets/NianStudyApp-YImpRfNC.js`。修改必须克制，优先通过独立增量 JS/CSS 扩展，避免直接大规模重写压缩后的核心包。

## 2. 不可违反的约束

1. 不创建新的 Worker。
2. 不重新绑定 `nian.682012ysh.top`。
3. 不迁移到 Cloudflare Pages、ChatGPT Sites 或其他新项目。
4. 不删减已有学习、奖励、剧情、PWA、APK 下载和移动端功能。
5. 保留 822 个真实英语词条；尾记录必须仍为 `id:822` / `imagine`。
6. 保留主存档键 `nian-study-progress-v2` 和旧版迁移键 `nianan_wordroom_v1`。
7. 不清空或重命名本地存档；保留学录导入/导出兼容。
8. 保留 APK 作为远程 WebView 壳：网页发布后 APK 主界面应自动同步。
9. 修改后先运行检查，再提交并推送 `main`；部署到同一个 `morning-bar-1aa6`。

## 3. 当前产品能力

### 原有书院主体

- 英语：822 词、识义、选择、拼写、语法阅读题库、复习间隔、错词回炉。
- 数学：56 道固定题，18 类题型，七步拆题。
- 语文：46 道固定题，15 类题型。
- 三科八题阶段模拟、知识图谱、今日课帖、错因归档。
- 专注计时、学识、连续学习、默契、印记、游赏时辰。
- 林念安多状态立绘、沈桃夭 Boss/短事件、诗笺、文房与书院舆图。
- PWA、离线页、Service Worker、Android WebView APK。

### 2026-08-12 新增“百戏楼”

入口和逻辑：

- `public/assets/nian-arcade-v3.js`
- `public/assets/nian-arcade-v3.css`
- 由 `public/assets/nian-lively-v2.js` 动态加载。
- Service Worker 缓存：`nian-static-cf-v5-arcade` / `nian-pages-cf-v5-arcade`。

玩法：

- 听音辨词：从原 822 词解析词库，只播放设备英语语音，先不显示英文。
- 听写巡夜：听发音后输入完整英文。
- 句阵重排：36 组英语句子，点击词块还原语序。
- 算学千变：10 类数学题型按随机参数生成变式，可反复练习。
- 经史百问：新增 48 道语文专项题。
- 三馆巡考：英语、数学、语文混合轮换。
- 今日长卷：每天按日期生成一套固定 20 题。
- 百连闯关：三颗心、最多 100 关。
- 错题追击：只重做百戏楼里真实答错的题。

百戏楼不会另开一套假进度。答题继续写入 `nian-study-progress-v2`：学识、连续学习、三科累计、词汇掌握、每十词游赏奖励和错题记录均保持联动；扩展字段放在 `arcadeV1` 下。

## 4. 目录说明

```text
public/
  index.html                         已构建首页
  assets/
    NianStudyApp-YImpRfNC.js         核心应用与 822 词、原题库、存档逻辑
    index-B65g4y4e.css               核心样式
    nian-lively-v2.js/.css           活泼视觉与互动增量层
    nian-arcade-v3.js/.css           百戏楼多玩法增量层
    nian-song/*.webp                 9 张林念安状态图
  downloads/*.apk                    Android WebView 壳
  sw.js                              离线缓存
  manifest.webmanifest               PWA 配置
wrangler.jsonc                       固定 Worker 与自定义域名配置
verify.sh                            发布前检查
deploy.sh                            Termux 应急手动部署
README-手机部署.md                   面向日常维护的说明
```

## 5. 开发与验收

安装依赖：

```bash
npm install
```

强制检查：

```bash
./verify.sh
node --check public/assets/nian-lively-v2.js
node --check public/assets/nian-arcade-v3.js
npx wrangler deploy --dry-run
```

至少回归以下项目：

- 360 / 390 / 412px 手机宽度无横向溢出。
- 林念安点击互动正常。
- 原英语、数学、语文、专注、拾遗、舆图、学录入口正常。
- 百戏楼听音辨词能播放英语语音并显示 4 个选项。
- 听写能输入并判分；句阵可排序；数学与语文可作答。
- 答题后 `nian-study-progress-v2` 更新，`nianan_wordroom_v1` 仍可迁移。
- `/sw.js` 包含 `nian-static-cf-v5-arcade`。
- `?source=android-app` 模式正常，并隐藏重复的 APK 下载卡。

## 6. 发布方式

首选流程：提交并推送 GitHub `main`，由现有 Cloudflare Workers Builds 自动部署。

如果 Workers Builds 没有触发，只能对现有项目执行：

```bash
npx wrangler deploy
```

部署输出必须明确显示：

- `Uploaded morning-bar-1aa6`
- `nian.682012ysh.top (custom domain)`

部署后同时检查正式域名和 `workers.dev` 地址。禁止因自动构建断开而创建替代 Worker。

## 7. 下一阶段建议

当前百戏楼已经解决“玩法太少、英语只有读、固定题很快见底”的第一层问题。下一阶段优先级：

1. 给听力加入句子级听力、短对话与听后选信息，而不只听单词。
2. 扩充句阵到 100+，按语法点分级。
3. 扩充语文到真实短阅读材料和分点采分题。
4. 数学补充图形题、函数图像和按薄弱点自动组卷。
5. 把百戏楼战果更深地接入林念安台词、沈桃夭 Boss 和书院地图解锁。

人物关系必须继续使用“默契”，不要改成廉价恋爱好感度；林念安仍是核心陪学角色，玩法服务于学习，不要变成与学习无关的签到页。

## 8. 当前交接版本

- 基线提交：`207a4c4`（活泼视觉层）
- 百戏楼提交：`6488e47`（多玩法与题库扩展）
- 交接文档提交：以 `main` 最新提交为准
- 交接日期：2026-08-12

