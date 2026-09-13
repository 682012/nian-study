#!/bin/bash
# /workspace(持久) <-> /tmp/nian-app(可构建) 同步并构建。proot 下 npm rename 有 bug，故用 yarn。
set -e
SRC=/workspace/nian-v10/app
DST=/tmp/nian-app
YARN="node /workspace/.toolchain/yarnpkg/package/bin/yarn.js"
rsync -a --delete --exclude node_modules --exclude dist "$SRC"/ "$DST"/
cd "$DST"
[ -d node_modules ] || $YARN install --registry https://registry.npmmirror.com --network-timeout 120000 --ignore-engines
$YARN build 2>&1 | tail -14
