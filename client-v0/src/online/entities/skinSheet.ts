// Sheet skin cho phần giao diện HTML (mặt, chân dung, xem thử): nạp sheet gốc, skin có hậu tố màu thì đổi màu bằng canvas (skinColor.ts).
import { WHITE_COLOR_ID, parseSkinId, recolorPixels } from './skinColor';

const SKIN_DIR = '/assets/characters/';

export interface SkinFrames {
  frames: Record<string, { frame: { x: number; y: number; w: number; h: number } }>;
}

const jsons = new Map<string, Promise<SkinFrames | null>>();
const images = new Map<string, Promise<CanvasImageSource | null>>();
const urls = new Map<string, Promise<string | null>>();

/** JSON khung của skin (skin có màu dùng JSON của skin gốc). */
export function loadSkinFrames(skinId: string): Promise<SkinFrames | null> {
  const { base } = parseSkinId(skinId);
  let json = jsons.get(base);
  if (!json) {
    json = fetch(`${SKIN_DIR}${base}.json`)
      .then((r) => (r.ok ? (r.json() as Promise<SkinFrames>) : null))
      .catch(() => null);
    jsons.set(base, json);
  }
  return json;
}

/** Ảnh sheet đã đổi màu (ảnh gốc hoặc canvas); không có art thì null. */
export function loadSkinImage(skinId: string): Promise<CanvasImageSource | null> {
  let image = images.get(skinId);
  if (!image) {
    image = (async () => {
      const { base, colorId } = parseSkinId(skinId);
      const source = new Image();
      source.src = `${SKIN_DIR}${base}.png`;
      await source.decode();
      if (colorId === WHITE_COLOR_ID) return source;
      const canvas = document.createElement('canvas');
      canvas.width = source.naturalWidth;
      canvas.height = source.naturalHeight;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(source, 0, 0);
      const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height);
      recolorPixels(pixels.data, colorId);
      ctx.putImageData(pixels, 0, 0);
      return canvas;
    })().catch(() => null);
    images.set(skinId, image);
  }
  return image;
}

/** URL dùng làm background-image: file gốc với bản trắng, data URL với bản đã đổi màu. */
export function loadSkinUrl(skinId: string): Promise<string | null> {
  let url = urls.get(skinId);
  if (!url) {
    const { base, colorId } = parseSkinId(skinId);
    url =
      colorId === WHITE_COLOR_ID
        ? Promise.resolve(`${SKIN_DIR}${base}.png`)
        : loadSkinImage(skinId).then((image) =>
            image instanceof HTMLCanvasElement ? image.toDataURL() : null,
          );
    urls.set(skinId, url);
  }
  return url;
}
