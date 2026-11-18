// Mock pier.html (BOT-02): bot theo mốc vào dần, chỉ bot được câu mới ngồi ghế, chat world, kết bạn, tin riêng,
// hồ sơ công khai và icon cá, cùng contract Server.
import { describe, expect, it } from 'vitest';
import configJson from '@fixtures/gameplay-config.v0.json';
import mapJson from '@fixtures/lake-map.placeholder.json';
import type { GameplayConfig } from '../core/gameplayConfig';
import { ApiClient, ApiError } from '../net/ApiClient';
import type { FriendsResponse, HubEventName, LoginResponse, PublicProfile } from '../net/contract';
import { EVENT_GUARDS } from '../net/contractGuards';
import { GameHub } from '../net/GameHub';
import type { LakeMap } from '../scenes/lake/walkable';
import { bindHubToStore } from '../state/bindHub';
import { Store } from '../state/store';
import { BOT_CONTENT, GENERAL_LINES, WAITING_LINES, FIGHTING_LINES } from './botSocial';
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
  const bad: string[] = [];
  const events: { name: string; payload: unknown }[] = [];
  for (const name of Object.keys(EVENT_GUARDS) as HubEventName[]) {
    hub.on(name, (payload) => {
      events.push({ name, payload });
      if (!(EVENT_GUARDS[name] as (v: unknown) => boolean)(payload))
        bad.push(`${name}: ${JSON.stringify(payload)}`);
    });
  }
  const login = await api.post<LoginResponse>('/auth/login', { firebaseIdToken: 'x' });
  api.setAccessToken(login.accessToken);
  store.dispatch({ type: 'session/profile', payload: login.player });
  await hub.start();
  await hub.joinLake();
  return { mock, api, hub, store, bad, events };
}

const botsIn = (store: Store) =>
  Object.keys(store.getState().lake.players).filter((id) => id.startsWith('bot-'));

