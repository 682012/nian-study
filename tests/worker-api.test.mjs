import assert from "node:assert/strict";
import worker from "../src/worker.js";

const env = { ASSETS: { fetch: () => new Response("asset fallback", { status: 200 }) } };
const jsonHeaders = { "content-type": "application/json", "sec-fetch-site": "same-origin" };

const health = await worker.fetch(new Request("https://nian.test/api/health"), env);
assert.equal(health.status, 200);
assert.equal((await health.json()).ok, true);

const response = await worker.fetch(new Request("https://nian.test/api/nian/respond", {
  method: "POST",
  headers: jsonHeaders,
  body: JSON.stringify({ message: "我想练英语听力", snapshot: { dueWords: 3, weakestSubject: "english" } }),
}), env);
assert.equal(response.status, 200);
const answer = await response.json();
assert.match(answer.reply, /词|听力|英语|长对话/);
assert.ok(["wrongbook", "listening", "adaptive"].includes(answer.suggestedAction));

// Test mistake tutoring
const tutoringRes = await worker.fetch(new Request("https://nian.test/api/nian/respond", {
  method: "POST",
  headers: jsonHeaders,
  body: JSON.stringify({
    message: "这道题我做错了，求指导",
    snapshot: { dueWords: 0, weakestSubject: "math" },
    mistakeContext: { prompt: "解方程：(x-2)(x-3)=0", topic: "二次方程", explanation: "两个因式至少一个为0" }
  }),
}), env);
assert.equal(tutoringRes.status, 200);
const tutoringAns = await tutoringRes.json();
assert.match(tutoringAns.reply, /二次方程|条件|关系式|公式/);
assert.equal(tutoringAns.mood, "teaching");

const rejected = await worker.fetch(new Request("https://nian.test/api/nian/respond", {
  method: "POST",
  headers: { "content-type": "text/plain" },
  body: "hello",
}), env);
assert.equal(rejected.status, 415);

// Test TTS endpoint parameter check
const ttsRejected = await worker.fetch(new Request("https://nian.test/api/nian/tts", {
  method: "POST",
  headers: jsonHeaders,
  body: JSON.stringify({}),
}), env);
assert.equal(ttsRejected.status, 400);

const missingKey = await worker.fetch(new Request("https://nian.test/api/nian/ai", {
  method: "POST", headers: jsonHeaders,
  body: JSON.stringify({ message: "测试连接", model: "gpt-4o-mini" }),
}), env);
assert.equal(missingKey.status, 401);
assert.equal((await missingKey.json()).code, "API_KEY_REQUIRED");

const crossSite = await worker.fetch(new Request("https://nian.test/api/nian/ai", {
  method: "POST", headers: { "content-type": "application/json", "sec-fetch-site": "cross-site" },
  body: JSON.stringify({ message: "测试", apiKey: "test-key-12345" }),
}), env);
assert.equal(crossSite.status, 403);

const tooLarge = await worker.fetch(new Request("https://nian.test/api/nian/respond", {
  method: "POST", headers: jsonHeaders, body: JSON.stringify({ message: "x".repeat(33_000) }),
}), env);
assert.equal(tooLarge.status, 413);

const originalFetch = globalThis.fetch;
let capturedUrl = "";
let capturedInit = null;
globalThis.fetch = async (url, init) => {
  capturedUrl = String(url); capturedInit = init;
  return new Response(JSON.stringify({ choices: [{ message: { content: "连接成功。先完成三道题。" } }] }), { status: 200, headers: { "content-type": "application/json" } });
};
const aiResponse = await worker.fetch(new Request("https://nian.test/api/nian/ai", {
  method: "POST", headers: jsonHeaders,
  body: JSON.stringify({
    message: "帮我安排英语复习", model: "gpt-4o-mini",
    history: [{ role: "system", content: "不应透传" }, { role: "assistant", content: "上一轮" }, { role: "user", content: "继续" }],
    snapshot: { weakestSubject: "english", dueWords: 4 },
  }),
}), { ...env, OPENAI_API_KEY: "environment-test-key" });
assert.equal(aiResponse.status, 200);
assert.match((await aiResponse.json()).reply, /连接成功/);
assert.equal(capturedUrl, "https://api.openai.com/v1/chat/completions");
assert.equal(capturedInit.headers.authorization, "Bearer environment-test-key");
const aiPayload = JSON.parse(capturedInit.body);
assert.equal(aiPayload.messages[0].role, "system");
assert.ok(!aiPayload.messages.some((message, index) => index > 0 && message.role === "system"));
assert.equal(aiPayload.messages.at(-1).content, "帮我安排英语复习");

globalThis.fetch = async () => new Response("provider-secret-detail", { status: 401 });
const upstreamFailure = await worker.fetch(new Request("https://nian.test/api/nian/ai", {
  method: "POST", headers: jsonHeaders, body: JSON.stringify({ message: "测试", apiKey: "browser-test-key" }),
}), env);
assert.equal(upstreamFailure.status, 502);
assert.doesNotMatch(await upstreamFailure.text(), /provider-secret-detail/);

globalThis.fetch = async (url, init) => {
  capturedUrl = String(url); capturedInit = init;
  return new Response(new Uint8Array([73, 68, 51, 4]), { status: 200, headers: { "content-type": "audio/mpeg" } });
};
const ttsResponse = await worker.fetch(new Request("https://nian.test/api/nian/tts", {
  method: "POST", headers: jsonHeaders,
  body: JSON.stringify({ text: "同窗你好", apiKey: "browser-test-key", model: "gpt-4o-mini-tts", voice: "alloy" }),
}), env);
assert.equal(ttsResponse.status, 200);
assert.equal(ttsResponse.headers.get("content-type"), "audio/mpeg");
assert.equal(capturedUrl, "https://api.openai.com/v1/audio/speech");
assert.deepEqual([...new Uint8Array(await ttsResponse.arrayBuffer())], [73, 68, 51, 4]);
assert.equal(JSON.parse(capturedInit.body).input, "同窗你好");

