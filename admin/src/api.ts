import type { AdminSession } from './types';

// Access token chỉ giữ trong bộ nhớ; refresh token nằm trong cookie HttpOnly do Server đặt.
const BASE = (import.meta.env.VITE_API_BASE as string | undefined) ?? 'http://localhost:5080';
const AUTH = '/api/v1/admin/auth';

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

let session: AdminSession | null = null;
let refreshing: Promise<AdminSession | null> | null = null;
const listeners = new Set<(value: AdminSession | null) => void>();

export function currentSession(): AdminSession | null {
  return session;
}

export function onSessionChange(listener: (value: AdminSession | null) => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function setSession(value: AdminSession | null): void {
  session = value;
  listeners.forEach((listener) => listener(value));
}

async function send(method: string, path: string, body?: unknown, headers: Record<string, string> = {}): Promise<Response> {
  const all: Record<string, string> = { ...headers };
  if (body !== undefined) all['Content-Type'] = 'application/json';
  if (session) all.Authorization = `Bearer ${session.accessToken}`;
  try {
    return await fetch(`${BASE}${path}`, {
      method,
      headers: all,
      body: body === undefined ? undefined : JSON.stringify(body),
      credentials: 'include',
    });
  } catch {
    throw new ApiError(0, 'NETWORK_ERROR', 'Không kết nối được Server.');
  }
}

async function read<T>(response: Response): Promise<T> {
  if (response.status === 204) return undefined as T;
  const json = (await response.json().catch(() => null)) as { data?: T; error?: { code: string; message: string } } | null;
  if (!response.ok) {
    throw new ApiError(response.status, json?.error?.code ?? 'HTTP_' + response.status, json?.error?.message ?? response.statusText);
  }
  return json?.data as T;
}

/** Gọi Admin API; gặp 401 thì thử refresh một lần rồi gửi lại. */
export async function api<T>(method: string, path: string, body?: unknown, options: { idempotencyKey?: string } = {}): Promise<T> {
  const headers: Record<string, string> = options.idempotencyKey ? { 'Idempotency-Key': options.idempotencyKey } : {};
  let response = await send(method, path, body, headers);
  if (response.status === 401 && session && (await refresh())) response = await send(method, path, body, headers);
  return read<T>(response);
}

export async function login(firebaseIdToken: string): Promise<AdminSession> {
  const value = await read<AdminSession>(await send('POST', `${AUTH}/login`, { firebaseIdToken }));
  setSession(value);
  return value;
}

/** Dùng cookie để lấy lại phiên; nhiều request cùng lúc chỉ refresh một lần. */
export function refresh(): Promise<AdminSession | null> {
  refreshing ??= (async () => {
    try {
      const value = await read<AdminSession>(await send('POST', `${AUTH}/refresh`));
      setSession(value);
      return value;
    } catch {
      setSession(null);
      return null;
    } finally {
      refreshing = null;
    }
  })();
  return refreshing;
}

export async function logout(): Promise<void> {
  await send('POST', `${AUTH}/logout`).catch(() => undefined);
  setSession(null);
}

export function describeError(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.code === 'FORBIDDEN') return 'Bạn không có quyền thực hiện thao tác này.';
    if (error.code === 'STATE_CONFLICT') return `Dữ liệu vừa bị người khác thay đổi. Tải lại rồi thử lại. (${error.message})`;
    return `${error.code}: ${error.message}`;
  }
  return error instanceof Error ? error.message : String(error);
}

export function newKey(): string {
  return crypto.randomUUID();
}
