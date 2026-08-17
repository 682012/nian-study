#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"
required=(
  public/index.html
  public/sw.js
  public/manifest.webmanifest
  public/assets/NianStudyApp-YImpRfNC.js
  public/assets/nian-lively-v2.css
  public/assets/nian-lively-v2.js
  public/assets/nian-voice-v1.js
  public/assets/nian-arcade-v3.css
  public/assets/nian-arcade-v3.js
  public/assets/nian-content-v8.js
  public/assets/nian-companion-v1.css
  public/assets/nian-companion-v1.js
  public/downloads/nian-study-android-v1.1.0.apk
  src/worker.js
  tests/content-v8.test.mjs
  tests/worker-api.test.mjs
  tests/voice-controller.test.mjs
  tests/ai-voice-integration.test.mjs
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
node --check public/assets/nian-lively-v2.js
node --check public/assets/nian-voice-v1.js
node --check public/assets/nian-arcade-v3.js
node --check public/assets/nian-content-v8.js
node --check public/assets/nian-companion-v1.js
node --check public/sw.js
node --check src/worker.js
node -e 'JSON.parse(require("fs").readFileSync("public/manifest.webmanifest", "utf8"))'
node tests/content-v8.test.mjs
node tests/worker-api.test.mjs
node tests/voice-controller.test.mjs
node tests/ai-voice-integration.test.mjs
node <<'NODE'
const fs = require('fs');
const raw = fs.readFileSync('wrangler.jsonc', 'utf8')
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/^\s*\/\/.*$/gm, '');
const config = JSON.parse(raw);
if (config.name !== 'morning-bar-1aa6') throw new Error(`Worker 目标异常：${config.name}`);
if (!config.routes?.some((route) => route.pattern === 'nian.682012ysh.top' && route.custom_domain === true)) {
  throw new Error('自定义域名配置异常');
}
if (config.assets?.directory !== './public' || config.assets?.not_found_handling !== 'single-page-application') {
  throw new Error('静态资源目录或 SPA 回落配置异常');
}
if (config.main !== 'src/worker.js' || config.assets?.binding !== 'ASSETS') {
  throw new Error('同 Worker API 入口或静态资源绑定异常');
}
NODE
count=$(find public/assets/nian-song -maxdepth 1 -type f -name '*.webp' | wc -l | tr -d ' ')
[ "$count" -ge 9 ] || { echo "念安立绘数量异常: $count"; exit 1; }
grep -Fq 'nian-lively-v2.css' public/index.html || { echo "首页未加载活泼视觉层"; exit 1; }
grep -Fq 'nian-arcade-v3.js' public/assets/nian-lively-v2.js || { echo "百戏楼未接入首页"; exit 1; }
grep -Fq 'AudioContext' public/assets/nian-lively-v2.js || { echo "界面点击音效缺失"; exit 1; }
grep -Fq 'data-nian-speech-status' public/assets/nian-arcade-v3.js || { echo "英语朗读状态反馈缺失"; exit 1; }
grep -Fq 'nian-static-cf-v8.3-ai-voice' public/sw.js || { echo "离线缓存版本未更新"; exit 1; }
grep -Fq "cache: 'no-cache'" public/sw.js || { echo "可变代码资源仍可能命中旧缓存"; exit 1; }
grep -Fq 'Unexpected code asset content type' public/sw.js || { echo "脚本回落 HTML 防护缺失"; exit 1; }
grep -Fq '听音辨词' public/assets/nian-arcade-v3.js || { echo "英语听力玩法缺失"; exit 1; }
grep -Fq '算学千变' public/assets/nian-arcade-v3.js || { echo "数学变式玩法缺失"; exit 1; }
grep -Fq '经史百问' public/assets/nian-arcade-v3.js || { echo "语文扩展题库缺失"; exit 1; }
grep -Fq '念安私塾' public/assets/nian-arcade-v3.js || { echo "自适应私塾缺失"; exit 1; }
grep -Fq '听句寻意' public/assets/nian-arcade-v3.js || { echo "句段听力缺失"; exit 1; }
grep -Fq '短章取证' public/assets/nian-arcade-v3.js || { echo "语文短章缺失"; exit 1; }
grep -Fq '/api/nian/respond' src/worker.js || { echo "念安对话 API 缺失"; exit 1; }
grep -Fq '/api/nian/ai' src/worker.js || { echo "可配置 AI API 缺失"; exit 1; }
grep -Fq 'nian-voice-v1.js' public/assets/nian-lively-v2.js || { echo "共享朗读控制器未接入"; exit 1; }
if grep -Eq 'sk-[A-Za-z0-9_-]{16,}' src/worker.js public/assets/nian-companion-v1.js; then echo "源码中仍有疑似硬编码 API Key"; exit 1; fi
grep -Fq 'env.ASSETS.fetch' src/worker.js || { echo "Worker 静态资源回落缺失"; exit 1; }
grep -Fq 'nian-study-progress-v2' public/assets/NianStudyApp-YImpRfNC.js || { echo "主存档键异常"; exit 1; }
node <<'NODE'
const fs = require('fs');
const path = require('path');