// Default voice fallback: no apiKey -> server-side Xiaomi MiMo
globalThis.fetch = async (url, init) => {
  capturedUrl = String(url); capturedInit = init;
  const audio = Buffer.from([73, 68, 51, 4]).toString("base64");
  return new Response(JSON.stringify({ choices: [{ message: { role: "assistant", content: "", audio: { data: audio } } }] }), { status: 200, headers: { "content-type": "application/json" } });
};
const defaultTts = await worker.fetch(new Request("https://nian.test/api/nian/tts", {
  method: "POST", headers: jsonHeaders, body: JSON.stringify({ text: "all" }),
}), { ...env, MIMO_API_KEY: "environment-mimo-key" });
assert.equal(defaultTts.status, 200);
assert.equal(defaultTts.headers.get("content-type"), "audio/mpeg");
assert.equal(capturedUrl, "https://api.xiaomimimo.com/v1/chat/completions");
assert.equal(JSON.parse(capturedInit.body).model, "mimo-v2.5-tts");
assert.equal(JSON.parse(capturedInit.body).messages[0].role, "assistant");
assert.ok(JSON.parse(capturedInit.body).audio.voice.length > 0);
assert.deepEqual([...new Uint8Array(await defaultTts.arrayBuffer())], [73, 68, 51, 4]);

// Missing server key: default voice fails loudly, not silently
globalThis.fetch = async () => new Response("{}", { status: 200 });
const defaultMissing = await worker.fetch(new Request("https://nian.test/api/nian/tts", {
  method: "POST", headers: jsonHeaders, body: JSON.stringify({ text: "all" }),
}), env);
assert.equal(defaultMissing.status, 503);
assert.equal((await defaultMissing.json()).code, "DEFAULT_VOICE_UNAVAILABLE");

// Voice selection: edge bridge preferred, MiMo direct as legacy, none otherwise
const voiceKeyEdge = await worker.fetch(new Request("https://nian.test/api/nian/voice-key", {
  headers: { "sec-fetch-site": "same-origin" },
}), { ...env, EDGE_TTS_TOKEN: "environment-bridge-token" });
assert.equal(voiceKeyEdge.status, 200);
assert.equal((await voiceKeyEdge.json()).provider, "edgetts");

const voiceKeyMimo = await worker.fetch(new Request("https://nian.test/api/nian/voice-key", {
  headers: { "sec-fetch-site": "same-origin" },
}), { ...env, MIMO_API_KEY: "environment-mimo-key" });
assert.equal(voiceKeyMimo.status, 200);
const voiceKeyBody = await voiceKeyMimo.json();
assert.equal(voiceKeyBody.provider, "mimo");
assert.equal(voiceKeyBody.baseUrl, "https://api.xiaomimimo.com/v1");
assert.equal(voiceKeyBody.model, "mimo-v2.5-tts");
assert.ok(voiceKeyBody.key.length > 0);

const voiceKeyMissing = await worker.fetch(new Request("https://nian.test/api/nian/voice-key"), env);
assert.equal((await voiceKeyMissing.json()).provider, "none");

const voiceKeyCross = await worker.fetch(new Request("https://nian.test/api/nian/voice-key", {
  headers: { "sec-fetch-site": "cross-site" },
}), env);
assert.equal(voiceKeyCross.status, 403);

// Edge TTS proxy: same-origin POST -> bridge with token and engine=edge
globalThis.fetch = async (url, init) => {
  capturedUrl = String(url); capturedInit = init;
  return new Response(new Uint8Array([73, 68, 51, 4]), { status: 200, headers: { "content-type": "audio/mpeg" } });
};
const edgeTts = await worker.fetch(new Request("https://nian.test/api/nian/edgetts", {
  method: "POST", headers: jsonHeaders,
  body: JSON.stringify({ text: "all", lang: "en-US" }),
}), { ...env, EDGE_TTS_TOKEN: "environment-bridge-token" });
assert.equal(edgeTts.status, 200);
assert.equal(edgeTts.headers.get("content-type"), "audio/mpeg");
assert.equal(capturedUrl, "http://tts.682012ysh.loc.cc/v1/audio/speech");
assert.equal(capturedInit.headers["x-bridge-token"], "environment-bridge-token");
const edgePayload = JSON.parse(capturedInit.body);
assert.equal(edgePayload.voice, "en-US-AvaNeural");
assert.equal(edgePayload.engine, "edge");
assert.deepEqual([...new Uint8Array(await edgeTts.arrayBuffer())], [73, 68, 51, 4]);

const edgeNoToken = await worker.fetch(new Request("https://nian.test/api/nian/edgetts", {
  method: "POST", headers: jsonHeaders, body: JSON.stringify({ text: "all" }),
}), env);
assert.equal(edgeNoToken.status, 503);
globalThis.fetch = originalFetch;

const asset = await worker.fetch(new Request("https://nian.test/favicon.svg"), env);
assert.equal(await asset.text(), "asset fallback");

console.log("Worker API 检查通过：本地回复、AI 代理、输入限制、跨站防护、错误脱敏、流式音频与静态资源回落均有效。");
