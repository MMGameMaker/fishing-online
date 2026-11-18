// Contract HTTP và SignalR theo SPEC_CHUNG v0.3 mục 3, 4, 5.
import type { Catalog, Rarity } from '../core/gameplayConfig';

export const ERROR_CODES = [
  'UNAUTHENTICATED',
  'SESSION_EXPIRED',
  'VALIDATION_FAILED',
  'IDEMPOTENCY_CONFLICT',
  'RATE_LIMITED',
  'SEAT_TAKEN',
  'ALREADY_HAS_SEAT',
  'NO_TICKET',
  'NOT_IN_SEAT',
  'OUT_OF_RANGE',
  'INSUFFICIENT_GOLD',
  'ATTEMPT_ACTIVE',
  'NO_ACTIVE_ATTEMPT',
  'BITE_EXPIRED',
  'RESULT_EXPIRED',
  'ROD_NOT_OWNED',
  'ROD_ALREADY_OWNED',
  'SKIN_NOT_OWNED',
  'SKIN_ALREADY_OWNED',
  'FISH_NOT_FOUND',
  'INVALID_QUANTITY',
  'PRICE_CHANGED',
  'STATE_CONFLICT',
  // BOT-02 (2026-11-18): kết bạn/tin riêng.
  'PLAYER_NOT_FOUND',
  'NOT_FRIENDS',
] as const;

export type ErrorCode = (typeof ERROR_CODES)[number];

/** Lỗi chỉ phát sinh ở Client, không có trong SPEC mục 5. */
export type ClientErrorCode = 'NETWORK_ERROR' | 'TIMEOUT';

export interface ErrorBody {
  code: ErrorCode;
  message: string;
  retryable: boolean;
}

export interface ApiSuccess<T> {
  data: T;
  traceId: string;
}

export interface ApiFailure {
  error: ErrorBody;
  traceId: string;
}

// ---------- HTTP ----------

export interface PlayerProfile {
  playerId: string;
  displayName: string;
  level: number;
  exp: number;
  gold: string;
  selectedSkinId: string;
  equippedRodId: string;
  /** Danh hiệu đang đeo (màn Tài khoản). Dự thảo, chỉ mock có; Server thật chưa hỗ trợ. */
  titleId?: string;
  /** Lời nhắn tối đa 100 ký tự (màn Tài khoản). Dự thảo, chỉ mock có. */
  bio?: string;
}

/** Một thành tựu (GAMEPLAY_SCOPE mục Thành tựu). Dự thảo contract, chỉ mock có. */
export interface AchievementEntry {
  id: string;
  name: string;
  /** Số đếm thật Server đang giữ, vẫn tăng khi chưa nhận thưởng. */
  counter: number;
  /** Mốc cộng dồn của từng level (5 phần tử). */
  thresholds: number[];
  /** Số level đã nhận thưởng (0..5). */
  claimedLevels: number;
  rewardGold: number;
}

export interface AchievementsResponse {
  achievements: AchievementEntry[];
}

export interface ClaimAchievementResponse {
  achievement: AchievementEntry;
  goldAdded: string;
  gold: string;
}

/** Ô cá khoe trên màn Tài khoản: 3 ô, mỗi ô một loài đã câu, hiện con dài nhất. */
export interface ShowcaseSlot {
  slot: number;
  speciesId: string | null;
  lengthTenthCm: number | null;
}

export interface ShowcaseResponse {
  slots: ShowcaseSlot[];
}

/**
 * GET /players/{id}/profile (BOT-02): hồ sơ công khai của người khác, không có Gold/UID/cờ bot.
 * `friendStatus`: quan hệ của người xem với người này.
 */
export type FriendStatus = 'self' | 'friends' | 'pending_out' | 'pending_in' | 'none';

export interface PublicProfile {
  playerId: string;
  displayName: string;
  skinId: string;
  level: number;
  exp: number;
  titleId: string;
  bio: string;
  showcase: ShowcaseSlot[];
  /** Đang có mặt trong hồ. */
  online: boolean;
  friendStatus: FriendStatus;
}

/** Một người bạn trong GET /friends; `online` = đang trong hồ. */
export interface FriendEntry {
  playerId: string;
  displayName: string;
  skinId: string;
  level: number;
  online: boolean;
}

