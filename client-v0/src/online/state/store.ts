// Kho state chung. Client chỉ phản ánh dữ liệu Server gửi, không tự cộng trừ Gold/EXP/cá.
import type { Catalog, Rarity } from '../core/gameplayConfig';
import {
  isSeatEnded,
  type AttemptView,
  type DirectMessage,
  type FriendEntry,
  type FriendRequestEntry,
  type FriendsResponse,
  type HubEventName,
  type HubEvents,
  type InventoryResponse,
  type MySeat,
  type MyTicket,
  type PlayerProfile,
  type PlayerView,
  type ProgressResponse,
  type SeatView,
  type TradeEntry,
  type TradesResponse,
} from '../net/contract';

export const CHAT_LOG_LIMIT = 100;
/** Số tin riêng giữ cho mỗi hội thoại. */
export const DM_LOG_LIMIT = 100;

export interface ShownCatch {
  speciesId: string;
  rarity: Rarity;
  shownUntil: string;
}

export interface LakeState {
  mapId: string | null;
  mapVersion: string | null;
  configVersion: string | null;
  /** serverNow − clientNow, cập nhật khi nhận snapshot. */
  serverTimeOffsetMs: number;
  players: Record<string, PlayerView>;
  seats: Record<string, SeatView>;
  myTicket: MyTicket | null;
  mySeat: MySeat | null;
  /** Lý do phiên ghế kết thúc gần nhất, UI dùng để thông báo. */
  lastSeatEnd: { seatId: string; reason: string } | null;
  correction: { x: number; y: number; seq: number } | null;
  catches: Record<string, ShownCatch>;
  /** Icon buồn khi thua minigame (FailShown): playerId → shownUntil. */
  fails: Record<string, string>;
  chat: ChatEntry[];
  emojis: Record<string, string>;
  /** Hồ hết cá: chặn mua vé và chạy thông báo thay thanh khoe cá (2026-11-19). */
  lakeEmpty: boolean;
}

/**
 * Một dòng trong khung chat: tin chữ, hoặc emoji (feedback 2026-11-13: emoji cũng hiện trong khung chat,
 * `text` rỗng). Emoji không có messageId từ Server nên Client tự đặt; thiếu sentAt thì khung chat lấy giờ nhận.
 */
export type ChatEntry = HubEvents['ChatReceived'] & {
  emojiId?: string;
  /** Tin hệ thống khoe cá (CatchAnnounced). */
  announce?: HubEvents['CatchAnnounced'];
};

/** Bạn bè, lời mời, tin riêng và loài đã câu (BOT-02). */
export interface SocialState {
  /** null khi chưa tải GET /friends. */
  friends: FriendEntry[] | null;
  incoming: FriendRequestEntry[];
  outgoing: string[];
  /** Tin riêng theo id người kia, cũ trước mới sau. */
  dms: Record<string, DirectMessage[]>;
  /** Số tin riêng chưa xem theo id người kia. */
  dmUnread: Record<string, number>;
  /** Loài đã câu (Sổ tay cá) để dựng ô icon cá trong bảng Biểu cảm; null khi chưa tải. */
  caughtSpecies: string[] | null;
  /** Đề nghị đổi cá đang chờ (đến/đi); null khi chưa tải GET /trades. */
  trades: TradesResponse | null;
}

export const initialSocial: SocialState = {
  friends: null,
  incoming: [],
  outgoing: [],
  dms: {},
  dmUnread: {},
  caughtSpecies: null,
  trades: null,
};

export interface GameState {
  session: { profile: PlayerProfile | null; gold: string | null };
  social: SocialState;
  lake: LakeState;
  attempt: AttemptView | null;
  inventory: InventoryResponse | null;
  progress: ProgressResponse | null;
  catalog: Catalog | null;
}

type EventAction = { [K in HubEventName]: { type: K; payload: HubEvents[K] } }[HubEventName];

export type GameAction =
  | EventAction
  | { type: 'session/profile'; payload: PlayerProfile | null }
  | { type: 'session/gold'; payload: string }
  | { type: 'lake/serverOffset'; payload: number }
  | { type: 'inventory/set'; payload: InventoryResponse }
  | { type: 'progress/set'; payload: ProgressResponse }
  | { type: 'catalog/set'; payload: Catalog }
  | { type: 'social/friends'; payload: FriendsResponse }
  | { type: 'social/outgoing'; payload: string }
  | { type: 'social/requestHandled'; payload: string }
  | { type: 'social/dmHistory'; payload: { playerId: string; messages: DirectMessage[] } }
  | { type: 'social/dmRead'; payload: string }
  | { type: 'social/caught'; payload: string[] }
  | { type: 'social/trades'; payload: TradesResponse }
  | { type: 'social/tradeOutgoing'; payload: TradeEntry };

