/**
 * Client-side image compression utility
 * Automatically resizes and compresses high-resolution vehicle photos
 * before upload to prevent network timeouts, payload limits, and memory issues
 * while preserving sharp image quality.
 */

export interface CompressionOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number; // 0 to 1
  mimeType?: 'image/jpeg' | 'image/webp';
}

const DEFAULT_OPTIONS: CompressionOptions = {
  maxWidth: 1920,
  maxHeight: 1920,
  quality: 0.85,
  mimeType: 'image/jpeg',
};

export async function compressImage(file: File, options?: CompressionOptions): Promise<File> {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  // Skip non-images
  if (!file.type.startsWith('image/')) {
    return file;
  }

  // If already small (< 300KB) and not a huge dimension image, no compression needed
  if (file.size < 300 * 1024 && !file.type.includes('png')) {
    return file;
  }

  return new Promise((resolve) => {
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);

      let { width, height } = img;
      const maxW = opts.maxWidth || 1920;
      const maxH = opts.maxHeight || 1920;

      // Calculate proportional downscale
      if (width > maxW || height > maxH) {
        if (width / height > maxW / maxH) {
          height = Math.round((height * maxW) / width);
          width = maxW;
        } else {
          width = Math.round((width * maxH) / height);
          height = maxH;
        }
      }

      // Draw onto high-quality canvas
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        // Fallback to original file if context not available
        resolve(file);
        return;
      }

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';

      // For transparent PNGs or general images, white background for clean JPEG output
      if (opts.mimeType === 'image/jpeg') {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, width, height);
      }

      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        (blob) => {
          if (!blob) {
            resolve(file);
            return;
          }

          // If compressed blob is somehow larger than original, return original
          if (blob.size >= file.size && file.size < 5 * 1024 * 1024) {
            resolve(file);
            return;
          }

          const baseName = file.name.replace(/\.[^/.]+$/, '');
          const extension = opts.mimeType === 'image/webp' ? '.webp' : '.jpg';
          const compressedFile = new File([blob], `${baseName}${extension}`, {
            type: opts.mimeType,
            lastModified: Date.now(),
          });

          console.log(
            `[ImageCompressor] ${file.name}: ${(file.size / 1024).toFixed(0)}KB -> ${(
              compressedFile.size / 1024
            ).toFixed(0)}KB (${width}x${height})`
          );

          resolve(compressedFile);
        },
        opts.mimeType,
        opts.quality
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(file);
    };

    img.src = objectUrl;
  });
}

/**
 * Batch compress an array of image files with progress feedback
 */
export async function compressImages(
  files: File[],
  onProgress?: (index: number, total: number) => void
): Promise<File[]> {
  const result: File[] = [];
  for (let i = 0; i < files.length; i++) {
    onProgress?.(i + 1, files.length);
    const compressed = await compressImage(files[i]);
    result.push(compressed);
  }
  return result;
}
