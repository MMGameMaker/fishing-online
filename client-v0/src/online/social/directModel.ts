// Logic thuần của tab "Tin riêng" (BOT-02): danh sách hội thoại theo người, gộp bạn bè và người đã nhắn, số chưa xem.
import type { Conversation, DirectMessage, FriendEntry } from '../net/contract';

export interface ConversationRow {
  playerId: string;
  displayName: string;
  skinId: string;
  online: boolean;
  lastText: string;
  lastAt: number;
  unread: number;
}

export function totalUnread(unread: Record<string, number>): number {
  return Object.values(unread).reduce((sum, count) => sum + Math.max(0, count), 0);
}

/**
 * Mỗi người một dòng: bạn bè (kể cả chưa nhắn) và người đã có tin. Tin mới trong store đè tin cuối của API.
 * Xếp: có tin chưa xem trước, rồi tin mới nhất, rồi bạn đang online, rồi theo tên.
 */
export function conversationRows(input: {
  friends: readonly FriendEntry[];
  conversations: readonly Conversation[];
  dms: Record<string, DirectMessage[]>;
  unread: Record<string, number>;
  inLake: (playerId: string) => boolean;
}): ConversationRow[] {
  const rows = new Map<string, ConversationRow>();
  for (const friend of input.friends) {
    rows.set(friend.playerId, {
      playerId: friend.playerId,
      displayName: friend.displayName,
      skinId: friend.skinId,
      online: friend.online,
      lastText: '',
      lastAt: 0,
      unread: 0,
    });
  }
  for (const conversation of input.conversations) {
    const row = rows.get(conversation.playerId);
    rows.set(conversation.playerId, {
      playerId: conversation.playerId,
      displayName: row?.displayName ?? conversation.displayName,
      skinId: row?.skinId ?? conversation.skinId,
      online: row?.online ?? conversation.online,
      lastText: conversation.lastText,
      lastAt: Date.parse(conversation.lastAt) || 0,
      unread: 0,
    });
  }
  for (const [playerId, messages] of Object.entries(input.dms)) {
    const last = messages[messages.length - 1];
    if (!last) continue;
    const row = rows.get(playerId);
    const at = Date.parse(last.sentAt) || 0;
    if (row && row.lastAt > at) continue;
    rows.set(playerId, {
      playerId,
      displayName:
        row?.displayName ?? (last.fromPlayerId === playerId ? last.fromName : 'Người chơi'),
      skinId: row?.skinId ?? 'skin_01',
      online: row?.online ?? false,
      lastText: last.text,
      lastAt: at,
      unread: 0,
    });
  }
  return [...rows.values()]
    .map((row) => ({
      ...row,
      online: row.online || input.inLake(row.playerId),
      unread: input.unread[row.playerId] ?? 0,
    }))
    .sort(
      (a, b) =>
        Number(b.unread > 0) - Number(a.unread > 0) ||
        b.lastAt - a.lastAt ||
        Number(b.online) - Number(a.online) ||
        a.displayName.localeCompare(b.displayName, 'vi'),
    );
}
