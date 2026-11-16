/**
 * Có popup chính nào đang mở không (cửa hàng, túi đồ, Sổ tay, vé, Tài khoản, xếp hạng, hộp thoại xác nhận...).
 * Mọi popup đặt `aria-modal="true"` trên lớp phủ nên không cần đăng ký riêng; LakeScene dùng để giữ nhân vật
 * đứng yên và chặn phím/chuột vào map (feedback 2026-11-16). Popup đang đóng đã bỏ `pointer-events`
 * nhưng còn trên DOM tới hết hiệu ứng, nên bỏ qua lớp phủ đó.
 */
export function isModalOpen(root: ParentNode = document): boolean {
  for (const el of root.querySelectorAll<HTMLElement>('[aria-modal="true"]')) {
    if (el.style.pointerEvents !== 'none' && !el.closest('[hidden]')) return true;
  }
  return false;
}
