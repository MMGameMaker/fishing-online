import type { ClientErrorCode, ErrorCode } from '../../net/contract';

/** Câu hiển thị cho từng mã lỗi ở SPEC mục 5. Kiểu Record bắt buộc đủ mọi mã. */
export const ERROR_TEXT: Record<ErrorCode | ClientErrorCode, string> = {
  UNAUTHENTICATED: 'Bạn cần đăng nhập để tiếp tục.',
  SESSION_EXPIRED: 'Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại.',
  VALIDATION_FAILED: 'Dữ liệu gửi lên không hợp lệ.',
  IDEMPOTENCY_CONFLICT: 'Yêu cầu bị trùng với một thao tác khác.',
  RATE_LIMITED: 'Bạn thao tác quá nhanh, hãy thử lại sau.',
  SEAT_TAKEN: 'Ghế đang được sử dụng.',
  SEAT_COOLDOWN: 'Ghế đang trong thời gian chờ, hãy thử lại sau ít giây.',
  ALREADY_HAS_SEAT: 'Bạn đang giữ một ghế khác.',
  NOT_IN_SEAT: 'Bạn cần giữ ghế để thực hiện việc này.',
  OUT_OF_RANGE: 'Bạn đã đi ra ngoài phạm vi cho phép.',
  INSUFFICIENT_GOLD: 'Bạn không đủ Gold.',
  ATTEMPT_ACTIVE: 'Bạn đang trong một lần câu.',
  NO_ACTIVE_ATTEMPT: 'Lần câu này không còn hiệu lực.',
  BITE_EXPIRED: 'Bạn bấm quá chậm, cá đã thoát.',
  TAP_REJECTED: 'Lần bấm không hợp lệ.',
  ROD_NOT_OWNED: 'Bạn chưa sở hữu cần câu này.',
  ROD_ALREADY_OWNED: 'Bạn đã sở hữu cần câu này.',
  FISH_NOT_FOUND: 'Không tìm thấy con cá này trong túi.',
  INVALID_DURATION: 'Thời lượng giữ ghế không hợp lệ.',
  PRICE_CHANGED: 'Giá ghế vừa thay đổi, hãy xác nhận lại.',
  SEAT_SESSION_EXPIRED: 'Phiên giữ ghế đã kết thúc, không thể gia hạn.',
  STATE_CONFLICT: 'Không thể thực hiện lúc này.',
  NETWORK_ERROR: 'Không kết nối được máy chủ.',
  TIMEOUT: 'Máy chủ phản hồi quá lâu, hãy thử lại.',
};

export function errorTextFor(code: string): string {
  return ERROR_TEXT[code as ErrorCode | ClientErrorCode] ?? 'Đã có lỗi xảy ra.';
}
