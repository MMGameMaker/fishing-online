// Luật phía mock theo SPEC 2.4-2.9, chỉ để Client chạy khi chưa có Server. Không phải kết quả thật.
import type { FishConfig, GameplayConfig, Rarity, RodConfig } from '../core/gameplayConfig';
import { RARITIES } from '../core/gameplayConfig';
import type { MinigameParams, Stats } from '../net/contract';

export type Random = () => number;

export function uniformInt(random: Random, min: number, max: number): number {
  return min + Math.floor(random() * (max - min + 1));
}

/** Level lớn nhất mà tổng expReq từ level 2 không vượt quá exp tích lũy. */
export function levelForExp(config: GameplayConfig, exp: number): number {
  let total = 0;
  let level = 1;
  for (const row of config.levels) {
    if (row.level === 1) continue;
    total += row.expReq;
    if (total > exp) break;
    level = row.level;
  }
  return level;
}

export function expToNext(config: GameplayConfig, exp: number): number {
  const level = levelForExp(config, exp);
  let total = 0;
  for (const row of config.levels) {
    if (row.level === 1) continue;
    total += row.expReq;
    if (row.level === level + 1) return total - exp;
  }
  return 0;
}

export function levelStats(config: GameplayConfig, level: number): Stats {
  const row = config.levels.find((l) => l.level === level);
  if (!row) throw new Error(`Không có level ${level}`);
  return pickStats(row);
}

export function pickStats(row: Stats): Stats {
  return {
    strength: row.strength,
    normalHitZonePct: row.normalHitZonePct,
    weaknessHitZonePct: row.weaknessHitZonePct,
    rareLuck: row.rareLuck,
    largeLuck: row.largeLuck,
  };
}

export function rodById(config: GameplayConfig, rodId: string): RodConfig {
  const rod = config.rods.find((r) => r.rodId === rodId);
  if (!rod) throw new Error(`Không có cần ${rodId}`);
  return rod;
}

export function addStats(a: Stats, b: Stats): Stats {
  return {
    strength: a.strength + b.strength,
    normalHitZonePct: a.normalHitZonePct + b.normalHitZonePct,
    weaknessHitZonePct: a.weaknessHitZonePct + b.weaknessHitZonePct,
    rareLuck: a.rareLuck + b.rareLuck,
    largeLuck: a.largeLuck + b.largeLuck,
  };
}

/** Chọn bậc theo basis point rồi chọn đều một loài trong bậc đó. */
export function pickSpecies(config: GameplayConfig, rareLuck: number, random: Random): FishConfig {
  const luck = Math.min(config.spawn.maxRareLuck, rareLuck);
  const roll = random() * 10000;
  let cumulative = 0;
  let rarity: Rarity = RARITIES[0]!;
  for (const candidate of RARITIES) {
    cumulative += config.spawn.rarityBaseBp[candidate];
    cumulative += config.spawn.rarityDeltaBpPerLuck[candidate] * luck;
    rarity = candidate;
    if (roll < cumulative) break;
  }
  const pool = config.fish.filter((f) => f.rarity === rarity);
  const species = pool[Math.floor(random() * pool.length)];
  if (!species) throw new Error(`Không có loài bậc ${rarity}`);
  return species;
}

export function rollLength(
  config: GameplayConfig,
  fish: FishConfig,
  largeLuck: number,
  random: Random,
): number {
  const luck = Math.min(config.lengthTiers.maxLargeLuck, largeLuck);
  const roll = random() * 10000;
  let cumulative = 0;
  const tiers = config.lengthTiers.tiers;
  let tier = tiers[tiers.length - 1]!;
  for (const candidate of tiers) {
    cumulative += candidate.baseBp + candidate.perLuckBp * luck;
    if (roll < cumulative) {
      tier = candidate;
      break;
    }
  }
  const position = tier.posMin + random() * (tier.posMax - tier.posMin);
  return Math.round(fish.minTenthCm + (fish.maxTenthCm - fish.minTenthCm) * position);
}

export function minigameParams(
  config: GameplayConfig,
  fish: FishConfig,
  stats: Stats,
  seed: number,
): MinigameParams {
  const row = config.minigame.rarity.find((r) => r.rarity === fish.rarity);
  if (!row) throw new Error(`Không có minigame cho ${fish.rarity}`);
  const greenWidth = Math.min(1, (row.greenBasePct / 100) * (1 + stats.normalHitZonePct / 100));
  const yellowWidth = Math.min(
    greenWidth,
    (row.yellowBasePct / 100) * (1 + stats.weaknessHitZonePct / 100),
  );
  return {
    seed,
    durationMs: row.durationMs,
    needlePassMs: row.needlePassMs,
    greenWidth,
    yellowWidth,
    shiftMin: row.shiftMin,
    shiftMax: row.shiftMax,
    missPenaltyMs: row.missPenaltyMs,
    fishHp: fish.hp,
    atk: stats.strength,
  };
}