export const initialLake: LakeState = {
  mapId: null,
  mapVersion: null,
  configVersion: null,
  serverTimeOffsetMs: 0,
  players: {},
  seats: {},
  myTicket: null,
  mySeat: null,
  lastSeatEnd: null,
  correction: null,
  catches: {},
  fails: {},
  chat: [],
  emojis: {},
  lakeEmpty: false,
};

export const initialState: GameState = {
  session: { profile: null, gold: null },
  social: initialSocial,
  lake: initialLake,
  attempt: null,
  inventory: null,
  progress: null,
  catalog: null,
};

function keyBy<T>(items: T[], key: (item: T) => string): Record<string, T> {
  return Object.fromEntries(items.map((item) => [key(item), item]));
}

function without<T>(record: Record<string, T>, key: string): Record<string, T> {
  const copy = { ...record };
  delete copy[key];
  return copy;
}

function reduceLake(lake: LakeState, action: GameAction): LakeState {
  switch (action.type) {
    case 'LakeSnapshot': {
      const s = action.payload;
      return {
        ...lake,
        mapId: s.mapId,
        mapVersion: s.mapVersion,
        configVersion: s.configVersion,
        players: keyBy(s.players, (p) => p.playerId),
        seats: keyBy(s.seats, (seat) => seat.seatId),
        myTicket: s.myTicket,
        mySeat: s.mySeat,
        lakeEmpty: s.lakeEmpty ?? false,
        correction: null,
      };
    }
    case 'LakeStockChanged':
      return { ...lake, lakeEmpty: action.payload.empty };
    case 'PlayerJoined':
      return { ...lake, players: { ...lake.players, [action.payload.playerId]: action.payload } };
    case 'PlayerLeft':
      return {
        ...lake,
        players: without(lake.players, action.payload.playerId),
        catches: without(lake.catches, action.payload.playerId),
        fails: without(lake.fails, action.payload.playerId),
        emojis: without(lake.emojis, action.payload.playerId),
      };
    case 'PlayerMoved': {
      const { playerId, x, y, dir } = action.payload;
      const player = lake.players[playerId];
      if (!player) return lake;
      return { ...lake, players: { ...lake.players, [playerId]: { ...player, x, y, dir } } };
    }
    case 'PositionCorrected':
      return { ...lake, correction: action.payload };
    case 'SeatChanged': {
      // Cập nhật luôn ghế của người chơi trong hồ để nhân vật người khác ngồi/đứng dậy đúng lúc
      // (trước đây chỉ biết ghế lúc vào hồ). Người rời ghế này thì xoá seatId của họ.
      const { seatId, occupantPlayerId } = action.payload;
      const players = { ...lake.players };
      for (const player of Object.values(players)) {
        const sits = player.playerId === occupantPlayerId;
        if (sits && player.seatId !== seatId) players[player.playerId] = { ...player, seatId };
        if (!sits && player.seatId === seatId)
          players[player.playerId] = { ...player, seatId: null };
      }
      return { ...lake, players, seats: { ...lake.seats, [seatId]: action.payload } };
    }
    case 'MyTicket':
      return { ...lake, myTicket: action.payload };
    case 'MySeat': {
      const payload = action.payload;
      if (isSeatEnded(payload)) {
        // Event kết thúc của phiên cũ đến muộn không được xóa phiên mới.
        if (lake.mySeat && lake.mySeat.seatId !== payload.seatId) return lake;
        return {
          ...lake,
          mySeat: null,
          lastSeatEnd: { seatId: payload.seatId, reason: payload.reason },
        };
      }
      return { ...lake, mySeat: payload, lastSeatEnd: null };
    }
    case 'CatchShown': {
      const { playerId, speciesId, rarity, shownUntil } = action.payload;
      return {
        ...lake,
        catches: { ...lake.catches, [playerId]: { speciesId, rarity, shownUntil } },
      };
    }
    case 'FailShown':
      return {
        ...lake,
        fails: { ...lake.fails, [action.payload.playerId]: action.payload.shownUntil },
      };
    case 'SkinChanged': {
      const player = lake.players[action.payload.playerId];
      if (!player) return lake;
      return {
        ...lake,
        players: {
          ...lake.players,
          [player.playerId]: { ...player, skinId: action.payload.skinId },
        },
      };
    }
    case 'RodChanged': {
      const player = lake.players[action.payload.playerId];
      if (!player) return lake;
      return {
        ...lake,
        players: {
          ...lake.players,
          [player.playerId]: { ...player, rodId: action.payload.rodId },
        },
      };
    }
    case 'ChatReceived':
      return { ...lake, chat: [...lake.chat, action.payload].slice(-CHAT_LOG_LIMIT) };
    case 'CatchAnnounced':
      return {
        ...lake,
        chat: [
          ...lake.chat,
          {
            messageId: `announce:${action.payload.playerId}:${action.payload.announcedAt}`,
            playerId: 'system',
            text: '',
            sentAt: action.payload.announcedAt,
            announce: action.payload,
          },
        ].slice(-CHAT_LOG_LIMIT),
      };
    case 'EmojiReceived':
      return {
        ...lake,
        chat: [
          ...lake.chat,
          {
            messageId: `emoji:${action.payload.playerId}:${lake.chat.length}:${action.payload.emojiId}`,
            playerId: action.payload.playerId,
            text: '',
            emojiId: action.payload.emojiId,
            displayName: lake.players[action.payload.playerId]?.displayName,
          },
        ].slice(-CHAT_LOG_LIMIT),
        emojis: { ...lake.emojis, [action.payload.playerId]: action.payload.emojiId },
      };
    case 'lake/serverOffset':
      return { ...lake, serverTimeOffsetMs: action.payload };
    default:
      return lake;
  }
}

