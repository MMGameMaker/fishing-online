import { afterEach, describe, expect, it } from 'vitest';
import { isViewRotated, localPoint, setViewRotated, toLocal } from './viewFrame';

afterEach(() => setViewRotated(false, 0));

describe('viewFrame', () => {
  it('không xoay: giữ nguyên toạ độ', () => {
    expect(isViewRotated()).toBe(false);
    expect(toLocal(120, 40)).toEqual({ x: 120, y: 40 });
    expect(localPoint({ clientX: 7, clientY: 9 })).toEqual({ x: 7, y: 9 });
  });

  it('xoay 90° theo chiều kim đồng hồ: màn 400 rộng, điểm bố cục (x, y) nằm ở màn hình (400 − y, x)', () => {
    setViewRotated(true, 400);
    // Góc trên-trái của bố cục nằm ở góc trên-phải của màn hình.
    expect(toLocal(400, 0)).toEqual({ x: 0, y: 0 });
    // Điểm bố cục (100, 30) → màn hình (370, 100) → trở lại.
    expect(toLocal(370, 100)).toEqual({ x: 100, y: 30 });
    // Góc dưới-trái màn hình (0, 800) ứng với góc dưới-phải của bố cục (800, 400).
    expect(toLocal(0, 800)).toEqual({ x: 800, y: 400 });
  });
});
