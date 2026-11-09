// Kiểu của docs/v01/fixtures/gameplay-config.v0.json. Mọi số balance đọc từ đây, không viết cứng.
export type Rarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';

export const RARITIES: readonly Rarity[] = ['common', 'uncommon', 'rare', 'epic', 'legendary'];

export interface StatBlock {
  strength: number;
  normalHitZonePct: number;
  weaknessHitZonePct: number;
  rareLuck: number;
  largeLuck: number;
}

export interface LevelConfig extends StatBlock {
  level: number;
  expReq: number;
}

export interface RodConfig extends StatBlock {
  rodId: string;
  name: string;
  priceGold: number | null;
  isDefault: boolean;
}

export interface FishConfig {
  speciesId: string;
  name: string;
  rarity: Rarity;
  minTenthCm: number;
  maxTenthCm: number;
  hp: number;
  exp: number;
  sellGold: number;
}

export interface SeatTierConfig {
  tier: number;
  seatNumbers: [number, number];
  rareLuck: number;
  largeLuck: number;
  lureTimeMs: number;
  unitPriceGold: string;
}

export interface MinigameRarityConfig {
  rarity: Rarity;
  durationMs: number;
  needlePassMs: number;
  greenBasePct: number;
  yellowBasePct: number;
  missPenaltyMs: number;
  shiftMin: number;
  shiftMax: number;
}

export interface LengthTierConfig {
  id: string;
  baseBp: number;
  perLuckBp: number;
  posMin: number;
  posMax: number;
}

export interface SpawnConfig {
  maxRareLuck: number;
  rarityBaseBp: Record<Rarity, number>;
  rarityDeltaBpPerLuck: Record<Rarity, number>;
}

export interface ShopOffer {
  offerId: string;
  itemId: string;
  priceGold: number;
}

export interface SeatPricingConfig {
  billingUnitMinutes: number;
  priceVersion: string;
  perSeatOverrides: { seatId: string; unitPriceGold: string }[];
}

export interface GameplayConfig {
  configVersion: string;
  newPlayer: { gold: number; rodId: string };
  levels: LevelConfig[];
  rods: RodConfig[];
  fish: FishConfig[];
  seatTiers: SeatTierConfig[];
  seatSession: { cooldownMs: number; disconnectGraceMs: number };
  fishing: {
    waitMinMs: number;
    waitMaxMs: number;
    biteWindowMs: number;
    biteGraceMs: number;
    catchShownMs: number;
    resultPopupMs: number;
  };
  minigame: { rarity: MinigameRarityConfig[]; resultGraceMs: number };
  lengthTiers: { maxLargeLuck: number; tiers: LengthTierConfig[] };
  spawn: SpawnConfig;
  shopOffers: ShopOffer[];
  seatPricing: SeatPricingConfig;
}

/** GET /catalog: config bỏ khối spawn để Client không biết tỷ lệ. */
export type Catalog = Omit<GameplayConfig, 'spawn'>;

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);
const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const isStr = (v: unknown): v is string => typeof v === 'string';

function isStatBlock(v: Record<string, unknown>): boolean {
  return (
    isNum(v.strength) &&
    isNum(v.normalHitZonePct) &&
    isNum(v.weaknessHitZonePct) &&
    isNum(v.rareLuck) &&
    isNum(v.largeLuck)
  );
}

function isRarity(v: unknown): v is Rarity {
  return RARITIES.includes(v as Rarity);
}

function isRarityBp(v: unknown): boolean {
  return isRecord(v) && RARITIES.every((r) => isNum(v[r]));
}

