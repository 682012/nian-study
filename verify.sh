#!/data/data/com.termux/files/usr/bin/bash
set -euo pipefail
cd "$(dirname "$0")"
required=(
  public/index.html
  public/sw.js
  public/manifest.webmanifest
  public/assets/NianStudyApp-YImpRfNC.js
  public/assets/nian-lively-v2.css
  public/assets/nian-lively-v2.js
  public/downloads/nian-study-android-v1.1.0.apk
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
grep -Fq 'nian-lively-v2.css' public/index.html || { echo "首页未加载活泼视觉层"; exit 1; }
grep -Fq 'nian-study-progress-v2' public/assets/NianStudyApp-YImpRfNC.js || { echo "主存档键异常"; exit 1; }
grep -Fq 'id:822' public/assets/NianStudyApp-YImpRfNC.js || { echo "822 词尾记录异常"; exit 1; }
echo "检查通过：核心网页、活泼视觉层、APK 与 9 张状态立绘齐全。"
