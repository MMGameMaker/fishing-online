// HTTP client theo SPEC mục 3. Access token chỉ giữ trong bộ nhớ, refresh token nằm ở cookie HttpOnly.
import type {
  ApiFailure,
  ApiSuccess,
  ClientErrorCode,
  ErrorCode,
  RefreshResponse,
} from './contract';

export type FetchLike = (input: string, init: RequestInit) => Promise<Response>;

export interface ApiClientOptions {
  /** Gốc Server, ví dụ http://localhost:5080. */
  baseUrl: string;
  fetchImpl?: FetchLike;
  timeoutMs?: number;
  maxRetries?: number;
  retryDelayMs?: number;
  uuid?: () => string;
  sleep?: (ms: number) => Promise<void>;
}

export class ApiError extends Error {
  constructor(
    readonly code: ErrorCode | ClientErrorCode,
    message: string,
    readonly retryable: boolean,
    readonly status: number | null = null,
    readonly traceId: string | null = null,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

const API_PREFIX = '/api/v1';
const DEFAULT_TIMEOUT_MS = 10_000;
const DEFAULT_MAX_RETRIES = 2;
const DEFAULT_RETRY_DELAY_MS = 300;

export class ApiClient {
  private accessToken: string | null = null;
  private refreshing: Promise<boolean> | null = null;
  private readonly fetchImpl: FetchLike;
  private readonly timeoutMs: number;
  private readonly maxRetries: number;
  private readonly retryDelayMs: number;
  private readonly uuid: () => string;
  private readonly sleep: (ms: number) => Promise<void>;

  constructor(private readonly options: ApiClientOptions) {
    this.fetchImpl = options.fetchImpl ?? ((input, init) => fetch(input, init));
    this.timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    this.maxRetries = options.maxRetries ?? DEFAULT_MAX_RETRIES;
    this.retryDelayMs = options.retryDelayMs ?? DEFAULT_RETRY_DELAY_MS;
    this.uuid = options.uuid ?? (() => crypto.randomUUID());
    this.sleep = options.sleep ?? ((ms) => new Promise((r) => setTimeout(r, ms)));
  }

  setAccessToken(token: string | null): void {
    this.accessToken = token;
  }

  getAccessToken(): string | null {
    return this.accessToken;
  }

  get<T>(path: string): Promise<T> {
    return this.request<T>('GET', path);
  }

  post<T>(path: string, body?: unknown): Promise<T> {
    return this.request<T>('POST', path, body);
  }

  put<T>(path: string, body?: unknown): Promise<T> {
    return this.request<T>('PUT', path, body);
  }

  /** Gọi refresh bằng cookie; trả true nếu đã có access token mới. */
  refreshSession(): Promise<boolean> {
    // Nhiều request cùng gặp 401 chỉ refresh một lần.
    this.refreshing ??= this.doRefresh().finally(() => {
      this.refreshing = null;
    });
    return this.refreshing;
  }

  private async request<T>(method: string, path: string, body?: unknown): Promise<T> {
    // Sinh key một lần cho cả chuỗi retry để Server không xử lý trùng.
    const key = method === 'POST' || method === 'PUT' ? this.uuid() : null;
    let refreshed = false;

    for (let attempt = 0; ;) {
      try {
        return await this.send<T>(method, path, body, key);
      } catch (error) {
        if (!(error instanceof ApiError)) throw error;
        if (error.status === 401 && !refreshed && !path.startsWith('/auth/')) {
          refreshed = true;
          if (await this.refreshSession()) continue;
          throw error;
        }
        if (!error.retryable || attempt >= this.maxRetries) throw error;
        attempt += 1;
        await this.sleep(this.retryDelayMs * attempt);
      }
    }
  }

  private async send<T>(
    method: string,
    path: string,
    body: unknown,
    idempotencyKey: string | null,
  ): Promise<T> {
    const headers: Record<string, string> = { Accept: 'application/json' };
    if (body !== undefined) headers['Content-Type'] = 'application/json';
    if (this.accessToken) headers.Authorization = `Bearer ${this.accessToken}`;
    if (idempotencyKey) headers['Idempotency-Key'] = idempotencyKey;

    const response = await this.fetchWithTimeout(`${this.options.baseUrl}${API_PREFIX}${path}`, {
      method,
      headers,
      credentials: 'include',
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    return this.parse<T>(response);
  }

  private async fetchWithTimeout(url: string, init: RequestInit): Promise<Response> {
    const controller = new AbortController();
    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, this.timeoutMs);
    try {
      return await this.fetchImpl(url, { ...init, signal: controller.signal });
    } catch {
      if (timedOut) throw new ApiError('TIMEOUT', 'Request timed out', true);
      throw new ApiError('NETWORK_ERROR', 'Network error', true);
    } finally {
      clearTimeout(timer);
    }
  }

  private async parse<T>(response: Response): Promise<T> {
    if (response.status === 204) return undefined as T;
    let payload: Partial<ApiSuccess<T> & ApiFailure> | null = null;
    try {
      payload = (await response.json()) as Partial<ApiSuccess<T> & ApiFailure>;
    } catch {
      payload = null;
    }
    if (response.ok && payload && 'data' in payload) return payload.data as T;

    if (payload?.error) {
      const { code, message, retryable } = payload.error;
      throw new ApiError(code, message, retryable, response.status, payload.traceId ?? null);
    }
    // Lỗi không theo envelope (proxy, 5xx): coi là lỗi mạng tạm thời.
    const retryable = response.status >= 500;
    throw new ApiError('NETWORK_ERROR', `HTTP ${response.status}`, retryable, response.status);
  }

  private async doRefresh(): Promise<boolean> {
    try {
      const result = await this.send<RefreshResponse>('POST', '/auth/refresh', undefined, null);
      this.accessToken = result.accessToken;
      return true;
    } catch {
      this.accessToken = null;
      return false;
    }
  }
}
