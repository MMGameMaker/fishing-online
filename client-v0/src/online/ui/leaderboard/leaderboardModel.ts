// Mô hình bảng xếp hạng tuần: chuyển RankingResponse của BE thành các dòng hiển thị. Không có số liệu tĩnh.
// Server thật chưa có API ranking (SOC-07 chờ GD); hiện dữ liệu đến từ MockBackend theo contract dự thảo.
import type { RankingEntry, RankingResponse } from '../../net/contract';

export const BOARD_ID = 'total-catch-weekly';
/** Mỗi lần tải một trang; bảng tuần có tối đa 50 hạng nên cuộn tới cuối thì tải trang kế. */
export const PAGE_SIZE = 10;
export const UNKNOWN = '?';

export interface RankRow {
  rank: number | null;
  displayName: string;
  value: number | null;
  reward: string | null;
}

export function toRow(entry: RankingEntry): RankRow {
  return {
    rank: entry.rank,
    displayName: entry.displayName,
    value: entry.value,
    reward: entry.reward,
  };
}

/**
 * Dòng của mình ở cuối bảng, mọi số liệu do BE trả. Chưa tải được: chỉ có tên, còn lại "?".
 * Điểm cập nhật ngay nhưng hạng/thưởng theo bản chụp 30 phút nên có thể có điểm mà hạng là "?".
 */
export function myRowFrom(response: RankingResponse | null, fallbackName: string): RankRow {
  if (!response) return { rank: null, displayName: fallbackName, value: null, reward: null };
  return toRow(response.me);
}

/** Số có dấu phẩy nghìn như ảnh mẫu (1,346); thiếu dữ liệu thì "?". */
export function formatCount(value: number | null): string {
  return value === null ? UNKNOWN : value.toLocaleString('en-US');
}

/** "1 ngày 23 giờ" còn lại tới mốc kết thúc chu kỳ do BE trả về. */
export function countdownText(periodEndsAt: string | null, nowMs: number): string {
  const end = periodEndsAt ? Date.parse(periodEndsAt) : NaN;
  if (Number.isNaN(end)) return UNKNOWN;
  const left = Math.max(0, end - nowMs);
  const days = Math.floor(left / 86_400_000);
  const hours = Math.floor((left % 86_400_000) / 3_600_000);
  return `${days} ngày ${hours} giờ`;
}
