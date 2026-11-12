import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  PATH,
  POND,
  POND_CELLS,
  ROOMS,
  TILE,
  YARD_VIEW,
  backyardGround,
  collidersOf,
  isSandPixel,
  partPlacements,
  type MapJson,
  type PartMetadata,
} from './cabinData';

const res = (path: string): string =>
  fileURLToPath(new URL(`../../../../public/new resources/${path}`, import.meta.url));
const readJson = <T>(path: string): T => JSON.parse(readFileSync(res(path), 'utf8')) as T;

const metadata = readJson<Record<string, PartMetadata>>('anim/embedded-metadata-0.json');
const roomAtlas = readJson<{ frames: Record<string, unknown> }>(
  'anim/atlases/sheet-room-fishing-cabin-0.json',
);
const yardAtlas = readJson<{ frames: Record<string, unknown> }>(
  'anim/atlases/sheet-fishing-cabin-yard-0.json',
);

describe('phòng fishing-cabin', () => {
  for (const [id, room] of Object.entries(ROOMS)) {
    it(`${id}: mọi tile sàn và tường có trong atlas, phủ kín lưới`, () => {
      for (const key of [room.floor, room.bottomWall]) {
        const part = metadata[key];
        expect(part, key).toBeDefined();
        const tiles = partPlacements(part!);
        const cells = new Set(tiles.map((t) => `${t.x},${t.y}`));
        expect(cells.size).toBe(tiles.length);
        for (const t of tiles) expect(roomAtlas.frames[t.frame], t.frame).toBeDefined();
      }
      expect(roomAtlas.frames[room.middleWall.frame]).toBeDefined();
    });

    it(`${id}: tường trước và va chạm nằm trong khung sàn`, () => {
      const floor = metadata[room.floor]!.data.image;
      const wall = metadata[room.bottomWall]!.data.image;
      expect(room.bottomWallAt.x + wall.width).toBeLessThanOrEqual(floor.width);
      expect(room.bottomWallAt.y + wall.height).toBe(floor.height);
      const colliders = collidersOf(readJson<MapJson>(`maps/${room.mapJson}`));
      expect(colliders.length).toBeGreaterThan(0);
      for (const c of colliders) {
        expect(c.x + c.width).toBeLessThanOrEqual(floor.width + 1);
        expect(c.y + c.height).toBeLessThanOrEqual(floor.height + 1);
      }
    });
  }
});

describe('sân sau', () => {
  const ground = backyardGround();

  it('nền phủ kín vùng xem bằng tile có trong atlas', () => {
    const cols = Math.ceil(YARD_VIEW.width / TILE);
    const rows = Math.ceil(YARD_VIEW.height / TILE);
    expect(ground.length).toBe(cols * rows);
    for (const t of ground) expect(yardAtlas.frames[t.frame], t.frame).toBeDefined();
  });

  it('ao trùm vùng va chạm nước và lối đi chạm tới ao', () => {
    const map = readJson<MapJson>('maps/fishing-cabin-backyard.json');
    const water = collidersOf(map).find((c) => c.kind === 'water');
    expect(water).toBeDefined();
    const size = POND.cell * 3;
    expect(POND.x).toBeLessThanOrEqual(water!.x);
    expect(POND.y).toBeLessThanOrEqual(water!.y);
    expect(POND.x + size).toBeGreaterThanOrEqual(water!.x + water!.width);
    expect(POND.y + size).toBeGreaterThanOrEqual(water!.y + water!.height);
    expect(PATH.yTo).toBeGreaterThan(POND.y);
    expect(POND_CELLS).toHaveLength(9);
  });

  it('chỉ màu cát bị làm trong suốt', () => {
    expect(isSandPixel(233, 236, 149)).toBe(true);
    expect(isSandPixel(228, 231, 156)).toBe(true);
    expect(isSandPixel(103, 137, 219)).toBe(false);
    expect(isSandPixel(251, 248, 228)).toBe(false);
  });
});
