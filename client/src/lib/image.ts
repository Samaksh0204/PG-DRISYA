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
