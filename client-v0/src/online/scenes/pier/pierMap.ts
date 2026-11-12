// Kiểu dữ liệu và hàm thuần cho map bến cá dựng lại từ ảnh gốc
// (public/new resources/art/ac50186c-…png). Dữ liệu nằm ở fishingPierMap.json, sinh bằng cách
// đối chiếu từng ô 16px và từng sprite của atlas với ảnh gốc.

/** Khóa atlas trong Phaser → tên file sheet trong public/new resources/anim/atlases. */
export const PIER_SHEETS = {
  pier: 'sheet-fishing-pier-0',
  town: 'sheet-main-town-0',
} as const;
export type PierSheet = keyof typeof PIER_SHEETS;

export interface PierObject {
  sheet: PierSheet;
  frame: string;
  /** Góc trên-trái của khung nguồn (sourceSize), pixel. */
  x: number;
  y: number;
  w: number;
  h: number;
  /** 0: lớp bờ nước, 0.5: bóng object, 1: object thường, >1: vẽ sau (thùng trên đỉnh chồng). */
  layer: number;
  /** Animation chứa frame này (nếu có), để chạy tiếp từ đúng frame trong ảnh gốc. */
  anim?: string;
  animIndex?: number;
}

export interface PierMapData {
  width: number;
  height: number;
  tile: number;
  /** Danh sách frame nền; ground[row][col] là chỉ số trong danh sách này. */
  groundFrames: string[];
  ground: number[][];
  /** Ô bóng map: [col, row, frame]. */
  shadows: [number, number, string][];
  /** Alpha hiệu dụng của bóng map đo được trên ảnh gốc (atlas lưu 102/255). */
  shadowAlpha: number;
  objects: PierObject[];
  /** Chân cọc dưới cầu đứng trong nước: [x giữa, y đỉnh], dò theo màu trên ảnh gốc. */
  pillarFlows: [number, number][];
  /** Ô 16px toàn nước, không bóng, không bị thuyền/object che: [col, row]. */
  openWater: [number, number][];
}

/** Gợn sóng rải trên mặt nước, giống WaterAnimationManager của game gốc (sinh lúc chạy). */
export const RIPPLE_ANIMS = [
  { key: 'water-animations/riverFlowLong', w: 11, h: 32 },
  { key: 'water-animations/riverFlowShort', w: 11, h: 16 },
  { key: 'water-animations/riverLine', w: 2, h: 28 },
  { key: 'water-animations/riverCurve', w: 21, h: 14 },
] as const;
export const PILLAR_FLOW_ANIM = 'water-animations/pillarRiverFlow';
export const PILLAR_FLOW_WIDTH = 14;

/**
 * Chọn góc trên-trái cho gợn sóng sao cho cả khung nằm trong ô nước trống.
 * Trả về null nếu thử nhiều lần không được.
 */
export function pickRippleSpot(
  openWater: readonly [number, number][],
  size: { w: number; h: number },
  tile: number,
  rand: () => number,
  tries = 24,
): { x: number; y: number } | null {
  if (openWater.length === 0) return null;
  const open = new Set(openWater.map(([c, r]) => `${c},${r}`));
  for (let i = 0; i < tries; i++) {
    const cell = openWater[Math.floor(rand() * openWater.length)]!;
    const x = cell[0] * tile + Math.floor(rand() * Math.max(1, tile - size.w + 1));
    const y = cell[1] * tile + Math.floor(rand() * Math.max(1, tile - (size.h % tile) + 1));
    const c0 = Math.floor(x / tile);
    const c1 = Math.floor((x + size.w - 1) / tile);
    const r0 = Math.floor(y / tile);
    const r1 = Math.floor((y + size.h - 1) / tile);
    let fits = true;
    for (let r = r0; r <= r1 && fits; r++) {
      for (let c = c0; c <= c1 && fits; c++) fits = open.has(`${c},${r}`);
    }
    if (fits) return { x, y };
  }
  return null;
}

const STACK_TOP_BIAS = 40;

/** Độ sâu vẽ: sắp theo đáy khung; lớp bờ/bóng luôn dưới object. */
export function depthOf(o: PierObject): number {
  if (o.layer === 0) return -9000;
  if (o.layer < 1) return -8000 + o.y + o.h;
  return o.y + o.h + (o.layer > 1 ? STACK_TOP_BIAS : 0);
}
