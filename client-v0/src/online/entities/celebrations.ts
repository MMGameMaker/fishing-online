// Tư thế các anim ăn mừng (yêu cầu 2026-11-25): nhảy mừng, xoay vòng, nhún nhảy. Thuần tính toán theo thời gian, không phụ thuộc Phaser;
// CharacterView áp kết quả lên thân, trang phục và cần (thân luôn dùng khung idle theo hướng), còn bóng đổ ở yên dưới đất.
import type { Direction } from '../net/contract';

export type CelebrationKind = 'jump' | 'spin' | 'dance';

export const CELEBRATION_KINDS: readonly CelebrationKind[] = ['jump', 'spin', 'dance'];

export const CELEBRATION_NAMES: Record<CelebrationKind, string> = {
  jump: 'Nhảy mừng',
  spin: 'Xoay vòng',
  dance: 'Nhún nhảy',
};

export const CELEBRATION_MS: Record<CelebrationKind, number> = {
  jump: 1000,
  spin: 900,
  dance: 2400,
};

export interface CelebrationPose {
  /** Dịch ngang/dọc (pixel, dy âm là lên) áp lên thân, trang phục, cần; bóng chỉ theo dx. */
  dx: number;
  dy: number;
  /** Co giãn quanh chân. */
  sx: number;
  sy: number;
  /** Hướng khung idle hiển thị. */
  dir: Direction;
  done: boolean;
}

/** Thứ tự quay: bắt đầu từ hướng hiện tại rồi đi hết vòng. */
const SPIN_ORDER: readonly Direction[] = ['down', 'right', 'up', 'left'];

const JUMP_HOPS = 2;
const JUMP_HOP_MS = 460;
const JUMP_HEIGHT = 14;
const SPIN_HEIGHT = 8;
const DANCE_BEAT_MS = 300;
const DANCE_HEIGHT = 4;
const DANCE_SWAY = 2;

/** Co khi chạm đất/cất cánh, giãn khi lên cao; trả [sx, sy] với u là tiến độ 0..1 của một cú nhảy. */
function squashStretch(u: number): [number, number] {
  const air = Math.sin(Math.PI * u);
  const edge = Math.max(0, 1 - u / 0.16) + Math.max(0, (u - 0.84) / 0.16);
  const sy = 1 + 0.1 * air - 0.14 * edge;
  const sx = 1 - 0.07 * air + 0.1 * edge;
  return [sx, sy];
}

export function celebrationPose(kind: CelebrationKind, elapsedMs: number, baseDir: Direction): CelebrationPose {
  const total = CELEBRATION_MS[kind];
  const t = Math.max(0, elapsedMs);
  const done = t >= total;
  const rest: CelebrationPose = { dx: 0, dy: 0, sx: 1, sy: 1, dir: baseDir, done };
  if (done) return rest;

  if (kind === 'jump') {
    const hopsMs = JUMP_HOPS * JUMP_HOP_MS;
    if (t >= hopsMs) return rest;
    const u = (t % JUMP_HOP_MS) / JUMP_HOP_MS;
    const [sx, sy] = squashStretch(u);
    return { dx: 0, dy: -JUMP_HEIGHT * 4 * u * (1 - u), sx, sy, dir: baseDir, done };
  }

  if (kind === 'spin') {
    const step = Math.min(3, Math.floor((t / total) * 4));
    const start = SPIN_ORDER.indexOf(baseDir);
    const dir = SPIN_ORDER[(start + step) % 4]!;
    const u = t / total;
    const [sx, sy] = squashStretch(u);
    return { dx: 0, dy: -SPIN_HEIGHT * 4 * u * (1 - u), sx, sy, dir, done };
  }

  // Nhún nhảy: lắc qua lại mỗi hai nhịp, nảy lên mỗi nhịp, nhìn thẳng về phía trước.
  const u = (t % DANCE_BEAT_MS) / DANCE_BEAT_MS;
  const [sx, sy] = squashStretch(u);
  return {
    dx: DANCE_SWAY * Math.sin((Math.PI * t) / DANCE_BEAT_MS),
    dy: -DANCE_HEIGHT * 4 * u * (1 - u),
    sx,
    sy,
    dir: 'down',
    done,
  };
}
