# Contract nền tảng và nguồn gameplay hiện hành

Cập nhật 2026-11-09: phần gameplay 0.1-draft cũ đã được rút để tránh hai nguồn mâu thuẫn. Đọc [SPEC_CHUNG 0.3](../v01/SPEC_CHUNG.md) và [GAMEPLAY_SCOPE](../../doc/GAMEPLAY_SCOPE.md); kỹ thuật v01 đang đề xuất, quyết định user ghi nhãn Chốt. Auth chi tiết tại [ACCOUNT_AUTH](../be/ACCOUNT_AUTH.md), Client/BE vẫn cần xác nhận trước tích hợp.

## Đang chạy trong scaffold

| Endpoint | Auth | Response |
| --- | --- | --- |
| GET /health/live | Public | 200 `{ "status":"alive" }` |
| GET /health/ready | Public | 200 `{ "status":"ready", "checks":{"postgres":"ready","redis":"ready"} }`; 503 khi thiếu config/schema/migration hoặc dependency lỗi, check tương ứng là `notReady`; không trả lỗi nội bộ |
| GET /api/v1/bootstrap | Public | 200 `{ "contractVersion":"0.1-draft", "mode":"transport-only", "gameplayAvailable":false, "hubPath":"/hubs/game" }` |
| /hubs/game → Ping() | Development only, diagnostic | `{ "contractVersion":"0.1-draft", "serverTime":"ISO-8601 UTC" }` |

## Thay đổi cần Client/Admin áp dụng

- Chỉ Manual, 5 cần/9 loài, chiều dài integer lengthTenthCm, không bốn slot/Idle/CancelFishing tự nguyện, không ví vé theo số lượt.
- Thính đã bỏ: không API UseChum, effect, item hay shop offer tương ứng.
- BuySeatTicket nhận requestId/seatId/durationUnits/expectedPriceVersion; ExtendSeatSession nhận requestId/sessionId/durationUnits/expectedPriceVersion. Server tính giá và trừ Gold + ledger + mua/gia hạn + receipt atomic. Retry không tạo charge hoặc thời gian lặp.
- Snapshot MySeatSession gồm sessionId/startedAt/expiresAt/purchasedMinutes/sessionVersion/priceVersion; Gold là chuỗi số nguyên. expiresAt gia hạn = hạn cũ + thời gian thêm, chỉ khi phiên còn hiệu lực.
- Ví dụ 10 phút/100 hoặc 200 Gold không là giá cuối; config block/giới hạn/giá còn được duyệt. Client phải xác nhận quote mới khi PRICE_CHANGED, không retry mua/gia hạn với ID mới một cách mù.
- Quần thể hữu hạn và Admin đợt thả là scope đã chọn; contract tồn/reservation/cạn cá chờ lead/GD. Mock chưa phải tích hợp thật.

Quy ước envelope, HTTP lỗi, ack/event/revision/auth/CSRF/idempotency lấy ở SPEC và auth source. Không có API gameplay nào trong danh sách này đã được scaffold triển khai.
