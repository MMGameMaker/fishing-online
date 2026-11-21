// Dữ liệu map và va chạm theo walkableRows. Hàm thuần, Server (BE-C-01) cài đặt cùng quy tắc.
export interface LakeSeat {
  seatId: string;
  number: number;
  x: number;
  y: number;
  facing: string;
  roamRadius: number;
  /** Độ sâu vẽ khi ngồi (ghế dài dọc đè lên người ngồi nửa trên); bỏ trống thì theo y chân. */
  depth?: number;
  /** Các chỗ của cùng một ghế dài có chung `bench` (yêu cầu 2026-11-18). */
  bench?: string;
}

/** Chỗ ngồi chơi, không câu (ghế quanh bàn; yêu cầu 2026-11-18). Ghế dài có 2 chỗ là 2 mục. */
export interface RestSeat {
  restSeatId: string;
  x: number;
  y: number;
  facing: string;
  depth?: number;
  bench?: string;
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
  restSeats?: RestSeat[];
  /** NPC đứng yên trên map; ô dưới chân đã chặn sẵn trong walkableRows. Bấm F ở gần để làm `action`. */
  npcs?: LakeNpc[];
}

/**
 * Yêu cầu 2026-11-20: `codex` mở Sổ tay cá (gấu trúc chân hải đăng), `sellFish` mở Cửa hàng ở tab Bán cá
 * (cáo đỏ đầu cầu gỗ cạnh thùng hàng).
 */
export type NpcAction = 'codex' | 'sellFish' | 'leaderboard';

export interface LakeNpc {
  npcId: string;
  skinId: string;
  name: string;
  x: number;
  y: number;
  facing: 'up' | 'down' | 'left' | 'right';
  action: NpcAction;
  /** Màu tên (mặc định trắng như người chơi khác). */
  nameColor?: string;
  /** Hạ tên xuống bao nhiêu px so với người chơi (mặc định 0). */
  nameOffsetY?: number;
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

/** Ô (cột, hàng) đi tới được từ spawn, tính một lần cho mỗi map (BFS theo ô, điểm thử ở giữa đáy ô). */
const reachableCache = new WeakMap<LakeMap, { x: number; y: number }[]>();

function cellPoint(map: LakeMap, col: number, row: number): { x: number; y: number } {
  return { x: col * map.tileSize + map.tileSize / 2, y: (row + 1) * map.tileSize - 1 };
}

/**
 * Các điểm đứng được và đi bộ tới được từ spawn. Loại nước, vật cản và cả những ô "đi được" bị cô lập
 * (vd. nóc thùng, góc kẹt) để người chơi không bị sinh ra chỗ không ra được.
 */
export function reachablePoints(map: LakeMap): { x: number; y: number }[] {
  const cached = reachableCache.get(map);
  if (cached) return cached;
  const cols = map.widthTiles;
  const rows = map.heightTiles;
  const seen = new Uint8Array(cols * rows);
  const ok = (c: number, r: number): boolean => {
    if (c < 0 || r < 0 || c >= cols || r >= rows) return false;
    const p = cellPoint(map, c, r);
    return canStand(map, p.x, p.y) && inLakeArea(map, p.x, p.y);
  };
  const startCol = Math.floor(map.spawn.x / map.tileSize);
  const startRow = Math.floor(map.spawn.y / map.tileSize);
  const out: { x: number; y: number }[] = [];
  if (!ok(startCol, startRow)) {
    reachableCache.set(map, out);
    return out;
  }
  const queue: number[] = [startRow * cols + startCol];
  seen[startRow * cols + startCol] = 1;
  while (queue.length > 0) {
    const index = queue.pop()!;
    const c = index % cols;
    const r = (index - c) / cols;
    out.push(cellPoint(map, c, r));
    for (const [dc, dr] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ] as const) {
      const nc = c + dc;
      const nr = r + dr;
      const next = nr * cols + nc;
      if (nc < 0 || nr < 0 || nc >= cols || nr >= rows || seen[next]) continue;
      seen[next] = 1;
      if (ok(nc, nr)) queue.push(next);
    }
  }
  reachableCache.set(map, out);
  return out;
}

/** Không xuất hiện trong khoảng này tính từ mép map (px map). */
const SPAWN_EDGE_MARGIN_PX = 80;

/**
 * Điểm xuất phát ngẫu nhiên khi vào game (yêu cầu 2026-11-16): bất kỳ chỗ đứng được và đi tới được trên map,
 * không phải nước hay vật cản. Map không có chỗ nào như vậy thì về spawn.
 */
export function randomSpawn(
  map: LakeMap,
  random: () => number = Math.random,
  /** Loại thêm chỗ không hợp (vd. bị vật thể che); không còn chỗ nào thì bỏ qua điều kiện này. */
  accept: (x: number, y: number) => boolean = () => true,
): { x: number; y: number } {
  const all = reachablePoints(map);
  // Chừa lề quanh mép map (feedback 2026-11-17): sát mép thì camera chạm biên, nhân vật bị HUD che.
  const maxX = map.widthTiles * map.tileSize - SPAWN_EDGE_MARGIN_PX;
  const maxY = map.heightTiles * map.tileSize - SPAWN_EDGE_MARGIN_PX;
  const good = all.filter(
    (p) =>
      p.x >= SPAWN_EDGE_MARGIN_PX &&
      p.x <= maxX &&
      p.y >= SPAWN_EDGE_MARGIN_PX &&
      p.y <= maxY &&
      accept(p.x, p.y),
  );
  const points = good.length > 0 ? good : all;
  if (points.length === 0) return { ...map.spawn };
  return { ...points[Math.floor(random() * points.length)]! };
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
