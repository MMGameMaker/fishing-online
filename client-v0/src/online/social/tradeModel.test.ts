// Reducer đề nghị đổi cá: TradeReceived thêm vào đề nghị đến, TradeUpdated đóng đề nghị (mọi trạng thái).
import { describe, expect, it } from 'vitest';
import type { TradeEntry } from '../net/contract';
import { initialState, reduce } from '../state/store';

const trade = (id: string, from: string, to: string): TradeEntry => ({
  tradeId: id,
  fromPlayerId: from,
  fromName: from,
  toPlayerId: to,
  toName: to,
  status: 'pending',
  createdAt: '2026-11-18T10:00:00Z',
  offer: [{ catchId: `${id}-a`, speciesId: 'perch', lengthTenthCm: 100 }],
  request: [{ catchId: `${id}-b`, speciesId: 'koi', lengthTenthCm: 300 }],
});

describe('store: đổi cá', () => {
  it('TradeReceived và tradeOutgoing thêm đề nghị, không trùng tradeId', () => {
    let state = reduce(initialState, { type: 'TradeReceived', payload: trade('t1', 'bob', 'me') });
    state = reduce(state, { type: 'TradeReceived', payload: trade('t1', 'bob', 'me') });
    state = reduce(state, { type: 'social/tradeOutgoing', payload: trade('t2', 'me', 'bob') });
    expect(state.social.trades?.incoming.map((t) => t.tradeId)).toEqual(['t1']);
    expect(state.social.trades?.outgoing.map((t) => t.tradeId)).toEqual(['t2']);
  });

  it('TradeUpdated đóng đề nghị ở cả hai danh sách', () => {
    let state = reduce(initialState, { type: 'TradeReceived', payload: trade('t1', 'bob', 'me') });
    state = reduce(state, { type: 'social/tradeOutgoing', payload: trade('t2', 'me', 'bob') });
    for (const [id, status] of [
      ['t1', 'accepted'],
      ['t2', 'declined'],
    ] as const) {
      state = reduce(state, {
        type: 'TradeUpdated',
        payload: { tradeId: id, status, fromPlayerId: 'x', toPlayerId: 'y' },
      });
    }
    expect(state.social.trades).toEqual({ incoming: [], outgoing: [] });
  });

  it('TradeUpdated khi chưa tải danh sách thì không làm gì', () => {
    const state = reduce(initialState, {
      type: 'TradeUpdated',
      payload: { tradeId: 't9', status: 'cancelled', fromPlayerId: 'a', toPlayerId: 'b' },
    });
    expect(state.social.trades).toBeNull();
  });
});
