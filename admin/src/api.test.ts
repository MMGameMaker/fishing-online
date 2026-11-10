import { describe, expect, it, vi } from 'vitest';
import { ApiError, api, currentSession, login, logout } from './api';

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

const session = (token: string) => ({ data: { accessToken: token, expiresAt: '2026-11-10T00:05:00Z', email: 'ops@example.com', permissions: ['config.read'] } });

describe('api', () => {
  it('refreshes once on 401 and retries with the new token', async () => {
    const fetch = vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(json(200, session('old')))
      .mockResolvedValueOnce(json(401, { error: { code: 'UNAUTHENTICATED', message: 'expired' } }))
      .mockResolvedValueOnce(json(200, session('new')))
      .mockResolvedValueOnce(json(200, { data: [1, 2] }));
    await login('firebase-token');

    const result = await api<number[]>('GET', '/api/v1/admin/config/versions');

    expect(result).toEqual([1, 2]);
    expect(fetch.mock.calls[2]?.[0]).toContain('/api/v1/admin/auth/refresh');
    const retry = fetch.mock.calls[3]?.[1] as RequestInit;
    expect((retry.headers as Record<string, string>).Authorization).toBe('Bearer new');
    expect(retry.credentials).toBe('include');
    await logout();
  });

  it('turns the error envelope into ApiError', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(json(409, { error: { code: 'STATE_CONFLICT', message: 'changed' } }));

    const error = await api('PUT', '/x', {}).catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).code).toBe('STATE_CONFLICT');
    expect((error as ApiError).status).toBe(409);
  });

  it('sends the idempotency key header', async () => {
    const fetch = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(json(200, { data: {} }));

    await api('POST', '/api/v1/admin/stocking', {}, { idempotencyKey: 'k-1' });

    expect((fetch.mock.calls[0]?.[1]?.headers as Record<string, string>)['Idempotency-Key']).toBe('k-1');
    expect(currentSession()).toBeNull();
  });
});
