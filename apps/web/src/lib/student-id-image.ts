// =============================================
// 学生証写真の前処理ユーティリティ
// 初期登録 (InitialRegistration) と再アップロード (Dashboard) で共有
// =============================================

const IMAGE_EXT_RE = /\.(jpe?g|png|gif|webp|heic|heif|bmp)$/i;

// この長さを超えるとき1回だけ圧縮（≈1.5MB binary 相当）
const COMPRESS_THRESHOLD_DATA_URL_LEN = 2_000_000;

/** ユーザーから運営に共有してもらうための短いコード */
export const STUDENT_ID_ERROR_CODES = {
  NO_PHOTO: 'SID-E01',
  NOT_IMAGE: 'SID-E02',
  TOO_LARGE: 'SID-E03',
  HEIC_CONVERT_FAILED: 'SID-E04',
  READ_FAILED: 'SID-E05',
  GENERIC: 'SID-E06',
} as const;

export type StudentIdErrorCode = (typeof STUDENT_ID_ERROR_CODES)[keyof typeof STUDENT_ID_ERROR_CODES];

export function isHeicLikeFile(file: File): boolean {
  const name = file.name.toLowerCase();
  return (
    file.type === 'image/heic' ||
    file.type === 'image/heif' ||
    name.endsWith('.heic') ||
    name.endsWith('.heif')
  );
}

export function isProbablyImageFile(file: File): boolean {
  if (file.type.startsWith('image/')) return true;
  if (isHeicLikeFile(file)) return true;
  // 一部の端末/ブラウザでは type が空・octet-stream になる
  if (!file.type || file.type === 'application/octet-stream') {
    if (file.name && IMAGE_EXT_RE.test(file.name)) return true;
    return file.size > 0;
  }
  return false;
}

function readBlobAsDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => resolve(event.target?.result as string);
    reader.onerror = () => reject(new Error('READ_FAILED'));
    reader.readAsDataURL(blob);
  });
}

function compressImageDataUrl(dataUrl: string, maxSide = 1600, quality = 0.82): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
      const width = Math.max(1, Math.round(img.width * scale));
      const height = Math.max(1, Math.round(img.height * scale));
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Failed to create canvas context'));
        return;
      }
      ctx.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
    img.onerror = () => reject(new Error('Failed to decode image'));
    img.src = dataUrl;
  });
}

/**
 * File を JPEG の data URL に正規化する。
 * - HEIC/HEIF は heic-to で JPEG に変換
 * - 閾値超なら1回だけ Canvas 圧縮
 * - decode 不能なら READ_FAILED を投げる（送信側でも扱えないため）
 */
export async function normalizeStudentIdImageDataUrl(file: File): Promise<string> {
  let sourceDataUrl: string;
  if (isHeicLikeFile(file)) {
    try {
      const { heicTo } = await import('heic-to');
      const converted = await heicTo({ blob: file, type: 'image/jpeg', quality: 0.9 });
      sourceDataUrl = await readBlobAsDataUrl(converted);
    } catch {
      throw new Error('HEIC_CONVERT_FAILED');
    }
  } else {
    sourceDataUrl = await readBlobAsDataUrl(file);
  }

  if (!sourceDataUrl || sourceDataUrl.length < 32) {
    throw new Error('READ_FAILED');
  }

  if (sourceDataUrl.length <= COMPRESS_THRESHOLD_DATA_URL_LEN) return sourceDataUrl;

  try {
    return await compressImageDataUrl(sourceDataUrl);
  } catch {
    throw new Error('READ_FAILED');
  }
}

/** data URL を JPEG File に変換（アップロード直前に呼ぶ） */
export async function dataUrlToJpegFile(dataUrl: string, fileName = 'student-id.jpg'): Promise<File> {
  const res = await fetch(dataUrl);
  const blob = await res.blob();
  return new File([blob], fileName, { type: 'image/jpeg' });
}
