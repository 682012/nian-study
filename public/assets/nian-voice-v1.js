(() => {
  "use strict";

  const synthesis = window.speechSynthesis;
  const Utterance = window.SpeechSynthesisUtterance;
  const supported = Boolean(synthesis && typeof synthesis.speak === "function" && typeof Utterance === "function");
  let sequence = 0;
  let voicePromise = null;

  function splitText(value, maxLength = 96) {
    const text = String(value || "").replace(/\s+/g, " ").trim();
    if (!text) return [];
    const limit = Math.max(24, Math.min(180, Number(maxLength) || 96));
    const sentences = text.match(/[^。！？!?；;：:\n]+[。！？!?；;：:]?|[^。！？!?；;：:\n]+$/g) || [text];
    const chunks = [];
    for (const sentence of sentences) {
      let rest = sentence.trim();
      while (rest.length > limit) {
        let cut = Math.max(rest.lastIndexOf("，", limit), rest.lastIndexOf(",", limit), rest.lastIndexOf("、", limit), rest.lastIndexOf(" ", limit));
        if (cut < Math.floor(limit * 0.55)) cut = limit;
        else cut += 1;
        chunks.push(rest.slice(0, cut).trim());
        rest = rest.slice(cut).trim();
      }
      if (rest) chunks.push(rest);
    }
    return chunks;
  }

  function availableVoices() {
    if (!supported) return [];
    try { return synthesis.getVoices() || []; } catch { return []; }
  }

  function waitForVoices(timeout = 1400) {
    const current = availableVoices();
    if (current.length || !supported) return Promise.resolve(current);
    if (voicePromise) return voicePromise;
    voicePromise = new Promise((resolve) => {
      let settled = false;
      let timer = 0;
      const deadline = Date.now() + Math.max(300, timeout);
      const finish = () => {
        if (settled) return;
        const voices = availableVoices();
        if (!voices.length && Date.now() < deadline) return;
        settled = true;
        window.clearInterval(timer);
        synthesis.removeEventListener?.("voiceschanged", finish);
        voicePromise = null;
        resolve(voices);
      };
      synthesis.addEventListener?.("voiceschanged", finish);
      timer = window.setInterval(finish, 120);
      finish();
    });
    return voicePromise;
  }

  function chooseVoice(voices, lang) {
    const normalized = String(lang || "zh-CN").toLowerCase();
    const family = normalized.split("-")[0];
    return voices.find((voice) => String(voice.lang).toLowerCase() === normalized)
      || voices.find((voice) => String(voice.lang).toLowerCase().startsWith(`${family}-`))
      || voices.find((voice) => String(voice.lang).toLowerCase() === family)
      || null;
  }

  function stop() {
    sequence += 1;
    if (!supported) return;
    try { synthesis.cancel(); } catch { /* Embedded WebViews may throw while speech starts. */ }
  }

  async function speakSystem(text, options = {}) {
    if (!supported) throw new Error("SYSTEM_SPEECH_UNSUPPORTED");
    const chunks = splitText(text, options.maxLength || 96);
    if (!chunks.length) throw new Error("SPEECH_TEXT_REQUIRED");
    stop();
    const requestId = sequence;
    const notify = typeof options.onStatus === "function" ? options.onStatus : () => {};
    notify("loading");
    const voices = await waitForVoices(options.voiceTimeout || 1400);
    if (requestId !== sequence) throw new Error("SPEECH_CANCELLED");
    const voice = chooseVoice(voices, options.lang || "zh-CN");
    try { synthesis.resume(); } catch { /* resume is optional in some WebViews. */ }

    for (let index = 0; index < chunks.length; index += 1) {
      if (requestId !== sequence) throw new Error("SPEECH_CANCELLED");
      await new Promise((resolve, reject) => {
        const utterance = new Utterance(chunks[index]);
        utterance.lang = options.lang || "zh-CN";
        utterance.rate = Math.max(0.5, Math.min(1.5, Number(options.rate) || 0.92));
        utterance.pitch = Math.max(0.5, Math.min(1.5, Number(options.pitch) || 1));
        utterance.volume = 1;
        utterance.voice = voice;
        let started = false;
        const watchdog = window.setTimeout(() => {
          if (!started && requestId === sequence) reject(new Error("SPEECH_DID_NOT_START"));
        }, options.startTimeout || 2400);
        utterance.onstart = () => { started = true; window.clearTimeout(watchdog); notify("playing", { index, total: chunks.length }); };
        utterance.onend = () => { window.clearTimeout(watchdog); resolve(); };
        utterance.onerror = (event) => {
          window.clearTimeout(watchdog);
          const code = event?.error || "SYSTEM_SPEECH_FAILED";
          reject(new Error(["canceled", "interrupted"].includes(code) && requestId !== sequence ? "SPEECH_CANCELLED" : code));
        };
        try { synthesis.speak(utterance); }
        catch { window.clearTimeout(watchdog); reject(new Error("SYSTEM_SPEECH_FAILED")); }
      });
    }
    if (requestId === sequence) notify("ended");
    return true;
  }

  window.NIAN_VOICE = Object.freeze({ supported, splitText, waitForVoices, chooseVoice, speakSystem, stop });
})();