/** Lời mời kết bạn đang chờ mình trả lời (người gửi). */
export interface FriendRequestEntry {
  playerId: string;
  displayName: string;
  skinId: string;
  level: number;
  sentAt: string;
}

export interface FriendsResponse {
  friends: FriendEntry[];
  incoming: FriendRequestEntry[];
  /** Người mình đã mời, đang chờ họ trả lời. */
  outgoing: string[];
}

/** POST /friends/requests: `sent` đã gửi (hoặc đang chờ), `friends` đã là bạn. */
export interface FriendRequestResult {
  status: 'sent' | 'friends' | 'none';
}

/** Tin riêng giữa hai người bạn (event DirectMessageReceived, ack SendDirectMessage, GET /me/dm/{id}). */
export interface DirectMessage {
  messageId: string;
  fromPlayerId: string;
  toPlayerId: string;
  fromName: string;
  text: string;
  sentAt: string;
}

export interface DirectMessagesResponse {
  messages: DirectMessage[];
}

/** Một hội thoại trong tab "Tin riêng" (GET /me/dm). */
export interface Conversation {
  playerId: string;
  displayName: string;
  skinId: string;
  online: boolean;
  lastText: string;
  lastFromPlayerId: string;
  lastAt: string;
}

export interface ConversationsResponse {
  conversations: Conversation[];
}

export interface Stats {
  strength: number;
  normalHitZonePct: number;
  weaknessHitZonePct: number;
  rareLuck: number;
  largeLuck: number;
}

export interface LoginRequest {
  firebaseIdToken: string;
  rememberMe?: boolean;
}

export interface LoginResponse {
  accessToken: string;
  expiresAt: string;
  isNew: boolean;
  player: PlayerProfile;
}

export interface RefreshResponse {
  accessToken: string;
  expiresAt: string;
}

export interface ProgressResponse {
  level: number;
  exp: number;
  expToNext: number;
  stats: Stats;
  breakdown: { level: Stats; rod: Stats };
}

export interface FishItem {
  catchId: string;
  speciesId: string;
  lengthTenthCm: number;
  caughtAt: string;
}

export interface InventoryResponse {
  inventoryVersion: number;
  gold: string;
  equippedRodId: string;
  rods: string[];
  items: { itemId: string; quantity: number }[];
  fish: FishItem[];
  /** Skin bán ở cửa hàng đã mua (skin miễn phí không có ở đây; xem `GET /skins`). */
  skins: string[];
}

/** `free` dùng ngay, `shop` phải mua bằng offer có `itemId` trùng `skinId` trong `Catalog.shopOffers`. */
export type SkinUnlock = 'free' | 'shop';

export interface SkinView {
  skinId: string;
  name: string;
  unlock: SkinUnlock;
  owned: boolean;
}

export interface SkinsResponse {
  skins: SkinView[];
  selectedSkinId: string;
}

export interface SelectSkinResponse {
  selectedSkinId: string;
}

export interface ShopBuyRequest {
  offerId: string;
  quantity: number;
}

export interface ShopBuyResponse {
  gold: string;
  inventory: InventoryResponse;
}

export type SellFishRequest = { catchIds: string[] } | { all: true };

export interface SellFishResponse {
  soldCount: number;
  goldEarned: string;
  gold: string;
}

export interface CodexEntry {
  speciesId: string;
  discovered: boolean;
  totalCaught: number;
  bestLengthTenthCm: number | null;
  firstCaughtAt: string | null;
  /** Con nhỏ nhất từng câu (kể cả đã bán), thêm 2026-11-13 cho Sổ tay cá; Server cũ có thể thiếu. */
  smallestLengthTenthCm?: number | null;
}

export interface CodexResponse {
  species: CodexEntry[];
}

/**
 * GET /rankings/{boardId}?limit&cursor (Server: Modules/Ranking; bảng tuần theo doc/GAMEPLAY_SCOPE.md).
 * Mục `me` luôn có tên; `reward` là Gold (chuỗi) theo bảng thưởng của GD, chỉ để hiển thị.
 */
export interface RankingEntry {
  rank: number | null;
  playerId: string;
  displayName: string;
  value: number | null;
  reward: string | null;
}

