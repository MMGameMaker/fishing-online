// Kho state chung. Client chỉ phản ánh dữ liệu Server gửi, không tự cộng trừ Gold/EXP/cá.
import type { Catalog, Rarity } from '../core/gameplayConfig';
import {
  isSeatEnded,
  type AttemptView,
  type HubEventName,
  type HubEvents,
  type InventoryResponse,
  type MySeat,
  type MyTicket,
  type PlayerProfile,
  type PlayerView,
  type ProgressResponse,
  type SeatView,
} from '../net/contract';

export const CHAT_LOG_LIMIT = 100;

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

export interface GameState {
  session: { profile: PlayerProfile | null; gold: string | null };
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
  | { type: 'catalog/set'; payload: Catalog };

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
};

export const initialState: GameState = {
  session: { profile: null, gold: null },
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
        correction: null,
      };
    }
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
    case 'SeatChanged':
      return { ...lake, seats: { ...lake.seats, [action.payload.seatId]: action.payload } };
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

/** Reducer thuần cho mọi event ở SPEC mục 4 và phản hồi HTTP. */
export function reduce(state: GameState, action: GameAction): GameState {
  const lake = reduceLake(state.lake, action);
  const next = lake === state.lake ? state : { ...state, lake };

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
