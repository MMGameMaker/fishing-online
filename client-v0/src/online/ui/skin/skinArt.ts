// Art skin dùng chung cho Túi đồ, cửa hàng và khung Ngoại hình: chân dung thỏ cắt từ sheet đã bake
// (tools/bake_characters.py, tools/bake_outfit_skins.mjs) và danh sách skin từ Server.
import type { ApiClient } from '../../net/ApiClient';
import type { SkinsResponse } from '../../net/contract';

const SKIN_DIR = '/assets/characters/';

const portraits = new Map<string, Promise<string | null>>();

/** Thỏ đứng nhìn xuống cắt sát từ sheet skin đã bake (data URL); skin chưa có art thì null. */
export function skinPortrait(skinId: string): Promise<string | null> {
  let portrait = portraits.get(skinId);
  if (!portrait) {
    portrait = (async () => {
      const response = await fetch(`${SKIN_DIR}${skinId}.json`);
      if (!response.ok) return null;
      const data = (await response.json()) as {
        frames: Record<string, { frame: { x: number; y: number; w: number; h: number } }>;
      };
      const frame = data.frames['idle_down_0']?.frame;
      if (!frame) return null;
      const image = new Image();
      image.src = `${SKIN_DIR}${skinId}.png`;
      await image.decode();
      const canvas = document.createElement('canvas');
      canvas.width = frame.w;
      canvas.height = frame.h;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(image, frame.x, frame.y, frame.w, frame.h, 0, 0, frame.w, frame.h);
      const { data: px } = ctx.getImageData(0, 0, frame.w, frame.h);
      let x0 = frame.w;
      let y0 = frame.h;
      let x1 = -1;
      let y1 = -1;
      for (let y = 0; y < frame.h; y++) {
        for (let x = 0; x < frame.w; x++) {
          if (px[(y * frame.w + x) * 4 + 3] === 0) continue;
          x0 = Math.min(x0, x);
          y0 = Math.min(y0, y);
          x1 = Math.max(x1, x);
          y1 = Math.max(y1, y);
        }
      }
      if (x1 < 0) return null;
      const out = document.createElement('canvas');
      out.width = x1 - x0 + 1;
      out.height = y1 - y0 + 1;
      out.getContext('2d')!.drawImage(canvas, -x0, -y0);
      return out.toDataURL();
    })().catch(() => null);
    portraits.set(skinId, portrait);
  }
  return portrait;
}

/**
 * Ảnh thỏ phóng nguyên số lần (pixel art giữ nét). Ảnh chưa nạp xong thì rỗng, nạp xong mới đặt kích thước;
 * skin chưa có art thì ảnh ẩn.
 */
export function skinImage(skinId: string, scale: number, className = ''): HTMLImageElement {
  const node = document.createElement('img');
  node.className = className;
  node.alt = '';
  node.draggable = false;
  node.hidden = true;
  void skinPortrait(skinId).then((src) => {
    if (!src) return;
    node.onload = () => {
      node.style.width = `${node.naturalWidth * scale}px`;
      node.style.height = `${node.naturalHeight * scale}px`;
      node.hidden = false;
    };
    node.src = src;
  });
  return node;
}

export const loadSkins = (api: ApiClient): Promise<SkinsResponse> =>
  api.get<SkinsResponse>('/skins');

// ---------- Xem thử trang phục (tab Trang phục của Cửa hàng, yêu cầu 2026-11-25) ----------

interface WardrobeThumbs {
  box: { x: number; y: number; w: number; h: number };
  items: Record<string, { x: number; y: number }>;
  image: HTMLImageElement;
}

let thumbsPromise: Promise<WardrobeThumbs | null> | null = null;

/** Sheet ảnh xem thử mọi món (tools/bake_wardrobe.mjs, `_thumbs.png|json`): tải một lần. */
function loadThumbs(): Promise<WardrobeThumbs | null> {
  thumbsPromise ??= (async () => {
    const response = await fetch('/assets/wardrobe/_thumbs.json');
    if (!response.ok) return null;
    const data = (await response.json()) as Omit<WardrobeThumbs, 'image'>;
    const image = new Image();
    image.src = '/assets/wardrobe/_thumbs.png';
    await image.decode();
    return { ...data, image };
  })().catch(() => null);
  return thumbsPromise;
}

const bodyCrops = new Map<string, Promise<HTMLCanvasElement | null>>();

/** Thân đứng nhìn xuống của skin, cắt đúng vùng xem thử (cùng vùng với ảnh món). */
function bodyCrop(skinId: string, box: WardrobeThumbs['box']): Promise<HTMLCanvasElement | null> {
  let crop = bodyCrops.get(skinId);
  if (!crop) {
    crop = (async () => {
      const response = await fetch(`${SKIN_DIR}${skinId}.json`);
      if (!response.ok) return null;
      const data = (await response.json()) as {
        frames: Record<string, { frame: { x: number; y: number; w: number; h: number } }>;
      };
      const frame = data.frames['idle_down_0']?.frame;
      if (!frame) return null;
      const image = new Image();
      image.src = `${SKIN_DIR}${skinId}.png`;
      await image.decode();
      const canvas = document.createElement('canvas');
      canvas.width = box.w;
      canvas.height = box.h;
      canvas
        .getContext('2d')!
        .drawImage(image, frame.x + box.x, frame.y + box.y, box.w, box.h, 0, 0, box.w, box.h);
      return canvas;
    })().catch(() => null);
    bodyCrops.set(skinId, crop);
  }
  return crop;
}

/**
 * Ảnh nhân vật mặc thử `itemIds` (quần, áo, mũ theo thứ tự truyền vào), phóng nguyên số lần. Chưa nạp xong thì ẩn; thiếu art thân thì
 * chỉ hiện món. Dùng ảnh xem thử chung nên 291 món chỉ tốn 1 ảnh + 1 JSON.
 */
export function outfitImage(
  skinId: string,
  itemIds: readonly string[],
  scale: number,
  className = '',
): HTMLImageElement {
  const node = document.createElement('img');
  node.className = className;
  node.alt = '';
  node.draggable = false;
  node.hidden = true;
  void loadThumbs().then(async (thumbs) => {
    if (!thumbs) return;
    const { box } = thumbs;
    const canvas = document.createElement('canvas');
    canvas.width = box.w;
    canvas.height = box.h;
    const ctx = canvas.getContext('2d')!;
    const body = await bodyCrop(skinId, box);
    if (body) ctx.drawImage(body, 0, 0);
    for (const id of itemIds) {
      const at = thumbs.items[id];
      if (at) ctx.drawImage(thumbs.image, at.x, at.y, box.w, box.h, 0, 0, box.w, box.h);
    }
    node.onload = () => {
      node.style.width = `${box.w * scale}px`;
      node.style.height = `${box.h * scale}px`;
      node.hidden = false;
    };
    node.src = canvas.toDataURL();
  });
  return node;
}
