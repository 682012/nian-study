# 念安陪学修复版提交说明

> 本文件保留的是 `78927a4` 修复补丁说明。当前目录已经继续加入 V8 增量功能，正式提交时应提交整个当前目录的变更，并同时阅读 `docs/V8-UPGRADE.md`，不要只重复应用旧补丁。

这份目录是完整可提交源码，基线为 GitHub `682012/nian-study` 的 `main@78927a47f39de0d1fa0d102809c3826a5b072c95`。

## 最省事的提交方式

把整个目录交给能够操作 GitHub 的工具，并明确要求：

> 将目录内全部文件覆盖提交到 `682012/nian-study` 的 `main` 分支；不要创建新仓库或新分支。提交前运行 `bash verify.sh`，通过后提交并推送。

## 使用补丁提交

同目录另附 `nian-study-fixes-from-78927a4.patch`，可在基线仓库中执行：

```bash
git switch main
git pull --ff-only
git apply --check /path/to/nian-study-fixes-from-78927a4.patch
git apply /path/to/nian-study-fixes-from-78927a4.patch
bash verify.sh
git add public/_headers public/assets/nian-arcade-v3.css public/assets/nian-arcade-v3.js public/assets/nian-lively-v2.css public/assets/nian-lively-v2.js public/sw.js verify.sh
git commit -m "fix: repair audio storage and cache behavior"
git push origin main
```

## 固定部署目标

- Worker：`morning-bar-1aa6`
- 自定义域名：`nian.682012ysh.top`
- 禁止创建新 Worker、Pages、站点或域名
