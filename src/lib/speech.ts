// 阶段1：系统语音（speechSynthesis）。阶段3 云 TTS 在此封装上叠加，UI 不用改。
let voices: SpeechSynthesisVoice[] = [];
function refresh() {
  if (!('speechSynthesis' in window)) return;
  voices = window.speechSynthesis.getVoices();
}
if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
  refresh();
  window.speechSynthesis.onvoiceschanged = refresh;
}

export const speech = {
  get supported() { return typeof window !== 'undefined' && 'speechSynthesis' in window; },
  cancel() { if (this.supported) window.speechSynthesis.cancel(); },
  speak(text: string, lang = 'en-US') {
    if (!this.supported) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = lang;
    u.rate = lang.startsWith('zh') ? 1 : 0.92;
    const v = voices.find((x) => x.lang?.startsWith(lang.slice(0, 2)) && /female|xiao|aria|samantha/i.test(x.name))
      || voices.find((x) => x.lang?.startsWith(lang.slice(0, 2)));
    if (v) u.voice = v;
    window.speechSynthesis.speak(u);
  },
};
