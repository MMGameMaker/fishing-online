import { describe, expect, it } from 'vitest';
import { CELEBRATION_MS, celebrationPose } from './celebrations';

describe('celebrationPose', () => {
  it('nhảy mừng: lên cao rồi về đất, hai cú, kết thúc đứng yên', () => {
    expect(celebrationPose('jump', 0, 'down').dy).toBeCloseTo(0, 5);
    expect(celebrationPose('jump', 230, 'down').dy).toBeLessThan(-10); // đỉnh cú nhảy đầu
    expect(celebrationPose('jump', 460, 'down').dy).toBeCloseTo(0, 5); // chạm đất giữa hai cú
    expect(celebrationPose('jump', 690, 'down').dy).toBeLessThan(-10); // đỉnh cú thứ hai
    const end = celebrationPose('jump', CELEBRATION_MS.jump, 'down');
    expect(end).toMatchObject({ dx: 0, dy: 0, sx: 1, sy: 1, done: true });
  });

  it('co lại khi chạm đất, giãn ra khi ở trên cao', () => {
    expect(celebrationPose('jump', 10, 'down').sy).toBeLessThan(1);
    expect(celebrationPose('jump', 230, 'down').sy).toBeGreaterThan(1);
  });

  it('xoay vòng: đi hết 4 hướng bắt đầu từ hướng hiện tại', () => {
    const dirs = [0, 250, 450, 700].map((t) => celebrationPose('spin', t, 'right').dir);
    expect(dirs).toEqual(['right', 'up', 'left', 'down']);
    expect(celebrationPose('spin', CELEBRATION_MS.spin, 'right')).toMatchObject({ dir: 'right', done: true });
  });

  it('nhún nhảy: nhìn thẳng, lắc ngang qua lại và nảy mỗi nhịp', () => {
    const left = celebrationPose('dance', 450, 'up');
    const right = celebrationPose('dance', 750, 'up');
    expect(left.dir).toBe('down');
    expect(left.dx).toBeLessThan(0);
    expect(right.dx).toBeGreaterThan(0);
    expect(celebrationPose('dance', 150, 'up').dy).toBeLessThan(0);
    expect(celebrationPose('dance', CELEBRATION_MS.dance + 1, 'up').done).toBe(true);
  });
});
