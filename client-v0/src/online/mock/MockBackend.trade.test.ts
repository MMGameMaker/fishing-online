// Đổi cá giữa bạn bè ở mock pier.html: cùng luật contract Server (1–5 con mỗi bên, chỉ bạn bè, cá lấy cá,
// kiểm lại khi đồng ý). Hoàn tất với mock không đồng nghĩa đã tích hợp Server thật.
import { describe, expect, it } from 'vitest';
import configJson from '@fixtures/gameplay-config.v0.json';
import mapJson from '@fixtures/lake-map.placeholder.json';
import type { GameplayConfig } from '../core/gameplayConfig';
import { ApiClient, ApiError } from '../net/ApiClient';
import type {
  FishItem,
  FriendFishResponse,
  HubEventName,
  InventoryResponse,
  LoginResponse,
  TradeEntry,
  TradesResponse,
} from '../net/contract';
import { EVENT_GUARDS } from '../net/contractGuards';
import { GameHub } from '../net/GameHub';
import type { LakeMap } from '../scenes/lake/walkable';
import { bindHubToStore } from '../state/bindHub';
import { bindTradeRefresh } from '../state/tradeRefresh';
import { Store } from '../state/store';
import { MockBackend } from './MockBackend';

const config = configJson as unknown as GameplayConfig;
const map = mapJson as LakeMap;
const T0 = Date.parse('2026-11-18T10:00:00Z');
let counter = 0;

async function setup() {
  const mock = new MockBackend({ config, map, seed: 11, startMs: T0, fishingBots: true });
  const api = new ApiClient({
    baseUrl: 'http://mock.local',
    fetchImpl: mock.fetch,
    sleep: () => Promise.resolve(),
  });
  const hub = new GameHub(mock.createConnection(), () => `req-${++counter}`);
  const store = new Store();
  bindHubToStore(hub, store, () => mock.now());
  bindTradeRefresh(hub, store, api);
  const bad: string[] = [];
  for (const name of Object.keys(EVENT_GUARDS) as HubEventName[]) {
    hub.on(name, (payload) => {
      if (!(EVENT_GUARDS[name] as (v: unknown) => boolean)(payload))
        bad.push(`${name}: ${JSON.stringify(payload)}`);
    });
  }
  const login = await api.post<LoginResponse>('/auth/login', { firebaseIdToken: 'x' });
  api.setAccessToken(login.accessToken);
  store.dispatch({ type: 'session/profile', payload: login.player });
  await hub.start();
  await hub.joinLake();
  mock.advance(1100);
  const botId = Object.keys(store.getState().lake.players).find((id) => id.startsWith('bot-'))!;
  // Mình đứng cạnh bot thì bot mời kết bạn; mời ngược để thành bạn (bot tự đồng ý sau 2–5 giây).
  await api.post('/friends/requests', { playerId: botId });
  mock.advance(6000);
  return { mock, api, hub, store, bad, botId };
}

type Rig = Awaited<ReturnType<typeof setup>>;

function giveFish(rig: Rig, count: number): FishItem[] {
  const fish: FishItem[] = Array.from({ length: count }, (_, i) => ({
    catchId: `my-fish-${counter}-${i}`,
    speciesId: config.fish[i % config.fish.length]!.speciesId,
    lengthTenthCm: 100 + i,
    caughtAt: new Date(T0).toISOString(),
  }));
  (rig.mock as unknown as { fish: FishItem[] }).fish = fish;
  return fish;
}

async function errorCode(promise: Promise<unknown>): Promise<string | undefined> {
  try {
    await promise;
  } catch (error) {
    return error instanceof ApiError ? error.code : String(error);
  }
  return undefined;
}

