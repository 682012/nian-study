#!/data/data/com.termux/files/usr/bin/bash
set -euo pipefail
cd "$(dirname "$0")"

if ! command -v node >/dev/null 2>&1; then
  echo "首次运行：安装 Node.js..."
  pkg install nodejs-lts -y
fi

if [ ! -d node_modules/wrangler ]; then
  echo "首次运行：安装 Wrangler..."
  npm install
fi

./verify.sh

if ! npx wrangler whoami >/dev/null 2>&1; then
  echo "需要登录 Cloudflare，浏览器会打开授权页面。"
  npx wrangler login
fi

echo "正在部署到固定 Worker：morning-bar-1aa6"
npx wrangler deploy

echo
echo "部署完成。"
echo "正式域名：https://nian.682012ysh.top/"
echo "Worker 地址：https://morning-bar-1aa6.qmm3544.workers.dev/"
