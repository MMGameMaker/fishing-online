import { describe, expect, it } from 'vitest';
import configJson from '@fixtures/gameplay-config.v0.json';
import type { GameplayConfig } from '../../core/gameplayConfig';
import { expText, levelProgress } from './levelProgress';

const { levels } = configJson as unknown as GameplayConfig;

describe('levelProgress', () => {
  it('level 1: tính từ 0 tới expReq của level 2', () => {
    const p = levelProgress(10, 1, levels);
    expect(p).toMatchObject({ level: 1, current: 10, needed: 40 });
    expect(p.ratio).toBeCloseTo(0.25);
    expect(expText(p)).toBe('EXP 10/40');
  });

  it('level 3: trừ phần EXP đã dùng để lên level 2 và 3', () => {
    // Lên level 3 cần 40 + 70 = 110; còn 25 trong level 3, cần 100 để lên 4.
    const p = levelProgress(135, 3, levels);
    expect(p).toMatchObject({ current: 25, needed: 100 });
    expect(expText(p)).toBe('EXP 25/100');
  });

  it('level tối đa: thanh đầy, ghi MAX', () => {
    const max = Math.max(...levels.map((row) => row.level));
    const p = levelProgress(5000, max, levels);
    expect(p).toMatchObject({ needed: null, ratio: 1 });
    expect(expText(p)).toBe('EXP MAX');
  });

  it('thanh không vượt quá 1', () => {
    expect(levelProgress(999, 1, levels).ratio).toBe(1);
  });
});
