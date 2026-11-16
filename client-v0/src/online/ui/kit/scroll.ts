/**
 * Giữ vị trí cuộn của các vùng cuộn khớp `selector` trong `container` qua một lần dựng lại nội dung
 * (feedback 2026-11-16: chọn cá hoặc trang bị không được kéo danh sách về đầu).
 * Gọi trước khi thay nội dung, rồi gọi hàm trả về sau khi nội dung mới đã nằm trong DOM.
 * Vùng cuộn khớp theo thứ tự xuất hiện.
 */
export function snapshotScroll(container: HTMLElement, selector: string): () => void {
  const saved = [...container.querySelectorAll<HTMLElement>(selector)].map((el) => ({
    top: el.scrollTop,
    left: el.scrollLeft,
  }));
  return () => {
    const next = container.querySelectorAll<HTMLElement>(selector);
    saved.forEach((pos, index) => {
      const el = next[index];
      if (!el) return;
      el.scrollTop = pos.top;
      el.scrollLeft = pos.left;
    });
  };
}
