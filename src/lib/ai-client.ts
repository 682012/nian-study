// 云端念安：OpenAI 兼容网关。设置只存本机 localStorage，Key 随请求经 Worker 转发，不落服务器。
const KEY = 'nian-ai-settings-v1';

export interface AiSettings {
  enabled: boolean;
  baseUrl: string;
  apiKey: string;
  model: string;
}

export const DEFAULT_SETTINGS: AiSettings = {
  enabled: false,
  baseUrl: 'https://api.openai.com/v1',
  apiKey: '',
  model: 'gpt-4o-mini',
};

export function loadSettings(): AiSettings {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return DEFAULT_SETTINGS;
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch { return DEFAULT_SETTINGS; }
}
export function saveSettings(s: AiSettings) {
  try { localStorage.setItem(KEY, JSON.stringify(s)); } catch { /* 存储不可用时静默 */ }
}

export interface ChatTurn { role: 'user' | 'assistant'; content: string }
export interface AiRequest {
  message: string;
  history: ChatTurn[];
  snapshot: Record<string, unknown>;
  mistakeContext?: { prompt: string; topic?: string; skill?: string; explanation?: string } | null;
}

export interface StreamHandlers {
  onDelta: (text: string) => void;
  signal?: AbortSignal;
}

// 流式对话；解析 SSE data: 行。失败抛错，调用方回退本地规则。
export async function streamNian(s: AiSettings, req: AiRequest, h: StreamHandlers): Promise<void> {
  const resp = await fetch('/api/nian/ai/stream', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      baseUrl: s.baseUrl, apiKey: s.apiKey, model: s.model,
      message: req.message, history: req.history, snapshot: req.snapshot, mistakeContext: req.mistakeContext ?? null,
    }),
    signal: h.signal,
  });
  if (!resp.ok || !resp.body) {
    let detail = '';
    try { detail = (await resp.json()).code || ''; } catch { /* ignore */ }
    throw new Error(`AI_${resp.status}_${detail}`);
  }
  const reader = resp.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith('data:')) continue;
      const data = trimmed.slice(5).trim();
      if (!data || data === '[DONE]') continue;
      try {
        const json = JSON.parse(data);
        const delta = json?.choices?.[0]?.delta?.content;
        if (typeof delta === 'string' && delta) h.onDelta(delta);
      } catch { /* 心跳/不完整帧 */ }
    }
  }
}

// 非流式连接测试（设置面板用）
export async function testNian(s: AiSettings): Promise<{ ok: boolean; detail: string }> {
  try {
    const resp = await fetch('/api/nian/ai', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        baseUrl: s.baseUrl, apiKey: s.apiKey, model: s.model,
        message: 'ping', history: [], snapshot: {}, mistakeContext: null,
      }),
    });
    if (resp.ok) return { ok: true, detail: '连接成功' };
    const body = await resp.json().catch(() => ({}));
    return { ok: false, detail: body.code || `HTTP ${resp.status}` };
  } catch (e) {
    return { ok: false, detail: e instanceof Error ? e.message : 'network error' };
  }
}
