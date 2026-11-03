# Quy trình phát triển

## Một vòng công việc

1. Đọc nguồn scope, đặc tả liên quan và bàn giao đang mở. Dùng ID S01–S13, W01–W13, A01–A06 theo backlog; không tự đặt lại hoặc tự nhận toàn bộ backlog.
2. Với việc phối hợp, dùng `docs/work/<ID>-<ten-viec>.md` theo mẫu có sẵn và đăng vào `docs/HANDOFF.md` khi thực sự bắt đầu. Không tạo tracker thứ hai trong `doc/`. Nếu chưa có hệ bàn giao, thống nhất nguồn dùng chung trước khi chia việc.
3. Ghi người phụ trách, phạm vi file, dependency, tiêu chí nghiệm thu và câu hỏi còn mở. Chỉ sửa phần đã nhận; chỉ định một người sửa contract/chung.
4. GD chốt đầu vào theo từng lát, bổ sung phase câu dần; không đợi toàn bộ GDD mới bootstrap. Client/BE/Admin thống nhất contract trước tích hợp. Client làm mock/fixture theo interface chung trong khi BE dùng API test/harness độc lập; BE nhận chỉnh nguồn contract chung sau Client xác nhận. Có thể phát triển bằng mock theo contract; ghi rõ chưa tích hợp thật.
5. Làm phần độc lập trong lúc chờ dependency; kiểm tra đơn vị và luồng thực tế phù hợp thay đổi. Mở PR kèm bằng chứng.
6. Tích hợp Client–BE–Admin theo phần áp dụng, QA đối chiếu acceptance và GD kiểm tra luật. Không đóng toàn việc khi mới xong một vai trò.
7. Cuối lượt có thay đổi đáng kể, cập nhật đầu ra, kiểm tra thực tế, vấn đề còn lại và bước tiếp theo vào phần vai trò. Khi hoàn tất, bỏ khỏi danh mục đang mở, giữ lịch sử file việc.

## Trách nhiệm

| Vai trò | Đầu ra chính |
| --- | --- |
| GD | Vòng chơi, công thức, bảng dữ liệu, tình huống biên, acceptance |
| Web Client + Art | Scene/input/UI Cocos, asset 2D, mock và tích hợp thật |
| Server | Luật authoritative, API/SignalR, giao dịch, persistence, audit |
| Admin (BE thực hiện) | UI React/TS cấu hình/tra cứu, validate/publish qua Admin API; cùng tải BE |
| QA | Kịch bản, bằng chứng, lỗi và kết quả kiểm lại |

Thay đổi luật/scope đã duyệt: ghi đề xuất, lý do và tác động lên dữ liệu, contract, asset, lịch; chờ người dùng duyệt trước khi đổi quyết định. Lựa chọn triển khai thông thường trong phạm vi đã giao không cần xin lại.

Khi file có người khác sửa, đọc bản trên đĩa trước khi chỉnh. Không ghi đè từ bản cũ; cùng sửa một đoạn thì chia lại phạm vi hoặc bàn giao tuần tự. Không lưu log dài, hội thoại, secret vào tài liệu.
