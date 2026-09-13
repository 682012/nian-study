#!/bin/bash
# 一键：同步源码到 /tmp 构建区 → 构建 → 起 preview → 真实浏览器回归 → 关服务
set -e
export PATH=/workspace/.toolchain/node20/bin:$PATH
SRC=/workspace/nian-v10/app; DST=/tmp/nian-app
YARN="node /workspace/.toolchain/yarnpkg/package/bin/yarn.js"
rsync -a --delete --exclude node_modules --exclude dist --exclude .git --exclude shots "$SRC"/ "$DST"/
cd "$DST"
[ -d node_modules ] || $YARN install --registry https://registry.npmmirror.com --network-timeout 120000 --ignore-engines
node_modules/.bin/tsc -b
node_modules/.bin/vitest run
node_modules/.bin/vite build
node_modules/.bin/vite preview --port 4173 >/tmp/preview.log 2>&1 &
SRV=$!
sleep 4
node tests/e2e-smoke.mjs || RC=1
kill $SRV 2>/dev/null
exit ${RC:-0}
