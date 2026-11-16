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
