import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const source = fs.readFileSync(new URL("../public/assets/nian-voice-v1.js", import.meta.url), "utf8");
const listeners = new Map();
const spoken = [];
let voices = [];
let cancelCount = 0;
class FakeUtterance { constructor(text) { this.text = text; } }
const synthesis = {
  getVoices: () => voices,
  addEventListener(type, listener) { listeners.set(type, listener); },
  removeEventListener(type, listener) { if (listeners.get(type) === listener) listeners.delete(type); },
  resume() {}, cancel() { cancelCount += 1; },
  speak(utterance) { spoken.push(utterance); queueMicrotask(() => { utterance.onstart?.(); utterance.onend?.(); }); },
};
const window = { speechSynthesis: synthesis, SpeechSynthesisUtterance: FakeUtterance, setTimeout, clearTimeout, setInterval, clearInterval };
let audioCreated = 0;
let audioPaused = 0;
let urlsRevoked = 0;
let latestAudio;
class FakeAudio {
  constructor() { audioCreated++; latestAudio = this; }
  play() { return Promise.resolve(); }
  pause() { audioPaused++; }
}
vm.runInNewContext(source, {
  window, Date, Promise, Error, Object, String, Number, Math, AbortController,
  Audio: FakeAudio,
  URL: { createObjectURL: () => 'blob:test', revokeObjectURL: () => { urlsRevoked++; } },
});
const voice = window.NIAN_VOICE;
assert.equal(voice.supported, true);
const chunks = voice.splitText("第一段很短。" + "这是一个需要拆分的长句，".repeat(18) + "结束。", 48);
assert.ok(chunks.length >= 3);
assert.ok(chunks.every((item) => item.length <= 49));
const delayedVoices = voice.waitForVoices(600);
setTimeout(() => { voices = [{ name: "中文", lang: "zh-CN" }, { name: "English", lang: "en-US" }]; listeners.get("voiceschanged")?.(); }, 20);
assert.equal((await delayedVoices).length, 2);
const statuses = [];
await voice.speakSystem("同窗你好。今天继续学习。", { lang: "zh-CN", maxLength: 24, onStatus: (status) => statuses.push(status) });
assert.ok(spoken.length >= 1);
assert.equal(spoken[0].voice.lang, "zh-CN");
assert.equal(statuses[0], "loading");
assert.equal(statuses.at(-1), "ended");
assert.ok(statuses.includes("playing"));
voice.stop();
assert.ok(cancelCount >= 2);
synthesis.speak = utterance => { spoken.push(utterance); utterance.onstart?.(); };
const pendingNative = voice.speakSystem('等待结束');
await new Promise(resolve => setTimeout(resolve, 0));
voice.stop();
await assert.rejects(pendingNative, /SPEECH_CANCELLED/);
synthesis.speak = () => {};
const beforeTimeout = cancelCount;
await assert.rejects(voice.speakSystem('不能启动', { startTimeout: 10 }), /SPEECH_DID_NOT_START/);
assert.ok(cancelCount >= beforeTimeout + 2, 'Timeout cancels native speech to prevent late playback');
let finishProvider;
let requestSignal;
voice.setCloudProvider((text, options, signal) => { requestSignal = signal; return new Promise(resolve => { finishProvider = resolve; }); });
const pendingCloud = voice.speakCloud('稍后返回的音频');
voice.stop();
assert.equal(requestSignal.aborted, true);
finishProvider({});
await assert.rejects(pendingCloud, /SPEECH_CANCELLED/);
assert.equal(audioCreated, 0, 'Cancelled requests never create a player');
voice.setCloudProvider(async () => ({}));
const playback = voice.speakCloud('播放中停止');
await new Promise(resolve => setTimeout(resolve, 0));
voice.stop();
await assert.rejects(playback, /SPEECH_CANCELLED/);
assert.ok(audioPaused > 0);
assert.equal(urlsRevoked, 1);
const cloudStatuses = [];
const complete = voice.speakCloud('完整播放', { onStatus: status => cloudStatuses.push(status) });
await new Promise(resolve => setTimeout(resolve, 0));
assert.equal(cloudStatuses.at(-1), 'playing');
latestAudio.onended();
await complete;
assert.equal(cloudStatuses.at(-1), 'ended');
assert.equal(urlsRevoked, 2);
console.log("语音控制器检查通过：音色加载、长句拆分、原生超时取消、云端请求取消、播放停止与资源回收均有效。");
