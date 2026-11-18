import { describe, expect, it } from 'vitest';
import type { DirectMessage, FriendEntry } from '../net/contract';
import { currentFriendStatus, friendButtons } from '../ui/friends/friendStatus';
import { conversationRows, totalUnread } from './directModel';
import { fishEmojiId, fishEmojiSlots, fishSpeciesOf } from './fishEmoji';
import { initialState, reduce, type GameState } from '../state/store';

const friend = (playerId: string, online = false): FriendEntry => ({
  playerId,
  displayName: playerId.toUpperCase(),
  skinId: 'skin_01',
  level: 1,
  online,
});

const dm = (id: string, from: string, to: string, sentAt: string, text = id): DirectMessage => ({
  messageId: id,
  fromPlayerId: from,
  toPlayerId: to,
  fromName: from,
  text,
  sentAt,
});

describe('icon cá (BOT-02)', () => {
  it('id fish:<loài> và đọc ngược', () => {
    expect(fishEmojiId('koi')).toBe('fish:koi');
    expect(fishSpeciesOf('fish:koi')).toBe('koi');
    expect(fishSpeciesOf('emoji_01')).toBeNull();
    expect(fishSpeciesOf('fish:')).toBeNull();
  });

  it('ô icon cá theo thứ tự catalog, chỉ loài đã câu', () => {
    const order = ['minnow', 'perch', 'carp', 'koi'];
    expect(fishEmojiSlots(null, order)).toEqual([]);
    expect(fishEmojiSlots(['koi', 'minnow', 'nope'], order)).toEqual(['minnow', 'koi']);
  });

  it('câu được loài mới thì ô xuất hiện ngay (store)', () => {
    let state: GameState = reduce(initialState, { type: 'social/caught', payload: ['minnow'] });
    state = reduce(state, {
      type: 'AttemptUpdate',
      payload: {
        attemptId: 'a1',
        phase: 'success',
        reason: null,
        biteDeadlineAt: null,
        minigame: null,
        state: null,
        result: {
          speciesId: 'koi',
          rarity: 'epic',
          lengthTenthCm: 300,
          isNew: true,
          isRecord: false,
          expGained: 10,
          level: 1,
          levelUp: false,
        },
      },
    });
    expect(state.social.caughtSpecies).toEqual(['minnow', 'koi']);
  });
});

describe('tin riêng và bạn bè trong store (BOT-02)', () => {
  const me = 'me';
  const base = reduce(initialState, {
    type: 'session/profile',
    payload: {
      playerId: me,
      displayName: 'Tôi',
      level: 1,
      exp: 0,
      gold: '0',
      selectedSkinId: 'skin_01',
      equippedRodId: 'rod_old',
    },
  });

  it('tin của người khác tăng số chưa xem, tin của mình thì không; trùng messageId bỏ qua', () => {
    let state = reduce(base, {
      type: 'DirectMessageReceived',
      payload: dm('m1', 'bob', me, '2026-11-18T01:00:00Z'),
    });
    state = reduce(state, {
      type: 'DirectMessageReceived',
      payload: dm('m1', 'bob', me, '2026-11-18T01:00:00Z'),
    });
    state = reduce(state, {
      type: 'DirectMessageReceived',
      payload: dm('m2', me, 'bob', '2026-11-18T01:00:05Z'),
    });
    expect(state.social.dms.bob?.map((m) => m.messageId)).toEqual(['m1', 'm2']);
    expect(state.social.dmUnread.bob).toBe(1);
    state = reduce(state, { type: 'social/dmRead', payload: 'bob' });
    expect(state.social.dmUnread.bob).toBe(0);
    expect(totalUnread({ a: 2, b: 3 })).toBe(5);
  });

  it('lời mời đến và thành bạn', () => {
    let state = reduce(base, {
      type: 'FriendRequestReceived',
      payload: {
        playerId: 'bob',
        displayName: 'Bob',
        skinId: 'skin_01',
        level: 2,
        sentAt: '2026-11-18T01:00:00Z',
      },
    });
    expect(state.social.incoming).toHaveLength(1);
    state = reduce(state, { type: 'FriendAdded', payload: friend('bob', true) });
    expect(state.social.incoming).toHaveLength(0);
    expect(state.social.friends?.map((f) => f.playerId)).toEqual(['bob']);
  });

  it('danh sách hội thoại: chưa xem trước, rồi tin mới nhất, rồi bạn online', () => {
    const rows = conversationRows({
      friends: [friend('ann'), friend('cat', true), friend('bob')],
      conversations: [
        {
          playerId: 'bob',
          displayName: 'BOB',
          skinId: 'skin_02',
          online: false,
          lastText: 'cũ',
          lastFromPlayerId: 'bob',
          lastAt: '2026-11-18T00:00:00Z',
        },
      ],
      dms: { dan: [dm('x', 'dan', me, '2026-11-18T02:00:00Z', 'mới')] },
      unread: { ann: 1 },
      inLake: (id) => id === 'ann',
    });
    expect(rows.map((r) => r.playerId)).toEqual(['ann', 'dan', 'bob', 'cat']);
    expect(rows[0]!.online).toBe(true);
    expect(rows[1]!.lastText).toBe('mới');
  });

  it('nút kết bạn theo trạng thái, ưu tiên dữ liệu mới trong store', () => {
    const social = { friends: [friend('bob')], incoming: [], outgoing: ['cat'] };
    expect(currentFriendStatus('bob', 'none', social)).toBe('friends');
    expect(currentFriendStatus('cat', 'none', social)).toBe('pending_out');
    expect(currentFriendStatus('dan', 'pending_out', social)).toBe('none');
    expect(currentFriendStatus('dan', 'pending_out', { ...social, friends: null })).toBe(
      'pending_out',
    );
    expect(friendButtons('none').actions[0]!.text).toBe('Kết bạn');
    expect(friendButtons('pending_out').actions[0]).toMatchObject({
      text: 'Đã gửi lời mời',
      disabled: true,
    });
    expect(friendButtons('friends')).toMatchObject({
      label: 'Bạn bè',
      actions: [{ id: 'message', text: 'Nhắn tin' }],
    });
    expect(friendButtons('pending_in').actions.map((a) => a.id)).toEqual(['accept', 'decline']);
  });
});
