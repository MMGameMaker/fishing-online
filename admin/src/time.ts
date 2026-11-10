/** Độ lệch (ms) của múi giờ so với UTC tại một thời điểm. */
function offsetMs(instant: number, timeZone: string): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(new Date(instant));
  const get = (type: string) => Number(parts.find((part) => part.type === type)?.value ?? 0);
  const asUtc = Date.UTC(get('year'), get('month') - 1, get('day'), get('hour'), get('minute'), get('second'));
  return asUtc - Math.floor(instant / 1000) * 1000;
}

/** Đổi giờ nhập ("2026-11-10T08:00") theo múi giờ đã chọn sang ISO UTC. Múi giờ chỉ dùng để nhập/hiển thị. */
export function zonedToUtc(local: string, timeZone: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(local);
  if (!match) throw new Error('Giờ không hợp lệ.');
  const [, year, month, day, hour, minute] = match.map(Number) as [number, number, number, number, number, number];
  const naive = Date.UTC(year, month - 1, day, hour, minute);
  let utc = naive - offsetMs(naive, timeZone);
  utc = naive - offsetMs(utc, timeZone);
  return new Date(utc).toISOString();
}

export function formatTime(iso: string | null | undefined, timeZone?: string): string {
  if (!iso) return '—';
  return new Intl.DateTimeFormat('vi-VN', { dateStyle: 'short', timeStyle: 'medium', timeZone }).format(new Date(iso));
}

export const TIME_ZONES = ['Asia/Ho_Chi_Minh', 'UTC', 'Asia/Tokyo', 'Europe/London', 'America/Los_Angeles'];
