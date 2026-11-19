// Khung hiển thị của trang. pier.html trên điện thoại đang để dọc thì xoay cả `body` 90° theo chiều kim đồng hồ
// (feedback 2026-11-19), nên toạ độ màn hình thật và toạ độ bố cục (trong body) lệch trục nhau.
// Mọi chỗ đọc `getBoundingClientRect()`/`clientX` để tính vị trí trong UI phải đi qua file này.
// Không xoay (mọi trang khác, màn ngang, máy tính) thì các hàm trả đúng giá trị gốc của trình duyệt.

let rotated = false;
/** Chiều rộng màn hình thật (px) lúc bật xoay; cạnh dài của body xoay. */
let screenWidth = 0;

export interface LocalRect {
  left: number;
  top: number;
  right: number;
  bottom: number;
  width: number;
  height: number;
}

/** Trang bật/tắt xoay (gọi từ mobileFrame của pier). `width` = `window.innerWidth` lúc đó. */
export function setViewRotated(on: boolean, width: number): void {
  rotated = on;
  screenWidth = width;
}

export function isViewRotated(): boolean {
  return rotated;
}

/** Cỡ khung bố cục: đã xoay thì chiều rộng/cao đổi chỗ so với cửa sổ. */
export function frameSize(): { width: number; height: number } {
  return rotated
    ? { width: window.innerHeight, height: window.innerWidth }
    : { width: window.innerWidth, height: window.innerHeight };
}

/**
 * Đổi một điểm trên màn hình thật (clientX/clientY) sang toạ độ bố cục.
 * Body xoay 90° cùng chiều kim đồng hồ nên điểm bố cục (x, y) nằm ở màn hình tại (W − y, x), với W = chiều rộng màn hình.
 */
export function toLocal(x: number, y: number): { x: number; y: number } {
  return rotated ? { x: y, y: screenWidth - x } : { x, y };
}

/** Điểm chạm của sự kiện con trỏ, theo toạ độ bố cục. */
export function localPoint(event: { clientX: number; clientY: number }): { x: number; y: number } {
  return toLocal(event.clientX, event.clientY);
}

/** Hình chữ nhật của phần tử theo toạ độ bố cục (khác `getBoundingClientRect()` khi trang đang xoay). */
export function localRect(el: Element): LocalRect {
  const rect = el.getBoundingClientRect();
  if (!rotated) return rect;
  const left = rect.top;
  const top = screenWidth - rect.right;
  const width = rect.height;
  const height = rect.width;
  return { left, top, right: left + width, bottom: top + height, width, height };
}