function mergeMessages(list: DirectMessage[], added: DirectMessage[]): DirectMessage[] {
  const seen = new Set(list.map((m) => m.messageId));
  const merged = [...list, ...added.filter((m) => !seen.has(m.messageId))];
  merged.sort((a, b) => Date.parse(a.sentAt) - Date.parse(b.sentAt));
  return merged.slice(-DM_LOG_LIMIT);
}

function reduceSocial(
  social: SocialState,
  action: GameAction,
  myId: string | undefined,
): SocialState {
  switch (action.type) {
    case 'social/friends':
      return {
        ...social,
        friends: action.payload.friends,
        incoming: action.payload.incoming,
        outgoing: action.payload.outgoing,
      };
    case 'social/outgoing':
      return social.outgoing.includes(action.payload)
        ? social
        : { ...social, outgoing: [...social.outgoing, action.payload] };
    case 'social/requestHandled':
      return { ...social, incoming: social.incoming.filter((r) => r.playerId !== action.payload) };
    case 'FriendRequestReceived':
      return {
        ...social,
        incoming: [
          action.payload,
          ...social.incoming.filter((r) => r.playerId !== action.payload.playerId),
        ],
      };
    case 'FriendAdded': {
      const friend = action.payload;
      const friends = [
        ...(social.friends ?? []).filter((f) => f.playerId !== friend.playerId),
        friend,
      ];
      return {
        ...social,
        friends,
        incoming: social.incoming.filter((r) => r.playerId !== friend.playerId),
        outgoing: social.outgoing.filter((id) => id !== friend.playerId),
      };
    }
    case 'FriendRemoved':
      return {
        ...social,
        friends: social.friends?.filter((f) => f.playerId !== action.payload.playerId) ?? null,
      };
    case 'DirectMessageReceived': {
      const message = action.payload;
      const mine = message.fromPlayerId === myId;
      const other = mine ? message.toPlayerId : message.fromPlayerId;
      const before = social.dms[other] ?? [];
      const list = mergeMessages(before, [message]);
      if (list.length === before.length && list.every((m, i) => m === before[i])) return social;
      return {
        ...social,
        dms: { ...social.dms, [other]: list },
        dmUnread: mine
          ? social.dmUnread
          : { ...social.dmUnread, [other]: (social.dmUnread[other] ?? 0) + 1 },
      };
    }
    case 'social/dmHistory': {
      const { playerId, messages } = action.payload;
      return {
        ...social,
        dms: { ...social.dms, [playerId]: mergeMessages(social.dms[playerId] ?? [], messages) },
      };
    }
    case 'social/dmRead':
      if (!social.dmUnread[action.payload]) return social;
      return { ...social, dmUnread: { ...social.dmUnread, [action.payload]: 0 } };
    case 'social/caught':
      return { ...social, caughtSpecies: action.payload };
    case 'social/trades':
      return { ...social, trades: action.payload };
    case 'social/tradeOutgoing': {
      const trades = social.trades ?? { incoming: [], outgoing: [] };
      return {
        ...social,
        trades: {
          ...trades,
          outgoing: [
            action.payload,
            ...trades.outgoing.filter((t) => t.tradeId !== action.payload.tradeId),
          ],
        },
      };
    }
    case 'TradeReceived': {
      const trades = social.trades ?? { incoming: [], outgoing: [] };
      return {
        ...social,
        trades: {
          ...trades,
          incoming: [
            action.payload,
            ...trades.incoming.filter((t) => t.tradeId !== action.payload.tradeId),
          ],
        },
      };
    }
    case 'TradeUpdated': {
      // Mọi trạng thái khác pending (đồng ý/từ chối/rút lại) đều đóng đề nghị.
      const trades = social.trades;
      if (!trades) return social;
      const open = (t: TradeEntry) => t.tradeId !== action.payload.tradeId;
      return {
        ...social,
        trades: { incoming: trades.incoming.filter(open), outgoing: trades.outgoing.filter(open) },
      };
    }
    case 'AttemptUpdate': {
      // Câu được loài mới: ô icon cá hiện ngay trong bảng Biểu cảm, không cần tải lại Sổ tay.
      const speciesId =
        action.payload.phase === 'success' ? action.payload.result?.speciesId : null;
      if (!speciesId || !social.caughtSpecies || social.caughtSpecies.includes(speciesId))
        return social;
      return { ...social, caughtSpecies: [...social.caughtSpecies, speciesId] };
    }
    default:
      return social;
  }
}

