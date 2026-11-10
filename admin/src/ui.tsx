import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { ApiError, api, describeError } from './api';
import type { Page } from './types';

export function ErrorBanner({ error }: { error: unknown }) {
  if (!error) return null;
  return (
    <p className="error" role="alert">
      {describeError(error)}
    </p>
  );
}

/** Hiển thị đúng trạng thái đang tải, bị từ chối, lỗi hoặc rỗng trước khi vẽ nội dung. */
export function Status({ loading, error, empty, children }: { loading: boolean; error: unknown; empty?: boolean; children: ReactNode }) {
  if (error instanceof ApiError && error.code === 'FORBIDDEN') return <p className="denied">Bạn không có quyền xem mục này.</p>;
  if (error) return <ErrorBanner error={error} />;
  if (loading) return <p className="muted">Đang tải…</p>;
  if (empty) return <p className="muted">Chưa có dữ liệu.</p>;
  return <>{children}</>;
}

export function useLoad<T>(load: () => Promise<T>, deps: unknown[]) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [loading, setLoading] = useState(true);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const run = useCallback(load, deps);
  const reload = useCallback(async () => {
    setLoading(true);
    try {
      setData(await run());
      setError(null);
    } catch (caught) {
      setError(caught);
    } finally {
      setLoading(false);
    }
  }, [run]);
  useEffect(() => {
    void reload();
  }, [reload]);
  return { data, error, loading, reload, setData };
}

/** Danh sách phân trang cursor của Admin API, có nút tải thêm. */
export function usePaged<T>(path: string | null) {
  const [items, setItems] = useState<T[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [loading, setLoading] = useState(false);

  const fetchPage = useCallback(
    async (after: string | null, replace: boolean) => {
      if (!path) return;
      setLoading(true);
      try {
        const separator = path.includes('?') ? '&' : '?';
        const page = await api<Page<T>>('GET', after ? `${path}${separator}cursor=${encodeURIComponent(after)}` : path);
        setItems((previous) => (replace ? page.items : [...previous, ...page.items]));
        setCursor(page.nextCursor);
        setError(null);
      } catch (caught) {
        setError(caught);
      } finally {
        setLoading(false);
      }
    },
    [path],
  );

  useEffect(() => {
    setItems([]);
    void fetchPage(null, true);
  }, [fetchPage]);

  const reload = useCallback(() => fetchPage(null, true), [fetchPage]);

  return {
    items,
    error,
    loading,
    hasMore: cursor !== null,
    loadMore: () => fetchPage(cursor, false),
    reload,
  };
}

export function JsonCell({ value }: { value: string | null }) {
  if (!value) return <span className="muted">—</span>;
  return (
    <details>
      <summary>Xem</summary>
      <pre>{JSON.stringify(JSON.parse(value), null, 2)}</pre>
    </details>
  );
}
