// Gửi kết quả minigame một lần, giữ nguyên requestId khi gửi lại để không phát thưởng trùng.
import type { AttemptView, CommandAck, ErrorCode, FishingOutcome } from '../net/contract';

export type SubmitResult =
  | { kind: 'settled'; attempt: AttemptView }
  | { kind: 'rejected'; code: ErrorCode }
  | { kind: 'unknown' };

export type SubmitInvoke = (
  args: { attemptId: string; outcome: FishingOutcome },
  requestId: string,
) => Promise<CommandAck<{ attempt: AttemptView }>>;

export interface SubmitOptions {
  uuid?: () => string;
  sleep?: (ms: number) => Promise<void>;
  maxAttempts?: number;
  retryDelayMs?: number;
}

const DEFAULT_MAX_ATTEMPTS = 3;
const DEFAULT_RETRY_DELAY_MS = 400;

/** Mất response thì gửi lại cùng requestId; hết lượt trả 'unknown' để nơi gọi tra snapshot. */
export async function submitFishingResult(
  invoke: SubmitInvoke,
  attemptId: string,
  outcome: FishingOutcome,
  options: SubmitOptions = {},
): Promise<SubmitResult> {
  const requestId = (options.uuid ?? (() => crypto.randomUUID()))();
  const sleep = options.sleep ?? ((ms) => new Promise((resolve) => setTimeout(resolve, ms)));
  const maxAttempts = options.maxAttempts ?? DEFAULT_MAX_ATTEMPTS;
  const retryDelayMs = options.retryDelayMs ?? DEFAULT_RETRY_DELAY_MS;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      const ack = await invoke({ attemptId, outcome }, requestId);
      if (ack.ok && ack.data) return { kind: 'settled', attempt: ack.data.attempt };
      return { kind: 'rejected', code: ack.error?.code ?? 'STATE_CONFLICT' };
    } catch (error) {
      console.warn('Gửi kết quả câu thất bại', error);
      if (attempt < maxAttempts) await sleep(retryDelayMs * attempt);
    }
  }
  return { kind: 'unknown' };
}
