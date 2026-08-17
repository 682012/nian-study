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
vm.runInNewContext(source, { window, Date, Promise, Error, Object, String, Number, Math });
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
console.log("语音控制器检查通过：延迟音色加载、中文音色选择、长句拆分、播放状态与停止队列均有效。");
