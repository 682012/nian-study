# 念安陪学 V10（nian-study 重建版）

广东中职“3+证书”陪学 PWA。V10 在 V9 丢失前端源码的基础上原地重建：数据与代码分离、
TypeScript 全链路、FSRS 科学复习、可配置 OpenAI 兼容云端念安。域名/Worker/存档/APK 全部不变。

## 技术栈
Vite 5 + React 18 + TypeScript + zustand；ts-fsrs v5；Cloudflare Workers + Static Assets；手写 Service Worker。

## 目录
- src/content/ 13 份内容 JSON（822 词、172 精编题、句型/听力/阅读、图谱、诗笺月令成就）
- src/quiz/ 题目模型、RNG、19 个程序化数学出题器（含 SVG）、出题引擎、模式
- src/lib/ 进度落账与 V9 迁移、FSRS 封装、本地规则念安、AI 客户端、备份、主题、语音
- src/store/ 答题会话、进度（persist）、UI
- src/components src/pages 答题弹窗、念安对话（含云端设置）、四页面
- worker/ Cloudflare Worker（本地规则 + AI 非流式/SSE + TTS，BYO baseUrl，SSRF 护栏）
- tests/ Playwright 真实浏览器回归
- scripts/extract-all.mjs 从 V9 压缩包抢救内容的脚本（在上级 nian-v10/scripts）

## 开发与验证（沙盒 proot）
npm 在本环境有 rename bug，用 Node20 + yarn classic（工具链在 /workspace/.toolchain）：
- 全量一键：./run-e2e.sh（同步→tsc→63 单测→build→preview→真机回归）
- 仅单测：yarn vitest run

## 存档兼容
- 新键 nian-study-progress-v10；首次打开自动从 nian-study-progress-v2 迁移并保留旧档
- 单词/错题排期升级为 FSRS，旧 mastery/due 映射 stability/due，学习历史不丢
- 设置页（书院页底部）支持 JSON 导出/导入（含旧档导入）与深色模式

## 云端念安
对话右上角齿轮：启用并填 OpenAI 兼容 Base URL / 模型 / Key（仅存本机 localStorage）。
Key 随请求经 /api/nian/ai(/stream) 转发，不落服务器；失败自动回退本地规则应答。
Worker 拒绝非 https、localhost、内网段、带认证信息的 Base URL。

## 部署
见 DEPLOY.md。Worker morning-bar-1aa6、域名 nian.682012ysh.top 不变。
版本探针：/api/health 应返回 nian-v10.1-ai。
