// 朗读优先级：服务器默认云语音（Edge 神经语音，MiMo 兜底）→ 系统 speechSynthesis。
// 用户在对话设置里的 BYO TTS 走 /api/nian/tts（云念安设置面板，后续接线）。
type VoiceConfig =
  | { provider: 'edgetts'; url: string }
  | { provider: 'mimo' }
  | { provider: 'none' };

let configPromise: Promise<VoiceConfig> | null = null;
let audioEl: HTMLAudioElement | null = null;

function fetchConfig(): Promise<VoiceConfig> {
  if (!configPromise) {
    configPromise = fetch('/api/nian/voice-config')
      .then((r) => (r.ok ? r.json() : { provider: 'none' }))
      .then((d): VoiceConfig => (d?.provider === 'edgetts' && typeof d.url === 'string' ? { provider: 'edgetts', url: d.url }
        : d?.provider === 'mimo' ? { provider: 'mimo' } : { provider: 'none' }))
      .catch(() => ({ provider: 'none' } as VoiceConfig));
  }
  return configPromise;
}

function systemVoices() { return ('speechSynthesis' in window) ? window.speechSynthesis.getVoices() : []; }
function speakSystem(text: string, lang: string) {
  if (!('speechSynthesis' in window)) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = lang;
  u.rate = lang.startsWith('zh') ? 1 : 0.92;
  const vs = systemVoices();
  const v = vs.find((x) => x.lang?.startsWith(lang.slice(0, 2)) && /female|xiao|aria|ava|samantha/i.test(x.name))
    || vs.find((x) => x.lang?.startsWith(lang.slice(0, 2)));
  if (v) u.voice = v;
  window.speechSynthesis.speak(u);
}

async function playCloud(path: string, body: Record<string, unknown>) {
  const resp = await fetch(path, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
  if (!resp.ok) throw new Error(`tts_${resp.status}`);
  const blob = await resp.blob();
  if (!blob.size || !/^audio\//.test(blob.type)) throw new Error('tts_bad_audio');
  if (audioEl) { audioEl.pause(); URL.revokeObjectURL(audioEl.src); }
  const url = URL.createObjectURL(blob);
  audioEl = new Audio(url);
  audioEl.onended = () => URL.revokeObjectURL(url);
  await audioEl.play();
}

export const speech = {
  get supported() { return typeof window !== 'undefined'; },
  cancel() {
    audioEl?.pause();
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
  },
  async speak(text: string, lang = 'en-US') {
    const cfg = await fetchConfig();
    try {
      if (cfg.provider === 'edgetts') {
        await playCloud(cfg.url, { text, lang });
        return;
      }
      if (cfg.provider === 'mimo') {
        await playCloud('/api/nian/tts', { text });
        return;
      }
    } catch {
      // 云端失败落到系统语音
    }
    speakSystem(text, lang);
  },
};
