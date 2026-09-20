// 拍照/选图 → 压缩成可上传的 dataURL。fitSize 是纯函数（单测），压缩走 canvas。

export function fitSize(w: number, h: number, maxDim: number): { width: number; height: number } {
  const side = Math.max(w, h);
  if (!Number.isFinite(side) || side <= 0) return { width: 1, height: 1 };
  if (side <= maxDim) return { width: Math.round(w), height: Math.round(h) };
  const k = maxDim / side;
  return { width: Math.max(1, Math.round(w * k)), height: Math.max(1, Math.round(h * k)) };
}

function readAsDataUrl(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('READ_FAILED'));
    reader.readAsDataURL(file);
  });
}

function decode(dataUrl: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    // 坏图/环境不解码时不能挂住：3 秒兜底返回 null，调用方走原图
    const timer = setTimeout(() => done(null), 3000);
    const done = (v: HTMLImageElement | null) => { clearTimeout(timer); img.onload = null; img.onerror = null; resolve(v); };
    img.onload = () => done(img);
    img.onerror = () => done(null);
    img.src = dataUrl;
  });
}

// 卷子照片压到 maxDim 长边、JPEG quality；解不动/不支持 canvas 时原样返回，让服务端兜底。
export async function fileToCompressedDataUrl(file: Blob, maxDim = 1600, quality = 0.62): Promise<string> {
  const dataUrl = await readAsDataUrl(file);
  if (!dataUrl.startsWith('data:image/')) throw new Error('NOT_IMAGE');
  if (/^data:image\/svg\+xml/i.test(dataUrl)) return dataUrl;
  if (dataUrl.length <= 400_000) return dataUrl; // 已经够小
  try {
    const img = await decode(dataUrl);
    if (!img) return dataUrl;
    const { width, height } = fitSize(img.naturalWidth || img.width, img.naturalHeight || img.height, maxDim);
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return dataUrl;
    ctx.drawImage(img, 0, 0, width, height);
    return canvas.toDataURL('image/jpeg', quality);
  } catch {
    return dataUrl;
  }
}

// 缩略图：给「最近拍的卷子」回看列表用。失败返回空串，不阻塞主流程。
export async function makeThumbDataUrl(dataUrl: string, size = 128, quality = 0.55): Promise<string> {
  try {
    if (typeof document === 'undefined' || !dataUrl.startsWith('data:image/')) return '';
    const img = await decode(dataUrl);
    if (!img) return '';
    const { width, height } = fitSize(img.naturalWidth || img.width, img.naturalHeight || img.height, size);
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return '';
    ctx.drawImage(img, 0, 0, width, height);
    const out = canvas.toDataURL('image/jpeg', quality);
    return out.startsWith('data:image/jpeg') ? out : '';
  } catch {
    return '';
  }
}