export interface RankingResponse {
  boardId: string;
  updatedAt: string;
  /** Mốc kết thúc chu kỳ (bảng tuần), ISO. */
  periodEndsAt: string;
  items: RankingEntry[];
  /** Cursor trang kế; null khi hết (bảng tuần chỉ hiện top 50). */
  nextCursor: string | null;
  /** `value` là điểm hiện tại (cập nhật ngay); `rank`/`reward` theo bản chụp 30 phút, null nếu chưa/không trong top 50. */
  me: RankingEntry;
}

export interface HistoryEntry {
  attemptId: string;
  outcome: AttemptPhase;
  reason: string | null;
  speciesId: string | null;
  lengthTenthCm: number | null;
  endedAt: string;
}

export interface HistoryResponse {
  items: HistoryEntry[];
  nextCursor: string | null;
}

export type { Catalog };

// ---------- SignalR ----------

export type Direction = 'up' | 'down' | 'left' | 'right';
export type SeatState = 'available' | 'occupied';
export type AttemptPhase = 'waiting' | 'bite' | 'minigame' | 'success' | 'failed' | 'cancelled';
export type TapResult = 'normal' | 'weak' | 'miss';
export type FishingOutcome = 'success' | 'failed';

export interface PlayerView {
  playerId: string;
  displayName: string;
  skinId: string;
  rodId: string;
  x: number;
  y: number;
  dir: Direction;
  seatId: string | null;
  fishing: boolean;
  /**
   * Chỗ ngồi chơi đang ngồi (ghế quanh bàn, không câu; yêu cầu 2026-11-18), vd `rest-01`.
   * Server cũ chưa gửi thì bỏ trống = không ngồi.
   */
  restSeatId?: string | null;
  /** Danh hiệu đang đeo, hiện dưới tên (yêu cầu 2026-11-18). Server cũ chưa gửi thì bỏ trống. */
  titleId?: string;
}

export interface SeatView {
  seatId: string;
  state: SeatState;
  occupantPlayerId: string | null;
}

/** Hạn vé của player; vé không gắn với ghế (SPEC 2.2). */
export interface MyTicket {
  expiresAt: string;
  purchasedMinutes: number;
  ticketVersion: number;
  priceVersion: string;
}

export interface MySeat {
  seatId: string;
  sessionId: string;
  sitAt: string;
}

export interface SeatEnded {
  seatId: string;
  ended: true;
  reason: string;
}

export interface MinigameParams {
  seed: number;
  durationMs: number;
  needlePassMs: number;
  greenWidth: number;
  yellowWidth: number;
  shiftMin: number;
  shiftMax: number;
  missPenaltyMs: number;
  fishHp: number;
  atk: number;
  /**
   * Độ hiếm của cá đã cắn câu, chỉ để tô màu icon cá (epic tím, legendary vàng; feedback 2026-11-12).
   * Server cũ chưa gửi thì bỏ trống.
   */
  rarity?: Rarity;
}

export interface AttemptResult {
  speciesId: string;
  rarity: Rarity;
  lengthTenthCm: number;
  isNew: boolean;
  isRecord: boolean;
  expGained: number;
  level: number;
  levelUp: boolean;
}

export interface AttemptView {
  attemptId: string;
  phase: AttemptPhase;
  reason: string | null;
  biteDeadlineAt: string | null;
  minigame: (MinigameParams & { startedAt: string; deadlineAt: string }) | null;
  /** Theo SPEC 0.5 Server không theo dõi HP/thời gian minigame nên luôn null. */
  state: null;
  result: AttemptResult | null;
}

export interface LakeSnapshot {
  mapId: string;
  mapVersion: string;
  configVersion: string;
  serverTime: string;
  players: PlayerView[];
  seats: SeatView[];
  myTicket: MyTicket | null;
  mySeat: MySeat | null;
  myAttempt: AttemptView | null;
}

export interface CommandAck<T> {
  requestId: string;
  ok: boolean;
  error: null | { code: ErrorCode; message: string };
  data: T | null;
}

export interface TicketPurchaseResult {
  ticket: MyTicket;
  gold: string;
  chargedGold: string;
}

export interface SitDownResult {
  seat: MySeat;
}

