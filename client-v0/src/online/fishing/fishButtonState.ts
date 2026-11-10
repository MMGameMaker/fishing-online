// Trạng thái nút Kéo, tự câu và khóa điều khiển theo CL-C-02, CL-C-03, CL-B-04. Hàm thuần.
import type { AttemptView } from '../net/contract';

export interface AutoCastInput {
  hasSession: boolean;
  seatReady: boolean;
  attempt: AttemptView | null;
  resultOpen: boolean;
  commandPending: boolean;
  nextCastAtMs: number;
  nowMs: number;
}

const ACTIVE_PHASES: readonly string[] = ['waiting', 'bite', 'minigame'];

export function isAttemptActive(attempt: AttemptView | null): boolean {
  return attempt !== null && ACTIVE_PHASES.includes(attempt.phase);
}

/** Khóa di chuyển khi đang câu và khi popup kết quả còn mở. */
export function isControlLocked(attempt: AttemptView | null, resultOpen: boolean): boolean {
  return isAttemptActive(attempt) || resultOpen;
}

/** Nút Kéo và lớp chạm toàn màn hình chỉ có khi cá đang cắn câu. */
export function isPullVisible(attempt: AttemptView | null): boolean {
  return attempt?.phase === 'bite';
}

/** Giữ ghế là tự câu; chỉ chờ popup được đóng hoặc hết thời gian trễ sau khi trượt. */
export function shouldAutoCast(input: AutoCastInput): boolean {
  const { hasSession, seatReady, attempt, resultOpen, commandPending, nextCastAtMs, nowMs } = input;
  return (
    hasSession &&
    seatReady &&
    !isAttemptActive(attempt) &&
    !resultOpen &&
    !commandPending &&
    nowMs >= nextCastAtMs
  );
}

/** Phần thời gian còn lại của vòng đếm 3 giây, 0..1. */
export function biteProgress(
  attempt: AttemptView | null,
  serverNowMs: number,
  biteWindowMs: number,
): number {
  if (attempt?.phase !== 'bite' || attempt.biteDeadlineAt === null) return 0;
  const remaining = Date.parse(attempt.biteDeadlineAt) - serverNowMs;
  return Math.min(1, Math.max(0, remaining / biteWindowMs));
}
