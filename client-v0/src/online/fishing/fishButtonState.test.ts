import { describe, expect, it } from 'vitest';
import samples from '@fixtures/api-samples.v0.json';
import type { AttemptView } from '../net/contract';
import {
  biteProgress,
  isAttemptActive,
  isControlLocked,
  isPullVisible,
  shouldAutoCast,
  type AutoCastInput,
} from './fishButtonState';

const hub = samples.hub as unknown as Record<string, AttemptView>;
const attempt = (name: string) => hub[`AttemptUpdate ${name}`]!;

describe('nút Kéo', () => {
  it('chỉ hiện khi cá cắn câu', () => {
    expect(isPullVisible(attempt('bite'))).toBe(true);
    for (const name of ['waiting', 'minigame', 'success', 'failed', 'cancelled']) {
      expect(isPullVisible(attempt(name))).toBe(false);
    }
    expect(isPullVisible(null)).toBe(false);
  });
});

describe('tự câu', () => {
  const ready: AutoCastInput = {
    hasSession: true,
    seatReady: true,
    attempt: null,
    resultOpen: false,
    commandPending: false,
    nextCastAtMs: 0,
    nowMs: 1000,
  };

  it('vừa có ghế và ngồi xong thì câu ngay', () => {
    expect(shouldAutoCast(ready)).toBe(true);
  });

  it('không câu khi chưa có ghế hoặc chưa ngồi xong', () => {
    expect(shouldAutoCast({ ...ready, hasSession: false })).toBe(false);
    expect(shouldAutoCast({ ...ready, seatReady: false })).toBe(false);
  });

  it('không gửi trùng khi đang câu hoặc lệnh chưa có phản hồi', () => {
    for (const name of ['waiting', 'bite', 'minigame']) {
      expect(shouldAutoCast({ ...ready, attempt: attempt(name) })).toBe(false);
    }
    expect(shouldAutoCast({ ...ready, commandPending: true })).toBe(false);
  });

  it('thắng: chờ popup đóng rồi câu tiếp', () => {
    const won = { ...ready, attempt: attempt('success') };
    expect(shouldAutoCast({ ...won, resultOpen: true })).toBe(false);
    expect(shouldAutoCast(won)).toBe(true);
  });

  it('trượt: chờ hết thời gian trễ rồi câu tiếp', () => {
    const lost = { ...ready, attempt: attempt('failed'), nextCastAtMs: 3000 };
    expect(shouldAutoCast({ ...lost, nowMs: 2999 })).toBe(false);
    expect(shouldAutoCast({ ...lost, nowMs: 3000 })).toBe(true);
  });
});

describe('khóa điều khiển', () => {
  it('khóa ở waiting, bite, minigame', () => {
    for (const name of ['waiting', 'bite', 'minigame']) {
      expect(isAttemptActive(attempt(name))).toBe(true);
      expect(isControlLocked(attempt(name), false)).toBe(true);
    }
  });

  it('khóa khi popup kết quả còn mở, mở khóa khi đóng', () => {
    expect(isControlLocked(attempt('success'), true)).toBe(true);
    expect(isControlLocked(attempt('success'), false)).toBe(false);
    expect(isControlLocked(null, false)).toBe(false);
  });
});

describe('biteProgress', () => {
  const bite = attempt('bite');
  const deadline = Date.parse(bite.biteDeadlineAt!);

  it('giảm từ 1 về 0', () => {
    expect(biteProgress(bite, deadline - 3000, 3000)).toBe(1);
    expect(biteProgress(bite, deadline - 1500, 3000)).toBe(0.5);
    expect(biteProgress(bite, deadline + 100, 3000)).toBe(0);
  });

  it('bằng 0 khi không ở bước cá cắn', () => {
    expect(biteProgress(attempt('waiting'), deadline, 3000)).toBe(0);
  });
});
