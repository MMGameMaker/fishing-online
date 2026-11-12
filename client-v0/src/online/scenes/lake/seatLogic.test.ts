import { describe, expect, it } from 'vitest';
import configJson from '@fixtures/gameplay-config.v0.json';
import type { GameplayConfig } from '../../core/gameplayConfig';
import { formatClock, isNearSeat, nearestSeat, priceSummary, sessionEndText } from './seatLogic';

const { ticketPricing } = configJson as unknown as GameplayConfig;

describe('seatLogic', () => {
  it('ở gần tối đa 64 px', () => {
    expect(isNearSeat(64, 0, { x: 0, y: 0 })).toBe(true);
    expect(isNearSeat(65, 0, { x: 0, y: 0 })).toBe(false);
  });

  it('tổng tiền theo đơn giá vé và số lượng', () => {
    expect(priceSummary(ticketPricing, 3)).toEqual({ minutes: 30, total: '150' });
  });

  it('đồng hồ phiên', () => {
    expect(formatClock(600_000)).toBe('10:00');
    expect(formatClock(61_001)).toBe('01:02');
    expect(formatClock(-5)).toBe('00:00');
  });

  it('thông báo theo lý do kết thúc phiên', () => {
    expect(sessionEndText('missed_bite')).toBe('Bạn không thu cần kịp nên đã tự đứng dậy.');
    expect(sessionEndText('xyz')).toBe('Phiên giữ ghế đã kết thúc.');
  });
});

describe('nearestSeat', () => {
  const seats = [
    { id: 'a', x: 100, y: 100 },
    { id: 'b', x: 140, y: 100 },
    { id: 'c', x: 400, y: 400 },
  ];

  it('chọn ghế gần nhất trong tầm ngồi', () => {
    expect(nearestSeat(130, 100, seats)?.id).toBe('b');
  });

  it('bỏ qua ghế đã có người', () => {
    expect(nearestSeat(130, 100, seats, (seat) => seat.id !== 'b')?.id).toBe('a');
  });

  it('không có ghế nào trong tầm thì trả null', () => {
    expect(nearestSeat(250, 250, seats)).toBeNull();
  });
});
