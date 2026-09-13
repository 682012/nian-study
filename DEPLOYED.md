# 线上部署记录 · 2026-09-14

- Worker morning-bar-1aa6 已部署 V10（Version ID 38a5d278-b26b-4eaf-af36-f4e41ff6942f）
- https://nian.682012ysh.top 与 workers.dev 双域 /api/health 均返回 nian-v10.1-ai
- 真机 390px 回归：答题闭环、SW 注册、V10 存档建立、零 JS 错误
- sw.js / index.html 响应头 max-age=0 must-revalidate：老用户下次打开自动升级到 V10，
  新 SW activate 清全部旧 nian-* 缓存；旧 hash 静态资源仍在 assets 存储中（无害，新 HTML 不引用）
- 既有 secrets（EDGE_TTS_TOKEN / MIMO_API_KEY）保留未删；V10 云 TTS 走 BYO 网关，前端默认系统语音
- 老存档 nian-study-progress-v2 首次打开自动迁移到 nian-study-progress-v10（旧档保留）
- APK 为远程网页壳，无需重编译即自动使用新版

## 回滚
重新部署 V9：cd /workspace/nian-src && 配置同 Token 后 npx wrangler deploy（其 wrangler.jsonc 指向旧 public）

## 待办
- GitHub 682012/nian-study 推送（等用户 PAT）
- 部署 Token 用完可在 Cloudflare 令牌列表吊销（名 ancient-lab-4b5a1）
