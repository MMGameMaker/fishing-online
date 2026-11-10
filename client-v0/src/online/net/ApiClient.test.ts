import { describe, expect, it, vi } from 'vitest';
import { ApiClient, ApiError, type FetchLike } from './ApiClient';

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

const ok = (data: unknown) => json(200, { data, traceId: 't' });
const fail = (status: number, code: string, retryable = false) =>
  json(status, { error: { code, message: code, retryable }, traceId: 't' });

function client(fetchImpl: FetchLike, timeoutMs?: number) {
  let n = 0;
  return new ApiClient({
    baseUrl: 'http://x',
    fetchImpl,
    timeoutMs,
    uuid: () => `key-${++n}`,
    sleep: () => Promise.resolve(),
  });
}

const headerOf = (init: RequestInit | undefined, name: string) =>
  (init?.headers as Record<string, string>)[name];

describe('ApiClient', () => {
  it('gắn tiền tố, token và trả data', async () => {
    const f = vi.fn<FetchLike>(async () => ok({ a: 1 }));
    const api = client(f);
    api.setAccessToken('tok');
    await expect(api.get('/me')).resolves.toEqual({ a: 1 });
    expect(f.mock.calls[0]?.[0]).toBe('http://x/api/v1/me');
    expect(headerOf(f.mock.calls[0]?.[1], 'Authorization')).toBe('Bearer tok');
    expect(headerOf(f.mock.calls[0]?.[1], 'Idempotency-Key')).toBeUndefined();
  });

  it('login gửi Firebase ID token và lưu access token cho request sau', async () => {
    const f = vi
      .fn<FetchLike>()
      .mockResolvedValueOnce(ok({ accessToken: 'acc', expiresAt: 'x', isNew: false, player: {} }))
      .mockResolvedValueOnce(ok({}));
    const api = client(f);
    await api.login('firebase-token');
    expect(f.mock.calls[0]?.[0]).toBe('http://x/api/v1/auth/login');
    expect(JSON.parse(String(f.mock.calls[0]?.[1]?.body))).toEqual({
      firebaseIdToken: 'firebase-token',
      rememberMe: true,
    });
    expect(api.getAccessToken()).toBe('acc');
    await api.get('/me');
    expect(headerOf(f.mock.calls[1]?.[1], 'Authorization')).toBe('Bearer acc');
  });

  it('retry giữ nguyên Idempotency-Key', async () => {
    const f = vi
      .fn<FetchLike>()
      .mockRejectedValueOnce(new TypeError('offline'))
      .mockResolvedValueOnce(fail(503, 'RATE_LIMITED', true))
      .mockResolvedValueOnce(ok({ done: true }));
    await expect(client(f).post('/shop/buy', { offerId: 'a' })).resolves.toEqual({ done: true });
    const keys = f.mock.calls.map((c) => headerOf(c[1], 'Idempotency-Key'));
    expect(keys).toEqual(['key-1', 'key-1', 'key-1']);
  });

  it('hai lệnh khác nhau có key khác nhau', async () => {
    const f = vi.fn<FetchLike>(async () => ok({}));
    const api = client(f);
    await api.post('/a', {});
    await api.put('/b', {});
    const keys = f.mock.calls.map((c) => headerOf(c[1], 'Idempotency-Key'));
    expect(keys).toEqual(['key-1', 'key-2']);
  });

  it('dừng retry sau số lần tối đa', async () => {
    const f = vi.fn<FetchLike>(async () => {
      throw new TypeError('offline');
    });
    await expect(client(f).get('/me')).rejects.toMatchObject({ code: 'NETWORK_ERROR' });
    expect(f).toHaveBeenCalledTimes(3);
  });

  it('401 → refresh → thử lại thành công, dùng token mới và cùng key', async () => {
    const f = vi
      .fn<FetchLike>()
      .mockResolvedValueOnce(fail(401, 'SESSION_EXPIRED'))
      .mockResolvedValueOnce(ok({ accessToken: 'new', expiresAt: 'x' }))
      .mockResolvedValueOnce(ok({ fine: 1 }));
    const api = client(f);
    api.setAccessToken('old');
    await expect(api.post('/shop/buy', {})).resolves.toEqual({ fine: 1 });
    expect(f.mock.calls[1]?.[0]).toBe('http://x/api/v1/auth/refresh');
    expect(headerOf(f.mock.calls[2]?.[1], 'Authorization')).toBe('Bearer new');
    expect(headerOf(f.mock.calls[2]?.[1], 'Idempotency-Key')).toBe('key-1');
  });

  it('refresh thất bại: trả lỗi 401 và xóa token', async () => {
    const f = vi.fn<FetchLike>(async () => fail(401, 'SESSION_EXPIRED'));
    const api = client(f);
    api.setAccessToken('old');
    await expect(api.get('/me')).rejects.toMatchObject({ code: 'SESSION_EXPIRED', status: 401 });
    expect(api.getAccessToken()).toBeNull();
    expect(f).toHaveBeenCalledTimes(2);
  });

  it('chỉ refresh một lần khi nhiều request cùng 401', async () => {
    let token = 'old';
    const f = vi.fn<FetchLike>(async (url, init) => {
      if (url.endsWith('/auth/refresh')) {
        token = 'new';
        return ok({ accessToken: 'new', expiresAt: 'x' });
      }
      return headerOf(init, 'Authorization') === `Bearer ${token}` && token === 'new'
        ? ok({ url })
        : fail(401, 'SESSION_EXPIRED');
    });
    const api = client(f);
    api.setAccessToken('old');
    await Promise.all([api.get('/a'), api.get('/b')]);
    const refreshCalls = f.mock.calls.filter((c) => c[0].endsWith('/auth/refresh'));
    expect(refreshCalls).toHaveLength(1);
  });

  it('lỗi 422 trả đúng code', async () => {
    const f = vi.fn<FetchLike>(async () => fail(422, 'INSUFFICIENT_GOLD'));
    const error = await client(f)
      .post('/shop/buy', {})
      .catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ code: 'INSUFFICIENT_GOLD', status: 422, retryable: false });
    expect(f).toHaveBeenCalledTimes(1);
  });

  it('quá 10 giây báo TIMEOUT', async () => {
    const f = vi.fn<FetchLike>(
      (_url, init) =>
        new Promise((_resolve, reject) => {
          init.signal?.addEventListener('abort', () => reject(new Error('aborted')));
        }),
    );
    await expect(client(f, 5).get('/me')).rejects.toMatchObject({ code: 'TIMEOUT' });
  });

  it('204 trả undefined', async () => {
    const f = vi.fn<FetchLike>(async () => new Response(null, { status: 204 }));
    await expect(client(f).post('/auth/logout')).resolves.toBeUndefined();
  });
});
