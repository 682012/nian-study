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

## 2026-09-14 V10.2 语音版（Version 46b539b7）
- 合并 V9.3 的 Edge 神经语音桥（secret EDGE_TTS_TOKEN）+ MiMo 内置 TTS（secret MIMO_API_KEY）+ BYO OpenAI TTS
- 前端云朗读优先（/api/nian/voice-config 自动发现），失败回退系统语音
- 真机验证：听音辨词点击发音走 /api/nian/edgetts；MiMo 中文 MP3 200
- GitHub 已同步：main=12bba19（V10），完整 V9 历史保留在 v9-archive 分支
- APK 资产补回 /downloads（300KB WebView 壳），书院页恢复下载入口

## 2026-09-14 V10.4 私有网关联调（Version 50d75e2b）
- 网关：https://api.682012ysh.top/v1（OpenAI 兼容，Caddy→filter-proxy→new-api）
- 模型：gemini-3-flash-agent（引导式陪学、稳定；注意 gemini-3-flash 渠道 6/6 触发 Google unsupported_country_region_territory 403，勿用）
- 凭证全部为 Worker secrets（不下发浏览器）：OPENAI_API_KEY=网关key、AI_BASE_URL、AI_MODEL
- 关键修复：cleanBaseUrl 空值原返回 DEFAULT_BASE（truthy）导致 || env 默认网关永不生效，无 key 请求全打到 OpenAI 官方 403；改为空返回 "" 并加 DEFAULT_BASE 末位回退
- 上游 403 unsupported_country 时自动换渠道重试 1 次（流式首字节前也重试）
- 前端默认 enabled=true 开箱即用，空 base/model/key=走服务器网关；设置面板可 BYO 覆盖
- 真机验证：云端在席、SSE 逐字回复、讲题、本地兜底三路径全通
