// Type guard theo contract: dùng trong test để phát hiện fixture hoặc mock lệch type.
import { RARITIES, type Rarity } from '../core/gameplayConfig';
import {
  ERROR_CODES,
  type ApiFailure,
  type AttemptView,
  type CommandAck,
  type ErrorCode,
  type HubEventName,
  type HubEvents,
  type InventoryResponse,
  type LakeSnapshot,
  type LoginResponse,
  type MySeatSession,
  type PlayerProfile,
  type PlayerView,
  type ProgressResponse,
  type SeatPurchaseResult,
  type SeatSessionEnded,
  type SeatView,
  type SellFishResponse,
  type Stats,
} from './contract';

type Guard<T> = (v: unknown) => v is T;

const obj = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);
const str = (v: unknown): v is string => typeof v === 'string';
const num = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const int = (v: unknown): v is number => Number.isInteger(v);
const bool = (v: unknown): v is boolean => typeof v === 'boolean';
const iso = (v: unknown): v is string => str(v) && !Number.isNaN(Date.parse(v));
const nullable =
  <T>(g: Guard<T>): Guard<T | null> =>
  (v: unknown): v is T | null =>
    v === null || g(v);
const arrayOf =
  <T>(g: Guard<T>): Guard<T[]> =>
  (v: unknown): v is T[] =>
    Array.isArray(v) && v.every(g);

/** Gold là chuỗi số nguyên không âm. */
export const isGold = (v: unknown): v is string => str(v) && /^\d+$/.test(v);
export const isRarityValue = (v: unknown): v is Rarity => RARITIES.includes(v as Rarity);
export const isErrorCode = (v: unknown): v is ErrorCode => ERROR_CODES.includes(v as ErrorCode);
const isDirection = (v: unknown) => v === 'up' || v === 'down' || v === 'left' || v === 'right';

export const isPlayerProfile: Guard<PlayerProfile> = (v): v is PlayerProfile =>
  obj(v) &&
  str(v.playerId) &&
  str(v.displayName) &&
  int(v.level) &&
  int(v.exp) &&
  isGold(v.gold) &&
  str(v.selectedSkinId) &&
  str(v.equippedRodId);

export const isStats: Guard<Stats> = (v): v is Stats =>
  obj(v) &&
  num(v.strength) &&
  num(v.normalHitZonePct) &&
  num(v.weaknessHitZonePct) &&
  num(v.rareLuck) &&
  num(v.largeLuck);

export const isLoginResponse: Guard<LoginResponse> = (v): v is LoginResponse =>
  obj(v) && str(v.accessToken) && iso(v.expiresAt) && bool(v.isNew) && isPlayerProfile(v.player);

export const isProgress: Guard<ProgressResponse> = (v): v is ProgressResponse =>
  obj(v) &&
  int(v.level) &&
  int(v.exp) &&
  int(v.expToNext) &&
  isStats(v.stats) &&
  obj(v.breakdown) &&
  isStats(v.breakdown.level) &&
  isStats(v.breakdown.rod);

const isFishItem = (v: unknown) =>
  obj(v) && str(v.catchId) && str(v.speciesId) && int(v.lengthTenthCm) && iso(v.caughtAt);

export const isInventory: Guard<InventoryResponse> = (v): v is InventoryResponse =>
  obj(v) &&
  int(v.inventoryVersion) &&
  isGold(v.gold) &&
  str(v.equippedRodId) &&
  Array.isArray(v.rods) &&
  v.rods.every(str) &&
  Array.isArray(v.items) &&
  Array.isArray(v.fish) &&
  v.fish.every(isFishItem);

export const isSellFish: Guard<SellFishResponse> = (v): v is SellFishResponse =>
  obj(v) && int(v.soldCount) && isGold(v.goldEarned) && isGold(v.gold);

export const isApiFailure: Guard<ApiFailure> = (v): v is ApiFailure =>
  obj(v) &&
  str(v.traceId) &&
  obj(v.error) &&
  isErrorCode(v.error.code) &&
  str(v.error.message) &&
  bool(v.error.retryable);

export const isPlayerView: Guard<PlayerView> = (v): v is PlayerView =>
  obj(v) &&
  str(v.playerId) &&
  str(v.displayName) &&
  str(v.skinId) &&
  str(v.rodId) &&
  num(v.x) &&
  num(v.y) &&
  isDirection(v.dir) &&
  (v.seatId === null || str(v.seatId)) &&
  bool(v.fishing);

export const isSeatView: Guard<SeatView> = (v): v is SeatView =>
  obj(v) &&
  str(v.seatId) &&
  int(v.tier) &&
  (v.state === 'available' || v.state === 'occupied' || v.state === 'cooldown') &&
  nullable(str)(v.occupantPlayerId) &&
  nullable(iso)(v.expiresAt) &&
  nullable(iso)(v.cooldownUntil) &&
  int(v.billingUnitMinutes) &&
  isGold(v.unitPriceGold) &&
  str(v.priceVersion);

