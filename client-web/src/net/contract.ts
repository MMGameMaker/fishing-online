// Contract HTTP và SignalR theo SPEC_CHUNG v0.3 mục 3, 4, 5.
import type { Catalog, Rarity } from '../core/gameplayConfig';

export const ERROR_CODES = [
  'UNAUTHENTICATED',
  'SESSION_EXPIRED',
  'VALIDATION_FAILED',
  'IDEMPOTENCY_CONFLICT',
  'RATE_LIMITED',
  'SEAT_TAKEN',
  'SEAT_COOLDOWN',
  'ALREADY_HAS_SEAT',
  'NOT_IN_SEAT',
  'OUT_OF_RANGE',
  'INSUFFICIENT_GOLD',
  'ATTEMPT_ACTIVE',
  'NO_ACTIVE_ATTEMPT',
  'BITE_EXPIRED',
  'TAP_REJECTED',
  'ROD_NOT_OWNED',
  'ROD_ALREADY_OWNED',
  'FISH_NOT_FOUND',
  'INVALID_DURATION',
  'PRICE_CHANGED',
  'SEAT_SESSION_EXPIRED',
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
export type SeatState = 'available' | 'occupied' | 'cooldown';
export type AttemptPhase = 'waiting' | 'bite' | 'minigame' | 'success' | 'failed' | 'cancelled';
export type TapResult = 'normal' | 'weak' | 'miss';

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
  tier: number;
  state: SeatState;
  occupantPlayerId: string | null;
  expiresAt: string | null;
  cooldownUntil: string | null;
  billingUnitMinutes: number;
  unitPriceGold: string;
  priceVersion: string;
}

export interface MySeatSession {
  seatId: string;
  tier: number;
  sessionId: string;
  startedAt: string;
  expiresAt: string;
  purchasedMinutes: number;
  sessionVersion: number;
  priceVersion: string;
}

export interface SeatSessionEnded {
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
  minigame: (MinigameParams & { startedAt: string }) | null;
  state: { hp: number; remainingMs: number; tapSeq: number } | null;
  result: AttemptResult | null;
}

export interface LakeSnapshot {
  mapId: string;
  mapVersion: string;
  configVersion: string;
  serverTime: string;
  players: PlayerView[];
  seats: SeatView[];
  mySession: MySeatSession | null;
  myAttempt: AttemptView | null;
}

export interface CommandAck<T> {
  requestId: string;
  ok: boolean;
  error: null | { code: ErrorCode; message: string };
  data: T | null;
}

export interface SeatPurchaseResult {
  session: MySeatSession;
  gold: string;
  chargedGold: string;
}

/** Lệnh hub: tham số (chưa gồm requestId) và kiểu data của ack. */
export interface HubCommands {
  JoinLake: { args: Record<string, never>; ack: LakeSnapshot };
  Move: { args: { seq: number; x: number; y: number; dir: Direction }; ack: null };
  BuySeatTicket: {
    args: { seatId: string; durationUnits: number; expectedPriceVersion: string };
    ack: SeatPurchaseResult;
  };
  ExtendSeatSession: {
    args: { sessionId: string; durationUnits: number; expectedPriceVersion: string };
    ack: SeatPurchaseResult;
  };
  LeaveSeat: { args: Record<string, never>; ack: null };
  CastLine: { args: Record<string, never>; ack: { attemptId: string } };
  HookFish: { args: { attemptId: string }; ack: null };
  MinigameTap: {
    args: { attemptId: string; seq: number; tMs: number };
    ack: { result: TapResult; hp: number; remainingMs: number };
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
  MySeatSession: MySeatSession | SeatSessionEnded;
  AttemptUpdate: AttemptView;
  CatchShown: { playerId: string; speciesId: string; rarity: Rarity; shownUntil: string };
  SkinChanged: { playerId: string; skinId: string };
  ChatReceived: { messageId: string; playerId: string; text: string };
  EmojiReceived: { playerId: string; emojiId: string };
}

export type HubEventName = keyof HubEvents;

export function isSessionEnded(v: HubEvents['MySeatSession']): v is SeatSessionEnded {
  return 'ended' in v;
}
