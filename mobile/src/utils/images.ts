// Phone photos are often 4–8 MB and HEIC on iPhone. The server accepts JPEG/PNG/WebP/GIF
// up to 5 MB and stops reading larger uploads part-way, which Android then reports as
// "Network request failed". So every photo is resized and re-encoded as JPEG first:
// ~200–500 KB each, sharp enough for listings (the server caps display at 1200px anyway).
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';

const MAX_EDGE = 1600;
const QUALITY = 0.7;

export interface PickedImage {
  uri: string;
  width?: number;
  height?: number;
  fileName?: string | null;
}

export interface UploadFile {
  uri: string;
  name: string;
  type: string;
}

export async function prepareForUpload(images: PickedImage[]): Promise<UploadFile[]> {
  return Promise.all(
    images.map(async (img, i) => {
      const ctx = ImageManipulator.manipulate(img.uri);
      const w = img.width || 0;
      const h = img.height || 0;
      if (w >= h && w > MAX_EDGE) ctx.resize({ width: MAX_EDGE });
      else if (h > w && h > MAX_EDGE) ctx.resize({ height: MAX_EDGE });
      const rendered = await ctx.renderAsync();
      const out = await rendered.saveAsync({ compress: QUALITY, format: SaveFormat.JPEG });
      const base = (img.fileName || `photo_${Date.now()}_${i}`).replace(/\.[^.]+$/, '');
      return { uri: out.uri, name: `${base}.jpg`, type: 'image/jpeg' };
    }),
  );
}
