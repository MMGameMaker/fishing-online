import { beforeEach, describe, expect, it } from 'vitest';
import configJson from '@fixtures/gameplay-config.v0.json';
import mapJson from '@fixtures/lake-map.placeholder.json';
import type { GameplayConfig } from '../core/gameplayConfig';
import { ApiClient, ApiError } from '../net/ApiClient';
import type {
  AttemptView,
  ErrorCode,
  HubEventName,
  InventoryResponse,
  LoginResponse,
  TicketPurchaseResult,
} from '../net/contract';
import { EVENT_GUARDS, isCommandAck, isInventory, isProgress } from '../net/contractGuards';
import { GameHub } from '../net/GameHub';
import type { LakeMap } from '../scenes/lake/walkable';
import { bindHubToStore } from '../state/bindHub';
import { Store } from '../state/store';
import { MockBackend } from './MockBackend';

const config = configJson as unknown as GameplayConfig;
const map = mapJson as LakeMap;
const PRICE = config.ticketPricing.priceVersion;
const UNIT_PRICE = Number(config.ticketPricing.unitPriceGold);
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

async function buyTicket(rig: Rig, quantity = 1) {
  const ack = await rig.hub.invoke('BuyTicket', { quantity, expectedPriceVersion: PRICE });
  if (ack.ok && ack.data) rig.store.dispatch({ type: 'session/gold', payload: ack.data.gold });
  return ack;
}

async function sitDown(rig: Rig, seatId = 'seat-11') {
  return rig.hub.invoke('SitDown', { seatId });
}

/** Mua vé rồi ngồi luôn; trả ack SitDown (hoặc ack BuyTicket nếu mua vé thất bại). */
async function buy(rig: Rig, seatId = 'seat-11', quantity = 1) {
  const purchase = await buyTicket(rig, quantity);
  if (!purchase.ok) return purchase;
  return sitDown(rig, seatId);
}

async function waitForBite(rig: Rig) {
  await rig.hub.invoke('CastLine', {});
  for (let i = 0; i < 80 && attemptOf(rig)?.phase !== 'bite'; i += 1) rig.mock.advance(100);
  expect(attemptOf(rig)?.phase).toBe('bite');
}

async function hook(rig: Rig): Promise<string> {
  const { attemptId } = attemptOf(rig)!;
  await rig.hub.invoke('HookFish', { attemptId });
  expect(attemptOf(rig)?.phase).toBe('minigame');
  return attemptId;
}

async function reachMinigame(rig: Rig): Promise<string> {
  await buy(rig);
  await waitForBite(rig);
  return hook(rig);
}

