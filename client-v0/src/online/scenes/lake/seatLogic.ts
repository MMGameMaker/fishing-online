// Logic hiển thị ghế theo CL-B-05, hàm thuần.
import type { SeatView } from '../../net/contract';

export const NEAR_SEAT_PX = 64;
/** Giới hạn của giao diện; min/max thời lượng thật còn chờ GD và do Server kiểm tra. */
export const MAX_UI_DURATION_UNITS = 6;

export const SEAT_COLORS = { available: 0x4fbf6a, occupied: 0xd9534f, cooldown: 0x8a8a8a } as const;

export function isNearSeat(x: number, y: number, seat: { x: number; y: number }): boolean {
  return Math.hypot(x - seat.x, y - seat.y) <= NEAR_SEAT_PX;
}

export function cooldownSeconds(seat: SeatView, serverNowMs: number): number {
  if (seat.state !== 'cooldown' || seat.cooldownUntil === null) return 0;
  return Math.max(0, Math.ceil((Date.parse(seat.cooldownUntil) - serverNowMs) / 1000));
}

/** Phút và tổng Gold chỉ để hiển thị xác nhận; Server tính lại khi thanh toán. */
export function priceSummary(seat: SeatView, units: number): { minutes: number; total: string } {
  return {
    minutes: units * seat.billingUnitMinutes,
    total: String(BigInt(seat.unitPriceGold) * BigInt(units)),
  };
}

export function formatClock(remainingMs: number): string {
  const totalSeconds = Math.max(0, Math.ceil(remainingMs / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

const SESSION_END_TEXT: Record<string, string> = {
  expired: 'Đã hết thời gian giữ ghế.',
  left_seat: 'Bạn đã rời ghế.',
  left_lake: 'Bạn đã rời khu vực câu cá nên mất ghế.',
  disconnected: 'Bạn đã mất ghế do mất kết nối quá lâu.',
};

export function sessionEndText(reason: string): string {
  return SESSION_END_TEXT[reason] ?? 'Phiên giữ ghế đã kết thúc.';
}
