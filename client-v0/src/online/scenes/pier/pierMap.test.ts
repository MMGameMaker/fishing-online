import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { NEAR_SEAT_PX, isNearSeat } from '../lake/seatLogic';
import { canStand, nearestStandable } from '../lake/walkable';
import mapData from './fishingPierMap.json';
import {
  PIER_SHEETS,
  RIPPLE_ANIMS,
  depthOf,
  pickRippleSpot,
  type PierMapData,
  type PierObject,
} from './pierMap';

const MAP = mapData as PierMapData;
const atlasFrames = (file: string): Record<string, unknown> => {
  const path = fileURLToPath(
    new URL(`../../../../public/new resources/anim/atlases/${file}.json`, import.meta.url),
  );
  return (JSON.parse(readFileSync(path, 'utf8')) as { frames: Record<string, unknown> }).frames;
};
const frames = {
  pier: atlasFrames(PIER_SHEETS.pier),
  town: atlasFrames(PIER_SHEETS.town),
};

describe('map bến cá dựng lại từ ảnh gốc', () => {
  it('lưới nền 68 × 50 ô, mọi ô trỏ tới frame có trong atlas', () => {
    expect(MAP.width).toBe(68 * MAP.tile);
    expect(MAP.height).toBe(50 * MAP.tile);
    expect(MAP.ground).toHaveLength(50);
    for (const row of MAP.ground) {
      expect(row).toHaveLength(68);
      for (const i of row) expect(frames.pier[MAP.groundFrames[i]!]).toBeDefined();
    }
  });

  it('ô bóng map nằm trong lưới và có trong atlas', () => {
    for (const [c, r, frame] of MAP.shadows) {
      expect(c).toBeGreaterThanOrEqual(0);
      expect(c).toBeLessThan(68);
      expect(r).toBeGreaterThanOrEqual(0);
      expect(r).toBeLessThan(50);
      expect(frames.pier[frame]).toBeDefined();
    }
  });

  it('object dùng frame có thật và chạm vào khung map', () => {
    expect(MAP.objects.length).toBeGreaterThan(100);
    for (const o of MAP.objects) {
      expect(frames[o.sheet][o.frame], o.frame).toBeDefined();
      expect(o.x + o.w).toBeGreaterThan(0);
      expect(o.y + o.h).toBeGreaterThan(0);
      expect(o.x).toBeLessThan(MAP.width);
      expect(o.y).toBeLessThan(MAP.height);
    }
  });

  it('có đủ các công trình chính của bến cá', () => {
    const names = new Set(MAP.objects.map((o) => o.frame));
    for (const f of [
      'fishing-objects/lightHouse',
      'fishing-objects/fishShop',
      'fishing-objects/smallRaft',
      'main-objects/vendingMachine',
    ]) {
      expect(names.has(f), f).toBe(true);
    }
    expect(MAP.objects.some((o) => o.anim === 'big-boat/boat')).toBe(true);
  });

  it('bờ nước và bóng luôn nằm dưới object', () => {
    const base: PierObject = { sheet: 'pier', frame: '', x: 0, y: 0, w: 10, h: 10, layer: 1 };
    expect(depthOf({ ...base, layer: 0 })).toBeLessThan(depthOf({ ...base, layer: 0.5 }));
    expect(depthOf({ ...base, layer: 0.5, y: 900 })).toBeLessThan(depthOf({ ...base, y: -50 }));
    expect(depthOf({ ...base, layer: 1.2 })).toBeGreaterThan(depthOf(base));
    expect(depthOf({ ...base, layer: 1.2, d: 448 })).toBe(448);
  });
});

describe('animation nước', () => {
  it('chân cọc nằm trong map và đứng ở vùng nước', () => {
    expect(MAP.pillarFlows.length).toBeGreaterThan(20);
    for (const [x, y] of MAP.pillarFlows) {
      expect(x).toBeGreaterThan(0);
      expect(x).toBeLessThan(MAP.width);
      expect(y).toBeGreaterThan(0);
      expect(y).toBeLessThan(MAP.height);
    }
  });

  it('không có dòng nước chân cọc trên cát (dưới hiên tiệm Marlin, mép bờ, dưới thuyền)', () => {
    // Feedback 2026-11-13: các điểm này trong ảnh gốc là cát/bờ/thuyền, vẽ dòng nước thành vệt xanh trên cát.
    const onSand = [
      [816, 220],
      [774, 221],
      [459, 120],
      [349, 745],
    ];
    for (const [x, y] of onSand) {
      expect(MAP.pillarFlows.some(([fx, fy]) => fx === x && fy === y)).toBe(false);
    }
    const underShack = MAP.pillarFlows.filter(
      ([x, y]) => x >= 750 && x <= 880 && y >= 200 && y <= 240,
    );
    expect(underShack).toEqual([]);
  });

  it('gợn sóng luôn nằm gọn trong ô nước trống', () => {
    const open = new Set(MAP.openWater.map(([c, r]) => `${c},${r}`));
    let seed = 1;
    const rand = (): number => {
      seed = (seed * 16807) % 2147483647;
      return seed / 2147483647;
    };
    for (const anim of RIPPLE_ANIMS) {
      for (let i = 0; i < 200; i++) {
        const spot = pickRippleSpot(MAP.openWater, anim, MAP.tile, rand);
        expect(spot, anim.key).not.toBeNull();
        for (const [px, py] of [
          [spot!.x, spot!.y],
          [spot!.x + anim.w - 1, spot!.y + anim.h - 1],
        ] as const) {
          expect(open.has(`${Math.floor(px / MAP.tile)},${Math.floor(py / MAP.tile)}`)).toBe(true);
        }
      }
    }
  });

  it('không có ô nước trống thì không đặt gợn sóng', () => {
    expect(pickRippleSpot([], { w: 4, h: 4 }, 16, Math.random)).toBeNull();
  });
});

