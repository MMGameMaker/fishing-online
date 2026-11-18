// Gọi API kết bạn (BOT-02) và cập nhật store; dùng chung cho popup người chơi và popup danh sách bạn.
import type { Services } from '../../core/services';
import type {
  CreateTradeRequest,
  FriendFishResponse,
  FriendRequestResult,
  FriendsResponse,
  InventoryResponse,
  TradeEntry,
  TradeResult,
  TradesResponse,
} from '../../net/contract';

export async function reloadFriends(services: Services): Promise<FriendsResponse> {
  const friends = await services.api.get<FriendsResponse>('/friends');
  services.store.dispatch({ type: 'social/friends', payload: friends });
  return friends;
}

/** Gửi lời mời; Server trả `friends` khi người kia đã mời mình trước (đồng ý luôn). */
export async function sendFriendRequest(
  services: Services,
  playerId: string,
): Promise<FriendRequestResult['status']> {
  const result = await services.api.post<FriendRequestResult>('/friends/requests', { playerId });
  if (result.status === 'friends') await reloadFriends(services);
  else services.store.dispatch({ type: 'social/outgoing', payload: playerId });
  return result.status;
}

export async function acceptFriend(services: Services, playerId: string): Promise<void> {
  await services.api.post<FriendRequestResult>(`/friends/requests/${playerId}/accept`);
  services.store.dispatch({ type: 'social/requestHandled', payload: playerId });
  await reloadFriends(services);
}

/** Xoá bạn; Server cũng gửi FriendRemoved tới cả hai bên, dispatch ở đây để người bấm thấy ngay. */
export async function removeFriend(services: Services, playerId: string): Promise<void> {
  await services.api.delete<FriendRequestResult>(`/friends/${playerId}`);
  services.store.dispatch({ type: 'FriendRemoved', payload: { playerId } });
}

export async function declineFriend(services: Services, playerId: string): Promise<void> {
  await services.api.post<FriendRequestResult>(`/friends/requests/${playerId}/decline`);
  services.store.dispatch({ type: 'social/requestHandled', payload: playerId });
}

// ---------- Trao đổi cá ----------

export async function reloadTrades(services: Services): Promise<TradesResponse> {
  const trades = await services.api.get<TradesResponse>('/trades');
  services.store.dispatch({ type: 'social/trades', payload: trades });
  return trades;
}

/** Cá chưa bán của một người bạn, để chọn con muốn đổi lấy. */
export async function loadFriendFish(
  services: Services,
  playerId: string,
): Promise<FriendFishResponse> {
  return services.api.get<FriendFishResponse>(`/friends/${playerId}/fish`);
}

export async function reloadInventory(services: Services): Promise<void> {
  const inventory = await services.api.get<InventoryResponse>('/me/inventory');
  services.store.dispatch({ type: 'inventory/set', payload: inventory });
}

/** Gửi đề nghị; cá không bị khoá trong lúc chờ, Server kiểm lại khi người kia đồng ý. */
export async function createTrade(
  services: Services,
  request: CreateTradeRequest,
): Promise<TradeEntry> {
  const trade = await services.api.post<TradeEntry>('/trades', request);
  services.store.dispatch({ type: 'social/tradeOutgoing', payload: trade });
  return trade;
}

/** Người nhận đồng ý: đổi chéo xong thì tải lại túi cá. TradeUpdated cũng tới store qua hub. */
export async function acceptTrade(services: Services, tradeId: string): Promise<void> {
  const result = await services.api.post<TradeResult>(`/trades/${tradeId}/accept`);
  await settleTrade(services, result);
}

export async function declineTrade(services: Services, tradeId: string): Promise<void> {
  await settleTrade(services, await services.api.post<TradeResult>(`/trades/${tradeId}/decline`));
}

/** Người gửi rút lại đề nghị. */
export async function cancelTrade(services: Services, tradeId: string): Promise<void> {
  await settleTrade(services, await services.api.post<TradeResult>(`/trades/${tradeId}/cancel`));
}

async function settleTrade(services: Services, result: TradeResult): Promise<void> {
  // Cập nhật ngay cho người bấm; event TradeUpdated từ Server tới sau là idempotent.
  const { trades } = services.store.getState().social;
  const entry = [...(trades?.incoming ?? []), ...(trades?.outgoing ?? [])].find(
    (t) => t.tradeId === result.tradeId,
  );
  services.store.dispatch({
    type: 'TradeUpdated',
    payload: {
      tradeId: result.tradeId,
      status: result.status,
      fromPlayerId: entry?.fromPlayerId ?? '',
      toPlayerId: entry?.toPlayerId ?? '',
    },
  });
  if (result.status === 'accepted') await reloadInventory(services);
}
