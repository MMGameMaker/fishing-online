import { describe, expect, it } from 'vitest';
import type { MinigameParams } from '../net/contract';
import vectors from './minigame-vectors.v0.json';
import { applyTap, createState } from './minigameCore';

const TOLERANCE = 1e-9;

interface VectorTap {
  seq: number;
  tMs: number;
  accepted: boolean;
  reason?: string;
  kind?: string;
  hp?: number;
  remainingMs?: number;
  greenStart?: number;
  yellowStart?: number;
  won?: boolean;
}

interface VectorCase {
  name: string;
  params: MinigameParams;
  initial: { greenStart: number; yellowStart: number; hp: number };
  taps: VectorTap[];
}

const cases = vectors.cases as VectorCase[];

describe('minigame-vectors.v0.json', () => {
  it('phủ đủ 5 rarity, cả tap trúng, trượt và bị từ chối', () => {
    const taps = cases.flatMap((c) => c.taps);
    expect(cases).toHaveLength(15);
    expect(new Set(taps.map((t) => t.kind ?? t.reason))).toEqual(
      new Set(['normal', 'weak', 'miss', 'too_fast', 'out_of_time']),
    );
  });

  it.each(cases.map((c) => [c.name, c] as const))('%s', (_name, vector) => {
    let state = createState(vector.params);
    expect(Math.abs(state.greenStart - vector.initial.greenStart)).toBeLessThanOrEqual(TOLERANCE);
    expect(Math.abs(state.yellowStart - vector.initial.yellowStart)).toBeLessThanOrEqual(TOLERANCE);

    for (const tap of vector.taps) {
      const out = applyTap(state, tap.seq, tap.tMs);
      expect(out.accepted).toBe(tap.accepted);
      if (!out.accepted) {
        expect(out.reason).toBe(tap.reason);
        continue;
      }
      state = out.state;
      expect(out.kind).toBe(tap.kind);
      expect(state.hp).toBe(tap.hp);
      expect(vector.params.durationMs - tap.tMs - state.penaltyMs).toBe(tap.remainingMs);
      expect(Math.abs(state.greenStart - tap.greenStart!)).toBeLessThanOrEqual(TOLERANCE);
      expect(Math.abs(state.yellowStart - tap.yellowStart!)).toBeLessThanOrEqual(TOLERANCE);
      expect(state.won).toBe(tap.won);
    }
  });
});
