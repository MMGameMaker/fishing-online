// Nhận biết người chơi đang mở web trên điện thoại (feedback 2026-11-17: điện thoại không được vào game).
// Chỉ chặn điện thoại; máy tính bảng (Android không có "Mobile", iPad báo là Mac) vẫn vào được.
const PHONE_UA = /iPhone|iPod|Windows Phone|Android.+Mobile|Mobi/i;

interface UADataNavigator {
  userAgentData?: { mobile?: boolean };
}

/** Thiết bị cảm ứng chính (điện thoại, máy tính bảng); máy tính dùng chuột thì không. */
export function isTouchDevice(): boolean {
  return window.matchMedia?.('(pointer: coarse)').matches ?? false;
}

export function isPhone(nav: Navigator = navigator): boolean {
  const mobile = (nav as Navigator & UADataNavigator).userAgentData?.mobile;
  if (mobile === true) return true;
  return PHONE_UA.test(nav.userAgent);
}
