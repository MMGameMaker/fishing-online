// Dữ liệu map và va chạm theo walkableRows. Hàm thuần, Server (BE-C-01) cài đặt cùng quy tắc.
export interface LakeSeat {
  seatId: string;
  number: number;
  x: number;
  y: number;
  facing: string;
  roamRadius: number;
}

export interface LakeMap {
  mapId: string;
  mapVersion: string;
  tileSize: number;
  widthTiles: number;
  heightTiles: number;
  walkableRows: string[];
  spawn: { x: number; y: number };
  lakeArea: { x: number; y: number }[];
  moveRules: { maxSpeedPxPerSec: number; feetHalfWidth: number; feetHeight: number };
  seats: LakeSeat[];
}

function isWalkableTile(map: LakeMap, col: number, row: number): boolean {
  return map.walkableRows[row]?.[col] === '1';
}

/**
 * Hình chữ nhật chân: rộng 2 × feetHalfWidth quanh x, cao feetHeight phía trên y.
 * Cạnh phải và cạnh dưới không tính ô kế tiếp khi nằm đúng ranh giới ô.
 */
export function canStand(map: LakeMap, x: number, y: number): boolean {
  const { feetHalfWidth, feetHeight } = map.moveRules;
  const size = map.tileSize;
  const left = Math.floor((x - feetHalfWidth) / size);
  const right = Math.ceil((x + feetHalfWidth) / size) - 1;
  const top = Math.floor((y - feetHeight) / size);
  const bottom = Math.ceil(y / size) - 1;
  for (let row = top; row <= bottom; row += 1) {
    for (let col = left; col <= right; col += 1) {
      if (!isWalkableTile(map, col, row)) return false;
    }
  }
  return true;
}

/** Điểm có nằm trong đa giác phạm vi Lake không (thuật toán tia). */
export function inLakeArea(map: LakeMap, x: number, y: number): boolean {
  const points = map.lakeArea;
  let inside = false;
  for (let i = 0, j = points.length - 1; i < points.length; j = i, i += 1) {
    const a = points[i]!;
    const b = points[j]!;
    const crosses = a.y > y !== b.y > y && x < ((b.x - a.x) * (y - a.y)) / (b.y - a.y) + a.x;
    if (crosses) inside = !inside;
  }
  return inside;
}

/** Di chuyển từng trục để nhân vật trượt dọc bờ thay vì đứng khựng. */
export function stepMove(
  map: LakeMap,
  x: number,
  y: number,
  dx: number,
  dy: number,
): { x: number; y: number } {
  const nextX = dx !== 0 && canStand(map, x + dx, y) ? x + dx : x;
  const nextY = dy !== 0 && canStand(map, nextX, y + dy) ? y + dy : y;
  return { x: nextX, y: nextY };
}

/**
 * Điểm đứng được gần (x, y) nhất trong bán kính maxRadius, quét theo vòng vuông bước `step`.
 * Dùng khi rời ghế: ghế là vật cản nên điểm ngồi có thể không đứng được.
 */
export function nearestStandable(
  map: LakeMap,
  x: number,
  y: number,
  maxRadius = 48,
  step = 2,
): { x: number; y: number } | null {
  if (canStand(map, x, y)) return { x, y };
  for (let r = step; r <= maxRadius; r += step) {
    let bestD = Infinity;
    let bestX = 0;
    let bestY = 0;
    for (let dy = -r; dy <= r; dy += step) {
      for (let dx = -r; dx <= r; dx += step) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
        const d = Math.hypot(dx, dy);
        if (d >= bestD || !canStand(map, x + dx, y + dy)) continue;
        bestD = d;
        bestX = x + dx;
        bestY = y + dy;
      }
    }
    if (bestD < Infinity) return { x: bestX, y: bestY };
  }
  return null;
}

/** Bán kính tìm chỗ đứng được quanh vị trí Server trả về lúc vào hồ. */
const START_SEARCH_PX = 32;

/**
 * Chỗ xuất phát khi vào hồ. Server không giữ map: người mới ở (0, 0), người cũ giữ vị trí lần trước
 * (có thể của map khác). (0, 0) hoặc chưa có thì ở spawn; vị trí không đứng được thì lấy chỗ đứng được
 * gần nhất, không có thì về spawn.
 */
export function startPosition(
  map: LakeMap,
  reported: { x: number; y: number } | undefined,
): { x: number; y: number } {
  if (!reported || (reported.x === 0 && reported.y === 0)) return { ...map.spawn };
  return nearestStandable(map, reported.x, reported.y, START_SEARCH_PX) ?? { ...map.spawn };
}