describe('map chơi được của pier', () => {
  const lake = MAP.lake;
  const FACING: Record<string, [number, number]> = {
    up: [0, -1],
    down: [0, 1],
    left: [-1, 0],
    right: [1, 0],
  };

  it('lưới đi được khớp kích thước map và spawn đứng được', () => {
    expect(lake.walkableRows).toHaveLength(lake.heightTiles);
    expect(lake.widthTiles * lake.tileSize).toBe(MAP.width);
    expect(canStand(lake, lake.spawn.x, lake.spawn.y)).toBe(true);
  });

  it('mỗi ghế có chỗ đứng trong tầm ngồi và phao rơi xuống nước', () => {
    expect(lake.seats).toHaveLength(16);
    for (const seat of lake.seats) {
      // Ghế là vật cản: rời ghế thì bước sang chỗ đứng được gần nhất, không quá 24px.
      const stand = nearestStandable(lake, seat.x, seat.y, 24);
      expect(stand, `${seat.seatId} có chỗ đứng khi rời ghế`).not.toBeNull();
      let reachable = false;
      for (let dy = -NEAR_SEAT_PX; dy <= NEAR_SEAT_PX && !reachable; dy += 4) {
        for (let dx = -NEAR_SEAT_PX; dx <= NEAR_SEAT_PX && !reachable; dx += 4) {
          reachable =
            isNearSeat(seat.x + dx, seat.y + dy, seat) && canStand(lake, seat.x + dx, seat.y + dy);
        }
      }
      expect(reachable, seat.seatId).toBe(true);
      const [vx, vy] = FACING[seat.facing]!;
      const bx = seat.x + vx * 48;
      const by = seat.y + vy * 48;
      const row = lake.walkableRows[Math.floor(by / lake.tileSize)]!;
      expect(row[Math.floor(bx / lake.tileSize)], `${seat.seatId} phao`).toBe('0');
    }
  });
});

describe('va chạm map pier', () => {
  const lake = MAP.lake;
  const objectsNamed = (frame: string): PierObject[] =>
    MAP.objects.filter((o) => o.frame === frame);

  it('không đứng được giữa ghế đẩu, ghế băng, bàn, thùng, máy bán nước', () => {
    const frames = [
      'main-objects/stool',
      'main-objects/frontBench',
      'main-objects/leftBench',
      'main-objects/rightBench',
      'main-objects/smallTable',
      'main-objects/picnicTableMiddle',
      'fishing-objects/boxClosed',
      'fishing-objects/tripleBox',
      'main-objects/vendingMachine',
    ];
    for (const frame of frames) {
      const list = objectsNamed(frame);
      expect(list.length, frame).toBeGreaterThan(0);
      for (const o of list) {
        // Tâm phần dưới của hình (chỗ vật chạm đất).
        const bottom = o.by ?? o.y + o.h;
        const x = o.x + o.w / 2;
        const y = bottom - 3;
        expect(canStand(lake, x, y), `${frame} @${o.x},${o.y}`).toBe(false);
      }
    }
  });

  it('không đứng được trên mặt nước trống', () => {
    for (const [c, r] of MAP.openWater) {
      const x = c * MAP.tile + MAP.tile / 2;
      const y = r * MAP.tile + MAP.tile - 1;
      expect(canStand(lake, x, y), `nước ${c},${r}`).toBe(false);
    }
  });
});

describe('chồng thùng', () => {
  it('thùng đỉnh vẽ trên các thùng bên dưới nhưng dưới nhân vật đứng trước chồng', () => {
    const tops = MAP.objects.filter((o) => o.layer > 1);
    expect(tops.length).toBeGreaterThan(0);
    for (const top of tops) {
      const under = MAP.objects.filter(
        (o) =>
          o.layer === 1 &&
          o.frame.includes('box') &&
          o.x < top.x + top.w &&
          o.x + o.w > top.x &&
          (o.by ?? 0) > (top.by ?? 0),
      );
      for (const o of under) expect(depthOf(top)).toBeGreaterThan(depthOf(o));
      // Nhân vật đứng trước chồng thùng có chân thấp hơn đáy thấp nhất; vùng chặn không cho đứng lấn vào.
      const lowest = Math.max(...under.map((o) => o.by ?? 0), top.by ?? 0);
      expect(depthOf(top)).toBeLessThanOrEqual(lowest + 1);
    }
  });
});

describe('ghế câu của pier', () => {
  it('mọi ghế câu nằm trên một ghế đẩu có sẵn của map (ghế băng không câu được)', () => {
    const stools = MAP.objects.filter((o) => o.frame === 'main-objects/stool');
    for (const seat of MAP.lake.seats) {
      const onStool = stools.some(
        (o) =>
          seat.x >= o.x &&
          seat.x <= o.x + o.w &&
          seat.y >= o.y &&
          seat.y <= (o.by ?? o.y + o.h) + 4,
      );
      expect(onStool, seat.seatId).toBe(true);
    }
  });

  it('số ghế không vượt số ghế mặc định của Server (20)', () => {
    expect(MAP.lake.seats.length).toBeLessThanOrEqual(20);
  });
});