describe('MockBackend đổi cá giữa bạn bè', () => {
  it('đề nghị → bot đồng ý: đổi chéo trong túi, đề nghị đóng, túi cá tải lại', async () => {
    const rig = await setup();
    const mine = giveFish(rig, 3);
    const friendFish = await rig.api.get<FriendFishResponse>(`/friends/${rig.botId}/fish`);
    expect(friendFish.fish.length).toBeGreaterThan(0);
    const theirs = friendFish.fish[0]!;

    const trade = await rig.api.post<TradeEntry>('/trades', {
      toPlayerId: rig.botId,
      offerCatchIds: [mine[0]!.catchId],
      requestCatchIds: [theirs.catchId],
    });
    expect(trade.status).toBe('pending');
    expect(trade.offer[0]!.catchId).toBe(mine[0]!.catchId);
    rig.store.dispatch({ type: 'social/tradeOutgoing', payload: trade });
    expect((await rig.api.get<TradesResponse>('/trades')).outgoing).toHaveLength(1);

    // Bot trả lời sau 3–8 giây (70% đồng ý); thử vài lần với đề nghị mới cho tới khi có kết quả đồng ý.
    rig.mock.advance(9000);
    expect((await rig.api.get<TradesResponse>('/trades')).outgoing).toHaveLength(0);
    expect(rig.store.getState().social.trades?.outgoing ?? []).toHaveLength(0);
    const inventory = await rig.api.get<InventoryResponse>('/me/inventory');
    const ids = inventory.fish.map((f) => f.catchId);
    if (ids.includes(theirs.catchId)) {
      expect(ids).not.toContain(mine[0]!.catchId);
      expect(inventory.fish).toHaveLength(3);
    } else {
      // Bot từ chối: túi nguyên vẹn.
      expect(ids).toContain(mine[0]!.catchId);
    }
    expect(rig.bad).toEqual([]);
  });

  it('luật: chỉ bạn bè, 1–5 con, không trùng, cá phải còn; rút lại và từ chối', async () => {
    const rig = await setup();
    const mine = giveFish(rig, 7);
    const theirs = (await rig.api.get<FriendFishResponse>(`/friends/${rig.botId}/fish`)).fish;
    const post = (body: Record<string, unknown>) => rig.api.post('/trades', body);
    const ok = { toPlayerId: rig.botId, offerCatchIds: [mine[0]!.catchId], requestCatchIds: [theirs[0]!.catchId] };

    expect(await errorCode(post({ ...ok, offerCatchIds: [] }))).toBe('VALIDATION_FAILED');
    expect(await errorCode(post({ ...ok, requestCatchIds: [] }))).toBe('VALIDATION_FAILED');
    expect(await errorCode(post({ ...ok, offerCatchIds: mine.slice(0, 6).map((f) => f.catchId) }))).toBe(
      'VALIDATION_FAILED',
    );
    expect(await errorCode(post({ ...ok, requestCatchIds: [mine[0]!.catchId] }))).toBe('VALIDATION_FAILED');
    expect(await errorCode(post({ ...ok, offerCatchIds: ['khong-co'] }))).toBe('FISH_NOT_FOUND');
    expect(await errorCode(post({ ...ok, toPlayerId: 'bot-khong-ton-tai' }))).toBe('NOT_FRIENDS');
    expect(await errorCode(rig.api.get('/friends/bot-khong-ton-tai/fish'))).toBe('NOT_FRIENDS');

    const trade = (await post(ok)) as TradeEntry;
    expect(await errorCode(rig.api.post(`/trades/${trade.tradeId}/accept`))).toBe('TRADE_NOT_FOUND');
    expect(await errorCode(rig.api.post(`/trades/${trade.tradeId}/decline`))).toBe('TRADE_NOT_FOUND');
    await rig.api.post(`/trades/${trade.tradeId}/cancel`);
    expect((await rig.api.get<TradesResponse>('/trades')).outgoing).toHaveLength(0);
    expect(await errorCode(rig.api.post(`/trades/${trade.tradeId}/cancel`))).toBe('TRADE_NOT_FOUND');

    // Tối đa 10 đề nghị chờ.
    for (let i = 0; i < 10; i++) await post(ok);
    expect(await errorCode(post(ok))).toBe('TRADE_LIMIT_REACHED');
  });

  it('bot đề nghị đổi: nhận TradeReceived, đồng ý thì đổi cá, từ chối thì giữ nguyên', async () => {
    const rig = await setup();
    const mine = giveFish(rig, 2);
    const received: TradeEntry[] = [];
    rig.hub.on('TradeReceived', (trade) => received.push(trade));
    rig.mock.advance(4 * 60_000);
    expect(received.length).toBeGreaterThanOrEqual(1);
    const trade = received[0]!;
    expect(rig.store.getState().social.trades?.incoming.map((t) => t.tradeId)).toContain(trade.tradeId);
    expect(trade.fromPlayerId).toBe(rig.botId);
    expect(mine.map((f) => f.catchId)).toContain(trade.request[0]!.catchId);

    await rig.api.post(`/trades/${trade.tradeId}/accept`);
    const ids = (await rig.api.get<InventoryResponse>('/me/inventory')).fish.map((f) => f.catchId);
    expect(ids).toContain(trade.offer[0]!.catchId);
    expect(ids).not.toContain(trade.request[0]!.catchId);
    expect(await errorCode(rig.api.post(`/trades/${trade.tradeId}/accept`))).toBe('TRADE_NOT_FOUND');
    expect(rig.bad).toEqual([]);
  });
});
