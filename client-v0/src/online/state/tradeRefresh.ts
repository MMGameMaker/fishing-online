// Đề nghị đổi cá được đồng ý (bởi bạn bè hoặc bởi mình ở máy/tab khác): túi cá đổi, tải lại GET /me/inventory.
import type { ApiClient } from '../net/ApiClient';
import type { GameHub } from '../net/GameHub';
import type { InventoryResponse } from '../net/contract';
import type { Store } from './store';

export function bindTradeRefresh(hub: GameHub, store: Store, api: ApiClient): () => void {
  return hub.on('TradeUpdated', (update) => {
    if (update.status !== 'accepted') return;
    void api
      .get<InventoryResponse>('/me/inventory')
      .then((inventory) => store.dispatch({ type: 'inventory/set', payload: inventory }))
      .catch(() => undefined);
  });
}
