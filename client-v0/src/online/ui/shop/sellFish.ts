// Bán cá lên Server dùng chung cho cửa hàng và Túi đồ: chọn hết cả túi thì gửi `all`, còn lại gửi theo lô 200.
import type { Services } from '../../core/services';
import type { SellFishResponse } from '../../net/contract';
import { showError, showToast } from '../kit/components';
import { formatGold } from '../kit/format';
import { chunkIds } from './shopModel';

/** Trả true khi bán xong (đã cập nhật Gold trong store, đã báo toast); lỗi thì báo lỗi và trả false. */
export async function sellFish(
  services: Services,
  root: HTMLElement,
  catchIds: string[],
  all: boolean,
): Promise<boolean> {
  if (catchIds.length === 0) return false;
  const { api, store } = services;
  let sold = 0;
  let earned = 0;
  try {
    const batches = all ? [null] : chunkIds(catchIds);
    for (const ids of batches) {
      const result = await api.post<SellFishResponse>(
        '/shop/sell-fish',
        ids ? { catchIds: ids } : { all: true },
      );
      sold += result.soldCount;
      earned += Number(result.goldEarned);
      store.dispatch({ type: 'session/gold', payload: result.gold });
    }
    showToast(root, `Đã bán ${sold} cá, nhận ${formatGold(String(earned))} Gold.`);
    return true;
  } catch (error) {
    showError(root, error);
    return false;
  }
}
