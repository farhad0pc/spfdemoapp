export interface CompressedImageResult {
  file: File;
  previewUrl: string;
  sizeBytes: number;
  width: number;
  height: number;
  formatLabel: 'WebP' | 'JPEG';
}

/**
 * Formats byte count into human-readable KB / MB badge label (e.g. "64 KB").
 */
export function formatBytesLabel(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 KB';
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${Math.max(1, Math.round(kb))} KB`;
  return `${(kb / 1024).toFixed(2)} MB`;
}

/**
 * Loads an image File into a drawable source along with its natural dimensions.
 * Uses createImageBitmap when available and falls back to HTMLImageElement.
 */
async function decodeImageSource(file: File): Promise<{
  source: CanvasImageSource;
  width: number;
  height: number;
  cleanup: () => void;
}> {
  if (typeof window !== 'undefined' && 'createImageBitmap' in window) {
    try {
      const bitmap = await createImageBitmap(file);
      return {
        source: bitmap,
        width: bitmap.width,
        height: bitmap.height,
        cleanup: () => {
          bitmap.close();
        },
      };
    } catch {
      // Fall through to HTMLImageElement decoder
    }
  }

  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      resolve({
        source: img,
        width: img.naturalWidth || img.width,
        height: img.naturalHeight || img.height,
        cleanup: () => {
          URL.revokeObjectURL(objectUrl);
        },
      });
    };
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Görsel çözümlenemedi. / Failed to decode image file.'));
    };
    img.src = objectUrl;
  });
}

function canvasToBlob(
  canvas: HTMLCanvasElement,
  mimeType: string,
  quality: number
): Promise<Blob | null> {
  return new Promise((resolve) => {
    canvas.toBlob(
      (blob) => {
        resolve(blob);
      },
      mimeType,
      quality
    );
  });
}

/**
 * Client-side WebP compressor for Free-Tier Supabase Storage & Egress efficiency.
 * Proportionally resizes any image so its longest edge is <= maxDimension (default 1024px)
 * and encodes to image/webp at 0.78 quality (~50-80 KB typical).
 * Automatically falls back to image/jpeg if the browser lacks WebP canvas encoding.
 */
export async function compressImageToWebP(
  file: File,
  maxDimension = 1024,
  quality = 0.78
): Promise<CompressedImageResult> {
  if (!file.type.startsWith('image/')) {
    throw new Error(
      'Yalnızca görsel dosyaları (WebP, JPEG, PNG) desteklenmektedir. / Only image files are supported.'
    );
  }

  const decoded = await decodeImageSource(file);

  try {
    const srcW = Math.max(1, decoded.width);
    const srcH = Math.max(1, decoded.height);
    const longestEdge = Math.max(srcW, srcH);
    const scale = longestEdge > maxDimension ? maxDimension / longestEdge : 1;

    const targetWidth = Math.max(1, Math.round(srcW * scale));
    const targetHeight = Math.max(1, Math.round(srcH * scale));

    const canvas = document.createElement('canvas');
    canvas.width = targetWidth;
    canvas.height = targetHeight;

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error(
        'Tarayıcı Canvas 2D bağlamı başlatılamadı. / Canvas 2D context unavailable.'
      );
    }

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(decoded.source, 0, 0, targetWidth, targetHeight);

    let outputBlob = await canvasToBlob(canvas, 'image/webp', quality);
    let mimeType = 'image/webp';
    let ext = 'webp';
    let formatLabel: 'WebP' | 'JPEG' = 'WebP';

    // Some older engines fall back to image/png when image/webp is unsupported
    if (!outputBlob || outputBlob.type !== 'image/webp') {
      const jpegBlob = await canvasToBlob(canvas, 'image/jpeg', quality);
      if (!jpegBlob) {
        throw new Error(
          'Görsel sıkıştırılamadı. / Failed to encode compressed image.'
        );
      }
      outputBlob = jpegBlob;
      mimeType = 'image/jpeg';
      ext = 'jpg';
      formatLabel = 'JPEG';
    }

    const baseName = (file.name || 'item-photo')
      .replace(/\.[^/.]+$/, '')
      .replace(/[^a-zA-Z0-9_-]/g, '_')
      .slice(0, 48);

    const compressedFile = new File(
      [outputBlob],
      `${baseName || 'item-photo'}.${ext}`,
      {
        type: mimeType,
        lastModified: Date.now(),
      }
    );

    const previewUrl = URL.createObjectURL(compressedFile);

    return {
      file: compressedFile,
      previewUrl,
      sizeBytes: compressedFile.size,
      width: targetWidth,
      height: targetHeight,
      formatLabel,
    };
  } finally {
    decoded.cleanup();
  }
}
