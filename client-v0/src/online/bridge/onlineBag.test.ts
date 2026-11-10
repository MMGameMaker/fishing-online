import { describe, expect, it, vi } from 'vitest';
import type { Catalog } from '../core/gameplayConfig';
import type { Services } from '../core/services';
import { createOnlineBagSource, groupFish } from './onlineBag';

const catalog = {
  fish: [
    { speciesId: 'minnow', name: 'Minnow', rarity: 'common', sellGold: 5 },
    { speciesId: 'koi', name: 'Koi', rarity: 'epic', sellGold: 50 },
  ],
} as unknown as Catalog;

const item = (catchId: string, speciesId: string) => ({
  catchId,
  speciesId,
  lengthTenthCm: 100,
  caughtAt: '2026-11-10T00:00:00Z',
});

describe('groupFish', () => {
  it('groups by species in catalog order with server prices', () => {
    const rows = groupFish([item('c1', 'koi'), item('c2', 'minnow'), item('c3', 'koi')], catalog);

    expect(rows.map((row) => [row.speciesId, row.count, row.unitGold])).toEqual([
      ['minnow', 1, 5],
      ['koi', 2, 50],
    ]);
    expect(rows[1]?.catchIds).toEqual(['c1', 'c3']);
  });

  it('keeps species missing from the catalog so no fish disappears', () => {
    expect(groupFish([item('c1', 'mystery')], catalog)).toMatchObject([
      { speciesId: 'mystery', name: 'mystery', count: 1 },
    ]);
  });
});

describe('createOnlineBagSource', () => {
  it('reads /me/inventory and sells one species by its catch ids', async () => {
    const get = vi
      .fn()
      .mockResolvedValue({ gold: '120', fish: [item('c1', 'koi'), item('c2', 'minnow')] });
    const post = vi.fn().mockResolvedValue({ soldCount: 1, goldEarned: '50', gold: '170' });
    const services = {
      api: { get, post },
      store: { getState: () => ({ catalog }) },
    } as unknown as Pick<Services, 'api' | 'store'>;
    const source = createOnlineBagSource(services);

    const bag = await source.load();
    await source.sell('koi');
    await source.sell('all');

    expect(get).toHaveBeenCalledWith('/me/inventory');
    expect(bag.gold).toBe('120');
    expect(post).toHaveBeenNthCalledWith(1, '/shop/sell-fish', { catchIds: ['c1'] });
    expect(post).toHaveBeenNthCalledWith(2, '/shop/sell-fish', { all: true });
  });
});
