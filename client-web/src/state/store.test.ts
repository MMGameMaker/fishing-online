import { describe, expect, it, vi } from 'vitest';
import samples from '@fixtures/api-samples.v0.json';
import type {
  AttemptView,
  HubEvents,
  InventoryResponse,
  LakeSnapshot,
  MySeatSession,
  PlayerProfile,
  SeatView,
} from '../net/contract';
import type { HubConnectionLike, HubHandler } from '../net/GameHub';
import { GameHub } from '../net/GameHub';
import { bindHubToStore } from './bindHub';
import { CHAT_LOG_LIMIT, Store, initialState, reduce } from './store';

const hub = samples.hub;
const snapshot = hub['JoinLake ack'].data as unknown as LakeSnapshot;
const seatChanged = hub.SeatChanged as unknown as SeatView;
const profile = samples.http['GET /api/v1/me 200'].data as PlayerProfile;
const session = hub['BuySeatTicket ack ok'].data.session as MySeatSession;
const joined = () => reduce(initialState, { type: 'LakeSnapshot', payload: snapshot });

describe('reducer', () => {
  it('LakeSnapshot nạp người chơi và 20 ghế', () => {
    const s = joined();
    expect(Object.keys(s.lake.seats)).toHaveLength(20);
    expect(s.lake.players[snapshot.players[0]!.playerId]?.displayName).toBe('Bob');
    expect(s.lake.mapId).toBe('lake-01');
  });

  it('SeatChanged chỉ cập nhật đúng ghế', () => {
    const before = joined();
    const after = reduce(before, { type: 'SeatChanged', payload: seatChanged });
    expect(after.lake.seats['seat-11']?.state).toBe('occupied');
    expect(after.lake.seats['seat-02']).toBe(before.lake.seats['seat-02']);
  });

  it('áp chuỗi event mẫu của một lần câu', () => {
    const sequence: AttemptView[] = [
      hub['AttemptUpdate waiting'],
      hub['AttemptUpdate bite'],
      hub['AttemptUpdate minigame'],
      hub['AttemptUpdate success'],
    ] as unknown as AttemptView[];
    let s = joined();
    const phases = sequence.map((payload) => {
      s = reduce(s, { type: 'AttemptUpdate', payload });
      return s.attempt?.phase;
    });
    expect(phases).toEqual(['waiting', 'bite', 'minigame', 'success']);
    expect(s.attempt?.result?.lengthTenthCm).toBe(143);
  });

  it('phiên ghế: nhận, gia hạn, kết thúc', () => {
    let s = reduce(joined(), { type: 'MySeatSession', payload: session });
    expect(s.lake.mySession?.purchasedMinutes).toBe(20);
    const extended = hub['ExtendSeatSession ack ok'].data.session as MySeatSession;
    s = reduce(s, { type: 'MySeatSession', payload: extended });
    expect(s.lake.mySession?.expiresAt).toBe('2026-11-09T10:30:00Z');
    s = reduce(s, {
      type: 'MySeatSession',
      payload: hub['MySeatSession ended'] as HubEvents['MySeatSession'],
    });
    expect(s.lake.mySession).toBeNull();
    expect(s.lake.lastSessionEnd?.reason).toBe('expired');
  });

  it('event kết thúc của ghế khác không xóa phiên hiện tại', () => {
    let s = reduce(joined(), { type: 'MySeatSession', payload: session });
    s = reduce(s, {
      type: 'MySeatSession',
      payload: { seatId: 'seat-01', ended: true, reason: 'expired' },
    });
    expect(s.lake.mySession?.seatId).toBe('seat-11');
  });

  it('người chơi: vào, di chuyển, đổi skin, rời', () => {
    const p = snapshot.players[0]!;
    let s = reduce(initialState, { type: 'PlayerJoined', payload: p });
    s = reduce(s, {
      type: 'PlayerMoved',
      payload: { playerId: p.playerId, x: 1, y: 2, dir: 'left', seq: 9 },
    });
    expect(s.lake.players[p.playerId]).toMatchObject({ x: 1, y: 2, dir: 'left' });
    s = reduce(s, { type: 'SkinChanged', payload: { playerId: p.playerId, skinId: 'skin_09' } });
    expect(s.lake.players[p.playerId]?.skinId).toBe('skin_09');
    s = reduce(s, { type: 'PlayerLeft', payload: { playerId: p.playerId } });
    expect(s.lake.players[p.playerId]).toBeUndefined();
  });

  it('event cho người chơi không có trong phòng được bỏ qua', () => {
    const s = reduce(initialState, {
      type: 'PlayerMoved',
      payload: { playerId: 'x', x: 1, y: 1, dir: 'up', seq: 1 },
    });
    expect(s).toBe(initialState);
  });

  it('CatchShown, PositionCorrected, Emoji', () => {
    let s = reduce(initialState, {
      type: 'CatchShown',
      payload: hub.CatchShown as HubEvents['CatchShown'],
    });
    expect(s.lake.catches['11111111-1111-4111-8111-111111111111']?.speciesId).toBe('perch');
    s = reduce(s, { type: 'PositionCorrected', payload: { x: 5, y: 6, seq: 7 } });
    expect(s.lake.correction).toEqual({ x: 5, y: 6, seq: 7 });
    s = reduce(s, { type: 'EmojiReceived', payload: { playerId: 'p', emojiId: 'smile' } });
    expect(s.lake.emojis.p).toBe('smile');
  });

  it('log chat bị giới hạn', () => {
    let s = initialState;
    for (let i = 0; i < CHAT_LOG_LIMIT + 5; i += 1) {
      s = reduce(s, {
        type: 'ChatReceived',
        payload: { messageId: `${i}`, playerId: 'p', text: 'x' },
      });
    }
    expect(s.lake.chat).toHaveLength(CHAT_LOG_LIMIT);
    expect(s.lake.chat[0]?.messageId).toBe('5');
  });

  it('Gold luôn lấy đúng giá trị Server gửi', () => {
    let s = reduce(initialState, { type: 'session/profile', payload: profile });
    expect(s.session.gold).toBe('100');
    s = reduce(s, { type: 'session/gold', payload: '20' });
    expect(s.session.gold).toBe('20');
    expect(s.session.profile?.gold).toBe('20');
    const inventory = samples.http['GET /api/v1/me/inventory 200'].data as InventoryResponse;
    s = reduce(s, { type: 'inventory/set', payload: inventory });
    expect(s.session.gold).toBe('55');
  });
});

