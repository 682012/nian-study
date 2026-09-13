# V10 部署

前置：Cloudflare API Token（需 Workers Scripts:Edit + 该 Zone 权限）。旧 token（/root/.cf_token）只有 Zone:Read，需要新签。

```bash
# 本地构建（沙盒用 node20 + yarn classic，见 run-e2e.sh）
yarn && yarn build
# 部署（二选一）
CLOUDFLARE_API_TOKEN=xxx npx wrangler deploy
# 或在 HB 机：源码 clone 后同命令；Worker 名/域名保持 morning-bar-1aa6 / nian.682012ysh.top
```

验证：
- /api/health 返回 {"version":"nian-v10.0-rebuild"}
- 旧用户存档键 nian-study-progress-v2 首次打开自动迁移到 nian-study-progress-v10，旧档保留。
