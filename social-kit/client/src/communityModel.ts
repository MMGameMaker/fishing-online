// Logic thuần của popup Cộng đồng: địa chỉ chia sẻ Facebook, nhãn nhà cung cấp, kiểm tra mã nhập.
import type { CommunityView, ShareKind } from './types';

/** Hộp thoại chia sẻ của Facebook (không cần Meta app); người chơi tự chọn "trang cá nhân" hoặc "nhóm" trong cửa sổ đó. */
export function facebookShareUrl(shareUrl: string): string {
  return `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`;
}

/** Chỉ mở liên kết https (tránh javascript: hay địa chỉ lạ trong cấu hình). */
export function safeHttpsUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:' ? parsed.toString() : null;
  } catch {
    return null;
  }
}

export function providerLabel(provider: string | null): string {
  if (provider === 'facebook.com') return 'Ảnh từ Facebook';
  if (provider === 'google.com') return 'Ảnh từ Google';
  return 'Chưa có ảnh tài khoản';
}

/** Mã nhóm hợp lệ để gửi: bỏ khoảng trắng hai đầu, 3-64 ký tự chữ số và gạch. */
export function normalizeGroupCode(raw: string): string | null {
  const code = raw.trim();
  return /^[A-Za-z0-9_-]{3,64}$/.test(code) ? code : null;
}

export const SHARE_LABEL: Record<ShareKind, string> = {
  feed: 'Chia sẻ lên Facebook',
  group: 'Chia sẻ vào nhóm',
};

export function sharesTotal(view: Pick<CommunityView, 'shares'>): number {
  return view.shares.feed + view.shares.group;
}
