// Đăng nhập dev cho test nhiều người chơi trên máy local (người dùng chốt 2026-11-12):
// mở trang với ?dev=Tên thì vào thẳng bằng người chơi test, không qua Google.
// Chỉ có trong bản dev (import.meta.env.DEV) và Server phải chạy Development + Auth:DevBypass.

export interface DevIdentity {
  name: string;
  playerId: string;
}

/** UUID cố định theo tên (FNV-1a 128 bit đơn giản) để cùng tên thì vào lại đúng người chơi. Hàm thuần. */
export function devPlayerIdFor(name: string): string {
  const key = name.trim().toLowerCase();
  const words = [0x811c9dc5, 0x01000193, 0x9e3779b9, 0x85ebca6b];
  for (let i = 0; i < key.length; i++) {
    const code = key.charCodeAt(i);
    for (let w = 0; w < words.length; w++) {
      words[w] = Math.imul((words[w]! ^ (code + w * 131)) >>> 0, 0x01000193 + w * 2) >>> 0;
    }
  }
  const hex = words.map((w) => w.toString(16).padStart(8, '0')).join('');
  // Định dạng UUID v4 hợp lệ (đặt bit version/variant) để Server Guid.TryParse được.
  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    `4${hex.slice(13, 16)}`,
    `${((parseInt(hex[16]!, 16) & 0x3) | 0x8).toString(16)}${hex.slice(17, 20)}`,
    hex.slice(20, 32),
  ].join('-');
}

/** Đọc ?dev=Tên; ngoài bản dev luôn trả null. */
export function devIdentityFromUrl(
  search: string = typeof window === 'undefined' ? '' : window.location.search,
  isDev: boolean = import.meta.env.DEV,
): DevIdentity | null {
  if (!isDev) return null;
  const name = new URLSearchParams(search).get('dev')?.trim();
  if (!name) return null;
  return { name, playerId: devPlayerIdFor(name) };
}
