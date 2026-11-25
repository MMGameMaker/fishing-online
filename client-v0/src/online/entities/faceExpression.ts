// Biểu cảm mặt (yêu cầu 2026-11-25): chớp mắt, mắt cười, nháy mắt, mắt trái tim, ngạc nhiên, khóc, giận, ngáp. Vẽ vài điểm ảnh lên mặt
// nhân vật khi đứng yên nhìn thẳng. Vị trí đo trên khung idle nhìn xuống (khung bake 120×140, chân ở (60, 76)): hầu hết loài có mắt dọc
// 1×2 điểm tại x 56 và 64, hàng 51-52; Gấu mắt ngang 2×1 ở hàng 52, Shiba mắt 1×1 ở hàng 51. Điểm ảnh che mắt cũ bằng màu lông trán
// rồi vẽ mắt mới. Miệng (ngạc nhiên, ngáp) chỉ vẽ với loài có khoảng trống dưới mũi (thỏ, mèo, Harlequin, thỏ đốm).
import { parseSkinId } from './skinColor';

export type ExpressionKind = 'blink' | 'smile' | 'wink' | 'love' | 'surprised' | 'cry' | 'angry' | 'yawn';

export const EXPRESSION_KINDS: readonly ExpressionKind[] = [
  'blink',
  'smile',
  'wink',
  'love',
  'surprised',
  'cry',
  'angry',
  'yawn',
];

export const EXPRESSION_MS: Record<ExpressionKind, number> = {
  blink: 180,
  smile: 1800,
  wink: 600,
  love: 1800,
  surprised: 1200,
  cry: 2200,
  angry: 1600,
  yawn: 2000,
};

export const EXPRESSION_NAMES: Record<ExpressionKind, string> = {
  blink: 'Chớp mắt',
  smile: 'Mắt cười',
  wink: 'Nháy mắt',
  love: 'Mắt trái tim',
  surprised: 'Ngạc nhiên',
  cry: 'Khóc',
  angry: 'Giận',
  yawn: 'Ngáp',
};

export type ExpressionColor = 'fur' | 'dark' | 'blush' | 'red' | 'tear' | 'white';

export interface ExpressionPixel {
  /** Toạ độ trong khung bake (gốc ở góc trên trái khung). */
  x: number;
  y: number;
  color: ExpressionColor;
}

interface Eye {
  /** Điểm ảnh của mắt gốc (sẽ được che). */
  pixels: [number, number][];
  /** Tâm ngang của mắt, hàng trên và hàng dưới dùng để vẽ mắt khép/cười. */
  cx: number;
  top: number;
  bottom: number;
}

const STANDARD: Eye[] = [
  {
    pixels: [
      [56, 51],
      [56, 52],
    ],
    cx: 56,
    top: 51,
    bottom: 52,
  },
  {
    pixels: [
      [64, 51],
      [64, 52],
    ],
    cx: 64,
    top: 51,
    bottom: 52,
  },
];

/** Gấu: mắt nằm ngang 2 điểm ở hàng 52. */
const BEAR: Eye[] = [
  {
    pixels: [
      [55, 52],
      [56, 52],
    ],
    cx: 56,
    top: 52,
    bottom: 53,
  },
  {
    pixels: [
      [64, 52],
      [65, 52],
    ],
    cx: 64,
    top: 52,
    bottom: 53,
  },
];

/** Shiba: mắt 1 điểm ở hàng 51. */
const SHIBA: Eye[] = [
  { pixels: [[56, 51]], cx: 56, top: 51, bottom: 52 },
  { pixels: [[64, 51]], cx: 64, top: 51, bottom: 52 },
];

/** Má hồng khi cười: ngay dưới mắt. */
const BLUSH: [number, number][] = [
  [55, 54],
  [56, 54],
  [64, 54],
  [65, 54],
];

/** Miệng "o" (ngạc nhiên) và miệng há to kèm lưỡi (ngáp), ngay dưới mũi ở (60, 53). */
const MOUTH_O: [number, number][] = [
  [59, 54],
  [60, 54],
  [61, 54],
  [60, 55],
];
const MOUTH_WIDE: [number, number][] = [
  [59, 54],
  [60, 54],
  [61, 54],
  [59, 55],
  [60, 55],
  [61, 55],
];
const TONGUE: [number, number] = [60, 55];

function eyesOf(skinId: string): Eye[] {
  const { base } = parseSkinId(skinId);
  if (base.includes('bear')) return BEAR;
  if (base.includes('shiba')) return SHIBA;
  return STANDARD;
}

/** Loài có khoảng trống dưới mũi để vẽ miệng: thỏ (skin_0x), mèo, Harlequin, thỏ đốm. */
function hasMouthRoom(skinId: string): boolean {
  const { base } = parseSkinId(skinId);
  return /^skin_0\d$/.test(base) || base.includes('cat') || base.includes('harlequin') || base.includes('red_bunny');
}

const px = (x: number, y: number, color: ExpressionColor): ExpressionPixel => ({ x, y, color });