/** Theo SPEC 0.5 Client tự chơi minigame và chỉ báo kết quả cuối. */
async function winMinigame(rig: Rig) {
  const attemptId = await hook(rig);
  const ack = await rig.hub.invoke('SubmitFishingResult', { attemptId, outcome: 'success' });
  expect(ack.ok).toBe(true);
  expect(ack.data?.attempt.phase).toBe('success');
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

  it('chơi trọn vòng: mua vé, ngồi ghế → câu thắng → túi, EXP, Codex → bán cá', async () => {
    const purchase = await buyTicket(rig, 2);
    expect(
      isCommandAck<TicketPurchaseResult>(purchase, (d): d is TicketPurchaseResult => d !== null),
    ).toBe(true);
    expect(purchase.data?.chargedGold).toBe(String(2 * UNIT_PRICE));
    expect(goldOf(rig)).toBe(String(100 - 2 * UNIT_PRICE));
    expect((await sitDown(rig, 'seat-11')).ok).toBe(true);

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
    expect(sold.gold).toBe(String(100 - 2 * UNIT_PRICE + species.sellGold));

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

  it('hết giờ minigame thì thất bại timeout', async () => {
    const attemptId = await reachMinigame(rig);
    const duration = attemptOf(rig)!.minigame!.durationMs;
    rig.mock.advance(duration + config.minigame.resultGraceMs + 200);
    expect(attemptOf(rig)).toMatchObject({ phase: 'failed', reason: 'timeout' });
    const late = await rig.hub.invoke('SubmitFishingResult', { attemptId, outcome: 'success' });
    expect(late.error?.code).toBe('RESULT_EXPIRED');
  });

  it('deadlineAt bằng duration cộng resultGraceMs', async () => {
    await reachMinigame(rig);
    const game = attemptOf(rig)!.minigame!;
    expect(Date.parse(game.deadlineAt) - Date.parse(game.startedAt)).toBe(
      game.durationMs + config.minigame.resultGraceMs,
    );
  });

  it('Client báo thua: không có cá và không EXP', async () => {
    const attemptId = await reachMinigame(rig);
    const ack = await rig.hub.invoke('SubmitFishingResult', { attemptId, outcome: 'failed' });
    expect(ack.data?.attempt.phase).toBe('failed');
    expect((await rig.api.get<InventoryResponse>('/me/inventory')).fish).toHaveLength(0);
    expect((await rig.api.get<{ exp: number }>('/me/progress')).exp).toBe(0);
  });

  it('gửi lặp kết quả với requestId khác vẫn chỉ một cá, một lần EXP', async () => {
    const attemptId = await reachMinigame(rig);
    const first = await rig.hub.invoke('SubmitFishingResult', { attemptId, outcome: 'success' });
    const second = await rig.hub.invoke('SubmitFishingResult', { attemptId, outcome: 'success' });
    expect(second.data?.attempt).toEqual(first.data?.attempt);
    const inventory = await rig.api.get<InventoryResponse>('/me/inventory');
    expect(inventory.fish).toHaveLength(1);
    const progress = await rig.api.get<{ exp: number }>('/me/progress');
    const species = config.fish.find((f) => f.speciesId === first.data?.attempt.result?.speciesId);
    expect(progress.exp).toBe(species?.exp);
  });

  it('đổi outcome sau khi đã kết thúc bị STATE_CONFLICT', async () => {
    const attemptId = await reachMinigame(rig);
    await rig.hub.invoke('SubmitFishingResult', { attemptId, outcome: 'failed' });
    const ack = await rig.hub.invoke('SubmitFishingResult', { attemptId, outcome: 'success' });
    expect(ack.error?.code).toBe('STATE_CONFLICT');
  });

  it('không nhận kết quả trước khi Hook hoặc với attempt giả', async () => {
    await buy(rig);
    await waitForBite(rig);
    const { attemptId } = attemptOf(rig)!;
    const early = await rig.hub.invoke('SubmitFishingResult', { attemptId, outcome: 'success' });
    expect(early.error?.code).toBe('STATE_CONFLICT');
    const fake = await rig.hub.invoke('SubmitFishingResult', {
      attemptId: 'gia',
      outcome: 'success',
    });
    expect(fake.error?.code).toBe('NO_ACTIVE_ATTEMPT');
  });

  it('vé hết giữa minigame: vẫn câu nốt được cá, sau đó tự đứng dậy', async () => {
    const attemptId = await reachMinigame(rig);
    // Đẩy hạn vé về hiện tại thay vì tua 10 phút, vì tua lâu sẽ quá deadline minigame.
    const internal = rig.mock as unknown as { ticket: { expiresAtMs: number } };
    internal.ticket.expiresAtMs = rig.mock.now();
    rig.mock.advance(100);
    expect(rig.store.getState().lake.mySeat).not.toBeNull();
    const ack = await rig.hub.invoke('SubmitFishingResult', { attemptId, outcome: 'success' });
    expect(ack.ok).toBe(true);
    rig.mock.advance(100);
    expect((await rig.api.get<InventoryResponse>('/me/inventory')).fish).toHaveLength(1);
    expect(rig.store.getState().lake.mySeat).toBeNull();
    expect(rig.store.getState().lake.lastSeatEnd?.reason).toBe('ticket_expired');
  });

  it('catalog không chứa khối spawn', async () => {
    const catalog = await rig.api.get<Record<string, unknown>>('/catalog');
    expect(catalog.spawn).toBeUndefined();
    expect(catalog.fishing).toBeDefined();
  });

  it('ghế: đang có người, hết vé, đã giữ ghế, ngồi lại không cooldown', async () => {
    expect((await buy(rig)).ok).toBe(true);
    expect((await sitDown(rig, 'seat-12')).error?.code).toBe('ALREADY_HAS_SEAT');
    await rig.hub.invoke('LeaveSeat', {});
    expect(rig.store.getState().lake.seats['seat-11']?.state).toBe('available');
    // Còn vé (vừa mua 10 phút) nên ngồi lại ngay được, không có cooldown.
    expect((await sitDown(rig, 'seat-11')).ok).toBe(true);
    await rig.hub.invoke('LeaveSeat', {});
    // Hết vé thì không ngồi được nữa.
    rig.mock.advance(config.ticketPricing.billingUnitMinutes * 60_000 + 1000);
    expect((await sitDown(rig, 'seat-11')).error?.code).toBe('NO_TICKET');
  });

  it('mua 2 đơn vị vé rồi mua thêm 1 đơn vị, cộng dồn hạn', async () => {
    rig = await setup(null, 500);
    const bought = await buyTicket(rig, 2);
    const originalExpiry = Date.parse(bought.data!.ticket.expiresAt);
    rig.mock.advance(60_000);
    const extended = await buyTicket(rig, 1);
    expect(extended.data?.ticket.purchasedMinutes).toBe(30);
    expect(Date.parse(extended.data!.ticket.expiresAt)).toBe(originalExpiry + 10 * 60_000);
    expect(extended.data?.ticket.ticketVersion).toBe(2);
    expect(extended.data?.gold).toBe(String(500 - 3 * UNIT_PRICE));
    expect(rig.store.getState().lake.myTicket?.purchasedMinutes).toBe(30);
  });

  it('retry cùng requestId không trừ tiền hai lần', async () => {
    const connection = rig.mock.createConnection();
    const args = { requestId: 'same', quantity: 1, expectedPriceVersion: PRICE };
    const first = await connection.invoke<{ data: TicketPurchaseResult }>('BuyTicket', args);
    const second = await connection.invoke<{ data: TicketPurchaseResult }>('BuyTicket', args);
    expect(second).toEqual(first);
    expect(first.data.gold).toBe(String(100 - UNIT_PRICE));
  });

  it('thiếu Gold, sai số lượng, sai phiên bản giá', async () => {
    const poor = await setup(null, 10);
    expect((await buyTicket(poor, 1)).error?.code).toBe('INSUFFICIENT_GOLD');
    expect((await buyTicket(rig, 0)).error?.code).toBe('INVALID_QUANTITY');
    const ack = await rig.hub.invoke('BuyTicket', { quantity: 1, expectedPriceVersion: 'cu' });
    expect(ack.error?.code).toBe('PRICE_CHANGED');
    expect(goldOf(rig)).toBe('100');
  });

  it('hết vé khi đang câu (chưa vào minigame): hủy lần câu, tự đứng dậy', async () => {
    await buy(rig);
    await rig.hub.invoke('CastLine', {});
    rig.mock.setSeatTimeScale(1000);
    for (let i = 0; i < 100 && rig.store.getState().lake.mySeat; i += 1) rig.mock.advance(100);
    expect(attemptOf(rig)).toMatchObject({ phase: 'cancelled', reason: 'ticket_expired' });
    const lake = rig.store.getState().lake;
    expect(lake.mySeat).toBeNull();
    expect(lake.lastSeatEnd?.reason).toBe('ticket_expired');
    expect(lake.seats['seat-11']?.state).toBe('available');
    expect(rig.badEvents).toEqual([]);
  });

  it('rời ghế khi đang câu: hủy với lý do left_seat', async () => {
    await buy(rig);
    await rig.hub.invoke('CastLine', {});
    await rig.hub.invoke('LeaveSeat', {});
    expect(attemptOf(rig)).toMatchObject({ phase: 'cancelled', reason: 'left_seat' });
  });

  it('rời ghế khi cá cắn câu: hủy, không có cá', async () => {
    await buy(rig);
    await waitForBite(rig);
    const ack = await rig.hub.invoke('LeaveSeat', {});
    expect(ack.ok).toBe(true);
    expect(attemptOf(rig)).toMatchObject({ phase: 'cancelled', reason: 'left_seat', result: null });
  });

  it('rời ghế trong minigame bị từ chối, lần câu vẫn chạy', async () => {
    await reachMinigame(rig);
    const ack = await rig.hub.invoke('LeaveSeat', {});
    expect(ack.error?.code).toBe('STATE_CONFLICT');
    expect(attemptOf(rig)?.phase).toBe('minigame');
    expect(rig.store.getState().lake.mySeat).not.toBeNull();
  });

  it('trượt cá thì tự đứng dậy, không phát icon buồn; thua minigame thì có', async () => {
    const fails: string[] = [];
    rig.hub.on('FailShown', (event) => fails.push(event.playerId));
    await buy(rig, 'seat-11', 2);
    await waitForBite(rig);
    rig.mock.advance(config.fishing.biteWindowMs + config.fishing.biteGraceMs + 200);
    expect(attemptOf(rig)).toMatchObject({ phase: 'failed', reason: 'missed_bite' });
    expect(rig.store.getState().lake.mySeat).toBeNull();
    expect(rig.store.getState().lake.lastSeatEnd?.reason).toBe('missed_bite');
    expect(fails.filter((id) => !id.startsWith('bot-'))).toHaveLength(0);

    await sitDown(rig);
    await waitForBite(rig);
    const attemptId = await hook(rig);
    await rig.hub.invoke('SubmitFishingResult', { attemptId, outcome: 'failed' });
    expect(fails.filter((id) => !id.startsWith('bot-'))).toHaveLength(1);
    expect(rig.store.getState().lake.mySeat).not.toBeNull();
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
      // Trượt cá thì tự đứng dậy nên phải ngồi lại mỗi lượt.
      if (i > 0) await sitDown(rig);
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
