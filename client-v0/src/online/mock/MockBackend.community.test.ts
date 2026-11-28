// Cộng đồng Facebook ở mock (2026-11-27): vào nhóm, xác nhận bằng mã, chia sẻ; cùng luật Server Modules/Community.
import { describe, expect, it } from 'vitest';
import configJson from '@fixtures/gameplay-config.v0.json';
import mapJson from '@fixtures/lake-map.placeholder.json';
import type { GameplayConfig } from '../core/gameplayConfig';
import { ApiClient, ApiError } from '../net/ApiClient';
import type { CommunityView, LoginResponse } from '../net/contract';
import type { LakeMap } from '../scenes/lake/walkable';
import { MockBackend } from './MockBackend';

const config = configJson as unknown as GameplayConfig;
const map = mapJson as LakeMap;

async function rig() {
  const mock = new MockBackend({ config, map, seed: 5, startMs: Date.parse('2026-11-27T03:00:00Z') });
  const api = new ApiClient({ baseUrl: 'http://mock.local', fetchImpl: mock.fetch, sleep: () => Promise.resolve() });
  const login = await api.post<LoginResponse>('/auth/login', { firebaseIdToken: 'x' });
  api.setAccessToken(login.accessToken);
  return api;
}

const code = async (promise: Promise<unknown>): Promise<string | undefined> =>
  promise.then(
    () => undefined,
    (error: unknown) => (error instanceof ApiError ? error.code : String(error)),
  );

describe('MockBackend cộng đồng', () => {
  it('trạng thái ban đầu: chưa bấm, chưa xác nhận, chưa chia sẻ', async () => {
    const api = await rig();
    const view = await api.get<CommunityView>('/me/community');
    expect(view).toMatchObject({ joinLinkClicked: false, groupVerified: false, shares: { feed: 0, group: 0 }, groupCodeEnabled: true });
    expect(view.groupUrl).toMatch(/^https:\/\//);
    expect(view.shareUrl).toMatch(/^https:\/\//);
  });

  it('bấm vào nhóm được ghi nhận nhưng chưa tính là đã vào nhóm', async () => {
    const api = await rig();
    const view = await api.post<CommunityView>('/me/community/join-click');
    expect(view.joinLinkClicked).toBe(true);
    expect(view.groupVerified).toBe(false);
  });

  it('mã sai bị từ chối, mã đúng (không phân biệt hoa thường) xác nhận', async () => {
    const api = await rig();
    expect(await code(api.post('/me/community/verify-group', { code: 'sai' }))).toBe('GROUP_CODE_INVALID');
    expect((await api.get<CommunityView>('/me/community')).groupVerified).toBe(false);
    const view = await api.post<CommunityView>('/me/community/verify-group', { code: ' fish2026 ' });
    expect(view.groupVerified).toBe(true);
  });

  it('đếm lượt chia sẻ theo loại và từ chối loại lạ', async () => {
    const api = await rig();
    await api.post('/me/community/share', { kind: 'feed' });
    await api.post('/me/community/share', { kind: 'group' });
    const view = await api.post<CommunityView>('/me/community/share', { kind: 'group' });
    expect(view.shares).toEqual({ feed: 1, group: 2 });
    expect(await code(api.post('/me/community/share', { kind: 'page' }))).toBe('VALIDATION_FAILED');
  });
});