/** Mắt khép: nét ngang 3 điểm ở hàng dưới. */
const closed = (eye: Eye): ExpressionPixel[] => [-1, 0, 1].map((dx) => px(eye.cx + dx, eye.bottom, 'dark'));
/** Mắt cười: vòm ^ (đỉnh ở hàng trên, hai chân ở hàng dưới). */
const arch = (eye: Eye): ExpressionPixel[] => [
  px(eye.cx - 1, eye.bottom, 'dark'),
  px(eye.cx, eye.top, 'dark'),
  px(eye.cx + 1, eye.bottom, 'dark'),
];
/** Mắt trái tim 3×3. */
const heart = (eye: Eye): ExpressionPixel[] => [
  px(eye.cx - 1, eye.top - 1, 'red'),
  px(eye.cx + 1, eye.top - 1, 'red'),
  px(eye.cx - 1, eye.top, 'red'),
  px(eye.cx, eye.top, 'red'),
  px(eye.cx + 1, eye.top, 'red'),
  px(eye.cx, eye.top + 1, 'red'),
];
/** Mắt tròn to 3×3 có điểm sáng ở góc trên trái. */
const wide = (eye: Eye): ExpressionPixel[] => {
  const out: ExpressionPixel[] = [];
  for (let dy = -1; dy <= 1; dy += 1) for (let dx = -1; dx <= 1; dx += 1) out.push(px(eye.cx + dx, eye.top + dy, 'dark'));
  out.push(px(eye.cx - 1, eye.top - 1, 'white'));
  return out;
};

/**
 * Điểm ảnh cần vẽ cho biểu cảm, theo thứ tự vẽ: trước hết che mắt gốc bằng màu lông, sau đó vẽ mắt/miệng mới. `elapsedMs` dùng cho
 * phần động (giọt nước mắt rơi).
 */
export function expressionPixels(kind: ExpressionKind, skinId: string, elapsedMs = 0): ExpressionPixel[] {
  const eyes = eyesOf(skinId);
  const [left, right] = eyes as [Eye, Eye];
  const out: ExpressionPixel[] = [];
  const cover = (eye: Eye) => {
    for (const [x, y] of eye.pixels) out.push(px(x, y, 'fur'));
  };
  const standard = eyes === STANDARD;

  switch (kind) {
    case 'blink':
      for (const eye of eyes) {
        cover(eye);
        out.push(...closed(eye));
      }
      break;
    case 'smile':
      for (const eye of eyes) {
        cover(eye);
        out.push(...arch(eye));
      }
      // Má hồng chỉ ở mặt tiêu chuẩn: gấu và shiba có mõm/đốm ngay dưới mắt nên bỏ để khỏi rối.
      if (standard) for (const [x, y] of BLUSH) out.push(px(x, y, 'blush'));
      break;
    case 'wink':
      // Nháy mắt phải (bên phải màn hình), mắt trái giữ nguyên.
      cover(right);
      out.push(...closed(right));
      break;
    case 'love':
      for (const eye of eyes) {
        cover(eye);
        out.push(...heart(eye));
      }
      if (standard) for (const [x, y] of BLUSH) out.push(px(x, y, 'blush'));
      break;
    case 'surprised':
      for (const eye of eyes) {
        cover(eye);
        out.push(...wide(eye));
      }
      if (hasMouthRoom(skinId)) for (const [x, y] of MOUTH_O) out.push(px(x, y, 'dark'));
      break;
    case 'cry': {
      // Mắt nhắm, mỗi bên một giọt nước mắt rơi xuống (2 vị trí luân phiên).
      const drop = Math.floor(elapsedMs / 180) % 2;
      for (const [index, eye] of [left, right].entries()) {
        cover(eye);
        out.push(...closed(eye));
        const x = eye.cx + (index === 0 ? -1 : 1);
        out.push(px(x, eye.bottom + 1 + drop, 'tear'));
        out.push(px(x, eye.bottom + 2 + drop, 'tear'));
      }
      break;
    }
    case 'angry': {
      // Lông mày xếch: đầu trong thấp hơn đầu ngoài, nằm trên mắt.
      const y = left.top - 2;
      out.push(px(left.cx - 2, y, 'dark'), px(left.cx - 1, y, 'dark'), px(left.cx, y + 1, 'dark'), px(left.cx + 1, y + 1, 'dark'));
      out.push(
        px(right.cx + 2, y, 'dark'),
        px(right.cx + 1, y, 'dark'),
        px(right.cx, y + 1, 'dark'),
        px(right.cx - 1, y + 1, 'dark'),
      );
      break;
    }
    case 'yawn':
      for (const eye of eyes) {
        cover(eye);
        out.push(...closed(eye));
      }
      if (hasMouthRoom(skinId)) {
        for (const [x, y] of MOUTH_WIDE) out.push(px(x, y, 'dark'));
        out.push(px(TONGUE[0], TONGUE[1], 'blush'));
      }
      break;
  }
  return out;
}