/** Reducer thuần cho mọi event ở SPEC mục 4 và phản hồi HTTP. */
export function reduce(state: GameState, action: GameAction): GameState {
  const lake = reduceLake(state.lake, action);
  const social = reduceSocial(state.social, action, state.session.profile?.playerId);
  const next = lake === state.lake && social === state.social ? state : { ...state, lake, social };

  switch (action.type) {
    case 'LakeSnapshot':
      return { ...next, attempt: action.payload.myAttempt };
    case 'AttemptUpdate':
      return { ...next, attempt: action.payload };
    case 'RodChanged': {
      // Cần của mình: cập nhật hồ sơ và túi đồ để mọi chỗ hiển thị cùng cần.
      const profile = next.session.profile;
      if (!profile || profile.playerId !== action.payload.playerId) return next;
      return {
        ...next,
        session: { ...next.session, profile: { ...profile, equippedRodId: action.payload.rodId } },
        inventory: next.inventory
          ? { ...next.inventory, equippedRodId: action.payload.rodId }
          : next.inventory,
      };
    }
    case 'session/profile':
      return {
        ...next,
        session: { profile: action.payload, gold: action.payload?.gold ?? null },
      };
    case 'session/gold': {
      const profile = next.session.profile;
      return {
        ...next,
        session: {
          profile: profile ? { ...profile, gold: action.payload } : null,
          gold: action.payload,
        },
        inventory: next.inventory ? { ...next.inventory, gold: action.payload } : null,
      };
    }
    case 'inventory/set':
      return reduce(
        { ...next, inventory: action.payload },
        {
          type: 'session/gold',
          payload: action.payload.gold,
        },
      );
    case 'progress/set':
      return { ...next, progress: action.payload };
    case 'catalog/set':
      return { ...next, catalog: action.payload };
    default:
      return next;
  }
}

export type StoreListener = (state: GameState, previous: GameState) => void;

export class Store {
  private state: GameState;
  private readonly listeners = new Set<StoreListener>();

  constructor(initial: GameState = initialState) {
    this.state = initial;
  }

  getState(): GameState {
    return this.state;
  }

  dispatch(action: GameAction): void {
    const previous = this.state;
    this.state = reduce(previous, action);
    if (this.state === previous) return;
    this.listeners.forEach((listener) => listener(this.state, previous));
  }

  subscribe(listener: StoreListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /** Chỉ gọi listener khi phần được chọn thay đổi (so sánh tham chiếu). */
  select<T>(selector: (state: GameState) => T, listener: (value: T) => void): () => void {
    return this.subscribe((state, previous) => {
      const value = selector(state);
      if (value !== selector(previous)) listener(value);
    });
  }
}
