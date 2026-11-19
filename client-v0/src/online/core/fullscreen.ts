// Toàn màn hình trên điện thoại/máy tính bảng, bật khi người chơi bấm CHƠI hoặc nút Google (feedback 2026-11-19).
// Trình duyệt chỉ cho vào toàn màn hình ngay trong thao tác chạm thật của người chơi, nên phải gọi đồng bộ
// trong sự kiện click, không `await` gì trước. iPhone Safari không có Fullscreen API: lệnh tự bỏ qua.
import { isTouchDevice } from './device';

type FullscreenElement = HTMLElement & {
  webkitRequestFullscreen?: () => Promise<void> | void;
};
type LockableOrientation = ScreenOrientation & { lock?: (orientation: string) => Promise<void> };

function isFullscreen(): boolean {
  return Boolean(document.fullscreenElement);
}

/** Cả trang (không chỉ #game) vào toàn màn hình để toast/popup gắn trên body vẫn hiện. */
export function enterMobileFullscreen(): void {
  if (!isTouchDevice() || isFullscreen()) return;
  const el = document.documentElement as FullscreenElement;
  try {
    const result = el.requestFullscreen
      ? el.requestFullscreen({ navigationUI: 'hide' })
      : el.webkitRequestFullscreen?.();
    // Khoá ngang chỉ chạy được khi đang toàn màn hình (Android Chrome); không khoá được thì pier tự xoay bằng CSS.
    void Promise.resolve(result)
      .then(() => (screen.orientation as LockableOrientation | undefined)?.lock?.('landscape'))
      .catch(() => undefined);
  } catch {
    // Trình duyệt từ chối: bỏ qua, game vẫn chơi bình thường ở chế độ thường.
  }
}

let retryArmed = false;

/**
 * Cơ hội thứ hai: cửa sổ đăng nhập Google (popup) có thể làm mất quyền bật toàn màn hình hoặc thoát nó
 * khi quay lại trang. Chạm tiếp theo trên trang, nếu vẫn chưa toàn màn hình thì bật. Chỉ một lần.
 */
export function armFullscreenRetry(): void {
  if (retryArmed || !isTouchDevice()) return;
  retryArmed = true;
  document.addEventListener('pointerup', enterMobileFullscreen, { once: true, capture: true });
}
