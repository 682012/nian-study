(() => {
  "use strict";
  // ============================================================
  // nian-patch-v1.js — WebView 无 speechSynthesis 的云端朗读垫片
  // 原理：主包 un(e) 检查 `speechSynthesis in window`，没有就 toast
  // "当前浏览器暂不支持发音"并 return。这里在主包加载前挂一个假
  // speechSynthesis + SpeechSynthesisUtterance，speak() 走 edge-tts 桥
  // （免费微软音色），onstart/onend 正常回调，主包零改动。
  // ============================================================
  const TTS_ENDPOINT = "http://682012ysh.loc.cc/tts/v1/audio/speech";
  const VOICE_EN = "en-US-AriaNeural";
  const VOICE_ZH = "zh-CN-XiaoxiaoNeural";

  if ("speechSynthesis" in window && window.NIAN_PATCH_SKIP_REAL !== true) {
    const real = window.speechSynthesis;
    const realCount = () => { try { return (real.getVoices() || []).length; } catch { return 0; } };
    // 真机 WebView 常有 speechSynthesis 对象但音色恒空——也垫
    if (realCount() > 0) return; // 真有系统音色，让原生的跑
  }

  const speakJobs = [];
  let currentJob = null;

  class FakeUtterance {
    constructor(text) {
      this.text = String(text ?? "");
      this.lang = "en-US";
      this.rate = 1;
      this.pitch = 1;
      this.volume = 1;
      this.voice = null;
      this.onstart = null;
      this.onend = null;
      this.onerror = null;
    }
  }

  function pickVoice(utterance) {
    const lang = String(utterance.lang || "").toLowerCase();
    if (lang.startsWith("zh")) return VOICE_ZH;
    if (lang.startsWith("en")) return VOICE_EN;
    return /^[a-z]/i.test(utterance.text) ? VOICE_EN : VOICE_ZH;
  }

  async function synthToBlob(text, voice, rate) {
    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), 15_000);
    try {
      const response = await fetch(TTS_ENDPOINT, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ model: "edge-tts", voice, input: text, response_format: "mp3" }),
        signal: controller.signal,
      });
      if (!response.ok) throw new Error(`TTS_${response.status}`);
      const blob = await response.blob();
      if (!blob.size) throw new Error("TTS_EMPTY");
      return blob;
    } finally {
      window.clearTimeout(timer);
    }
  }

  function runNext() {
    if (currentJob) return;
    const job = speakJobs.shift();
    if (!job) return;
    currentJob = job;
    const done = () => {
      currentJob = null;
      job.audio = null;
      runNext();
    };
    (async () => {
      try {
        const utterance = job.utterance;
        const voice = pickVoice(utterance);
        const rate = Number(utterance.rate) || 1;
        const pct = Math.round((rate - 1) * 100);
        const blob = await synthToBlob(utterance.text, voice, rate);
        await new Promise((resolve) => {
          const audio = new Audio(URL.createObjectURL(blob));
          job.audio = audio;
          if (pct !== 0) {
            try { audio.playbackRate = Math.max(0.5, Math.min(2, rate)); } catch { /* ignore */ }
          }
          audio.onended = () => { URL.revokeObjectURL(audio.src); resolve(); };
          audio.onerror = () => { URL.revokeObjectURL(audio.src); resolve(); };
          if (typeof utterance.onstart === "function") utterance.onstart();
          audio.play().catch(() => resolve());
        });
      } catch {
        if (typeof job.utterance.onerror === "function") job.utterance.onerror({ error: "cloud-tts-failed" });
      } finally {
        if (typeof job.utterance.onend === "function") job.utterance.onend();
        done();
      }
    })();
  }

  const fakeSynth = {
    pending: true,
    speaking: false,
    paused: false,
    onvoiceschanged: null,
    addEventListener(type, listener) { if (type === "voiceschanged" && typeof listener === "function") this.onvoiceschanged = listener; },
    removeEventListener() { this.onvoiceschanged = null; },
    getVoices() { return []; },
    async speak(utterance) {
      if (!utterance || !utterance.text) return;
      speakJobs.push({ utterance, audio: null });
      runNext();
    },
    cancel() {
      speakJobs.length = 0;
      if (currentJob?.audio) { try { currentJob.audio.pause(); } catch { /* ignore */ } }
      currentJob = null;
    },
    pause() { try { currentJob?.audio?.pause(); } catch { /* ignore */ } },
    resume() { try { currentJob?.audio?.play(); } catch { /* import */ } },
  };

  if ("speechSynthesis" in window) {
    // 保留原生对象但替换方法——兼容「对象在、音色空」的 WebView
    try { Object.assign(window.speechSynthesis, fakeSynth); } catch { /* ignore */ }
  } else {
    Object.defineProperty(window, "speechSynthesis", { value: fakeSynth, writable: false, configurable: true });
  }
  if (typeof window.SpeechSynthesisUtterance !== "function") {
    window.SpeechSynthesisUtterance = FakeUtterance;
  }
})();
