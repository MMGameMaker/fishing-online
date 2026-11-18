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

/** Khoảng cách tối thiểu (px) giữa điểm dừng của bot và người/bot khác (yêu cầu 2026-11-17); cùng số với BotMap.MinSpotGap ở Server. */
export const SPOT_GAP = 24;

/** Hai điểm có quá gần nhau để đứng chồng lên nhau không. */
export function tooClose(
  a: { x: number; y: number },
  b: { x: number; y: number },
  gap = SPOT_GAP,
): boolean {
  return (a.x - b.x) ** 2 + (a.y - b.y) ** 2 < gap * gap;
}

/** Điểm đứng được ngẫu nhiên quanh (x, y), qua được `accept` nếu có; null nếu thử nhiều lần không được. */
export function pickWanderTarget(
  map: LakeMap,
  x: number,
  y: number,
  random: () => number,
  radius = 240,
  tries = 30,
  accept?: (point: { x: number; y: number }) => boolean,
): { x: number; y: number } | null {
  for (let i = 0; i < tries; i++) {
    const tx = Math.round(x + (random() * 2 - 1) * radius);
    const ty = Math.round(y + (random() * 2 - 1) * radius);
    const point = { x: tx, y: ty };
    if (canStand(map, tx, ty) && inLakeArea(map, tx, ty) && (!accept || accept(point)))
      return point;
  }
  return null;
}

const ROUTE_CELL = 8;

/** Đường thẳng giữa hai điểm không đụng vật cản (lấy mẫu mỗi 2 px bằng đúng hình chữ nhật chân). */
function clearLine(
  map: LakeMap,
  a: { x: number; y: number },
  b: { x: number; y: number },
): boolean {
  const steps = Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) / 2);
  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    if (!canStand(map, a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t)) return false;
  }
  return true;
}

/**
 * Đường đi bộ từ `from` tới `to` quanh vật cản (BFS trên lưới 8 px, rồi nắn thẳng các đoạn nhìn thấy nhau).
 * Trả về danh sách điểm cần tới theo thứ tự, điểm cuối đúng là `to`; null nếu không có đường.
 * Bot đi ngồi ghế dùng đường này thay vì đi thẳng, tránh kẹt sau nhà/bàn rồi bị dịch chuyển lên ghế.
 */
export function findRoute(
  map: LakeMap,
  from: { x: number; y: number },
  to: { x: number; y: number },
): { x: number; y: number }[] | null {
  if (!canStand(map, to.x, to.y)) return null;
  if (clearLine(map, from, to)) return [{ x: to.x, y: to.y }];
  // +1: toạ độ chân có thể nằm đúng mép dưới/phải của ô cuối.
  const cols = Math.ceil((map.widthTiles * map.tileSize) / ROUTE_CELL) + 1;
  const rows = Math.ceil((map.heightTiles * map.tileSize) / ROUTE_CELL) + 1;
  const ok = (c: number, r: number) =>
    c >= 0 && r >= 0 && c < cols && r < rows && canStand(map, c * ROUTE_CELL, r * ROUTE_CELL);
  const nearest = (p: { x: number; y: number }): [number, number] | null => {
    const c0 = Math.round(p.x / ROUTE_CELL);
    const r0 = Math.round(p.y / ROUTE_CELL);
    for (let d = 0; d <= 4; d++) {
      for (let dr = -d; dr <= d; dr++) {
        for (let dc = -d; dc <= d; dc++) {
          if (Math.max(Math.abs(dc), Math.abs(dr)) === d && ok(c0 + dc, r0 + dr)) {
            return [c0 + dc, r0 + dr];
          }
        }
      }
    }
    return null;
  };
  const start = nearest(from);
  const goal = nearest(to);
  if (!start || !goal) return null;
  const key = (c: number, r: number) => r * cols + c;
  const prev = new Map<number, number>([[key(start[0], start[1]), -1]]);
  const queue: [number, number][] = [start];
  let found = false;
  for (let head = 0; head < queue.length && !found; head++) {
    const [c, r] = queue[head]!;
    for (const [dc, dr] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
      [1, 1],
      [1, -1],
      [-1, 1],
      [-1, -1],
    ] as const) {
      const nc = c + dc;
      const nr = r + dr;
      if (prev.has(key(nc, nr)) || !ok(nc, nr)) continue;
      // Đi chéo chỉ khi hai ô kề cạnh cũng đứng được, để khỏi cắt góc vật cản.
      if (dc !== 0 && dr !== 0 && (!ok(c + dc, r) || !ok(c, r + dr))) continue;
      prev.set(key(nc, nr), key(c, r));
      if (nc === goal[0] && nr === goal[1]) found = true;
      queue.push([nc, nr]);
    }
  }
  if (!found && key(start[0], start[1]) !== key(goal[0], goal[1])) return null;
  const cells: { x: number; y: number }[] = [];
  for (let k = key(goal[0], goal[1]); k !== -1; k = prev.get(k)!) {
    cells.push({ x: (k % cols) * ROUTE_CELL, y: Math.floor(k / cols) * ROUTE_CELL });
  }
  cells.reverse();
  cells.push({ x: to.x, y: to.y });
  // Nắn thẳng: từ điểm hiện tại, nhảy tới điểm xa nhất còn nhìn thấy được.
  const route: { x: number; y: number }[] = [];
  let at = { x: from.x, y: from.y };
  let i = 0;
  while (i < cells.length) {
    let j = cells.length - 1;
    while (j > i && !clearLine(map, at, cells[j]!)) j--;
    route.push(cells[j]!);
    at = cells[j]!;
    i = j + 1;
  }
  return route;
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
