// Ask image CDNs for a copy sized for where it's shown, in a modern format
// (WebP/AVIF), instead of downloading full-size originals.
export function optimizeImage(url: string | undefined, width: number): string | undefined {
  if (!url) return url;
  try {
    if (url.includes('res.cloudinary.com') && url.includes('/upload/') && !/\/upload\/[^/]*(w_|q_|f_)/.test(url)) {
      return url.replace('/upload/', `/upload/f_auto,q_auto,c_limit,w_${width}/`);
    }
    if (url.includes('images.pexels.com')) {
      const u = new URL(url);
      u.searchParams.set('auto', 'compress');
      u.searchParams.set('cs', 'tinysrgb');
      u.searchParams.set('w', String(width));
      return u.toString();
    }
  } catch {
    /* leave unknown URLs untouched */
  }
  return url;
}

// srcset with 1x and 2x versions for sharp images on high-density screens.
export function imageSrcSet(url: string | undefined, width: number): string | undefined {
  const one = optimizeImage(url, width);
  const two = optimizeImage(url, width * 2);
  return one && two && one !== url ? `${one} 1x, ${two} 2x` : undefined;
}

// Phone photos are often 4–8 MB; the server accepts up to 5 MB each. Shrink large
// photos in the browser (longest edge 1600px, JPEG) before uploading. Small images,
// and any browser that can't decode the file, keep the original.
const MAX_EDGE = 1600;
const KEEP_UNDER_BYTES = 1.5 * 1024 * 1024;

export async function shrinkImage(file: File): Promise<File> {
  if (typeof createImageBitmap !== 'function' || typeof document === 'undefined') return file;
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
    if (scale === 1 && file.size <= KEEP_UNDER_BYTES) {
      bitmap.close?.();
      return file;
    }
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close?.();
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.8));
    if (!blob || blob.size >= file.size) return file;
    return new File([blob], file.name.replace(/\.[^.]+$/, '') + '.jpg', { type: 'image/jpeg' });
  } catch {
    return file;
  }
}
