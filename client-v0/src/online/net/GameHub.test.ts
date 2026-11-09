import { describe, expect, it, vi } from 'vitest';
import samples from '@fixtures/api-samples.v0.json';
import { GameHub, type HubConnectionLike, type HubHandler } from './GameHub';

class FakeConnection implements HubConnectionLike {
  handlers = new Map<string, HubHandler[]>();
  calls: { method: string; arg: unknown }[] = [];
  startedAfterHandlers = 0;
  reconnecting?: () => void;
  reconnected?: () => void;
  closed?: () => void;
  ack: unknown = samples.hub['JoinLake ack'];
  failStart = false;

  async start() {
    if (this.failStart) throw new Error('nope');
    this.startedAfterHandlers = this.handlers.size;
  }
  async stop() {}
  async invoke<T>(method: string, arg: unknown) {
    this.calls.push({ method, arg });
    return this.ack as T;
  }
  on(event: string, handler: HubHandler) {
    this.handlers.set(event, [...(this.handlers.get(event) ?? []), handler]);
  }
  onreconnecting(cb: () => void) {
    this.reconnecting = cb;
  }
  onreconnected(cb: () => void) {
    this.reconnected = cb;
  }
  onclose(cb: () => void) {
    this.closed = cb;
  }
  fire(event: string, payload: unknown) {
    this.handlers.get(event)?.forEach((h) => h(payload));
  }
}

const flush = () => new Promise((r) => setTimeout(r, 0));

describe('GameHub', () => {
  it('invoke tự thêm requestId', async () => {
    const c = new FakeConnection();
    const hub = new GameHub(c, () => 'req-1');
    await hub.invoke('HookFish', { attemptId: 'a' });
    expect(c.calls[0]).toEqual({
      method: 'HookFish',
      arg: { requestId: 'req-1', attemptId: 'a' },
    });
  });

  it('listener đăng ký trước start và nhận event', async () => {
    const c = new FakeConnection();
    const hub = new GameHub(c);
    const seen = vi.fn();
    hub.on('SeatChanged', seen);
    await hub.start();
    expect(c.startedAfterHandlers).toBe(1);
    c.fire('SeatChanged', samples.hub.SeatChanged);
    expect(seen).toHaveBeenCalledWith(samples.hub.SeatChanged);
  });

  it('nhiều listener chỉ gắn một handler, hủy được', () => {
    const c = new FakeConnection();
    const hub = new GameHub(c);
    const a = vi.fn();
    const b = vi.fn();
    const off = hub.on('PlayerLeft', a);
    hub.on('PlayerLeft', b);
    expect(c.handlers.get('PlayerLeft')).toHaveLength(1);
    off();
    c.fire('PlayerLeft', { playerId: 'x' });
    expect(a).not.toHaveBeenCalled();
    expect(b).toHaveBeenCalledOnce();
  });

  it('phát trạng thái kết nối theo thứ tự', async () => {
    const c = new FakeConnection();
    const hub = new GameHub(c);
    const states: string[] = [];
    hub.onConnectionState((s) => states.push(s));
    await hub.start();
    c.reconnecting?.();
    c.reconnected?.();
    await flush();
    c.closed?.();
    expect(states).toEqual([
      'connecting',
      'connected',
      'reconnecting',
      'connected',
      'disconnected',
    ]);
  });

  it('start lỗi quay về disconnected', async () => {
    const c = new FakeConnection();
    c.failStart = true;
    const hub = new GameHub(c);
    await expect(hub.start()).rejects.toThrow('nope');
    expect(hub.state).toBe('disconnected');
  });

  it('nối lại thì gọi JoinLake và nhận snapshot mới', async () => {
    const c = new FakeConnection();
    const hub = new GameHub(c);
    const snapshot = vi.fn();
    hub.on('LakeSnapshot', snapshot);
    await hub.start();
    c.reconnecting?.();
    c.reconnected?.();
    await flush();
    expect(c.calls.map((x) => x.method)).toEqual(['JoinLake']);
    expect(snapshot).toHaveBeenCalledOnce();
  });
});
