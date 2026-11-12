// Dữ liệu khu fishing-cabin: phòng lg/md ghép lại nguyên bản từ embedded-metadata-0,
// sân sau tự dựng (atlas không có vị trí ghép của nền sân sau). Chỉ dữ liệu thuần, không phụ thuộc Phaser.

export type CabinMapId = 'lg' | 'md' | 'backyard';
export type RoomId = Exclude<CabinMapId, 'backyard'>;

export const RES = encodeURI('/new resources');
export const ROOM_ATLAS = 'room-fishing-cabin';
export const YARD_ATLAS = 'fishing-cabin-yard';
export const PIER_ATLAS = 'fishing-pier';
export const METADATA_KEY = 'embedded-metadata-0';

export interface Point {
  x: number;
  y: number;
}

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
  kind?: string;
}

export interface RoomConfig {
  /** Khóa trong embedded-metadata-0. */
  floor: string;
  bottomWall: string;
  /** Vị trí lớp tường trước, dò bằng so khớp điểm ảnh với sàn (khớp 100%). */
  bottomWallAt: Point;
  middleWall: { frame: string } & Point;
  /** Cửa ra sân sau: góc trên-trái của openFishingDoor. */
  door: Point;
  /** Bệ cửa sổ có chim (khung 64 × 32). */
  birdWindows: Point[];
  /** Cửa sổ mở/đóng (khung 48 × 32). */
  windows: Point[];
  mapJson: string;
}

export const ROOMS: Record<RoomId, RoomConfig> = {
  lg: {
    floor: 'fishing-cabin-burrow/lgFloor',
    bottomWall: 'fishing-cabin-burrow/lgBottomWall',
    bottomWallAt: { x: 0, y: 150 },
    middleWall: { frame: 'fishing-cabin-burrow/lgMiddleWall', x: 16, y: 124 },
    door: { x: 371, y: 21 },
    birdWindows: [
      { x: 32, y: 22 },
      { x: 480, y: 22 },
    ],
    windows: [{ x: 208, y: 86 }],
    mapJson: 'fishing-cabin-lg.json',
  },
  md: {
    floor: 'fishing-cabin-burrow/mdFloor',
    bottomWall: 'fishing-cabin-burrow/mdBottomWall',
    bottomWallAt: { x: 64, y: 214 },
    middleWall: { frame: 'fishing-cabin-burrow/mdMiddleWall', x: 0, y: 118 },
    door: { x: 157, y: 21 },
    birdWindows: [{ x: 48, y: 22 }],
    windows: [{ x: 288, y: 142 }],
    mapJson: 'fishing-cabin-md.json',
  },
};

export const BIRD_ANIMS = [
  'fishing-cabin-windows/birdFlap',
  'fishing-cabin-windows/birdSquawk',
  'fishing-cabin-windows/birdEgg',
] as const;
export const WINDOW_ANIM = 'fishing-cabin-windows/openWindow';
export const DOOR_FRAME = 'fishing-cabin-burrow/openFishingDoor';

/** Một mục trong embedded-metadata-0. */
export interface PartMetadata {
  folder: string;
  data: {
    tile_size: number;
    image: { width: number; height: number };
    tiles: Record<string, [number, number][]>;
  };
}

export interface TilePlacement {
  frame: string;
  x: number;
  y: number;
}

/** Đổi bảng hash → danh sách ô thành danh sách vẽ (frame, pixel). */
export function partPlacements(part: PartMetadata): TilePlacement[] {
  const size = part.data.tile_size;
  const out: TilePlacement[] = [];
  for (const [hash, cells] of Object.entries(part.data.tiles)) {
    const frame = `maps/${part.folder}/${hash}`;
    for (const [col, row] of cells) out.push({ frame, x: col * size, y: row * size });
  }
  return out;
}

/** Va chạm trong map JSON; dùng cho lớp hiển thị kiểm tra. */
export interface MapJson {
  objects: Record<string, { name: string; params: { spawnPosition: Point; colliders: Rect[] } }>;
}

export function collidersOf(map: MapJson): Rect[] {
  return Object.values(map.objects).flatMap((o) => o.params.colliders ?? []);
}

// ---------------- Sân sau ----------------

export const TILE = 16;
/** Vùng hiển thị sân sau, theo tọa độ gốc của fishing-cabin-backyard.json. */
// Rộng tối thiểu bằng khung hình 480 × 270 để không lộ mép đen.
export const YARD_VIEW = { x: 304, y: 464, width: 496, height: 352 } as const;
/** Ao 3 × 3 ô bờ 32px lấy từ atlas fishing-pier, canh theo collider kind "water" (494–568, 650–722). */
export const POND = { x: 483, y: 638, cell: 32 } as const;
/** Lối cát từ cửa sau xuống ao, rộng 3 ô (mép trái, cát, mép phải). */
export const PATH = { x: 499, yFrom: 592, yTo: 648 } as const;
/** Cửa sau trên vách gỗ. */
export const YARD_DOOR = { x: 503, y: 545 } as const;

const yard = (ids: string[]): string[] => ids.map((id) => `maps/fishing-cabin-backyard/${id}`);

