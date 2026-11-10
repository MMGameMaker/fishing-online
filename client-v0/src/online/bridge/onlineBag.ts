// Cho túi B của Coral Cove đọc kho cá của Fishing Online (mock hoặc Server thật) thay vì kho cũ.
import type { Catalog, Rarity } from '../core/gameplayConfig';
import type { Services } from '../core/services';
import type {
  FishItem,
  InventoryResponse,
  SellFishRequest,
  SellFishResponse,
} from '../net/contract';

export interface BagRow {
  speciesId: string;
  name: string;
  rarity: Rarity;
  count: number;
  /** Giá bán một con theo catalog của Server. */
  unitGold: number;
  catchIds: string[];
}

export interface BagContents {
  gold: string;
  rows: BagRow[];
}

export interface OnlineBagSource {
  load(): Promise<BagContents>;
  /** Bán hết cá của một loài, hoặc toàn bộ túi khi truyền 'all'. Trả số Gold nhận được. */
  sell(speciesId: string | 'all'): Promise<SellFishResponse>;
}

/** Gom cá theo loài, giữ thứ tự catalog; loài không có trong catalog vẫn hiện để không mất cá. */
export function groupFish(fish: readonly FishItem[], catalog: Catalog | null): BagRow[] {
  const bySpecies = new Map<string, FishItem[]>();
  for (const item of fish) {
    const list = bySpecies.get(item.speciesId) ?? [];
    list.push(item);
    bySpecies.set(item.speciesId, list);
  }
  const order = catalog?.fish.map((entry) => entry.speciesId) ?? [];
  const species = [...bySpecies.keys()].sort((a, b) => rank(order, a) - rank(order, b));
  return species.map((speciesId) => {
    const config = catalog?.fish.find((entry) => entry.speciesId === speciesId);
    const items = bySpecies.get(speciesId) ?? [];
    return {
      speciesId,
      name: config?.name ?? speciesId,
      rarity: config?.rarity ?? 'common',
      count: items.length,
      unitGold: config?.sellGold ?? 0,
      catchIds: items.map((item) => item.catchId),
    };
  });
}

function rank(order: readonly string[], speciesId: string): number {
  const index = order.indexOf(speciesId);
  return index === -1 ? order.length : index;
}

export function createOnlineBagSource(services: Pick<Services, 'api' | 'store'>): OnlineBagSource {
  let last: BagRow[] = [];
  return {
    async load() {
      const inventory = await services.api.get<InventoryResponse>('/me/inventory');
      last = groupFish(inventory.fish, services.store.getState().catalog);
      return { gold: inventory.gold, rows: last };
    },
    sell(speciesId) {
      const body: SellFishRequest =
        speciesId === 'all'
          ? { all: true }
          : { catchIds: last.find((row) => row.speciesId === speciesId)?.catchIds ?? [] };
      return services.api.post<SellFishResponse>('/shop/sell-fish', body);
    },
  };
}
