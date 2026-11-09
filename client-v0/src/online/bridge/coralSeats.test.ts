import { describe, expect, it } from 'vitest';
import configJson from '@fixtures/gameplay-config.v0.json';
import type { GameplayConfig } from '../core/gameplayConfig';
import { MockBackend } from '../mock/MockBackend';
import { GameHub } from '../net/GameHub';
import { buildCoralMap, buildCoralSeats, seatIdFor, tierForSeatNumber } from './coralSeats';

const config = configJson as unknown as GameplayConfig;
const roomSeats = Array.from({ length: 20 }, (_, i) => ({
  x: 100 + i,
  y: 200,
  direction: i % 2 ? 'left' : 'down',
}));
const room = { key: 'coralCove', tile: 30, width: 160, height: 120, seats: roomSeats };

describe('coralSeats', () => {
  it('20 ghế đúng mã, hướng và phân bổ Tier 5/5/10', () => {
    const seats = buildCoralSeats(roomSeats, config.seatTiers);
    expect(seats).toHaveLength(20);
    expect(seats[0]).toMatchObject({ seatId: 'seat-01', number: 1, tier: 1, facing: 'down' });
    expect(seats[19]).toMatchObject({ seatId: 'seat-20', number: 20, tier: 3 });
    const count = (tier: number) => seats.filter((s) => s.tier === tier).length;
    expect([count(1), count(2), count(3)]).toEqual([5, 5, 10]);
  });

  it('seatIdFor đệm số 0', () => {
    expect(seatIdFor(7)).toBe('seat-07');
  });

  it('số ghế ngoài bảng Tier báo lỗi', () => {
    expect(() => tierForSeatNumber(config.seatTiers, 21)).toThrow();
  });

  it('phòng không có ghế báo lỗi', () => {
    expect(() => buildCoralMap({ ...room, seats: [] }, config.seatTiers)).toThrow();
  });

  it('mock nhận map của scene: mua được ghế 11 giá Tier 3', async () => {
    const map = buildCoralMap(room, config.seatTiers);
    const mock = new MockBackend({ config, map, seed: 1, startMs: 1000, botCount: 0 });
    const hub = new GameHub(mock.createConnection(), () => 'r');
    await hub.start();
    const snapshot = await hub.joinLake();
    expect(snapshot.data?.seats).toHaveLength(20);
    expect(snapshot.data?.players).toHaveLength(1);
    const ack = await hub.invoke('BuySeatTicket', {
      seatId: 'seat-11',
      durationUnits: 1,
      expectedPriceVersion: config.seatPricing.priceVersion,
    });
    expect(ack.data?.chargedGold).toBe('40');
  });
});
