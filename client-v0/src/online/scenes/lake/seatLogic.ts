// Logic hiển thị ghế/vé theo scope 2026-11-10 (vé theo thời gian, không gắn ghế), hàm thuần.
import type { TicketPricingConfig } from '../../core/gameplayConfig';

export const NEAR_SEAT_PX = 64;
/** Giới hạn của giao diện; Server kiểm tra lại theo ticketPricing.maxUnitsPerPurchase. */
export const MAX_UI_DURATION_UNITS = 6;

export const SEAT_COLORS = { available: 0x4fbf6a, occupied: 0xd9534f } as const;

export function isNearSeat(x: number, y: number, seat: { x: number; y: number }): boolean {
  return Math.hypot(x - seat.x, y - seat.y) <= NEAR_SEAT_PX;
}

/** Phút và tổng Gold chỉ để hiển thị xác nhận; Server tính lại khi thanh toán. */
export function priceSummary(
  pricing: TicketPricingConfig,
  units: number,
): { minutes: number; total: string } {
  return {
    minutes: units * pricing.billingUnitMinutes,
    total: String(BigInt(pricing.unitPriceGold) * BigInt(units)),
  };
}

export function formatClock(remainingMs: number): string {
  const totalSeconds = Math.max(0, Math.ceil(remainingMs / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

const SEAT_END_TEXT: Record<string, string> = {
  left_seat: 'Bạn đã rời ghế.',
  left_lake: 'Bạn đã rời khu vực câu cá nên mất ghế.',
  missed_bite: 'Bạn không thu cần kịp nên đã tự đứng dậy.',
  ticket_expired: 'Vé câu cá đã hết hạn nên bạn tự đứng dậy.',
  disconnect_timeout: 'Bạn đã mất ghế do mất kết nối quá lâu.',
};

export function sessionEndText(reason: string): string {
  return SEAT_END_TEXT[reason] ?? 'Phiên giữ ghế đã kết thúc.';
}
