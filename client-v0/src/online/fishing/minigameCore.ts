// Lõi minigame theo SPEC 2.7: hàm thuần, không phụ thuộc Phaser. State bất biến để hoàn tác được tap.
import type { MinigameParams, TapResult } from '../net/contract';

export const DEFAULT_MIN_TAP_INTERVAL_MS = 80;

const UINT32 = 4294967296;

/** Một bước mulberry32: nhận state, trả số ngẫu nhiên [0, 1) và state mới. */
function rngStep(rngState: number): { value: number; state: number } {
  const state = (rngState + 0x6d2b79f5) >>> 0;
  let t = state;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return { value: ((t ^ (t >>> 14)) >>> 0) / UINT32, state };
}

export function mulberry32(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    const step = rngStep(state);
    state = step.state;
    return step.value;
  };
}

/** Vị trí kim 0..1 tại thời điểm t, t = 0 ở mép trái và chạy sang phải. */
export function needlePos(tMs: number, needlePassMs: number): number {
  const phase = (tMs % (2 * needlePassMs)) / needlePassMs;
  return phase <= 1 ? phase : 2 - phase;
}

export interface MinigameState {
  readonly params: MinigameParams;
  readonly minTapIntervalMs: number;
  readonly rngState: number;
  readonly greenStart: number;
  readonly yellowStart: number;
  readonly hp: number;
  readonly penaltyMs: number;
  readonly tapSeq: number;
  readonly lastTapMs: number | null;
  readonly won: boolean;
}

export type RejectReason = 'finished' | 'bad_seq' | 'too_fast' | 'out_of_time';

export type TapOutcome =
  | { accepted: true; kind: TapResult; state: MinigameState }
  | { accepted: false; reason: RejectReason; state: MinigameState };

export function createState(
  params: MinigameParams,
  options: { minTapIntervalMs?: number } = {},
): MinigameState {
  const first = rngStep(params.seed >>> 0);
  const second = rngStep(first.state);
  const greenStart = first.value * (1 - params.greenWidth);
  return {
    params,
    minTapIntervalMs: options.minTapIntervalMs ?? DEFAULT_MIN_TAP_INTERVAL_MS,
    rngState: second.state,
    greenStart,
    yellowStart: greenStart + second.value * (params.greenWidth - params.yellowWidth),
    hp: params.fishHp,
    penaltyMs: 0,
    tapSeq: 0,
    lastTapMs: null,
    won: false,
  };
}

export function remainingMs(state: MinigameState, tMs: number): number {
  return state.params.durationMs - tMs - state.penaltyMs;
}

/** Thua khi hết giờ mà cá còn HP. */
export function isLost(state: MinigameState, tMs: number): boolean {
  return !state.won && remainingMs(state, tMs) <= 0;
}

function classify(state: MinigameState, p: number): TapResult {
  const { greenWidth, yellowWidth } = state.params;
  if (p >= state.yellowStart && p <= state.yellowStart + yellowWidth) return 'weak';
  if (p >= state.greenStart && p <= state.greenStart + greenWidth) return 'normal';
  return 'miss';
}

function damageOf(kind: TapResult, atk: number): number {
  if (kind === 'weak') return 2 * atk;
  return kind === 'normal' ? atk : 0;
}

/**
 * Xử lý tap thứ seq tại tMs. Phía Client không có serverElapsed nên chỉ kiểm tra seq,
 * khoảng cách giữa hai tap và thời gian còn lại. Tap bị từ chối không đổi state, không tiêu RNG.
 */
export function applyTap(state: MinigameState, seq: number, tMs: number): TapOutcome {
  const reject = (reason: RejectReason): TapOutcome => ({ accepted: false, reason, state });
  if (state.won) return reject('finished');
  if (seq !== state.tapSeq + 1) return reject('bad_seq');
  if (state.lastTapMs !== null && tMs < state.lastTapMs + state.minTapIntervalMs) {
    return reject('too_fast');
  }
  if (remainingMs(state, tMs) <= 0) return reject('out_of_time');

  const { params } = state;
  const kind = classify(state, needlePos(tMs, params.needlePassMs));
  const hp = state.hp - damageOf(kind, params.atk);
  const penaltyMs = state.penaltyMs + (kind === 'miss' ? params.missPenaltyMs : 0);

  // Dịch vùng sau mọi loại tap, đúng thứ tự tiêu RNG: shift, hướng, vị trí vàng.
  const shiftStep = rngStep(state.rngState);
  const dirStep = rngStep(shiftStep.state);
  const yellowStep = rngStep(dirStep.state);
  const shift = params.shiftMin + shiftStep.value * (params.shiftMax - params.shiftMin);
  const dir = dirStep.value < 0.5 ? -1 : 1;
  const maxStart = 1 - params.greenWidth;
  const greenStart = Math.min(maxStart, Math.max(0, state.greenStart + dir * shift));

  return {
    accepted: true,
    kind,
    state: {
      ...state,
      rngState: yellowStep.state,
      greenStart,
      yellowStart: greenStart + yellowStep.value * (params.greenWidth - params.yellowWidth),
      hp,
      penaltyMs,
      tapSeq: seq,
      lastTapMs: tMs,
      won: hp <= 0,
    },
  };
}