/** Ô cỏ trơn (độ thuần màu cao) và ô cỏ có hoa/đá để rải thêm. */
export const GRASS_FRAMES = yard([
  '0edd2e29',
  '0f3147f6',
  '1a3d0a8c',
  '1a4e34a8',
  '1c6a2019',
  '1f2be413',
  '2ba124e5',
  '4b5b1c3a',
  '4e4389b5',
  '05b5c26c',
  '05c60df1',
  '005d1f68',
  '5e8b6f91',
  '6d9c9273',
  '7b1b69b7',
  '8a5dae69',
  '8b1fb2d5',
  '8b5c9716',
  '08be3c6a',
  '8f1c1d44',
  '9dabb61f',
  '15b60920',
  '17ac46d9',
  '19d318e4',
  '41eea4c5',
  '44b23684',
  '45c7bc68',
  '46e5d162',
  '52e44e7a',
  '57aa90fb',
  '74bf5b37',
  '75f7f53d',
  '82a5ba81',
  '85c8b960',
  '86b5a870',
  '89b7dcaa',
  '103f50ff',
  '437d8303',
  '617c8ef0',
  '622ec2ba',
]);
export const GRASS_DECOR_FRAMES = yard([
  'bf1f8a19',
  'c4ad6f62',
  'c7a040b5',
  'c42d11ef',
  'ce13a386',
  'dd8e85ef',
  'eaa67c51',
  'eb8d35e6',
  'eb124f62',
  'ed2ba2b4',
  'f64d76b7',
  'f79b224b',
  'f83b7d8c',
  'f86d1621',
  'f337b799',
  'f16166a3',
  'fcd7d913',
  '38bf4266',
  'bfa8dfb4',
  '49244811',
  '4e148045',
  'a8a5a648',
  'e814198a',
  '264ea72d',
]);
export const SAND_FRAMES = yard([
  '0ffd9489',
  '0086ee60',
  '115cc8b3',
  '70492e29',
  'a52cf0ae',
  'b03826c8',
]);
/** Mép trái lối đi (cỏ trái, cát phải) và mép phải (cát trái, cỏ phải). */
export const PATH_LEFT_FRAMES = yard(['ab224827', 'f6667103']);
export const PATH_RIGHT_FRAMES = yard(['c6425d0b']);

/** PRNG có seed để bố cục giống nhau mỗi lần tải. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pick(list: string[], rand: () => number): string {
  return list[Math.floor(rand() * list.length)] ?? list[0]!;
}

/** Nền sân sau: cỏ phủ toàn vùng xem, lối cát 3 ô từ cửa xuống ao. */
export function backyardGround(seed = 11): TilePlacement[] {
  const rand = mulberry32(seed);
  const out: TilePlacement[] = [];
  const x0 = Math.floor(YARD_VIEW.x / TILE);
  const y0 = Math.floor(YARD_VIEW.y / TILE);
  const x1 = Math.ceil((YARD_VIEW.x + YARD_VIEW.width) / TILE);
  const y1 = Math.ceil((YARD_VIEW.y + YARD_VIEW.height) / TILE);
  const pathCol = Math.floor(PATH.x / TILE);
  for (let ty = y0; ty < y1; ty++) {
    for (let tx = x0; tx < x1; tx++) {
      const y = ty * TILE;
      const onPath = y >= PATH.yFrom - TILE && y < PATH.yTo;
      let frame: string;
      if (onPath && tx === pathCol) frame = pick(PATH_LEFT_FRAMES, rand);
      else if (onPath && tx === pathCol + 1) frame = pick(SAND_FRAMES, rand);
      else if (onPath && tx === pathCol + 2) frame = pick(PATH_RIGHT_FRAMES, rand);
      else frame = rand() < 0.12 ? pick(GRASS_DECOR_FRAMES, rand) : pick(GRASS_FRAMES, rand);
      out.push({ frame, x: tx * TILE, y });
    }
  }
  return out;
}

export const SHORE_TYPES = [
  'TopLeft',
  'TopCenter',
  'TopRight',
  'MiddleLeft',
  'MiddleRight',
  'BottomLeft',
  'BottomCenter',
  'BottomRight',
] as const;
export type ShoreType = (typeof SHORE_TYPES)[number];
export const SHORE_FRAME_COUNT = 16;

/** Ô ao 3 × 3: viền bờ có animation, giữa là nước. */
export const POND_CELLS: readonly { type: ShoreType | 'water'; dx: number; dy: number }[] = [
  { type: 'TopLeft', dx: 0, dy: 0 },
  { type: 'TopCenter', dx: 1, dy: 0 },
  { type: 'TopRight', dx: 2, dy: 0 },
  { type: 'MiddleLeft', dx: 0, dy: 1 },
  { type: 'water', dx: 1, dy: 1 },
  { type: 'MiddleRight', dx: 2, dy: 1 },
  { type: 'BottomLeft', dx: 0, dy: 2 },
  { type: 'BottomCenter', dx: 1, dy: 2 },
  { type: 'BottomRight', dx: 2, dy: 2 },
];

/** Ô nước trơn 16px trong atlas fishing-pier, dùng cho giữa ao. */
export const POND_WATER_FRAMES = ['4c35323a', '16130b04', 'c67a90ed', 'b655b274'].map(
  (id) => `maps/fishing/${id}`,
);

/** Màu cát nền của tile bờ; điểm ảnh gần màu này được làm trong suốt để cỏ sân sau lộ ra. */
export const SHORE_SAND = [233, 236, 149] as const;
const SAND_TOLERANCE = 20;

export function isSandPixel(r: number, g: number, b: number): boolean {
  const [sr, sg, sb] = SHORE_SAND;
  return Math.abs(r - sr) + Math.abs(g - sg) + Math.abs(b - sb) <= SAND_TOLERANCE;
}
