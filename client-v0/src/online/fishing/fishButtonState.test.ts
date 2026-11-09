import { describe, expect, it } from 'vitest';
import samples from '@fixtures/api-samples.v0.json';
import type { AttemptView } from '../net/contract';
import { biteProgress, fishButtonView, isAttemptActive, isControlLocked } from './fishButtonState';

const hub = samples.hub as unknown as Record<string, AttemptView>;
const attempt = (name: string) => hub[`AttemptUpdate ${name}`]!;
const view = (a: AttemptView | null, hasSession = true, lock = 0, nowMs = 1000) =>
  fishButtonView({ hasSession, attempt: a, resultLockUntilMs: lock, nowMs });

describe('fishButtonView theo chuỗi event mẫu', () => {
  it('ẩn khi không giữ ghế', () => {
    expect(view(null, false)).toEqual({ visible: false });
  });

  it('sẵn sàng khi chưa câu', () => {
    expect(view(null)).toMatchObject({ mode: 'ready', label: 'Câu', canPress: true });
  });

  it('khóa khi đang chờ cá', () => {
    expect(view(attempt('waiting'))).toMatchObject({ mode: 'waiting', canPress: false });
  });

  it('"Kéo!" khi cá cắn', () => {
    expect(view(attempt('bite'))).toMatchObject({ mode: 'bite', label: 'Kéo!', canPress: true });
  });

  it('ẩn trong minigame', () => {
    expect(view(attempt('minigame'))).toEqual({ visible: false });
  });

  it('khóa trong thời gian popup rồi sẵn sàng lại', () => {
    expect(view(attempt('success'), true, 2000, 1000)).toMatchObject({
      mode: 'locked',
      canPress: false,
    });
    expect(view(attempt('success'), true, 2000, 2000)).toMatchObject({
      mode: 'ready',
      canPress: true,
    });
  });

  it('thất bại hoặc bị hủy thì sẵn sàng ngay', () => {
    expect(view(attempt('failed'))).toMatchObject({ mode: 'ready' });
    expect(view(attempt('cancelled'))).toMatchObject({ mode: 'ready' });
  });
});

describe('khóa điều khiển', () => {
  it('khóa ở waiting, bite, minigame', () => {
    for (const name of ['waiting', 'bite', 'minigame']) {
      expect(isAttemptActive(attempt(name))).toBe(true);
      expect(isControlLocked(attempt(name), 0, 1000)).toBe(true);
    }
  });

  it('khóa khi popup kết quả, mở sau đó', () => {
    expect(isControlLocked(attempt('success'), 3000, 2999)).toBe(true);
    expect(isControlLocked(attempt('success'), 3000, 3000)).toBe(false);
    expect(isControlLocked(null, 0, 1000)).toBe(false);
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
