// Thanh EXP của khung người chơi. SPEC: `exp` là tổng tích luỹ, `expReq[n]` là EXP cần để lên
// level n từ n−1, level tối đa là level cuối bảng.
import type { LevelConfig } from '../../core/gameplayConfig';

export interface LevelProgress {
  level: number;
  /** EXP đã có trong level hiện tại. */
  current: number;
  /** EXP cần để lên level kế; null khi đã tối đa. */
  needed: number | null;
  /** 0..1 cho độ dài thanh. */
  ratio: number;
}

export function levelProgress(
  exp: number,
  level: number,
  levels: readonly LevelConfig[],
): LevelProgress {
  const sorted = [...levels].sort((a, b) => a.level - b.level);
  // Tổng EXP để đạt level hiện tại = tổng expReq của các level 2..level.
  const base = sorted
    .filter((row) => row.level > 1 && row.level <= level)
    .reduce((sum, row) => sum + row.expReq, 0);
  const next = sorted.find((row) => row.level === level + 1);
  const current = Math.max(0, exp - base);
  if (!next) return { level, current, needed: null, ratio: 1 };
  const needed = next.expReq;
  return { level, current, needed, ratio: needed > 0 ? Math.min(1, current / needed) : 1 };
}

/** "EXP 25/100"; đã tối đa thì "EXP MAX". */
export function expText(progress: LevelProgress): string {
  return progress.needed === null ? 'EXP MAX' : `EXP ${progress.current}/${progress.needed}`;
}
