# 念安 V9 · Cloudflare Worker 长期维护包

本版界面、修复清单及验证方法见 [V9 更新说明](docs/V9-WORKSPACE.md)。

这个目录固定部署到：

- Worker：`morning-bar-1aa6`
- 正式域名：`https://nian.682012ysh.top/`
- 静态站目录：`public/`

## 当前正式发布链

日常维护以本 GitHub 仓库的 `main` 分支为唯一基线。提交并推送到 `main` 后，由现有 Cloudflare Workers Builds 自动部署到同一个 `morning-bar-1aa6`；不新建 Worker、不迁移项目，也不重新绑定域名。

`deploy.sh` 保留为 Termux 下的应急手动发布方式，不替代 GitHub 自动部署链。

## Android App 同步说明

`public/downloads/nian-study-android-v1.1.0.apk` 是轻量 WebView 壳：先显示 APK 内置启动页，再打开正式网站。因此网页功能和样式发布后，APK 主界面会自动使用同一版；只有安装包内的启动页、图标和壳版本号需要重新打包才会变化。

V9 在原功能上加载 `nian-workspace-v9.css` 与 `nian-workspace-v9.js`，整合书案、练习、藏书和书院导航，并修复进度同步、数学选项、语音取消与缓存更新。存档键与原 822 词 ID 保持兼容。

## 百戏楼多玩法扩展

首页新增“百戏楼”，直接复用原 822 词和 `nian-study-progress-v2` 学录：

- 听音辨词：只播放英文，不先显示单词；
- 听写巡夜：听发音后输入完整英文；
- 句阵重排：点击词块组成正确句子；
- 算学千变：10 类数学题型按随机参数生成变式；
- 经史百问：新增 48 道语文专项题；
- 三馆巡考、每日长卷、百连闯关与错题追击。

闯关答题会继续累计原学识、三科答题量、词汇掌握度、连续学习和每十词游赏奖励；退出百戏楼后原地更新学录，无需刷新整页。语音默认使用设备系统音色，也可自行配置云端朗读；不上传录音。

## 第一次在 Termux 使用

把本 ZIP 解压到 Termux 主目录后：

```bash
cd ~/nian-worker-maintainable
./deploy.sh
```

脚本会自动：

1. 检查 Node.js，没有就安装；
2. 安装 Wrangler；
3. 检查网页核心文件和 9 张念安状态立绘；
4. 首次要求登录 Cloudflare；
5. 部署到同一个 `morning-bar-1aa6` Worker。

## 以后更新

以后只要把新版网页文件覆盖到 `public/`，然后：

```bash
cd ~/nian-worker-maintainable
./deploy.sh
```

不需要重新创建 Worker，也不需要重新绑定 `nian.682012ysh.top`。

## 本包状态图

`public/assets/nian-song/` 内包含：

- welcome.webp
- idle.webp
- teaching.webp
- thinking.webp
- correct.webp
- break.webp
- celebrate.webp
- tease.webp
- invite.webp

## 本地预览（可选）

```bash
cd ~/nian-worker-maintainable
npm install
npm run dev
```

## 备注

`wrangler.jsonc` 已把自定义域名写入配置，后续 Wrangler 部署会以这个配置为准。
