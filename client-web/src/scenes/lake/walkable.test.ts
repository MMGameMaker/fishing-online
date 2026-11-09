import { describe, expect, it } from 'vitest';
import mapJson from '@fixtures/lake-map.placeholder.json';
import { canStand, inLakeArea, stepMove, type LakeMap } from './walkable';

const map = mapJson as LakeMap;

describe('canStand', () => {
  it('điểm spawn đứng được', () => {
    expect(canStand(map, map.spawn.x, map.spawn.y)).toBe(true);
  });

  it('điểm trên nước không đứng được', () => {
    expect(canStand(map, 768, 576)).toBe(false);
  });

  it('cả 20 ghế đứng được', () => {
    expect(map.seats).toHaveLength(20);
    for (const seat of map.seats) expect(canStand(map, seat.x, seat.y)).toBe(true);
  });

  it('ngoài map không đứng được', () => {
    expect(canStand(map, -50, 100)).toBe(false);
    expect(canStand(map, 100, 99999)).toBe(false);
  });

  it('chân 14×6 chạm nước thì không đứng được', () => {
    // Hồ bắt đầu từ cột 12 (x = 384), hàng 8 đến 25.
    expect(canStand(map, 384 - 7, 576)).toBe(true);
    expect(canStand(map, 384 - 6, 576)).toBe(false);
  });

  it('cạnh đáy chân chạm hàng nước phía dưới', () => {
    // Hàng 8 (y = 256) là nước trong khoảng cột 12..35.
    expect(canStand(map, 768, 256)).toBe(true);
    expect(canStand(map, 768, 257)).toBe(false);
  });
});

describe('inLakeArea', () => {
  it('trong và ngoài phạm vi', () => {
    expect(inLakeArea(map, map.spawn.x, map.spawn.y)).toBe(true);
    expect(inLakeArea(map, 5, 5)).toBe(false);
  });
});

describe('stepMove', () => {
  it('đi tự do trên cỏ', () => {
    expect(stepMove(map, 200, 200, 3, 4)).toEqual({ x: 203, y: 204 });
  });

  it('không đi xuyên nước, trượt dọc bờ', () => {
    expect(stepMove(map, 377, 576, 5, 3)).toEqual({ x: 377, y: 579 });
  });

  it('đi nhiều bước vào hồ vẫn dừng ở bờ', () => {
    let p = { x: 300, y: 576 };
    for (let i = 0; i < 100; i += 1) p = stepMove(map, p.x, p.y, 2, 0);
    expect(canStand(map, p.x, p.y)).toBe(true);
    expect(p.x).toBeLessThanOrEqual(377);
  });
});
