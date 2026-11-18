// Mặt thỏ cắt từ frame đứng nhìn xuống của skin đã bake, làm avatar nhỏ (khung chat, danh sách bạn, popup người chơi).
import type { FrameRect } from './emojis';

const SKIN_DIR = '/assets/characters/';
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
    face = fetch(`${SKIN_DIR}${skinId}.json`)
      .then((r) =>
        r.ok ? (r.json() as Promise<{ frames: Record<string, { frame: FrameRect }> }>) : null,
      )
      .then((data) => {
        const frame = data?.frames['idle_down_0']?.frame;
        return frame
          ? { url: `${SKIN_DIR}${skinId}.png`, x: frame.x + FACE.x, y: frame.y + FACE.y }
          : null;
      })
      .catch(() => null);
    skinFaces.set(skinId, face);
  }
  return face;
}

/** Ô mặt thỏ (span) cỡ FACE.size, CSS lớp ngoài tự phóng to; nạp ảnh bất đồng bộ. */
export function faceElement(skinId: string, className: string): HTMLSpanElement {
  const face = document.createElement('span');
  face.className = className;
  face.style.width = `${FACE.size}px`;
  face.style.height = `${FACE.size}px`;
  void faceOf(skinId).then((rect) => {
    if (!rect) return;
    face.style.backgroundImage = `url("${rect.url}")`;
    face.style.backgroundPosition = `-${rect.x}px -${rect.y}px`;
  });
  return face;
}
