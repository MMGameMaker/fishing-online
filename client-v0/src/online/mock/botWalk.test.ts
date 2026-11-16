import { describe, expect, it } from 'vitest';
import pierMap from '../scenes/pier/fishingPierMap.json';
import { nearestStandable, type LakeMap } from '../scenes/lake/walkable';
import { findRoute, pickWanderTarget, walkStep } from './botWalk';

/** Sàn 10×10 ô 8 px, trừ một cột chặn ở x = 5. */
const MAP: LakeMap = {
  mapId: 't',
  mapVersion: '1',
  tileSize: 8,
  widthTiles: 10,
  heightTiles: 10,
  walkableRows: Array.from({ length: 10 }, () => '1111101111'),
  spawn: { x: 16, y: 40 },
  lakeArea: [
    { x: 0, y: 0 },
    { x: 80, y: 0 },
    { x: 80, y: 80 },
    { x: 0, y: 80 },
  ],
  moveRules: { maxSpeedPxPerSec: 90, feetHalfWidth: 2, feetHeight: 2 },
  seats: [],
};

describe('botWalk', () => {
  it('đi từng bước ngắn tới đích rồi dừng', () => {
    let p = { x: 12, y: 40 };
    let arrived = false;
    let steps = 0;
    while (!arrived && steps < 20) {
      const r = walkStep(MAP, p.x, p.y, 30, 40, 5.5);
      expect(Math.hypot(r.x - p.x, r.y - p.y)).toBeLessThanOrEqual(5.5 + 1e-9);
      expect(r.dir).toBe('right');
      p = { x: r.x, y: r.y };
      arrived = r.arrived;
      steps++;
    }
    expect(arrived).toBe(true);
    expect(Math.abs(p.x - 30)).toBeLessThanOrEqual(2);
    expect(steps).toBeGreaterThan(2);
  });

  it('kẹt vật cản thì không di chuyển', () => {
    const r = walkStep(MAP, 36, 40, 60, 40, 5.5);
    expect(r.moved).toBe(false);
    expect(r.arrived).toBe(false);
  });

  it('chọn điểm đi dạo đứng được, hết cách thì trả null', () => {
    const target = pickWanderTarget(MAP, 20, 40, () => 0.3, 40);
    expect(target).not.toBeNull();
    const none = pickWanderTarget(
      { ...MAP, walkableRows: MAP.walkableRows.map(() => '0000000000') },
      20,
      40,
      Math.random,
    );
    expect(none).toBeNull();
  });
});

describe('findRoute', () => {
  // Cột chặn ở x = 5 nhưng chừa lối ở hàng cuối.
  const WALL: LakeMap = {
    ...MAP,
    walkableRows: Array.from({ length: 10 }, (_, r) => (r === 9 ? '1111111111' : '1111101111')),
  };

  it('đi vòng qua vật cản và tới đúng đích, từng bước không bị kẹt', () => {
    const route = findRoute(WALL, { x: 12, y: 40 }, { x: 68, y: 40 });
    expect(route).not.toBeNull();
    expect(route!.length).toBeGreaterThan(1);
    expect(route![route!.length - 1]).toEqual({ x: 68, y: 40 });
    let p = { x: 12, y: 40 };
    let guard = 0;
    for (const point of route!) {
      for (; guard < 400; guard++) {
        const r = walkStep(WALL, p.x, p.y, point.x, point.y, 5.5);
        expect(r.moved || r.arrived).toBe(true);
        p = { x: r.x, y: r.y };
        if (r.arrived) break;
      }
    }
    expect(Math.hypot(p.x - 68, p.y - 40)).toBeLessThanOrEqual(2);
  });

  it('đường thẳng thông thì đi thẳng một đoạn', () => {
    expect(findRoute(MAP, { x: 12, y: 20 }, { x: 30, y: 20 })).toEqual([{ x: 30, y: 20 }]);
  });

  it('không có đường hoặc đích không đứng được thì null', () => {
    const sealed: LakeMap = { ...MAP, walkableRows: MAP.walkableRows.map(() => '1111101111') };
    expect(findRoute(sealed, { x: 12, y: 40 }, { x: 68, y: 40 })).toBeNull();
    expect(findRoute(MAP, { x: 12, y: 40 }, { x: 44, y: 40 })).toBeNull();
  });
});

const PIER_LAKE_MAP = pierMap.lake as unknown as LakeMap;

describe('findRoute trên map pier', () => {
  it('từ spawn tới được chỗ đứng cạnh mọi ghế (collider không cô lập ghế nào)', () => {
    const unreachable = PIER_LAKE_MAP.seats.filter((seat) => {
      const stand = nearestStandable(PIER_LAKE_MAP, seat.x, seat.y);
      return !stand || !findRoute(PIER_LAKE_MAP, PIER_LAKE_MAP.spawn, stand);
    });
    expect(unreachable.map((s) => s.seatId)).toEqual([]);
  });
});
