import { describe, expect, it } from 'vitest';
import type { LakeMap } from '../scenes/lake/walkable';
import { pickWanderTarget, walkStep } from './botWalk';

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
