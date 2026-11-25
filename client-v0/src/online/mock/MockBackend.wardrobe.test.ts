// Tab Trang phục ở mock pier.html: 355 món (40 mũ, 165 áo, 86 quần, 64 nguyên bộ), 300 Gold, mua rồi mới mặc được (cùng luật Server Modules/Wardrobe).
import { describe, expect, it } from 'vitest';
import configJson from '@fixtures/gameplay-config.v0.json';
import mapJson from '@fixtures/lake-map.placeholder.json';
import type { GameplayConfig } from '../core/gameplayConfig';
import { ApiClient, ApiError } from '../net/ApiClient';
import type {
  BuyWardrobeResponse,
  LoginResponse,
  OutfitView,
  PlayerProfile,
  SkinsResponse,
  WardrobeResponse,
} from '../net/contract';
import { GameHub } from '../net/GameHub';
import { EVENT_GUARDS } from '../net/contractGuards';
import type { LakeMap } from '../scenes/lake/walkable';
import { MockBackend } from './MockBackend';

const config = configJson as unknown as GameplayConfig;
const map = mapJson as LakeMap;

async function rig(gold = 1000) {
  const mock = new MockBackend({
    config: { ...config, newPlayer: { ...config.newPlayer, gold } },
    map,
    seed: 5,
    startMs: Date.parse('2026-11-25T03:00:00Z'),
  });
  const api = new ApiClient({ baseUrl: 'http://mock.local', fetchImpl: mock.fetch, sleep: () => Promise.resolve() });
  const login = await api.post<LoginResponse>('/auth/login', { firebaseIdToken: 'x' });
  api.setAccessToken(login.accessToken);
  return { mock, api, goldAfterLogin: login.player.gold };
}

const code = async (promise: Promise<unknown>): Promise<string | undefined> =>
  promise.then(
    () => undefined,
    (error: unknown) => (error instanceof ApiError ? error.code : String(error)),
  );

describe('MockBackend trang phục', () => {
  it('danh mục 355 món 300 Gold, chưa có món nào, chưa mặc gì', async () => {
    const { api } = await rig();
    const list = await api.get<WardrobeResponse>('/wardrobe');
    expect(list.items).toHaveLength(355);
    expect(list.items.filter((i) => i.slot === 'hat')).toHaveLength(40);
    expect(list.items.filter((i) => i.slot === 'top')).toHaveLength(165);
    expect(list.items.filter((i) => i.slot === 'legs')).toHaveLength(86);
    expect(list.items.filter((i) => i.slot === 'set')).toHaveLength(64);
    expect(list.items.every((i) => i.priceGold === 300 && !i.owned)).toBe(true);
    expect(list.equipped).toEqual({ hatId: null, topId: null, legsId: null, setId: null });
  });

  it('mua trừ 300 Gold, mua lại báo đã có, thiếu Gold thì báo không đủ', async () => {
    const { api } = await rig(700);
    const bought = await api.post<BuyWardrobeResponse>('/wardrobe/buy', { itemId: 'hat_cap' });
    expect(bought.gold).toBe('400');
    expect(bought.item.owned).toBe(true);
    expect(await code(api.post('/wardrobe/buy', { itemId: 'hat_cap' }))).toBe('WARDROBE_ALREADY_OWNED');
    await api.post('/wardrobe/buy', { itemId: 'top_hoodie' });
    expect(await code(api.post('/wardrobe/buy', { itemId: 'legs_cargo-pants' }))).toBe('INSUFFICIENT_GOLD');
    expect(await code(api.post('/wardrobe/buy', { itemId: 'hat_khong-co' }))).toBe('VALIDATION_FAILED');
  });

  it('chỉ mặc được món đã mua và đúng loại; cởi bằng null; cả hồ nhận OutfitChanged', async () => {
    const { mock, api } = await rig();
    const hub = new GameHub(mock.createConnection(), () => 'req-1');
    const events: unknown[] = [];
    hub.on('OutfitChanged', (payload) => events.push(payload));
    await hub.start();
    await hub.joinLake();
    expect(await code(api.put('/me/outfit', { hatId: 'hat_cap', topId: null, legsId: null }))).toBe(
      'WARDROBE_NOT_OWNED',
    );
    await api.post('/wardrobe/buy', { itemId: 'hat_cap' });
    // Đặt mũ vào chỗ áo là sai loại.
    expect(await code(api.put('/me/outfit', { hatId: null, topId: 'hat_cap', legsId: null }))).toBe(
      'VALIDATION_FAILED',
    );
    const worn = await api.put<OutfitView>('/me/outfit', { hatId: 'hat_cap', topId: null, legsId: null });
    expect(worn.hatId).toBe('hat_cap');
    expect((await api.get<WardrobeResponse>('/wardrobe')).equipped.hatId).toBe('hat_cap');
    const bare = await api.put<OutfitView>('/me/outfit', { hatId: null, topId: null, legsId: null });
    expect(bare).toEqual({ hatId: null, topId: null, legsId: null, setId: null });
    expect(events).toHaveLength(2);
    // Event phát ra phải khớp guard của contract.
    expect(events.every((event) => EVENT_GUARDS.OutfitChanged(event))).toBe(true);
  });
});

describe('MockBackend nguyên bộ', () => {
  it('nguyên bộ thay cả áo và quần: không mặc cùng áo/quần lẻ, mặc kèm mũ thì được', async () => {
    const { api } = await rig(2000);
    for (const itemId of ['set_santa-outfit', 'top_hoodie', 'hat_cap']) await api.post('/wardrobe/buy', { itemId });
    expect(await code(api.put('/me/outfit', { setId: 'set_santa-outfit', topId: 'top_hoodie' }))).toBe('VALIDATION_FAILED');
    expect(await code(api.put('/me/outfit', { topId: 'set_santa-outfit' }))).toBe('VALIDATION_FAILED');
    const worn = await api.put<OutfitView>('/me/outfit', { setId: 'set_santa-outfit', hatId: 'hat_cap' });
    expect(worn).toMatchObject({ setId: 'set_santa-outfit', hatId: 'hat_cap', topId: null, legsId: null });
  });
});

describe('MockBackend nhân vật đã chọn', () => {
  it('mới vào chưa chọn; chọn skin (kể cả giữ skin mặc định) thì ghi nhận đã chọn', async () => {
    const { api } = await rig();
    expect((await api.get<PlayerProfile>('/me')).characterChosen).toBe(false);
    await api.put('/me/skin', { skinId: 'skin_bot_cat_black' });
    const me = await api.get<PlayerProfile>('/me');
    expect(me.characterChosen).toBe(true);
    expect(me.selectedSkinId).toBe('skin_bot_cat_black');
  });

  it('skin bạn thú chọn được miễn phí', async () => {
    const { api } = await rig();
    const list = await api.get<SkinsResponse>('/skins');
    const animals = list.skins.filter((skin) => skin.skinId.startsWith('skin_bot_'));
    expect(animals).toHaveLength(20);
    expect(animals.every((skin) => skin.unlock === 'free' && skin.owned)).toBe(true);
  });
});
