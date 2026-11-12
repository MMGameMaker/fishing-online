import { describe, expect, it } from 'vitest';
import mapJson from '@fixtures/lake-map.placeholder.json';
import {
  canStand,
  inLakeArea,
  nearestStandable,
  startPosition,
  stepMove,
  type LakeMap,
} from './walkable';

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

describe('nearestStandable', () => {
  it('đang đứng được thì giữ nguyên', () => {
    expect(nearestStandable(map, map.spawn.x, map.spawn.y)).toEqual(map.spawn);
  });

  it('từ trên nước sát bờ tìm ra điểm đứng được gần nhất', () => {
    // Bờ trái hồ ở x = 384: đứng ở 384 - 6 thì chạm nước, lùi 2px là đứng được.
    const spot = nearestStandable(map, 384 - 6, 576);
    expect(spot).not.toBeNull();
    expect(canStand(map, spot!.x, spot!.y)).toBe(true);
    expect(Math.hypot(spot!.x - (384 - 6), spot!.y - 576)).toBeLessThanOrEqual(2);
  });

  it('giữa hồ không có chỗ đứng trong bán kính thì trả null', () => {
    expect(nearestStandable(map, 768, 576, 16)).toBeNull();
  });
});

describe('startPosition', () => {
  it('chưa có vị trí hoặc người mới ở (0, 0) thì xuất phát ở spawn', () => {
    expect(startPosition(map, undefined)).toEqual(map.spawn);
    expect(startPosition(map, { x: 0, y: 0 })).toEqual(map.spawn);
  });

  it('vị trí đứng được thì giữ nguyên', () => {
    expect(startPosition(map, { x: map.spawn.x, y: map.spawn.y })).toEqual(map.spawn);
  });

  it('vị trí ngoài map (từ map khác) thì về spawn', () => {
    expect(startPosition(map, { x: 99999, y: 99999 })).toEqual(map.spawn);
  });

  it('lệch nhẹ xuống nước thì bước sang chỗ đứng được gần nhất', () => {
    const spot = startPosition(map, { x: 384 - 6, y: 576 });
    expect(canStand(map, spot.x, spot.y)).toBe(true);
    expect(spot).not.toEqual(map.spawn);
  });
});
