import { describe, expect, it } from 'vitest';
import configJson from '@fixtures/gameplay-config.v0.json';
import type { Catalog } from '../../core/gameplayConfig';
import type { FishItem } from '../../net/contract';
import { catchIdsToSell, chunkIds, groupFish, rodOffers, selectionSummary } from './shopModel';

const catalog = configJson as unknown as Catalog;
const fish = (catchId: string, speciesId: string, lengthTenthCm: number): FishItem => ({
  catchId,
  speciesId,
  lengthTenthCm,
  caughtAt: '2026-11-13T00:00:00Z',
});

const bag = [
  fish('a', 'perch', 124),
  fish('b', 'perch', 124),
  fish('c', 'perch', 130),
  fish('d', 'koi', 400),
  fish('e', 'minnow', 90),
];

describe('groupFish', () => {
  it('gộp cùng loài và cùng kích thước, đếm số lượng, giá theo Server', () => {
    const groups = groupFish(bag, catalog);
    const perch124 = groups.find((g) => g.key === 'perch:124');
    expect(perch124?.catchIds).toEqual(['a', 'b']);
    expect(perch124?.unitGold).toBe(5);
    expect(groups.find((g) => g.key === 'perch:130')?.catchIds).toEqual(['c']);
  });

  it('cá hiếm lên trước', () => {
    expect(groupFish(bag, catalog)[0]?.speciesId).toBe('koi');
  });
});

describe('selectionSummary', () => {
  it('chọn ô là chọn cả các con trong ô, cộng đúng tiền', () => {
    const groups = groupFish(bag, catalog);
    const sum = selectionSummary(groups, new Set(['perch:124', 'koi:400']));
    expect(sum.count).toBe(3);
    expect(sum.gold).toBe(2 * 5 + 50);
    expect(sum.catchIds.sort()).toEqual(['a', 'b', 'd']);
  });

  it('bỏ chọn thì trừ tiền', () => {
    const groups = groupFish(bag, catalog);
    expect(selectionSummary(groups, new Set(['koi:400'])).gold).toBe(50);
    expect(selectionSummary(groups, new Set()).gold).toBe(0);
  });
});

describe('catchIdsToSell', () => {
  it('bán đúng số lượng, kẹp trong 1..số con', () => {
    const group = groupFish(bag, catalog).find((g) => g.key === 'perch:124')!;
    expect(catchIdsToSell(group, 1)).toEqual(['a']);
    expect(catchIdsToSell(group, 9)).toEqual(['a', 'b']);
    expect(catchIdsToSell(group, 0)).toEqual(['a']);
  });
});

describe('chunkIds', () => {
  it('chia theo giới hạn 200 của Server', () => {
    const ids = Array.from({ length: 450 }, (_, i) => String(i));
    expect(chunkIds(ids).map((c) => c.length)).toEqual([200, 200, 50]);
  });
});

describe('rodOffers', () => {
  it('5 cần, giá theo Server, cần mặc định và cần đã mua là đã có', () => {
    const offers = rodOffers(catalog, ['rod_old', 'rod_bliss']);
    expect(offers.map((o) => o.rodId)).toEqual([
      'rod_old',
      'rod_steel_awl',
      'rod_high_performer',
      'rod_bliss',
      'rod_giant_caster',
    ]);
    expect(offers.find((o) => o.rodId === 'rod_giant_caster')).toMatchObject({
      priceGold: 2000,
      offerId: 'offer_rod_giant_caster',
      owned: false,
    });
    expect(offers.filter((o) => o.owned).map((o) => o.rodId)).toEqual(['rod_old', 'rod_bliss']);
  });
});
