import { PHOTO_MAX_BYTES, fitWithin } from './gallery';

/**
 * ضغط الصور في المتصفح قبل الرفع (لحماية 500MB المجانية في Supabase).
 * صورة الجوال 4–8 ميجا تصبح ~150–350 ك.ب، والمصغّرة ~20–40 ك.ب.
 */

const FULL_SIDE = 1600;
const THUMB_SIDE = 480;
const FULL_QUALITIES = [0.82, 0.72, 0.62, 0.5];
const MAX_INPUT_BYTES = 25 * 1024 * 1024;

export interface PreparedPhoto {
  file: Blob;
  thumb: Blob;
  width: number;
  height: number;
}

async function decode(file: File): Promise<{ source: CanvasImageSource; width: number; height: number; close: () => void }> {
  if (typeof createImageBitmap === 'function') {
    try {
      // imageOrientation: يصحّح دوران صور الجوال حسب بيانات EXIF
      const bmp = await createImageBitmap(file, { imageOrientation: 'from-image' });
      return { source: bmp, width: bmp.width, height: bmp.height, close: () => bmp.close() };
    } catch {
      // نكمل بالطريقة البديلة
    }
  }
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.decoding = 'async';
    img.src = url;
    await img.decode();
    return { source: img, width: img.naturalWidth, height: img.naturalHeight, close: () => undefined };
  } finally {
    URL.revokeObjectURL(url);
  }
}

function toBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob((b) => resolve(b), type, quality));
}

/** WebP إن دعمه المتصفح، وإلا JPEG (سفاري القديم يرجع PNG عند طلب WebP، فنتحقق من النوع الفعلي) */
async function encode(canvas: HTMLCanvasElement, qualities: number[]): Promise<Blob> {
  for (const type of ['image/webp', 'image/jpeg']) {
    let last: Blob | null = null;
    for (const q of qualities) {
      const blob = await toBlob(canvas, type, q);
      if (!blob || blob.type !== type) break; // هذا النوع غير مدعوم
      last = blob;
      if (blob.size <= 450 * 1024) return blob;
    }
    if (last) return last; // أفضل ما أمكن بهذا النوع
  }
  throw new Error('encode-failed');
}

function render(source: CanvasImageSource, w: number, h: number): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('no-canvas');
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(source, 0, 0, w, h);
  return canvas;
}

export async function prepareUpload(file: File): Promise<PreparedPhoto> {
  if (!/^image\/(jpeg|png|webp)$/.test(file.type)) throw new Error('نوع الصورة غير مدعوم. استخدم JPG أو PNG أو WEBP.');
  if (file.size > MAX_INPUT_BYTES) throw new Error('الصورة كبيرة جداً (الحد 25 ميجابايت قبل الضغط).');

  const img = await decode(file).catch(() => {
    throw new Error('تعذّر فتح الصورة. قد تكون تالفة.');
  });
  try {
    const full = fitWithin(img.width, img.height, FULL_SIDE);
    const small = fitWithin(img.width, img.height, THUMB_SIDE);
    const fullBlob = await encode(render(img.source, full.width, full.height), FULL_QUALITIES);
    const thumbBlob = await encode(render(img.source, small.width, small.height), [0.7, 0.55]);
    if (fullBlob.size > PHOTO_MAX_BYTES) throw new Error('تعذّر تصغير الصورة إلى الحجم المسموح.');
    return { file: fullBlob, thumb: thumbBlob, width: full.width, height: full.height };
  } finally {
    img.close();
  }
}
