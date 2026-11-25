// Mặt thỏ cắt từ frame đứng nhìn xuống của skin đã bake, làm avatar nhỏ (khung chat, danh sách bạn, popup người chơi).
import { loadSkinFrames, loadSkinUrl } from '../entities/skinSheet';
import type { FrameRect } from './emojis';

/** Vùng mặt thỏ trong frame idle_down_0 (khung bake 120×140, chân ở 60,76). */
const FACE = { x: 44, y: 34, size: 34 };

export interface FaceRect {
  url: string;
  x: number;
  y: number;
}

const skinFaces = new Map<string, Promise<FaceRect | null>>();

/** Toạ độ mặt trong sheet của skin; skin chưa có art thì null. */
export function faceOf(skinId: string): Promise<FaceRect | null> {
  let face = skinFaces.get(skinId);
  if (!face) {
    face = Promise.all([loadSkinFrames(skinId), loadSkinUrl(skinId)])
      .then(([data, url]) => {
        const frame: FrameRect | undefined = data?.frames['idle_down_0']?.frame;
        return frame && url ? { url, x: frame.x + FACE.x, y: frame.y + FACE.y } : null;
      })
      .catch(() => null);
    skinFaces.set(skinId, face);
  }
  return face;
}

/** Chỉ phần đầu (đến cổ), căn giữa theo trục thân: dùng cho avatar thẻ người chơi và popup Tài khoản (yêu cầu 2026-11-25). */
const HEAD = { dx: 6, dy: 1, w: 21, h: 21 };

/**
 * Ô mặt thỏ (span) cỡ FACE.size (cả đầu và ngực), CSS lớp ngoài tự phóng to; nạp ảnh bất đồng bộ.
 * `headOnly` cắt riêng phần đầu (21×21), không lấy thân.
 */
export function faceElement(skinId: string, className: string, headOnly = false): HTMLSpanElement {
  const face = document.createElement('span');
  face.className = className;
  face.style.width = `${headOnly ? HEAD.w : FACE.size}px`;
  face.style.height = `${headOnly ? HEAD.h : FACE.size}px`;
  void faceOf(skinId).then((rect) => {
    if (!rect) return;
    face.style.backgroundImage = `url("${rect.url}")`;
    const x = rect.x + (headOnly ? HEAD.dx : 0);
    const y = rect.y + (headOnly ? HEAD.dy : 0);
    face.style.backgroundPosition = `-${x}px -${y}px`;
  });
  return face;
}