const core = fs.readFileSync('public/assets/NianStudyApp-YImpRfNC.js', 'utf8');
const arcade = fs.readFileSync('public/assets/nian-arcade-v3.js', 'utf8');
if (/^\s*<!doctype\s+html/i.test(arcade)) throw new Error('百戏楼脚本错误回落成了 HTML');
const words = [...core.matchAll(/\{id:(\d+),word:`([^`]*)`,phonetic:`([^`]*)`,meaning:`([^`]*)`\}/g)]
  .map((match) => ({ id: Number(match[1]), word: match[2] }));
if (words.length !== 822 || words.at(-1)?.id !== 822 || words.at(-1)?.word !== 'imagine') {
  throw new Error(`词库异常：解析到 ${words.length} 条，尾记录为 ${JSON.stringify(words.at(-1))}`);
}

const refs = new Set();
const html = fs.readFileSync('public/index.html', 'utf8');
for (const match of html.matchAll(/\b(?:src|href)=["']([^"']+)["']/g)) refs.add(match[1]);
const lively = fs.readFileSync('public/assets/nian-lively-v2.js', 'utf8');
for (const match of lively.matchAll(/\b(?:src|href)\s*=\s*["']([^"']+)["']/g)) refs.add(match[1]);
const sw = fs.readFileSync('public/sw.js', 'utf8');
for (const match of sw.matchAll(/["'](\/(?:assets|icons|downloads)\/[^"']+|\/(?:index\.html|offline\.html|manifest\.webmanifest|favicon\.svg))["']/g)) refs.add(match[1]);
const manifest = JSON.parse(fs.readFileSync('public/manifest.webmanifest', 'utf8'));
for (const icon of manifest.icons || []) refs.add(icon.src);

const headers = fs.readFileSync('public/_headers', 'utf8');
if (/^\/assets\/\*\s*$/m.test(headers)) throw new Error('宽泛资源缓存规则会与可变脚本的 no-cache 叠加');
for (const asset of [
  'index-B65g4y4e.css', 'index-Dm1zMWhb.js', 'framework-CXnKph_e.js',
  'layout-segment-context-B6a3SPWX.js', 'rolldown-runtime-S-ySWqyJ.js',
  'NianStudyApp-YImpRfNC.js', 'nian-lively-v2.js', 'nian-lively-v2.css',
  'nian-voice-v1.js',
  'nian-arcade-v3.js', 'nian-arcade-v3.css', 'nian-content-v8.js',
  'nian-companion-v1.js', 'nian-companion-v1.css',
]) {
  const rule = new RegExp(`^/assets/${asset.replace('.', '\\.') }\\s*\\n\\s+Cache-Control:\\s*no-cache\\s*$`, 'm');
  if (!rule.test(headers)) throw new Error(`${asset} 缺少独立 no-cache 规则`);
}

const missing = [...refs]
  .filter((ref) => !/^(?:https?:|data:|#)/.test(ref))
  .filter((ref) => !ref.includes('${'))
  .map((ref) => ref.split(/[?#]/)[0].replace(/^\//, ''))
  .filter(Boolean)
  .filter((ref) => !fs.existsSync(path.join('public', ref)));
if (missing.length) throw new Error(`页面引用了不存在的文件：${[...new Set(missing)].join(', ')}`);
NODE
echo "检查通过：822 词、自适应私塾、扩展听读题库、念安 API、APK、缓存策略与页面资源齐全。"
