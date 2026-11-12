// Đổi tên tài khoản Google thành tên hiển thị hợp lệ của game (giống luật Server: 3–16 ký tự,
// chữ/số/khoảng trắng/_). Hàm thuần.

const ALLOWED = /[^\p{L}\p{N} _]/gu;
const MIN_LENGTH = 3;
const MAX_LENGTH = 16;

/** Tên Server tự đặt cho người chơi mới (`Fisher` + 8 ký tự hex), coi như chưa đặt tên. */
export const DEFAULT_NAME_PATTERN = /^Fisher[0-9a-f]{8}$/i;

export function toDisplayName(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const cleaned = raw.normalize('NFC').replace(ALLOWED, '').replace(/\s+/g, ' ').trim();
  const cut = [...cleaned].slice(0, MAX_LENGTH).join('').trim();
  return [...cut].length >= MIN_LENGTH ? cut : null;
}

/**
 * Có nên đổi tên theo Google không: mock luôn đổi; Server thật chỉ đổi khi người chơi
 * vẫn mang tên mặc định, để không ghi đè tên họ đã tự đổi.
 */
export function shouldApplyGoogleName(
  current: string,
  googleName: string | null,
  isMock: boolean,
): googleName is string {
  if (!googleName || googleName === current) return false;
  return isMock || DEFAULT_NAME_PATTERN.test(current);
}
