// Toàn màn hình trên điện thoại/máy tính bảng (feedback 2026-11-19): màn đăng nhập/menu chưa bật; vào tới hồ thì bật,
// và mỗi lần người chơi chạm lại trong game mà đang không toàn màn hình thì bật lại.
// Trình duyệt chỉ cho vào toàn màn hình ngay trong thao tác chạm thật của người chơi, nên phải gọi đồng bộ
// trong sự kiện chạm, không `await` gì trước. iPhone Safari không có Fullscreen API: lệnh tự bỏ qua.
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

let guardOn = false;
let guardListening = false;

function onTouch(): void {
  if (guardOn) enterMobileFullscreen();
}

/**
 * Bật/tắt chế độ "đang trong game". Bật: thử vào toàn màn hình ngay (có thể bị từ chối vì đã quá lâu sau lần chạm
 * cuối) và từ giờ mỗi lần chạm/bấm phím trên trang mà chưa toàn màn hình thì bật lại. Tắt (về đăng nhập/menu): ngừng.
 */
export function setFullscreenGuard(on: boolean): void {
  guardOn = on && isTouchDevice();
  if (!guardOn) return;
  enterMobileFullscreen();
  if (guardListening) return;
  guardListening = true;
  // Pha capture để vẫn chạy khi game/popup chặn sự kiện nổi lên.
  document.addEventListener('pointerup', onTouch, true);
  document.addEventListener('keydown', onTouch, true);
}
