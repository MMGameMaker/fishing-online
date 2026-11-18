// BXH cá ngày ở mock pier.html: cùng luật Server (mỗi người một dòng, top 10, dài nhất / câu sớm nhất, loài hợp lệ).
import { describe, expect, it } from 'vitest';
import configJson from '@fixtures/gameplay-config.v0.json';
import mapJson from '@fixtures/lake-map.placeholder.json';
import type { GameplayConfig } from '../core/gameplayConfig';
import { ApiClient, ApiError } from '../net/ApiClient';
import type { DailyFishRanking, LoginResponse } from '../net/contract';
import type { LakeMap } from '../scenes/lake/walkable';
import { dailyCountdown, dailyLengthText, dailyTimeText } from '../ui/leaderboard/DailyFishPopup';
import { MockBackend } from './MockBackend';

const config = configJson as unknown as GameplayConfig;
const map = mapJson as LakeMap;
// 2026-11-18 10:00 giờ VN = 03:00 UTC.
const T0 = Date.parse('2026-11-18T03:00:00Z');

async function rig() {
  const mock = new MockBackend({ config, map, seed: 3, startMs: T0 });
  const api = new ApiClient({ baseUrl: 'http://mock.local', fetchImpl: mock.fetch, sleep: () => Promise.resolve() });
  const login = await api.post<LoginResponse>('/auth/login', { firebaseIdToken: 'x' });
  api.setAccessToken(login.accessToken);
  return { mock, api };
}

describe('MockBackend BXH cá ngày', () => {
  it('top 10, mỗi người một dòng, sắp theo tiêu chí, reset 0h giờ VN', async () => {
    const { api } = await rig();
    const species = config.fish[0]!.speciesId;
    const length = await api.get<DailyFishRanking>(`/rankings/daily-fish/${species}?metric=length`);
    expect(length.items).toHaveLength(10);
    expect(new Set(length.items.map((i) => i.playerId)).size).toBe(10);
    expect(length.items.map((i) => i.rank)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    const lengths = length.items.map((i) => i.lengthTenthCm);
    expect(lengths).toEqual([...lengths].sort((a, b) => b - a));
    expect(length.me).toBeNull();
    expect(length.periodStartsAt).toBe('2026-11-17T17:00:00.000Z');
    expect(length.periodEndsAt).toBe('2026-11-18T17:00:00.000Z');

    const early = await api.get<DailyFishRanking>(`/rankings/daily-fish/${species}?metric=earliest`);
    const times = early.items.map((i) => Date.parse(i.caughtAt));
    expect(times).toEqual([...times].sort((a, b) => a - b));
    expect(times[0]).toBeGreaterThanOrEqual(Date.parse(length.periodStartsAt));
  });

  it('loài hoặc tiêu chí sai → VALIDATION_FAILED', async () => {
    const { api } = await rig();
    for (const path of ['/rankings/daily-fish/khong-co', `/rankings/daily-fish/${config.fish[0]!.speciesId}?metric=x`]) {
      const error = await api.get(path).catch((e: unknown) => e);
      expect(error).toBeInstanceOf(ApiError);
      expect((error as ApiError).code).toBe('VALIDATION_FAILED');
    }
  });
});

describe('định dạng BXH cá ngày', () => {
  it('chiều dài, giờ VN và đếm ngược', () => {
    expect(dailyLengthText(123)).toBe('12,3cm');
    expect(dailyTimeText('2026-11-17T23:05:00Z')).toBe('06:05');
    expect(dailyTimeText('xx')).toBe('?');
    expect(dailyCountdown('2026-11-18T17:00:00Z', Date.parse('2026-11-18T11:40:00Z'))).toBe('5 giờ 20 phút');
    expect(dailyCountdown(null, 0)).toBe('?');
  });
});
