// 扫描客户端：图片 → Worker /api/nian/ai/scan → 结构化题目。
// 复用「云端念安」设置（baseUrl/apiKey/model 都可留空走服务器默认网关）。
import { loadSettings } from './ai-client';
import { parseScanResult, type ScannedQ } from '../quiz/scan-parse';

export class ScanError extends Error {
  code: string;
  constructor(code: string, message: string) {
    super(message);
    this.code = code;
    this.name = 'ScanError';
  }
}

const FRIENDLY: Record<string, string> = {
  IMAGE_REQUIRED: '没有收到图片，重新选一张试试',
  INVALID_IMAGE: '图片格式不支持（需要 jpg/png/webp）',
  IMAGE_TOO_LARGE: '图片太大了，换一张压缩过的或重新拍',
  API_KEY_REQUIRED: '还没配识别服务：去「设置」里填模型 Key，或等等再试',
  UPSTREAM_SCAN_UNSUPPORTED: '当前模型不会看图：去「设置」把模型换成支持图片识别的型号',
  UPSTREAM_TIMEOUT: '识别超时了，换个网络或再试一次',
  UPSTREAM_UNAVAILABLE: '识别服务暂时不可用，稍后再试',
  EMPTY_SCAN: '这张图里没找到题目：拍清楚一点，或手动裁掉多余部分',
};

export function friendlyScanError(code: string, fallback?: string): string {
  return FRIENDLY[code] || fallback || '识别失败，再试一次';
}

export async function scanPaperImage(image: string, hint = ''): Promise<ScannedQ[]> {
  if (!image || !image.startsWith('data:image/')) throw new ScanError('IMAGE_REQUIRED', friendlyScanError('IMAGE_REQUIRED'));
  if (image.length > 6_000_000) throw new ScanError('IMAGE_TOO_LARGE', friendlyScanError('IMAGE_TOO_LARGE'));
  const s = loadSettings();
  let resp: Response;
  try {
    resp = await fetch('/api/nian/ai/scan', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        image,
        hint: hint.slice(0, 200),
        ...(s.baseUrl ? { baseUrl: s.baseUrl } : {}),
        ...(s.apiKey ? { apiKey: s.apiKey } : {}),
        ...(s.model ? { model: s.model } : {}),
      }),
    });
  } catch {
    throw new ScanError('NETWORK', '网络不稳，识别请求没发出去');
  }
  const data = await resp.json().catch(() => null) as null | { ok?: boolean; code?: string; error?: string; questions?: unknown[]; raw?: string };
  if (!resp.ok || !data?.ok) {
    const code = data?.code || `HTTP_${resp.status}`;
    throw new ScanError(code, friendlyScanError(code, data?.error));
  }
  const source = Array.isArray(data.questions) && data.questions.length ? JSON.stringify(data.questions) : String(data.raw ?? '');
  const parsed = parseScanResult(source);
  if (!parsed.questions.length) {
    throw new ScanError('EMPTY_SCAN', parsed.issues[0] || friendlyScanError('EMPTY_SCAN'));
  }
  return parsed.questions;
}
