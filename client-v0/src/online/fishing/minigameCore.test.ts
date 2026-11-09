import { describe, expect, it } from 'vitest';
import samples from '@fixtures/api-samples.v0.json';
import type { MinigameParams } from '../net/contract';
import { applyTap, createState, isLost, mulberry32, needlePos, remainingMs } from './minigameCore';

const params = samples.hub['AttemptUpdate minigame'].minigame as MinigameParams;

/** Tìm thời điểm kim nằm đúng loại vùng mong muốn, không trùng vùng vàng khi cần vùng xanh. */
function findT(
  state: ReturnType<typeof createState>,
  kind: 'normal' | 'weak' | 'miss',
  from: number,
): number {
  for (let t = from; t < from + 5000; t += 1) {
    const outcome = applyTap(state, state.tapSeq + 1, t);
    if (outcome.accepted && outcome.kind === kind) return t;
  }
  throw new Error('không tìm được thời điểm');
}

describe('mulberry32', () => {
  it('khớp 5 số tham chiếu SPEC 2.7', () => {
    const next = mulberry32(123456789);
    expect([next(), next(), next(), next(), next()]).toEqual([
      0.2577907438389957, 0.9707721115555614, 0.7853280142880976, 0.20616457983851433,
      0.30307188746519387,
    ]);
  });
});

describe('needlePos', () => {
  it('chạy sang phải rồi quay lại', () => {
    expect(needlePos(0, 900)).toBe(0);
    expect(needlePos(450, 900)).toBeCloseTo(0.5, 12);
    expect(needlePos(900, 900)).toBe(1);
    expect(needlePos(1350, 900)).toBeCloseTo(0.5, 12);
    expect(needlePos(1800, 900)).toBe(0);
  });
});

describe('createState', () => {
  it('tiêu 2 số RNG đầu để đặt vùng', () => {
    const next = mulberry32(params.seed);
    const greenStart = next() * (1 - params.greenWidth);
    const yellowStart = greenStart + next() * (params.greenWidth - params.yellowWidth);
    const state = createState(params);
    expect(state.greenStart).toBeCloseTo(greenStart, 12);
    expect(state.yellowStart).toBeCloseTo(yellowStart, 12);
    expect(state.hp).toBe(params.fishHp);
  });

  it('vùng vàng luôn nằm trong vùng xanh', () => {
    for (let seed = 1; seed < 200; seed += 1) {
      const s = createState({ ...params, seed });
      expect(s.yellowStart).toBeGreaterThanOrEqual(s.greenStart);
      expect(s.yellowStart + params.yellowWidth).toBeLessThanOrEqual(
        s.greenStart + params.greenWidth + 1e-12,
      );
    }
  });
});

describe('applyTap', () => {
  it('trúng vàng trừ 2×atk, không phạt giờ', () => {
    const s = createState(params);
    const out = applyTap(s, 1, findT(s, 'weak', 0));
    expect(out).toMatchObject({ accepted: true, kind: 'weak' });
    expect(out.state.hp).toBe(params.fishHp - 2 * params.atk);
    expect(out.state.penaltyMs).toBe(0);
  });

  it('trúng xanh trừ atk', () => {
    const s = createState(params);
    const out = applyTap(s, 1, findT(s, 'normal', 0));
    expect(out).toMatchObject({ accepted: true, kind: 'normal' });
    expect(out.state.hp).toBe(params.fishHp - params.atk);
  });

  it('trượt không trừ HP, phạt giờ', () => {
    const s = createState(params);
    const t = findT(s, 'miss', 0);
    const out = applyTap(s, 1, t);
    expect(out.state.hp).toBe(params.fishHp);
    expect(remainingMs(out.state, t)).toBe(params.durationMs - t - params.missPenaltyMs);
  });

  it('mọi loại tap đều dịch vùng và tiêu đúng 3 số RNG', () => {
    const next = mulberry32(params.seed);
    next();
    const s0 = createState(params);
    next();
    const shift = params.shiftMin + next() * (params.shiftMax - params.shiftMin);
    const dir = next() < 0.5 ? -1 : 1;
    const expected = Math.min(1 - params.greenWidth, Math.max(0, s0.greenStart + dir * shift));
    const yellow = expected + next() * (params.greenWidth - params.yellowWidth);
    const out = applyTap(s0, 1, findT(s0, 'miss', 0));
    expect(out.state.greenStart).toBeCloseTo(expected, 9);
    expect(out.state.yellowStart).toBeCloseTo(yellow, 9);
  });

  it('vùng xanh không ra ngoài thanh', () => {
    let s = createState({ ...params, shiftMin: 0.5, shiftMax: 0.9, durationMs: 1e7 });
    for (let i = 1; i <= 200; i += 1) {
      const out = applyTap(s, i, i * 100);
      s = out.state;
      expect(s.greenStart).toBeGreaterThanOrEqual(0);
      expect(s.greenStart).toBeLessThanOrEqual(1 - params.greenWidth + 1e-12);
    }
  });

  it('từ chối sai seq, không đổi state', () => {
    const s = createState(params);
    expect(applyTap(s, 2, 100)).toEqual({ accepted: false, reason: 'bad_seq', state: s });
  });

  it('từ chối tap cách nhau dưới 80 ms', () => {
    const first = applyTap(createState(params), 1, 100);
    expect(applyTap(first.state, 2, 179)).toMatchObject({ accepted: false, reason: 'too_fast' });
    expect(applyTap(first.state, 2, 180).accepted).toBe(true);
  });

  it('từ chối tap khi hết giờ và báo thua', () => {
    const s = createState(params);
    expect(applyTap(s, 1, params.durationMs)).toMatchObject({
      accepted: false,
      reason: 'out_of_time',
    });
    expect(isLost(s, params.durationMs)).toBe(true);
    expect(isLost(s, params.durationMs - 1)).toBe(false);
  });

  it('HP về 0 là thắng, không nhận tap nữa', () => {
    let s = createState({ ...params, fishHp: params.atk, durationMs: 1e6 });
    const out = applyTap(s, 1, findT(s, 'normal', 0));
    s = out.state;
    expect(s.won).toBe(true);
    expect(isLost(s, 1e7)).toBe(false);
    expect(applyTap(s, 2, 1e5)).toMatchObject({ accepted: false, reason: 'finished' });
  });

  it('cùng seed và cùng chuỗi tap cho cùng kết quả', () => {
    const play = () => {
      let s = createState(params);
      const kinds: string[] = [];
      for (let i = 1; i <= 8; i += 1) {
        const out = applyTap(s, i, i * 311);
        if (out.accepted) kinds.push(out.kind);
        s = out.state;
      }
      return { kinds, s };
    };
    expect(play()).toEqual(play());
  });
});
