import { beforeEach, describe, expect, it } from 'vitest';
import configJson from '@fixtures/gameplay-config.v0.json';
import mapJson from '@fixtures/lake-map.placeholder.json';
import type { GameplayConfig } from '../core/gameplayConfig';
import { applyTap, createState, type MinigameState } from '../fishing/minigameCore';
import { ApiClient, ApiError } from '../net/ApiClient';
import type {
  AttemptView,
  ErrorCode,
  HubEventName,
  InventoryResponse,
  LoginResponse,
  SeatPurchaseResult,
} from '../net/contract';
import { EVENT_GUARDS, isCommandAck, isInventory, isProgress } from '../net/contractGuards';
import { GameHub } from '../net/GameHub';
import type { LakeMap } from '../scenes/lake/walkable';
import { bindHubToStore } from '../state/bindHub';
import { Store } from '../state/store';
import { MockBackend } from './MockBackend';

const config = configJson as unknown as GameplayConfig;
const map = mapJson as LakeMap;
const PRICE = config.seatPricing.priceVersion;
const T0 = Date.parse('2026-11-09T10:00:00Z');

let requestCounter = 0;

interface Rig {
  mock: MockBackend;
  api: ApiClient;
  hub: GameHub;
  store: Store;
  badEvents: string[];
  seenEvents: Set<string>;
}

async function setup(forcedError: ErrorCode | null = null, gold?: number): Promise<Rig> {
  const testConfig =
    gold === undefined ? config : { ...config, newPlayer: { ...config.newPlayer, gold } };
  const mock = new MockBackend({ config: testConfig, map, seed: 7, startMs: T0, forcedError });
  const api = new ApiClient({
    baseUrl: 'http://mock.local',
    fetchImpl: mock.fetch,
    sleep: () => Promise.resolve(),
  });
  const hub = new GameHub(mock.createConnection(), () => `req-${++requestCounter}`);
  const store = new Store();
  bindHubToStore(hub, store, () => mock.now());

  // Mọi event mock phát ra phải khớp type guard của contract.
  const badEvents: string[] = [];
  const seenEvents = new Set<string>();
  for (const name of Object.keys(EVENT_GUARDS) as HubEventName[]) {
    hub.on(name, (payload) => {
      seenEvents.add(name);
      if (!(EVENT_GUARDS[name] as (v: unknown) => boolean)(payload)) {
        badEvents.push(`${name}: ${JSON.stringify(payload)}`);
      }
    });
  }

  const login = await api.post<LoginResponse>('/auth/login', { firebaseIdToken: 'x' });
  api.setAccessToken(login.accessToken);
  store.dispatch({ type: 'session/profile', payload: login.player });
  await hub.start();
  await hub.joinLake();
  return { mock, api, hub, store, badEvents, seenEvents };
}

const attemptOf = (rig: Rig): AttemptView | null => rig.store.getState().attempt;
const goldOf = (rig: Rig) => rig.store.getState().session.gold;

async function buy(rig: Rig, seatId = 'seat-11', durationUnits = 1) {
  const ack = await rig.hub.invoke('BuySeatTicket', {
    seatId,
    durationUnits,
    expectedPriceVersion: PRICE,
  });
  if (ack.ok && ack.data) rig.store.dispatch({ type: 'session/gold', payload: ack.data.gold });
  return ack;
}

async function waitForBite(rig: Rig) {
  await rig.hub.invoke('CastLine', {});
  for (let i = 0; i < 80 && attemptOf(rig)?.phase !== 'bite'; i += 1) rig.mock.advance(100);
  expect(attemptOf(rig)?.phase).toBe('bite');
}

function hitTime(state: MinigameState, from: number): number {
  for (let t = from; t < from + 4000; t += 1) {
    const out = applyTap(state, state.tapSeq + 1, t);
    if (out.accepted && out.kind !== 'miss') return t;
  }
  throw new Error('không có thời điểm trúng');
}

/** Chơi thắng minigame bằng cách tính trước thời điểm kim nằm trong vùng. */
async function winMinigame(rig: Rig) {
  const attempt = attemptOf(rig)!;
  await rig.hub.invoke('HookFish', { attemptId: attempt.attemptId });
  const current = attemptOf(rig)!;
  expect(current.phase).toBe('minigame');
  const started = Date.parse(current.minigame!.startedAt);
  let state = createState(current.minigame!, {
    minTapIntervalMs: config.minigame.tapValidation.minTapIntervalMs,
  });
  while (!state.won) {
    const elapsed = rig.mock.now() - started;
    const t = hitTime(state, elapsed + config.minigame.tapValidation.minTapIntervalMs);
    rig.mock.advance(t - elapsed);
    const ack = await rig.hub.invoke('MinigameTap', {
      attemptId: current.attemptId,
      seq: state.tapSeq + 1,
      tMs: t,
    });
    expect(ack.ok).toBe(true);
    const out = applyTap(state, state.tapSeq + 1, t);
    state = out.state;
    expect(ack.data?.hp).toBe(state.hp);
  }
}