/** Kiểm tra đúng hình dạng config để phát hiện fixture lệch type. */
export function isGameplayConfig(v: unknown): v is GameplayConfig {
  if (!isRecord(v) || !isStr(v.configVersion)) return false;
  const { newPlayer, levels, rods, fish, seatTiers, seatSession, fishing } = v;
  const { minigame, lengthTiers, spawn, shopOffers, seatPricing } = v;
  if (!isRecord(newPlayer) || !isNum(newPlayer.gold) || !isStr(newPlayer.rodId)) return false;
  if (!Array.isArray(levels) || !levels.every(isLevel)) return false;
  if (!Array.isArray(rods) || !rods.every(isRod)) return false;
  if (!Array.isArray(fish) || !fish.every(isFish)) return false;
  if (!Array.isArray(seatTiers) || !seatTiers.every(isSeatTier)) return false;
  if (!isRecord(seatSession) || !isNum(seatSession.cooldownMs)) return false;
  if (!isNum(seatSession.disconnectGraceMs)) return false;
  if (!isRecord(fishing)) return false;
  const fishingKeys = [
    'waitMinMs',
    'waitMaxMs',
    'biteWindowMs',
    'biteGraceMs',
    'catchShownMs',
    'resultPopupMs',
  ];
  if (!fishingKeys.every((k) => isNum(fishing[k]))) return false;
  if (!isRecord(minigame) || !Array.isArray(minigame.rarity)) return false;
  if (!minigame.rarity.every(isMinigameRarity)) return false;
  if (!isNum(minigame.resultGraceMs)) return false;
  if (!isRecord(lengthTiers) || !Array.isArray(lengthTiers.tiers)) return false;
  if (!isNum(lengthTiers.maxLargeLuck) || !lengthTiers.tiers.every(isLengthTier)) return false;
  if (!isRecord(spawn) || !isNum(spawn.maxRareLuck)) return false;
  if (!isRarityBp(spawn.rarityBaseBp) || !isRarityBp(spawn.rarityDeltaBpPerLuck)) return false;
  if (!Array.isArray(shopOffers) || !shopOffers.every(isShopOffer)) return false;
  return (
    isRecord(seatPricing) &&
    isNum(seatPricing.billingUnitMinutes) &&
    isStr(seatPricing.priceVersion) &&
    Array.isArray(seatPricing.perSeatOverrides)
  );
}

function isLevel(v: unknown): boolean {
  return isRecord(v) && isNum(v.level) && isNum(v.expReq) && isStatBlock(v);
}

function isRod(v: unknown): boolean {
  return (
    isRecord(v) &&
    isStr(v.rodId) &&
    isStr(v.name) &&
    (v.priceGold === null || isNum(v.priceGold)) &&
    typeof v.isDefault === 'boolean' &&
    isStatBlock(v)
  );
}

function isFish(v: unknown): boolean {
  return (
    isRecord(v) &&
    isStr(v.speciesId) &&
    isStr(v.name) &&
    isRarity(v.rarity) &&
    isNum(v.minTenthCm) &&
    isNum(v.maxTenthCm) &&
    isNum(v.hp) &&
    isNum(v.exp) &&
    isNum(v.sellGold)
  );
}

function isSeatTier(v: unknown): boolean {
  return (
    isRecord(v) &&
    isNum(v.tier) &&
    Array.isArray(v.seatNumbers) &&
    v.seatNumbers.length === 2 &&
    isNum(v.rareLuck) &&
    isNum(v.largeLuck) &&
    isNum(v.lureTimeMs) &&
    isStr(v.unitPriceGold)
  );
}

function isMinigameRarity(v: unknown): boolean {
  return (
    isRecord(v) &&
    isRarity(v.rarity) &&
    isNum(v.durationMs) &&
    isNum(v.needlePassMs) &&
    isNum(v.greenBasePct) &&
    isNum(v.yellowBasePct) &&
    isNum(v.missPenaltyMs) &&
    isNum(v.shiftMin) &&
    isNum(v.shiftMax)
  );
}

function isLengthTier(v: unknown): boolean {
  return (
    isRecord(v) &&
    isStr(v.id) &&
    isNum(v.baseBp) &&
    isNum(v.perLuckBp) &&
    isNum(v.posMin) &&
    isNum(v.posMax)
  );
}

function isShopOffer(v: unknown): boolean {
  return isRecord(v) && isStr(v.offerId) && isStr(v.itemId) && isNum(v.priceGold);
}
