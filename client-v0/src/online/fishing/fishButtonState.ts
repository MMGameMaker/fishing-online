// Trạng thái nút câu và khóa điều khiển theo CL-C-02, CL-B-04. Hàm thuần.
import type { AttemptView } from '../net/contract';

export type FishButtonMode = 'ready' | 'waiting' | 'bite' | 'locked';

export type FishButtonViewState =
  { visible: false } | { visible: true; mode: FishButtonMode; label: string; canPress: boolean };

export interface FishButtonInput {
  hasSession: boolean;
  attempt: AttemptView | null;
  resultLockUntilMs: number;
  nowMs: number;
}

const ACTIVE_PHASES: readonly string[] = ['waiting', 'bite', 'minigame'];

export function isAttemptActive(attempt: AttemptView | null): boolean {
  return attempt !== null && ACTIVE_PHASES.includes(attempt.phase);
}

/** Khóa di chuyển khi đang câu và trong thời gian popup kết quả. */
export function isControlLocked(
  attempt: AttemptView | null,
  resultLockUntilMs: number,
  nowMs: number,
): boolean {
  return isAttemptActive(attempt) || nowMs < resultLockUntilMs;
}

export function fishButtonView(input: FishButtonInput): FishButtonViewState {
  const { hasSession, attempt, resultLockUntilMs, nowMs } = input;
  if (!hasSession) return { visible: false };
  switch (attempt?.phase) {
    case 'minigame':
      return { visible: false };
    case 'waiting':
      return { visible: true, mode: 'waiting', label: 'Câu', canPress: false };
    case 'bite':
      return { visible: true, mode: 'bite', label: 'Kéo!', canPress: true };
    default:
      if (nowMs < resultLockUntilMs) {
        return { visible: true, mode: 'locked', label: 'Câu', canPress: false };
      }
      return { visible: true, mode: 'ready', label: 'Câu', canPress: true };
  }
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
