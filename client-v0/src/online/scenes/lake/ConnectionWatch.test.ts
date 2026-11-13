import { describe, expect, it } from 'vitest';
import type { ConnectionState } from '../../net/GameHub';
import { ConnectionWatch, RETRY_MS, type WatchedHub } from './ConnectionWatch';

class FakeHub implements WatchedHub {
  state: ConnectionState = 'connected';
  failStarts = 0;
  starts = 0;
  joins = 0;
  private listener: ((state: ConnectionState) => void) | null = null;

  onConnectionState(listener: (state: ConnectionState) => void): () => void {
    this.listener = listener;
    return () => (this.listener = null);
  }

  set(state: ConnectionState): void {
    this.state = state;
    this.listener?.(state);
  }

  async start(): Promise<void> {
    this.starts += 1;
    if (this.failStarts > 0) {
      this.failStarts -= 1;
      this.set('disconnected');
      throw new Error('server down');
    }
    this.set('connected');
  }

  async joinLake(): Promise<{ ok: boolean }> {
    this.joins += 1;
    return { ok: true };
  }
}

function setup() {
  const root = {} as HTMLElement;
  const hub = new FakeHub();
  const timers: { fn: () => void; ms: number }[] = [];
  const watch = new ConnectionWatch({
    root,
    hub,
    view: { show: () => {}, hide: () => {} },
    setTimer: (fn, ms) => timers.push({ fn, ms }),
    clearTimer: () => {},
  });
  const runNext = async () => {
    const timer = timers.shift();
    timer?.fn();
    await new Promise((r) => setTimeout(r, 0));
    return timer;
  };
  return { root, hub, timers, watch, runNext };
}

describe('ConnectionWatch', () => {
  it('kết nối đóng hẳn thì hiện băng và hẹn thử lại', () => {
    const { hub, timers, watch } = setup();
    hub.set('disconnected');
    expect(watch.isShowingBanner).toBe(true);
    expect(timers).toHaveLength(1);
    expect(timers[0]!.ms).toBe(RETRY_MS);
  });

  it('Server chưa lên thì tiếp tục thử, lên rồi thì vào lại hồ và ẩn băng', async () => {
    const { hub, watch, runNext } = setup();
    hub.failStarts = 2;
    hub.set('disconnected');
    await runNext();
    await runNext();
    expect(watch.isShowingBanner).toBe(true);
    await runNext();
    expect(hub.starts).toBe(3);
    expect(hub.joins).toBe(1);
    expect(watch.isShowingBanner).toBe(false);
  });

  it('đang tự nối lại (reconnecting) chỉ hiện băng, không tự thử thêm', () => {
    const { hub, timers, watch } = setup();
    hub.set('reconnecting');
    expect(watch.isShowingBanner).toBe(true);
    expect(timers).toHaveLength(0);
    hub.set('connected');
    expect(watch.isShowingBanner).toBe(false);
  });
});