describe('Store', () => {
  it('select chỉ báo khi phần được chọn đổi', () => {
    const store = new Store();
    const gold = vi.fn();
    store.select((s) => s.session.gold, gold);
    store.dispatch({ type: 'catalog/set', payload: {} as never });
    expect(gold).not.toHaveBeenCalled();
    store.dispatch({ type: 'session/gold', payload: '5' });
    expect(gold).toHaveBeenCalledExactlyOnceWith('5');
  });

  it('bindHubToStore đưa event vào store và tính lệch giờ', () => {
    const handlers = new Map<string, HubHandler>();
    const connection: HubConnectionLike = {
      start: async () => {},
      stop: async () => {},
      invoke: async () => undefined as never,
      on: (event, handler) => void handlers.set(event, handler),
      onreconnecting: () => {},
      onreconnected: () => {},
      onclose: () => {},
    };
    const store = new Store();
    const unbind = bindHubToStore(
      new GameHub(connection),
      store,
      () => Date.parse(snapshot.serverTime) - 250,
    );
    handlers.get('LakeSnapshot')?.(snapshot);
    expect(store.getState().lake.serverTimeOffsetMs).toBe(250);
    handlers.get('SeatChanged')?.(seatChanged);
    expect(store.getState().lake.seats['seat-11']?.state).toBe('occupied');
    unbind();
    handlers.get('SeatChanged')?.({ ...seatChanged, state: 'available' });
    expect(store.getState().lake.seats['seat-11']?.state).toBe('occupied');
  });
});
