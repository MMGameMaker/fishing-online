import { describe, expect, it } from 'vitest';
import samples from '@fixtures/api-samples.v0.json';
import type { SeatView } from '../../net/contract';
import {
  cooldownSeconds,
  formatClock,
  isNearSeat,
  priceSummary,
  sessionEndText,
} from './seatLogic';

const seats = samples.hub['JoinLake ack'].data.seats as SeatView[];
const available = seats[1]!;
const cooling = seats[5]!;

describe('seatLogic', () => {
  it('ở gần tối đa 64 px', () => {
    expect(isNearSeat(64, 0, { x: 0, y: 0 })).toBe(true);
    expect(isNearSeat(65, 0, { x: 0, y: 0 })).toBe(false);
  });

  it('đếm ngược cooldown làm tròn lên', () => {
    const now = Date.parse(cooling.cooldownUntil!) - 7200;
    expect(cooldownSeconds(cooling, now)).toBe(8);
    expect(cooldownSeconds(cooling, now + 60_000)).toBe(0);
    expect(cooldownSeconds(available, now)).toBe(0);
  });

  it('tổng tiền theo đơn giá ghế và số block', () => {
    expect(priceSummary(available, 3)).toEqual({ minutes: 30, total: '360' });
  });

  it('đồng hồ phiên', () => {
    expect(formatClock(600_000)).toBe('10:00');
    expect(formatClock(61_001)).toBe('01:02');
    expect(formatClock(-5)).toBe('00:00');
  });

  it('thông báo theo lý do kết thúc phiên', () => {
    expect(sessionEndText('expired')).toBe('Đã hết thời gian giữ ghế.');
    expect(sessionEndText('xyz')).toBe('Phiên giữ ghế đã kết thúc.');
  });
});