describe('MockBackend', () => {
  let rig: Rig;

  beforeEach(async () => {
    rig = await setup();
  });

  it('đăng nhập trả 100 Gold và cần mặc định', () => {
    const profile = rig.store.getState().session.profile;
    expect(profile?.gold).toBe('100');
    expect(profile?.equippedRodId).toBe('rod_old');
  });

  it('snapshot có 20 ghế và 3 bot', () => {
    const lake = rig.store.getState().lake;
    expect(Object.keys(lake.seats)).toHaveLength(20);
    expect(Object.keys(lake.players)).toHaveLength(4);
  });

  it('thiếu token thì HTTP trả 401', async () => {
    const api = new ApiClient({
      baseUrl: 'http://mock.local',
      fetchImpl: new MockBackend({ config, map }).fetch,
    });
    await expect(api.get('/me')).rejects.toMatchObject({ status: 401 });
  });

  it('chơi trọn vòng: mua ghế → câu thắng → túi, EXP, Codex → bán cá', async () => {
    const ack = await buy(rig, 'seat-11', 2);
    expect(isCommandAck<SeatPurchaseResult>(ack, (d): d is SeatPurchaseResult => d !== null)).toBe(
      true,
    );
    expect(ack.data?.chargedGold).toBe('80');
    expect(goldOf(rig)).toBe('20');

    await waitForBite(rig);
    expect(attemptOf(rig)?.result).toBeNull();
    await winMinigame(rig);

    const finished = attemptOf(rig)!;
    expect(finished.phase).toBe('success');
    expect(finished.result?.isNew).toBe(true);
    const species = config.fish.find((f) => f.speciesId === finished.result?.speciesId)!;
    expect(finished.result!.lengthTenthCm).toBeGreaterThanOrEqual(species.minTenthCm);
    expect(finished.result!.lengthTenthCm).toBeLessThanOrEqual(species.maxTenthCm);

    const inventory = await rig.api.get<InventoryResponse>('/me/inventory');
    expect(isInventory(inventory)).toBe(true);
    expect(inventory.fish).toHaveLength(1);
    const progress = await rig.api.get('/me/progress');
    expect(isProgress(progress)).toBe(true);
    expect((progress as { exp: number }).exp).toBe(species.exp);

    const codex = await rig.api.get<{ species: { speciesId: string; discovered: boolean }[] }>(
      '/me/codex',
    );
    expect(codex.species).toHaveLength(9);
    expect(codex.species.filter((s) => s.discovered).map((s) => s.speciesId)).toEqual([
      species.speciesId,
    ]);

    const sold = await rig.api.post<{ gold: string; soldCount: number }>('/shop/sell-fish', {
      all: true,
    });
    expect(sold.soldCount).toBe(1);
    expect(sold.gold).toBe(String(20 + species.sellGold));

    const history = await rig.api.get<{ items: { outcome: string }[] }>('/me/history');
    expect(history.items[0]?.outcome).toBe('success');
    expect(rig.seenEvents.has('CatchShown')).toBe(true);
    expect(rig.badEvents).toEqual([]);
  });

  it('không gửi loài trong event bite', async () => {
    await buy(rig);
    await waitForBite(rig);
    expect(JSON.stringify(attemptOf(rig))).not.toMatch(/species/i);
  });

  it('không bấm kịp thì thất bại missed_bite', async () => {
    await buy(rig);
    await waitForBite(rig);
    const { biteWindowMs, biteGraceMs } = config.fishing;
    rig.mock.advance(biteWindowMs + biteGraceMs + 200);
    expect(attemptOf(rig)).toMatchObject({ phase: 'failed', reason: 'missed_bite' });
    expect(rig.badEvents).toEqual([]);
  });

  it('thời gian chờ cá cắn trừ Lure Time của ghế', async () => {
    rig = await setup(null, 500);
    expect((await buy(rig, 'seat-01')).ok).toBe(true);
    const before = rig.mock.now();
    await rig.hub.invoke('CastLine', {});
    for (let i = 0; i < 80 && attemptOf(rig)?.phase !== 'bite'; i += 1) rig.mock.advance(100);
    expect(attemptOf(rig)?.phase).toBe('bite');
    const waited = rig.mock.now() - before;
    expect(waited).toBeGreaterThanOrEqual(config.fishing.waitMinMs - 1000);
    expect(waited).toBeLessThanOrEqual(config.fishing.waitMaxMs - 1000 + 100);
  });

  it('hết giờ minigame thì thất bại timeout', async () => {
    await buy(rig);
    await waitForBite(rig);
    await rig.hub.invoke('HookFish', { attemptId: attemptOf(rig)!.attemptId });
    const duration = attemptOf(rig)!.minigame!.durationMs;
    rig.mock.advance(duration + config.minigame.tapValidation.endGraceMs + 200);
    expect(attemptOf(rig)).toMatchObject({ phase: 'failed', reason: 'timeout' });
  });

  it('tap ngoài cửa sổ thời gian bị TAP_REJECTED', async () => {
    await buy(rig);
    await waitForBite(rig);
    await rig.hub.invoke('HookFish', { attemptId: attemptOf(rig)!.attemptId });
    const ack = await rig.hub.invoke('MinigameTap', {
      attemptId: attemptOf(rig)!.attemptId,
      seq: 1,
      tMs: 5000,
    });
    expect(ack.error?.code).toBe('TAP_REJECTED');
  });

  it('ghế: đang có người, cooldown, đã giữ ghế', async () => {
    expect((await buy(rig)).ok).toBe(true);
    expect((await buy(rig, 'seat-12')).error?.code).toBe('ALREADY_HAS_SEAT');
    await rig.hub.invoke('LeaveSeat', {});
    expect(rig.store.getState().lake.seats['seat-11']?.state).toBe('cooldown');
    expect((await buy(rig)).error?.code).toBe('SEAT_COOLDOWN');
    rig.mock.advance(config.seatSession.cooldownMs + 100);
    expect(rig.store.getState().lake.seats['seat-11']?.state).toBe('available');
    expect((await buy(rig)).ok).toBe(true);
  });

  it('mua 2 block rồi gia hạn 1 block được đúng 3 block', async () => {
    rig = await setup(null, 500);
    const bought = await buy(rig, 'seat-11', 2);
    const sessionId = bought.data!.session.sessionId;
    const originalExpiry = Date.parse(bought.data!.session.expiresAt);
    rig.mock.advance(60_000);
    const extended = await rig.hub.invoke('ExtendSeatSession', {
      sessionId,
      durationUnits: 1,
      expectedPriceVersion: PRICE,
    });
    expect(extended.data?.session.purchasedMinutes).toBe(30);
    expect(Date.parse(extended.data!.session.expiresAt)).toBe(originalExpiry + 10 * 60_000);
    expect(extended.data?.session.sessionVersion).toBe(2);
    expect(extended.data?.gold).toBe('380');
    expect(rig.store.getState().lake.mySession?.purchasedMinutes).toBe(30);
  });

  it('retry cùng requestId không trừ tiền hai lần', async () => {
    const connection = rig.mock.createConnection();
    const args = {
      requestId: 'same',
      seatId: 'seat-11',
      durationUnits: 1,
      expectedPriceVersion: PRICE,
    };
    const first = await connection.invoke<{ data: SeatPurchaseResult }>('BuySeatTicket', args);
    const second = await connection.invoke<{ data: SeatPurchaseResult }>('BuySeatTicket', args);
    expect(second).toEqual(first);
    expect(first.data.gold).toBe('60');
  });

  it('thiếu Gold, sai thời lượng, sai phiên bản giá', async () => {
    expect((await buy(rig, 'seat-01', 1)).error?.code).toBe('INSUFFICIENT_GOLD');
    expect((await buy(rig, 'seat-11', 0)).error?.code).toBe('INVALID_DURATION');
    const ack = await rig.hub.invoke('BuySeatTicket', {
      seatId: 'seat-11',
      durationUnits: 1,
      expectedPriceVersion: 'cu',
    });
    expect(ack.error?.code).toBe('PRICE_CHANGED');
    expect(goldOf(rig)).toBe('100');
  });

  it('hết hạn khi đang câu: hủy lần câu, về cooldown', async () => {
    await buy(rig);
    await rig.hub.invoke('CastLine', {});
    rig.mock.setSeatTimeScale(1000);
    // Dừng ngay khi phiên kết thúc, nếu tua tiếp thì cooldown cũng hết theo tốc độ x1000.
    for (let i = 0; i < 100 && rig.store.getState().lake.mySession; i += 1) rig.mock.advance(100);
    expect(attemptOf(rig)).toMatchObject({ phase: 'cancelled', reason: 'session_expired' });
    const lake = rig.store.getState().lake;
    expect(lake.mySession).toBeNull();
    expect(lake.lastSessionEnd?.reason).toBe('expired');
    expect(lake.seats['seat-11']?.state).toBe('cooldown');
    expect(rig.badEvents).toEqual([]);
  });

  it('rời ghế khi đang câu: hủy với lý do left_seat', async () => {
    await buy(rig);
    await rig.hub.invoke('CastLine', {});
    await rig.hub.invoke('LeaveSeat', {});
    expect(attemptOf(rig)).toMatchObject({ phase: 'cancelled', reason: 'left_seat' });
  });

  it('di chuyển xuống nước hoặc quá phạm vi ghế bị kéo về', async () => {
    await rig.hub.invoke('Move', { seq: 1, x: 768, y: 576, dir: 'down' });
    expect(rig.store.getState().lake.correction?.seq).toBe(1);
    await buy(rig, 'seat-11');
    const seat = map.seats.find((s) => s.seatId === 'seat-11')!;
    await rig.hub.invoke('Move', {
      seq: 2,
      x: seat.x + seat.roamRadius + 40,
      y: seat.y,
      dir: 'right',
    });
    expect(rig.store.getState().lake.correction).toMatchObject({ x: seat.x, y: seat.y, seq: 2 });
  });

  it('shop: thiếu Gold, đã có cần, đổi cần', async () => {
    const error = await rig.api
      .post('/shop/buy', { offerId: 'offer_rod_steel_awl', quantity: 1 })
      .catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ code: 'INSUFFICIENT_GOLD', status: 422 });

    rig = await setup(null, 1000);
    await rig.api.post('/shop/buy', { offerId: 'offer_rod_steel_awl', quantity: 1 });
    await expect(
      rig.api.post('/shop/buy', { offerId: 'offer_rod_steel_awl', quantity: 1 }),
    ).rejects.toMatchObject({ code: 'ROD_ALREADY_OWNED' });
    await expect(rig.api.put('/me/equipped-rod', { rodId: 'rod_bliss' })).rejects.toMatchObject({
      code: 'ROD_NOT_OWNED',
    });
    await rig.api.put('/me/equipped-rod', { rodId: 'rod_steel_awl' });
    const inventory = await rig.api.get<InventoryResponse>('/me/inventory');
    expect(inventory.equippedRodId).toBe('rod_steel_awl');
  });

  it('forcedError trả lỗi giả nhưng vẫn vào hồ được', async () => {
    const forced = await setup('SEAT_TAKEN');
    expect(Object.keys(forced.store.getState().lake.seats)).toHaveLength(20);
    expect((await buy(forced)).error?.code).toBe('SEAT_TAKEN');
  });

  it('bot di chuyển và mọi event hợp lệ', () => {
    rig.mock.advance(30_000);
    expect(rig.seenEvents.has('PlayerMoved')).toBe(true);
    expect(rig.badEvents).toEqual([]);
  });

  it('đặt tên: quá ngắn, trùng, hợp lệ', async () => {
    await expect(rig.api.put('/me/display-name', { displayName: 'ab' })).rejects.toMatchObject({
      code: 'VALIDATION_FAILED',
    });
    await expect(rig.api.put('/me/display-name', { displayName: 'bot 1' })).rejects.toMatchObject({
      code: 'STATE_CONFLICT',
    });
    await expect(
      rig.api.put('/me/display-name', { displayName: 'Câu Thủ' }),
    ).resolves.toMatchObject({
      displayName: 'Câu Thủ',
    });
  });

  it('lịch sử phân trang không trùng dòng', async () => {
    await buy(rig, 'seat-11', 2);
    for (let i = 0; i < 5; i += 1) {
      await waitForBite(rig);
      rig.mock.advance(config.fishing.biteWindowMs + config.fishing.biteGraceMs + 200);
    }
    const seen: string[] = [];
    let cursor: string | null = null;
    do {
      const query: string = cursor === null ? '?limit=2' : `?limit=2&cursor=${cursor}`;
      const page: { items: { attemptId: string }[]; nextCursor: string | null } = await rig.api.get(
        `/me/history${query}`,
      );
      seen.push(...page.items.map((item) => item.attemptId));
      cursor = page.nextCursor;
    } while (cursor !== null);
    expect(seen).toHaveLength(5);
    expect(new Set(seen).size).toBe(5);
  });
});
