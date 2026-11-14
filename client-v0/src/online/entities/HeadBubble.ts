// Bong bóng trên đầu nhân vật dựng từ Head Bubble.png (pier.html, feedback 2026-11-14): nền kem, viền nâu,
// bóng đổ, đuôi nhọn giữa đáy chỉ xuống nhân vật. Dùng cho cả chat và emoji. Ảnh vẽ ở tỉ lệ 4 nên ghép
// texture ở tỉ lệ đó rồi hiển thị ×0,25 để điểm ảnh khớp nhân vật. Đuôi và góc giữ nguyên, cạnh kéo giãn.
import type Phaser from 'phaser';

export const HEAD_BUBBLE_SRC = 'head-bubble-src';
const SRC_URL = encodeURI('/new resources/ui/Head Bubble.png');

/** Mốc cắt trong ảnh 95×104 (pixel ảnh). */
const SRC = { w: 95, h: 104, border: 4, bodyBottom: 88, tailX0: 39, tailX1: 55 } as const;
const ART_SCALE = 4;

export function preloadHeadBubble(scene: Phaser.Scene): void {
  if (!scene.textures.exists(HEAD_BUBBLE_SRC)) scene.load.image(HEAD_BUBBLE_SRC, SRC_URL);
}

export function hasHeadBubble(scene: Phaser.Scene): boolean {
  return scene.textures.exists(HEAD_BUBBLE_SRC);
}

/**
 * Texture bong bóng có thân rộng `w` × cao `h` (pixel thế giới, không tính đuôi). Ghép 3 hàng × 5 cột:
 * góc và đuôi giữ nguyên, phần còn lại kéo giãn. Cache theo kích thước.
 */
export function headBubbleTexture(scene: Phaser.Scene, w: number, h: number): string {
  const key = `head-bubble-${w}x${h}`;
  if (scene.textures.exists(key)) return key;
  const src = scene.textures.get(HEAD_BUBBLE_SRC).getSourceImage() as HTMLImageElement;
  const tw = Math.max(w * ART_SCALE, SRC.border * 2 + (SRC.tailX1 - SRC.tailX0) + 8);
  const tailH = SRC.h - SRC.bodyBottom;
  const th = Math.max(h * ART_SCALE, SRC.border * 2 + 4) + tailH;
  const canvas = scene.textures.createCanvas(key, tw, th)!;
  const ctx = canvas.getContext();
  ctx.imageSmoothingEnabled = false;

  const tailW = SRC.tailX1 - SRC.tailX0;
  const sideFill = (tw - SRC.border * 2 - tailW) / 2;
  const leftFill = Math.floor(sideFill);
  const rightFill = Math.ceil(sideFill);
  // Cột nguồn [x0, x1) → cột đích [dx, dx + dw).
  const cols: [number, number, number, number][] = [
    [0, SRC.border, 0, SRC.border],
    [SRC.border, SRC.tailX0, SRC.border, leftFill],
    [SRC.tailX0, SRC.tailX1, SRC.border + leftFill, tailW],
    [SRC.tailX1, SRC.w - SRC.border, SRC.border + leftFill + tailW, rightFill],
    [SRC.w - SRC.border, SRC.w, tw - SRC.border, SRC.border],
  ];
  const bodyH = th - tailH;
  const rows: [number, number, number, number][] = [
    [0, SRC.border, 0, SRC.border],
    [SRC.border, SRC.bodyBottom, SRC.border, bodyH - SRC.border],
    [SRC.bodyBottom, SRC.h, bodyH, tailH],
  ];
  for (const [sy0, sy1, dy, dh] of rows) {
    for (const [sx0, sx1, dx, dw] of cols) {
      if (dw <= 0 || dh <= 0) continue;
      ctx.drawImage(src, sx0, sy0, sx1 - sx0, sy1 - sy0, dx, dy, dw, dh);
    }
  }
  canvas.refresh();
  return key;
}

/** Chiều cao phần đuôi (pixel thế giới) để đặt nội dung lên trên đuôi. */
export const HEAD_BUBBLE_TAIL_PX = (SRC.h - SRC.bodyBottom) / ART_SCALE;
export const HEAD_BUBBLE_ART_SCALE = 1 / ART_SCALE;
