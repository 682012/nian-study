# 念安 V7 · Cloudflare Worker 长期维护包

这个目录固定部署到：

- Worker：`morning-bar-1aa6`
- 正式域名：`https://nian.682012ysh.top/`
- 静态站目录：`public/`

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
