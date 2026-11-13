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
  'FISH_NOT_FOUND',
  'INVALID_QUANTITY',
  'PRICE_CHANGED',
  'STATE_CONFLICT',
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
}

export interface CodexResponse {
  species: CodexEntry[];
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
  CastLine: { args: Record<string, never>; ack: { attemptId: string } };
  HookFish: { args: { attemptId: string }; ack: null };
  SubmitFishingResult: {
    args: { attemptId: string; outcome: FishingOutcome };
    ack: { attempt: AttemptView };
  };
  SendChat: { args: { text: string }; ack: null };
  SendEmoji: { args: { emojiId: string }; ack: null };
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
}

export type HubEventName = keyof HubEvents;

export function isSeatEnded(v: HubEvents['MySeat']): v is SeatEnded {
  return 'ended' in v;
}
