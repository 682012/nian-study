import assert from "node:assert/strict";
import fs from "node:fs";

const companion = fs.readFileSync("public/assets/nian-companion-v1.js", "utf8");
const arcade = fs.readFileSync("public/assets/nian-arcade-v3.js", "utf8");
const lively = fs.readFileSync("public/assets/nian-lively-v2.js", "utf8");
const sw = fs.readFileSync("public/sw.js", "utf8");
const worker = fs.readFileSync("src/worker.js", "utf8");

for (const feature of ["openai-proxy", "custom-direct", "/api/nian/ai", "sessionStorage", "data-ai-test-voice", "playCloudSpeech"]) {
  assert.ok(companion.includes(feature), `陪学面板缺少 ${feature}`);
}
assert.ok(!companion.includes("Notification.requestPermission"), "页面加载时不应索要通知权限");
assert.ok(!/const\s+MIMO_API_KEY|sk-[A-Za-z0-9_-]{16,}/.test(worker), "Worker 不得含硬编码密钥");
assert.ok(worker.includes('OPENAI_API_BASE = "https://api.openai.com/v1"'));
assert.ok(worker.includes('url.pathname === "/api/nian/ai"'));
assert.ok(!arcade.includes("if (question.speech) speak(question.speech)"), "题目渲染时不应绕过用户手势自动朗读");
assert.ok(arcade.includes("window.NIAN_VOICE.speakSystem"));
assert.ok(lively.indexOf("nian-voice-v1.js") < lively.indexOf("nian-arcade-v3.js"), "语音控制器必须先于题目脚本加载");
assert.ok(sw.includes("nian-static-cf-v8.3-ai-voice"));
assert.ok(sw.includes("/assets/nian-voice-v1.js"));

console.log("AI/语音集成检查通过：三种对话模式、密钥策略、用户手势、加载顺序和离线缓存均正确接线。");