/** Lệnh hub: tham số (chưa gồm requestId) và kiểu data của ack. */
/** Vị trí ban đầu do Client báo; Server không có map nên không kiểm tra. */
export interface JoinLakeArgs {
  x?: number;
  y?: number;
  dir?: Direction;
}

export interface HubCommands {
  JoinLake: { args: JoinLakeArgs; ack: LakeSnapshot };
  Move: { args: { seq: number; x: number; y: number; dir: Direction }; ack: null };
  BuyTicket: {
    args: { quantity: number; expectedPriceVersion: string };
    ack: TicketPurchaseResult;
  };
  SitDown: { args: { seatId: string }; ack: SitDownResult };
  LeaveSeat: { args: Record<string, never>; ack: null };
  /**
   * Ngồi chơi vào một chỗ (yêu cầu 2026-11-18): Server giữ chỗ, đã có người thì SEAT_TAKEN.
   * Gửi kèm vị trí chỗ ngồi để Server đặt nhân vật vào đó.
   */
  SitRest: { args: { restSeatId: string; x: number; y: number; dir: Direction }; ack: null };
  StandRest: { args: Record<string, never>; ack: null };
  CastLine: { args: Record<string, never>; ack: { attemptId: string } };
  HookFish: { args: { attemptId: string }; ack: null };
  SubmitFishingResult: {
    args: { attemptId: string; outcome: FishingOutcome };
    ack: { attempt: AttemptView };
  };
  SendChat: { args: { text: string }; ack: null };
  /** `emojiId`: emoji_01..16 hoặc `fish:<speciesId>` (loài người gửi đã câu, BOT-02). */
  SendEmoji: { args: { emojiId: string }; ack: null };
  /** Tin riêng cho bạn bè (BOT-02); chưa là bạn thì lỗi NOT_FRIENDS. */
  SendDirectMessage: { args: { toPlayerId: string; text: string }; ack: DirectMessage };
}

export type HubCommandName = keyof HubCommands;

/** Event Server gửi xuống. */
export interface HubEvents {
  LakeSnapshot: LakeSnapshot;
  PlayerJoined: PlayerView;
  PlayerLeft: { playerId: string };
  PlayerMoved: { playerId: string; x: number; y: number; dir: Direction; seq: number };
  PositionCorrected: { x: number; y: number; seq: number };
  SeatChanged: SeatView;
  MyTicket: MyTicket;
  MySeat: MySeat | SeatEnded;
  AttemptUpdate: AttemptView;
  CatchShown: { playerId: string; speciesId: string; rarity: Rarity; shownUntil: string };
  FailShown: { playerId: string; shownUntil: string };
  SkinChanged: { playerId: string; skinId: string };
  /** Đổi cần đang dùng (PUT /me/equipped-rod): cả hồ thấy cần mới ngay. */
  RodChanged: { playerId: string; rodId: string };
  /** Server gửi kèm tên người gửi và thời điểm (ISO); mock cũ có thể thiếu. */
  ChatReceived: {
    messageId: string;
    playerId: string;
    text: string;
    displayName?: string;
    sentAt?: string;
  };
  EmojiReceived: { playerId: string; emojiId: string };
  /**
   * Khoe cá kiểu 1 (doc/GAMEPLAY_SCOPE): thanh "Chúc mừng [tên] là người đầu tiên câu được [cá]" cho mọi người
   * và một tin hệ thống trong khung chat. Hiện chỉ Server bản dev phát qua POST /dev/announce-catch.
   */
  CatchAnnounced: {
    playerId: string;
    displayName: string;
    speciesId: string;
    speciesName: string;
    rarity: Rarity;
    first: boolean;
    announcedAt: string;
  };
  /** Tin riêng, tới cả người gửi và người nhận (mọi tab). */
  DirectMessageReceived: DirectMessage;
  /** Có người mời mình kết bạn. */
  FriendRequestReceived: FriendRequestEntry;
  /** Vừa thành bạn (gửi cho cả hai bên, mô tả người kia). */
  FriendAdded: FriendEntry;
}

export type HubEventName = keyof HubEvents;

export function isSeatEnded(v: HubEvents['MySeat']): v is SeatEnded {
  return 'ended' in v;
}
