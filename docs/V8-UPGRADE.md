# 念安陪学 V8 增量说明

V8 继续部署到原 GitHub、原 `main`、原 Cloudflare Worker `morning-bar-1aa6` 和原域名 `nian.682012ysh.top`，没有新建或迁移项目。

## 新增能力

- `念安私塾`：读取本地学录，按英语、数学、语文近期正确率动态增加薄弱学科权重。
- `念安今日卷`：每天固定一套 20 题，但组卷结构来自用户当时的薄弱项。
- 英语新增 24 组句子、通知和短对话听力，支持正常与慢速重播。
- 句阵从 36 组扩充到 72 组。
- 语文新增 16 篇原创短章取证题。
- 数学参数变式从 10 类扩到 18 类，加入二次方程、方程组、数列求和、对数、坐标中点、增长率、平均数和极差。
- 百戏楼增加技能级连续正确/错误、到期时间和最近 80 次作答记录。
- 百戏楼错题最多保留最近 120 条，防止随机变式长期撑满 `localStorage`。
- 首页新增念安陪学卡和对话面板；念安会根据到期词、错题、薄弱学科、时间和刚刚的作答改变台词与状态图。
- 念安回复可以使用中文系统语音朗读。
- PWA 增加“今日卷、念安私塾、和念安说话”快捷方式。

## 同 Worker API

V8 在同一个 Worker 中增加：

- `GET /api/health`
- `POST /api/nian/respond`

API 只接收最多 240 字的消息和汇总学习指标，不接收完整学录；无数据库、无 Cookie、无第三方密钥。客户端在 API 不可用或离线时自动使用本地陪学逻辑。

Worker 入口为 `src/worker.js`，静态资源继续由同一 Worker 的 `ASSETS` binding 提供。禁止为了 API 另建 Worker。

## 主要文件

- `public/assets/nian-content-v8.js`：新增句阵、听力和原创短章。
- `public/assets/nian-companion-v1.js/.css`：动态念安、统一拾遗入口和对话面板。
- `public/assets/nian-arcade-v3.js/.css`：自适应组卷、技能调度和新玩法。
- `src/worker.js`：念安回复 API 和静态资源回落。
- `tests/content-v8.test.mjs`：扩展题库与存档上限检查。
- `tests/worker-api.test.mjs`：API 与静态资源回落检查。

## 验证

```bash
npm install
npm test
bash verify.sh
npx wrangler deploy --dry-run
```

强制保留：822 词、`nian-study-progress-v2`、`nianan_wordroom_v1`、APK 下载、原有三科功能、PWA、剧情和存档导入导出。

## APK 说明

APK 继续加载正式网站，所以 V8 网页功能会同步进入 APK。现有 APK 仍是 Android Debug 签名的 WebView 壳；在建立可保管的正式签名和完整 Android 工程前，不要假装它已经具备正式应用商店发布条件。
