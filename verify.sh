#!/data/data/com.termux/files/usr/bin/bash
set -euo pipefail
cd "$(dirname "$0")"
required=(
  public/index.html
  public/sw.js
  public/manifest.webmanifest
  public/assets/NianStudyApp-YImpRfNC.js
  public/assets/nian-song/welcome.webp
  public/assets/nian-song/idle.webp
  public/assets/nian-song/teaching.webp
  public/assets/nian-song/thinking.webp
  public/assets/nian-song/correct.webp
  public/assets/nian-song/break.webp
  public/assets/nian-song/celebrate.webp
  public/assets/nian-song/tease.webp
  public/assets/nian-song/invite.webp
)
for f in "${required[@]}"; do
  [ -f "$f" ] || { echo "缺少文件: $f"; exit 1; }
done
count=$(find public/assets/nian-song -maxdepth 1 -type f -name '*.webp' | wc -l | tr -d ' ')
[ "$count" -ge 9 ] || { echo "念安立绘数量异常: $count"; exit 1; }
echo "检查通过：核心网页 + 9 张状态立绘齐全。"
