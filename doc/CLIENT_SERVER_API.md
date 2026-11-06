# Giao tiếp Client–Server và Admin API

Đây là hướng dẫn lập contract; chưa khai báo endpoint/event có thật. Client và BE thống nhất trước tích hợp, chỉ định một người chỉnh phần chung. BE thực hiện cả Admin React/TS và Server. BE chỉnh nguồn contract chung sau Client xác nhận; Client sở hữu adapter/fixture. Chốt schema tối thiểu để Client mock và BE test qua harness độc lập, không chờ toàn bộ phase câu.

## Mỗi contract cần có

- Tên và phiên bản, chủ sở hữu, trạng thái đề xuất/đã thống nhất, bên dùng.
- HTTP method/path hoặc SignalR hub/method/event; auth và quyền, request/response/event mẫu, schema và nullability.
- ID, enum, đơn vị chiều dài/tiền/thời gian, timezone, giới hạn và thứ tự dữ liệu. Không truyền Gold bằng số thực nếu cần chính xác nguyên đơn vị.
- Điều kiện hợp lệ, lỗi nghiệp vụ, lỗi xác thực, timeout, retry, trạng thái sau lỗi và cách lấy snapshot.
- Với mua/tiêu hao/nhận thưởng: quy tắc chống xử lý trùng, phạm vi và thời hạn request ID, phản hồi khi gửi lại. Không retry mù thao tác thay đổi tài nguyên.
- Với realtime: thứ tự/phiên bản trạng thái, xử lý event trễ/trùng, reconnect, snapshot và đồng bộ lại. Không giả định mất kết nối nghĩa là thao tác chưa xảy ra.

## Contract mới cần cho v1

Catalog/quyền/chọn skin và SkinChanged/snapshot; gửi chat/emoji, khoe catch đã xác thực; ranking phân trang có chỉ số/phạm vi/chu kỳ/đồng hạng/update time. Tên API/event cụ thể cần hai bên thống nhất; luật social/ranking cần GD chốt. Loot API để sau, không chặn bản đầu.

## Ranh giới trách nhiệm

Client gửi ý định; Server kiểm tra quyền, ghế, vé, trang bị, luật và quyết định cá/tiền/loot. Không tin giá, phần thưởng hoặc player ID do Client tự gửi. Hai người chọn ghế cuối hoặc gửi cùng request tài nguyên phải có kết quả nhất quán từ Server.

PostgreSQL lưu trạng thái bền vững và giao dịch theo thiết kế BE; Redis hỗ trợ trạng thái nhanh/cache/coordination theo thiết kế cụ thể. Không coi cache là bằng chứng duy nhất của ledger. Quyền sở hữu phòng, cơ chế khóa và phục hồi là phần BE phải mô tả, chưa được chốt ở đây.

Admin gọi Admin API của Server, kiểm tra quyền ở Server; không kết nối database trực tiếp từ trình duyệt. Publish cấu hình phải validate và lưu audit phù hợp.

Mock dùng cùng schema/version và có tình huống thành công/lỗi. Khi đổi contract, ghi tác động tới Client/BE/Admin, tương thích bản cũ, migration nếu có và cập nhật mock. Nghiệm thu cần chạy với Server thật, gồm reconnect, tranh chấp và request lặp.