export const isMySeatSession: Guard<MySeatSession> = (v): v is MySeatSession =>
  obj(v) &&
  str(v.seatId) &&
  int(v.tier) &&
  str(v.sessionId) &&
  iso(v.startedAt) &&
  iso(v.expiresAt) &&
  int(v.purchasedMinutes) &&
  int(v.sessionVersion) &&
  str(v.priceVersion);

export const isSeatSessionEnded: Guard<SeatSessionEnded> = (v): v is SeatSessionEnded =>
  obj(v) && str(v.seatId) && v.ended === true && str(v.reason);

export const isSeatPurchase: Guard<SeatPurchaseResult> = (v): v is SeatPurchaseResult =>
  obj(v) && isMySeatSession(v.session) && isGold(v.gold) && isGold(v.chargedGold);

const isMinigame = (v: unknown) =>
  obj(v) &&
  int(v.seed) &&
  iso(v.startedAt) &&
  num(v.durationMs) &&
  num(v.needlePassMs) &&
  num(v.greenWidth) &&
  num(v.yellowWidth) &&
  num(v.shiftMin) &&
  num(v.shiftMax) &&
  num(v.missPenaltyMs) &&
  num(v.fishHp) &&
  num(v.atk);

const isAttemptState = (v: unknown) => obj(v) && num(v.hp) && num(v.remainingMs) && int(v.tapSeq);

const isAttemptResult = (v: unknown) =>
  obj(v) &&
  str(v.speciesId) &&
  isRarityValue(v.rarity) &&
  int(v.lengthTenthCm) &&
  bool(v.isNew) &&
  bool(v.isRecord) &&
  int(v.expGained) &&
  int(v.level) &&
  bool(v.levelUp);

const PHASES = ['waiting', 'bite', 'minigame', 'success', 'failed', 'cancelled'];

export const isAttemptView: Guard<AttemptView> = (v): v is AttemptView =>
  obj(v) &&
  str(v.attemptId) &&
  PHASES.includes(v.phase as string) &&
  (v.reason === null || str(v.reason)) &&
  (v.biteDeadlineAt === null || iso(v.biteDeadlineAt)) &&
  (v.minigame === null || isMinigame(v.minigame)) &&
  (v.state === null || isAttemptState(v.state)) &&
  (v.result === null || isAttemptResult(v.result));

export const isLakeSnapshot: Guard<LakeSnapshot> = (v): v is LakeSnapshot =>
  obj(v) &&
  str(v.mapId) &&
  str(v.mapVersion) &&
  str(v.configVersion) &&
  iso(v.serverTime) &&
  arrayOf(isPlayerView)(v.players) &&
  arrayOf(isSeatView)(v.seats) &&
  (v.mySession === null || isMySeatSession(v.mySession)) &&
  (v.myAttempt === null || isAttemptView(v.myAttempt));

export function isCommandAck<T>(v: unknown, dataGuard: (d: unknown) => d is T): v is CommandAck<T> {
  if (!obj(v) || !str(v.requestId) || !bool(v.ok)) return false;
  if (v.ok) return v.error === null && (v.data === null || dataGuard(v.data));
  return obj(v.error) && isErrorCode(v.error.code) && str(v.error.message) && v.data === null;
}

/** Guard của từng event ở SPEC mục 4. */
export const EVENT_GUARDS: { [K in HubEventName]: Guard<HubEvents[K]> } = {
  LakeSnapshot: isLakeSnapshot,
  PlayerJoined: isPlayerView,
  PlayerLeft: (v): v is HubEvents['PlayerLeft'] => obj(v) && str(v.playerId),
  PlayerMoved: (v): v is HubEvents['PlayerMoved'] =>
    obj(v) && str(v.playerId) && num(v.x) && num(v.y) && isDirection(v.dir) && int(v.seq),
  PositionCorrected: (v): v is HubEvents['PositionCorrected'] =>
    obj(v) && num(v.x) && num(v.y) && int(v.seq),
  SeatChanged: isSeatView,
  MySeatSession: (v): v is HubEvents['MySeatSession'] =>
    isMySeatSession(v) || isSeatSessionEnded(v),
  AttemptUpdate: isAttemptView,
  CatchShown: (v): v is HubEvents['CatchShown'] =>
    obj(v) && str(v.playerId) && str(v.speciesId) && isRarityValue(v.rarity) && iso(v.shownUntil),
  SkinChanged: (v): v is HubEvents['SkinChanged'] => obj(v) && str(v.playerId) && str(v.skinId),
  ChatReceived: (v): v is HubEvents['ChatReceived'] =>
    obj(v) && str(v.messageId) && str(v.playerId) && str(v.text),
  EmojiReceived: (v): v is HubEvents['EmojiReceived'] =>
    obj(v) && str(v.playerId) && str(v.emojiId),
};
