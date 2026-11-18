// Chỗ ngồi chơi (ghế quanh bàn, không câu; yêu cầu 2026-11-18) trong mock: giữ chỗ, đứng dậy, đi khỏi thì trả chỗ.
import { describe, expect, it } from 'vitest';
import configJson from '@fixtures/gameplay-config.v0.json';
import type { GameplayConfig } from '../core/gameplayConfig';
import { ApiClient } from '../net/ApiClient';
import type { LoginResponse } from '../net/contract';
import { isPlayerView } from '../net/contractGuards';
import { GameHub } from '../net/GameHub';
import pierMap from '../scenes/pier/fishingPierMap.json';
import type { LakeMap } from '../scenes/lake/walkable';
import { bindHubToStore } from '../state/bindHub';
import { Store } from '../state/store';
import { MockBackend } from './MockBackend';

const config = configJson as unknown as GameplayConfig;
const map = (pierMap as unknown as { lake: LakeMap }).lake;
let counter = 0;

async function setup() {
  const mock = new MockBackend({
    config,
    map,
    seed: 3,
    startMs: Date.parse('2026-11-18T10:00:00Z'),
  });
  const api = new ApiClient({
    baseUrl: 'http://mock.local',
    fetchImpl: mock.fetch,
    sleep: () => Promise.resolve(),
  });
  const hub = new GameHub(mock.createConnection(), () => `rest-${++counter}`);
  const store = new Store();
  bindHubToStore(hub, store, () => mock.now());
  const login = await api.post<LoginResponse>('/auth/login', { firebaseIdToken: 'x' });
  api.setAccessToken(login.accessToken);
  store.dispatch({ type: 'session/profile', payload: login.player });
  await hub.start();
  await hub.joinLake();
  const myId = login.player.playerId;
  const mine = () => store.getState().lake.players[myId];
  return { hub, store, mine };
}

const seat = map.restSeats![0]!;
const sitArgs = (restSeatId = seat.restSeatId) => ({
  restSeatId,
  x: seat.x,
  y: seat.y,
  dir: seat.facing as 'left' | 'right',
});

describe('mock: chỗ ngồi chơi', () => {
  it('ngồi: PlayerView của mình có restSeatId và vị trí chỗ ngồi; đứng dậy thì trả chỗ', async () => {
    const { hub, mine } = await setup();
    const ack = await hub.invoke('SitRest', sitArgs());
    expect(ack.ok).toBe(true);
    expect(isPlayerView(mine())).toBe(true);
    expect(mine()?.restSeatId).toBe(seat.restSeatId);
    expect(mine()?.x).toBe(seat.x);

    await hub.invoke('StandRest', {});
    expect(mine()?.restSeatId).toBeNull();
  });

  it('đi khỏi chỗ ngồi mà chưa đứng dậy thì tự trả chỗ', async () => {
    const { hub, mine } = await setup();
    await hub.invoke('SitRest', sitArgs());
    await hub.invoke('Move', { seq: 1, x: seat.x, y: seat.y, dir: 'down' });
    expect(mine()?.restSeatId).toBe(seat.restSeatId);
    await hub.invoke('Move', { seq: 2, x: seat.x + 20, y: seat.y, dir: 'down' });
    expect(mine()?.restSeatId).toBeNull();
  });

  it('chỗ không có trên map thì VALIDATION_FAILED', async () => {
    const { hub } = await setup();
    const ack = await hub.invoke('SitRest', sitArgs('rest-99'));
    expect(ack.ok).toBe(false);
    expect(ack.error?.code).toBe('VALIDATION_FAILED');
  });
});
