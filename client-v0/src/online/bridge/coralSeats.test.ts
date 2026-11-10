import { describe, expect, it } from 'vitest';
import configJson from '@fixtures/gameplay-config.v0.json';
import type { GameplayConfig } from '../core/gameplayConfig';
import { MockBackend } from '../mock/MockBackend';
import { GameHub } from '../net/GameHub';
import { buildCoralMap, buildCoralSeats, seatIdFor } from './coralSeats';

const config = configJson as unknown as GameplayConfig;
const roomSeats = Array.from({ length: 20 }, (_, i) => ({
  x: 100 + i,
  y: 200,
  direction: i % 2 ? 'left' : 'down',
}));
const room = { key: 'coralCove', tile: 30, width: 160, height: 120, seats: roomSeats };

describe('coralSeats', () => {
  it('20 ghế đúng mã và hướng, không còn Tier', () => {
    const seats = buildCoralSeats(roomSeats);
    expect(seats).toHaveLength(20);
    expect(seats[0]).toMatchObject({ seatId: 'seat-01', number: 1, facing: 'down' });
    expect(seats[19]).toMatchObject({ seatId: 'seat-20', number: 20, facing: 'left' });
  });

  it('seatIdFor đệm số 0', () => {
    expect(seatIdFor(7)).toBe('seat-07');
  });

  it('phòng không có ghế báo lỗi', () => {
    expect(() => buildCoralMap({ ...room, seats: [] })).toThrow();
  });

  it('mock nhận map của scene: mua vé rồi ngồi ghế 11', async () => {
    const map = buildCoralMap(room);
    const mock = new MockBackend({ config, map, seed: 1, startMs: 1000, botCount: 0 });
    const hub = new GameHub(mock.createConnection(), () => 'r');
    await hub.start();
    const snapshot = await hub.joinLake();
    expect(snapshot.data?.seats).toHaveLength(20);
    expect(snapshot.data?.players).toHaveLength(1);

    const buy = await hub.invoke('BuyTicket', {
      quantity: 1,
      expectedPriceVersion: config.ticketPricing.priceVersion,
    });
    expect(buy.data?.chargedGold).toBe('50');

    const sit = await hub.invoke('SitDown', { seatId: 'seat-11' });
    expect(sit.data?.seat.seatId).toBe('seat-11');
  });
});
