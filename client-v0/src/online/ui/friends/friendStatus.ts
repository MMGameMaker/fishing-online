// Logic thuần: trạng thái nút kết bạn trong popup người chơi (BOT-02), ưu tiên dữ liệu mới trong store hơn
// friendStatus lúc tải hồ sơ (vd. vừa nhận FriendAdded hoặc vừa gửi lời mời).
import type { FriendStatus } from '../../net/contract';
import type { SocialState } from '../../state/store';

export function currentFriendStatus(
  playerId: string,
  loaded: FriendStatus,
  social: Pick<SocialState, 'friends' | 'incoming' | 'outgoing'>,
): FriendStatus {
  if (loaded === 'self') return 'self';
  if (social.friends?.some((f) => f.playerId === playerId)) return 'friends';
  if (social.incoming.some((r) => r.playerId === playerId)) return 'pending_in';
  if (social.outgoing.includes(playerId)) return 'pending_out';
  // Store chưa tải danh sách bạn: giữ theo hồ sơ; đã tải mà không thấy thì lời mời đã được trả lời
  // hoặc đã bị xoá bạn (FriendRemoved), dù hồ sơ tải trước đó ghi là bạn.
  if (social.friends === null) return loaded;
  return 'none';
}

export interface FriendButtons {
  /** Chữ trạng thái cạnh nút (vd. "Bạn bè"). */
  label: string | null;
  actions: {
    id: 'request' | 'accept' | 'decline' | 'message' | 'remove';
    text: string;
    primary: boolean;
    disabled?: boolean;
  }[];
}

export function friendButtons(status: FriendStatus): FriendButtons {
  switch (status) {
    case 'friends':
      return {
        label: 'Bạn bè',
        actions: [
          { id: 'message', text: 'Nhắn tin', primary: true },
          { id: 'remove', text: 'Xoá bạn', primary: false },
        ],
      };
    case 'pending_out':
      return {
        label: null,
        actions: [{ id: 'request', text: 'Đã gửi lời mời', primary: false, disabled: true }],
      };
    case 'pending_in':
      return {
        label: 'Muốn kết bạn với bạn',
        actions: [
          { id: 'accept', text: 'Đồng ý', primary: true },
          { id: 'decline', text: 'Từ chối', primary: false },
        ],
      };
    case 'self':
      return { label: null, actions: [] };
    default:
      return { label: null, actions: [{ id: 'request', text: 'Kết bạn', primary: true }] };
  }
}
