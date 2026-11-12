import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
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