describe('MockBackend pier (BOT-02)', () => {
  it('bot vào dần tới 30 (user thật = 1), tên trong danh sách 50, chỉ tối đa 20 bot giữ ghế', async () => {
    const rig = await setup();
    expect(botsIn(rig.store)).toHaveLength(0);
    rig.mock.advance(1100);
    expect(botsIn(rig.store)).toHaveLength(1);
    rig.mock.advance(1500);
    expect(botsIn(rig.store).length).toBeLessThanOrEqual(1);
    let maxSeated = 0;
    for (let i = 0; i < 300; i++) {
      rig.mock.advance(1000);
      const seated = Object.values(rig.store.getState().lake.seats).filter((s) =>
        s.occupantPlayerId?.startsWith('bot-'),
      ).length;
      maxSeated = Math.max(maxSeated, seated);
    }
    const bots = botsIn(rig.store);
    expect(bots).toHaveLength(30);
    for (const id of bots)
      expect(BOT_CONTENT.names).toContain(rig.store.getState().lake.players[id]!.displayName);
    // Map thử có 20 ghế: luôn chừa một ghế trống cho người chơi đang đứng.
    expect(maxSeated).toBeGreaterThan(0);
    expect(maxSeated).toBeLessThanOrEqual(19);
    expect(rig.bad).toEqual([]);
  });

  it('bot chat world theo trạng thái, cả hồ 20–40 giây một câu', async () => {
    const rig = await setup();
    rig.mock.advance(20_000);
    const before = rig.store.getState().lake.chat.length;
    rig.mock.advance(120_000);
    const lines = rig.store
      .getState()
      .lake.chat.slice(before)
      .filter((m) => m.playerId.startsWith('bot-') && !m.emojiId);
    expect(lines.length).toBeGreaterThanOrEqual(2);
    const all = new Set([
      ...GENERAL_LINES,
      ...WAITING_LINES,
      ...FIGHTING_LINES,
      ...BOT_CONTENT.successChat,
    ]);
    for (const line of lines) expect(all.has(line.text)).toBe(true);
    expect(rig.bad).toEqual([]);
  });

  it('kết bạn, tin riêng, hồ sơ công khai', async () => {
    const rig = await setup();
    rig.mock.advance(1100);
    const botId = botsIn(rig.store)[0]!;
    const bot = rig.store.getState().lake.players[botId]!;

    // Chưa là bạn: không nhắn được.
    const denied = await rig.hub.invoke('SendDirectMessage', { toPlayerId: botId, text: 'Chào' });
    expect(denied.error?.code).toBe('NOT_FRIENDS');

    const profile = await rig.api.get<PublicProfile>(`/players/${botId}/profile`);
    expect(profile.displayName).toBe(bot.displayName);
    expect(BOT_CONTENT.normalChat).toContain(profile.bio);
    expect(profile.friendStatus).toBe('none');
    expect(JSON.stringify(profile).toLowerCase()).not.toContain('isbot');

    // Mời bot: bot tự đồng ý sau 2–5 giây.
    expect(
      (await rig.api.post<{ status: string }>('/friends/requests', { playerId: botId })).status,
    ).toBe('sent');
    expect((await rig.api.get<PublicProfile>(`/players/${botId}/profile`)).friendStatus).toBe(
      'pending_out',
    );
    rig.mock.advance(5100);
    expect(rig.store.getState().social.friends?.map((f) => f.playerId)).toContain(botId);
    const list = await rig.api.get<FriendsResponse>('/friends');
    expect(list.friends.map((f) => f.playerId)).toContain(botId);

    // Nhắn riêng: bot trả lời 2–6 giây sau bằng câu "Chat bình thường".
    const sent = await rig.hub.invoke('SendDirectMessage', { toPlayerId: botId, text: 'Chào bạn' });
    expect(sent.ok).toBe(true);
    rig.mock.advance(6100);
    const thread = rig.store.getState().social.dms[botId] ?? [];
    expect(thread.map((m) => m.fromPlayerId)).toEqual([
      '11111111-1111-4111-8111-111111111111',
      botId,
    ]);
    expect(BOT_CONTENT.normalChat).toContain(thread[1]!.text);
    expect(rig.store.getState().social.dmUnread[botId]).toBe(1);
    const history = await rig.api.get<{ messages: unknown[] }>(`/me/dm/${botId}`);
    expect(history.messages).toHaveLength(2);
    const conversations = await rig.api.get<{ conversations: { playerId: string }[] }>('/me/dm');
    expect(conversations.conversations[0]!.playerId).toBe(botId);

    await expect(rig.api.get('/players/nope/profile')).rejects.toBeInstanceOf(ApiError);
    expect(rig.bad).toEqual([]);
  });

  it('bot mời kết bạn khi đi gần (mỗi bot một lần), người chơi đồng ý/từ chối', async () => {
    const rig = await setup();
    rig.mock.advance(1100);
    const botId = botsIn(rig.store)[0]!;
    const bot = rig.store.getState().lake.players[botId]!;
    await rig.hub.invoke('Move', { seq: 1, x: bot.x, y: bot.y, dir: 'down' });
    expect(rig.mock.social.inviteNearbyOnce()).toBe(botId);
    expect(rig.mock.social.inviteNearbyOnce()).toBeNull();
    expect(rig.store.getState().social.incoming.map((r) => r.playerId)).toEqual([botId]);
    await rig.api.post(`/friends/requests/${botId}/decline`);
    expect(rig.mock.social.inviteNearbyOnce()).toBeNull();
    await expect(rig.api.post(`/friends/requests/${botId}/accept`)).rejects.toMatchObject({
      code: 'STATE_CONFLICT',
    });
  });

  it('icon cá chỉ gửi được khi đã câu loài đó', async () => {
    const rig = await setup();
    const denied = await rig.hub.invoke('SendEmoji', { emojiId: 'fish:koi' });
    expect(denied.error?.code).toBe('VALIDATION_FAILED');
    expect((await rig.hub.invoke('SendEmoji', { emojiId: 'emoji_16' })).ok).toBe(true);
    expect((await rig.hub.invoke('SendEmoji', { emojiId: 'emoji_17' })).ok).toBe(false);
  });
});
