// Hàm thuần cho khung chat: giờ gửi, chuẩn hoá tin trước khi gửi.

/** Khớp Social:ChatMaxLength của Server; Server kiểm tra lại. */
export const CHAT_MAX_LENGTH = 160;

/** Giờ hiển thị HH:MM:SS theo giờ máy; thiếu sentAt (mock cũ) thì dùng thời điểm nhận. */
export function formatChatTime(sentAt: string | undefined, receivedAtMs: number): string {
  const ms = sentAt ? Date.parse(sentAt) : NaN;
  const date = new Date(Number.isFinite(ms) ? ms : receivedAtMs);
  return [date.getHours(), date.getMinutes(), date.getSeconds()]
    .map((part) => String(part).padStart(2, '0'))
    .join(':');
}

/** Bỏ khoảng trắng thừa; rỗng thì null (không gửi). Độ dài do ô nhập giới hạn sẵn. */
export function normalizeChat(text: string): string | null {
  const trimmed = text.replace(/\s+/g, ' ').trim();
  if (!trimmed) return null;
  return [...trimmed].slice(0, CHAT_MAX_LENGTH).join('');
}

export function chatCounter(text: string): string {
  return `${[...text].length}/${CHAT_MAX_LENGTH}`;
}
