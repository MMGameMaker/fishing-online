// Hiệu ứng hiện/ẩn dùng chung cho mọi popup và nút DOM (feedback 2026-11-12):
// không bật/tắt tức thì mà fade in kèm phóng nhẹ (easing có nảy), fade out kèm thu nhỏ.
// CSS ở kit.css (.ui-in-*, .ui-out-*). Dùng thuộc tính `scale` riêng nên không đè `transform` của phần tử.

export type MotionKind = 'pop' | 'fade';

/** Thời gian hiệu ứng ra; khớp với kit.css. */
export const MOTION_OUT_MS = 160;

/** Bắt đầu hiệu ứng hiện. Gọi ngay trước hoặc sau khi gắn phần tử vào DOM. */
export function animateIn(el: HTMLElement, kind: MotionKind = 'pop'): void {
  el.classList.remove('ui-out-pop', 'ui-out-fade');
  el.classList.add(`ui-in-${kind}`);
}

/** Chạy hiệu ứng ẩn; resolve khi xong (hoặc quá hạn nếu trình duyệt không chạy animation). */
export function animateOut(el: HTMLElement, kind: MotionKind = 'pop'): Promise<void> {
  el.classList.remove('ui-in-pop', 'ui-in-fade');
  el.classList.add(`ui-out-${kind}`);
  return new Promise((resolve) => {
    const timer = window.setTimeout(resolve, MOTION_OUT_MS + 80);
    el.addEventListener(
      'animationend',
      (event) => {
        if (event.target !== el) return;
        window.clearTimeout(timer);
        resolve();
      },
      { once: true },
    );
  });
}

/** Ẩn có hiệu ứng rồi gỡ khỏi DOM; chặn bấm trong lúc đang ẩn. */
export async function removeWithMotion(el: HTMLElement, kind: MotionKind = 'pop'): Promise<void> {
  el.style.pointerEvents = 'none';
  await animateOut(el, kind);
  el.remove();
}
