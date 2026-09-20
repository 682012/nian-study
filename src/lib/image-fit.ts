// 拍照/选图 → 压缩成可上传的 dataURL。纯计算部分（fitSize）单独导出便于单测。
export function fitSize(w: number, h: number, maxDim: number): { width: number; height: number } {
  const side = Math.max(w, h);
  if (!Number.isFinite(side) || side <= 0) return { width: 1, height: 1 };
  if (side <= maxDim) return { width: Math.round(w), height: Math.round(h) };
  const k = maxDim / side;
  return { width: Math.max(1, Math.round(w * k)), height: Math.max(1, Math.round(h * k)) };
}

// 卷子照片压到 maxDim 长边、JPEG quality；解不动/不支持 canvas 时原样返回，让服务端兜底。
export async function fileToCompressedDataUrl(file: Blob, maxDim = 1600, quality = 0.62): Promise<string> {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('READ_FAILED'));
    reader.readAsDataURL(file);
  });
  if (!dataUrl.startsWith('data:image/')) throw new Error('NOT_IMAGE');
  if (/^data:image\/svg\+xml/i.test(dataUrl)) return dataUrl;
  if (typeof document === 'undefined' || !document.createElement) return dataUrl;
  // 小图（<400KB）直接上传，省一次解码；坏图/环境不解码也不能挂住——3 秒兜底。
  if (dataUrl.length <= 400_000) return dataUrl;
  const img = await new Promise<HTMLImageElement | null>((resolve) => {
    const el = new Image();
    const timer = setTimeout(() => done(null), 3000);
    const done = (v: HTMLImageElement | null) => { clearTimeout(timer); el.onload = null; el.onerror = null; resolve(v); };
    el.onload = () => done(el);
    el.onerror = () => done(null);
    el.src = dataUrl;
  });
  if (!img) return dataUrl;
  const w = img.naturalWidth || img.width;
  const h = img.naturalHeight || img.height;
  const { width, height } = fitSize(w, h, maxDim);
  try {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return dataUrl;
    ctx.drawImage(img, 0, 0, width, height);
    return canvas.toDataURL('image/jpeg', quality);
  } catch { return dataUrl; }
}
