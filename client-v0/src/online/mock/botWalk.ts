// Bot đi bộ mượt cho mock pier (feedback 2026-11-16: bot đi mà như dịch chuyển). Hàm thuần, test được.
// Mỗi nhịp 100 ms bot đi một bước ngắn (đúng nhịp Client gửi Move và nội suy 100 ms), không nhảy 16 px mỗi 0,6 giây.
import type { Direction } from '../net/contract';
import { directionFromVector } from '../scenes/lake/movement';
import { canStand, inLakeArea, stepMove, type LakeMap } from '../scenes/lake/walkable';

/** Nhịp phát PlayerMoved của bot đang đi (ms), bằng nhịp Move của người chơi thật. */
export const BOT_WALK_EVERY_MS = 100;
/** Tốc độ đi dạo của bot (px/giây), chậm hơn mức tối đa 90 của người chơi. */
export const BOT_WALK_SPEED = 55;
/** Nghỉ giữa hai điểm tới (ms). */
export const BOT_PAUSE_MS = [800, 3000] as const;

export interface WalkResult {
  x: number;
  y: number;
  dir: Direction;
  moved: boolean;
  arrived: boolean;
}

/** Điểm đứng được ngẫu nhiên quanh (x, y); null nếu thử nhiều lần không được. */
export function pickWanderTarget(
  map: LakeMap,
  x: number,
  y: number,
  random: () => number,
  radius = 240,
  tries = 30,
): { x: number; y: number } | null {
  for (let i = 0; i < tries; i++) {
    const tx = Math.round(x + (random() * 2 - 1) * radius);
    const ty = Math.round(y + (random() * 2 - 1) * radius);
    if (canStand(map, tx, ty) && inLakeArea(map, tx, ty)) return { x: tx, y: ty };
  }
  return null;
}

/** Một bước thẳng tới (tx, ty), trượt dọc vật cản; `moved` false nghĩa là kẹt. */
export function walkStep(
  map: LakeMap,
  x: number,
  y: number,
  tx: number,
  ty: number,
  stepPx: number,
  fallback: Direction = 'down',
): WalkResult {
  const dx = tx - x;
  const dy = ty - y;
  const distance = Math.hypot(dx, dy);
  if (distance <= 2) return { x, y, dir: fallback, moved: false, arrived: true };
  const step = Math.min(distance, stepPx);
  const next = stepMove(map, x, y, (dx / distance) * step, (dy / distance) * step);
  const moved = next.x !== x || next.y !== y;
  const dir = directionFromVector(dx, dy, fallback);
  return { x: next.x, y: next.y, dir, moved, arrived: Math.hypot(tx - next.x, ty - next.y) <= 2 };
}
