import { describe, expect, it } from 'vitest';
import samples from '@fixtures/api-samples.v0.json';
import config from '@fixtures/gameplay-config.v0.json';
import { isGameplayConfig } from '../core/gameplayConfig';
import {
  EVENT_GUARDS,
  isApiFailure,
  isCommandAck,
  isInventory,
  isLakeSnapshot,
  isLoginResponse,
  isPlayerProfile,
  isProgress,
  isSeatPurchase,
  isSellFish,
} from './contractGuards';

const http = samples.http as Record<string, { data?: unknown; error?: unknown }>;
const hub = samples.hub as Record<string, unknown>;
const noData = (d: unknown): d is null => d === null;
const tapData = (d: unknown): d is object => typeof d === 'object' && d !== null;

describe('fixture khớp contract', () => {
  it('gameplay-config qua type guard', () => {
    expect(isGameplayConfig(config)).toBe(true);
  });

  it('config thiếu trường bị từ chối', () => {
    const broken = { ...config, fish: [{ speciesId: 'x' }] };
    expect(isGameplayConfig(broken)).toBe(false);
  });

  it.each([
    ['POST /api/v1/auth/login 200', isLoginResponse],
    ['GET /api/v1/me 200', isPlayerProfile],
    ['GET /api/v1/me/inventory 200', isInventory],
    ['POST /api/v1/shop/sell-fish 200', isSellFish],
    ['GET /api/v1/me/progress 200', isProgress],
  ] as const)('HTTP %s', (key, guard) => {
    expect(guard(http[key]?.data)).toBe(true);
  });

  it('HTTP lỗi 422', () => {
    expect(isApiFailure(http['POST /api/v1/shop/buy 422'])).toBe(true);
  });

  it('mọi mẫu HTTP đều đã được kiểm tra', () => {
    expect(Object.keys(http)).toHaveLength(6);
  });

  it.each([
    ['JoinLake ack', isLakeSnapshot],
    ['BuySeatTicket ack ok', isSeatPurchase],
    ['BuySeatTicket ack taken', noData],
    ['ExtendSeatSession ack ok', isSeatPurchase],
    ['MinigameTap ack', tapData],
  ] as const)('ack %s', (key, guard) => {
    expect(isCommandAck(hub[key], guard as (d: unknown) => d is unknown)).toBe(true);
  });

  it.each([
    ['SeatChanged', 'SeatChanged'],
    ['AttemptUpdate waiting', 'AttemptUpdate'],
    ['AttemptUpdate bite', 'AttemptUpdate'],
    ['AttemptUpdate minigame', 'AttemptUpdate'],
    ['AttemptUpdate success', 'AttemptUpdate'],
    ['AttemptUpdate failed', 'AttemptUpdate'],
    ['AttemptUpdate cancelled', 'AttemptUpdate'],
    ['CatchShown', 'CatchShown'],
    ['MySeatSession ended', 'MySeatSession'],
  ] as const)('event %s', (key, event) => {
    expect(EVENT_GUARDS[event](hub[key])).toBe(true);
  });

  it('mọi mẫu hub đều đã được kiểm tra', () => {
    expect(Object.keys(hub)).toHaveLength(14);
  });
});
