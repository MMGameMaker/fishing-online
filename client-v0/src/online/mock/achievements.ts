// Bảng thành tựu của mock theo GAMEPLAY_SCOPE mục Thành tựu (GD chốt 2026-11-13, số tạm để test).
// Server thật chưa có API thành tựu: đây là contract dự thảo, mock hoàn tất chưa phải tích hợp thật.
import type { AchievementEntry } from '../net/contract';

export const ACHIEVEMENT_REWARD_GOLD = 100;

export interface AchievementDef {
  id: string;
  name: string;
  thresholds: number[];
}

export const ACHIEVEMENT_DEFS: readonly AchievementDef[] = [
  { id: 'diligent', name: 'Cần thủ chăm chỉ', thresholds: [10, 50, 200, 500, 1000] },
  { id: 'collector', name: 'Nhà sưu tầm', thresholds: [3, 6, 9, 12, 15] },
  { id: 'rare_hunter', name: 'Săn cá hiếm', thresholds: [5, 20, 50, 100, 150] },
  { id: 'legend_lake', name: 'Huyền thoại hồ câu', thresholds: [1, 3, 5, 10, 15] },
  { id: 'giant_fish', name: 'Cá khủng', thresholds: [1, 3, 5, 7, 10] },
  { id: 'pioneer', name: 'Người tiên phong', thresholds: [1, 3, 5, 7, 10] },
  { id: 'merchant', name: 'Thương nhân', thresholds: [500, 2000, 10000, 50000, 70000] },
  { id: 'persistent', name: 'Người bền bỉ', thresholds: [60, 360, 600, 3000, 5000] },
];

export type AchievementCounters = Record<string, number>;

export function achievementEntries(
  counters: AchievementCounters,
  claimed: Record<string, number>,
): AchievementEntry[] {
  return ACHIEVEMENT_DEFS.map((def) => ({
    id: def.id,
    name: def.name,
    counter: counters[def.id] ?? 0,
    thresholds: [...def.thresholds],
    claimedLevels: claimed[def.id] ?? 0,
    rewardGold: ACHIEVEMENT_REWARD_GOLD,
  }));
}

/** Mỗi lần nhận một level; trả null nếu chưa đạt mốc hoặc đã nhận đủ. */
export function nextClaim(entry: AchievementEntry): number | null {
  if (entry.claimedLevels >= entry.thresholds.length) return null;
  return entry.counter >= (entry.thresholds[entry.claimedLevels] ?? Infinity)
    ? entry.claimedLevels + 1
    : null;
}
