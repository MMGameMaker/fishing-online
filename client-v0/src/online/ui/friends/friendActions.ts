// Gọi API kết bạn (BOT-02) và cập nhật store; dùng chung cho popup người chơi và popup danh sách bạn.
import type { Services } from '../../core/services';
import type { FriendRequestResult, FriendsResponse } from '../../net/contract';

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

export async function declineFriend(services: Services, playerId: string): Promise<void> {
  await services.api.post<FriendRequestResult>(`/friends/requests/${playerId}/decline`);
  services.store.dispatch({ type: 'social/requestHandled', payload: playerId });
}
