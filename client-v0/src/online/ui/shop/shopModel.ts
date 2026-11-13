// Logic thuần của cửa hàng (không DOM): gộp cá trong túi, tính tiền khi chọn, chọn catchId để bán.
// Giá cá và giá cần luôn lấy theo catalog của Server; Server tính lại khi bán/mua.
import type { Catalog, Rarity } from '../../core/gameplayConfig';
import type { FishItem } from '../../net/contract';

/** Màu theo độ hiếm cho chữ độ hiếm và nền ô cá (người dùng chốt 2026-11-13). */
export const SHOP_RARITY_COLORS: Record<Rarity, string> = {
  common: '#9a9a9a',
  uncommon: '#4caf50',
  rare: '#3f8fe0',
  epic: '#a35fe0',
  legendary: '#f2c23a',
};

const RARITY_ORDER: Rarity[] = ['legendary', 'epic', 'rare', 'uncommon', 'common'];

/** Một ô cá: các con cùng loài, cùng tên và cùng kích thước. */
export interface FishGroup {
  key: string;
  speciesId: string;
  name: string;
  rarity: Rarity;
  lengthTenthCm: number;
  catchIds: string[];
  /** Giá bán một con theo Server. */
  unitGold: number;
}

export function groupFish(fish: readonly FishItem[], catalog: Catalog | null): FishGroup[] {
  const groups = new Map<string, FishGroup>();
  for (const item of fish) {
    const key = `${item.speciesId}:${item.lengthTenthCm}`;
    let group = groups.get(key);
    if (!group) {
      const config = catalog?.fish.find((f) => f.speciesId === item.speciesId);
      group = {
        key,
        speciesId: item.speciesId,
        name: config?.name ?? item.speciesId,
        rarity: config?.rarity ?? 'common',
        lengthTenthCm: item.lengthTenthCm,
        catchIds: [],
        unitGold: config?.sellGold ?? 0,
      };
      groups.set(key, group);
    }
    group.catchIds.push(item.catchId);
  }
  // Hiếm trước, rồi theo tên, cá to trước.
  return [...groups.values()].sort(
    (a, b) =>
      RARITY_ORDER.indexOf(a.rarity) - RARITY_ORDER.indexOf(b.rarity) ||
      a.name.localeCompare(b.name) ||
      b.lengthTenthCm - a.lengthTenthCm,
  );
}

/** Chế độ chọn nhiều: chọn một ô là chọn cả các con trong ô (người dùng chốt 2026-11-13). */
export function selectionSummary(
  groups: readonly FishGroup[],
  selected: ReadonlySet<string>,
): { count: number; gold: number; catchIds: string[] } {
  let count = 0;
  let gold = 0;
  const catchIds: string[] = [];
  for (const group of groups) {
    if (!selected.has(group.key)) continue;
    count += group.catchIds.length;
    gold += group.catchIds.length * group.unitGold;
    catchIds.push(...group.catchIds);
  }
  return { count, gold, catchIds };
}

/** Bán n con trong một ô (popup chi tiết): lấy n catchId đầu, n kẹp trong 1..số con. */
export function catchIdsToSell(group: FishGroup, quantity: number): string[] {
  const n = Math.max(1, Math.min(group.catchIds.length, Math.round(quantity)));
  return group.catchIds.slice(0, n);
}

/** Server nhận tối đa 200 catchId mỗi lần bán. */
export const MAX_SELL_IDS = 200;

export function chunkIds(ids: readonly string[], size = MAX_SELL_IDS): string[][] {
  const out: string[][] = [];
  for (let i = 0; i < ids.length; i += size) out.push(ids.slice(i, i + size));
  return out;
}

export interface RodOffer {
  rodId: string;
  name: string;
  /** Không có offer (cần mặc định) thì null. */
  offerId: string | null;
  priceGold: number;
  owned: boolean;
}

/** 5 ô cần theo thứ tự catalog (rẻ → đắt); cần đã có thì "Đã có", không mua được. */
export function rodOffers(catalog: Catalog | null, ownedRods: readonly string[]): RodOffer[] {
  if (!catalog) return [];
  return catalog.rods.map((rod) => {
    const offer = catalog.shopOffers.find((o) => o.itemId === rod.rodId);
    return {
      rodId: rod.rodId,
      name: rod.name,
      offerId: offer?.offerId ?? null,
      priceGold: offer?.priceGold ?? rod.priceGold ?? 0,
      owned: ownedRods.includes(rod.rodId) || (rod.isDefault && !offer),
    };
  });
}
