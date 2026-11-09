# Quy tắc làm việc — Fishing Online

Áp dụng cho GD và ba nhóm triển khai: Server (BE), Web Client, Admin Tool cùng mọi AI agent làm việc trong repository này. Playable dùng 2D Pixel Art, Phaser Engine + TypeScript; Server ASP.NET Core + SignalR + PostgreSQL + Redis; Admin React + TypeScript. Web Client kiêm Art/asset 2D, không tách vai trò Art riêng. Quyết định hiện hành trong docs/PROJECT.md thay thế các chỉ dẫn cũ không còn phù hợp.

- Đọc `docs/README.md` trước khi bắt đầu; dùng `docs/` làm nơi trao đổi công việc chung giữa các agent.
- Đọc nguồn thiết kế liên quan trong `docs/PROJECT.md` và bàn giao còn mở trong `docs/HANDOFF.md`. Không mặc định agent biết lịch sử chat khác.
- Chỉ sửa tài liệu và mã thuộc phạm vi công việc đang được giao. Không ghi đè thay đổi của người khác. Nếu cùng sửa một file, phân chia phạm vi trước.
- Phân biệt quyết định đã duyệt, đề xuất và kết quả đã kiểm chứng. Không tự biến đề xuất thành yêu cầu đã chốt.
- Mỗi việc phối hợp dùng một file `docs/work/<ID>-<ten-viec>.md` theo mẫu `_TEMPLATE.md`; dùng ID S/W/A trong doc Notion Phân rã công việc Playable v0.1. GD, Web Client, Server và Admin Tool cập nhật phần tham gia. HANDOFF.md chỉ là danh mục việc đang mở, không sao chép backlog dự kiến.
- Cuối lượt làm việc có thay đổi đáng kể: cập nhật phần vai trò của mình, kèm đầu ra, kiểm tra thực tế và bước tiếp theo. Không báo Xong toàn việc khi chỉ hoàn tất một vai trò.
- Client và BE thống nhất contract trước khi tích hợp. Client có thể dùng mock theo contract trong lúc BE phát triển; ghi rõ mock chưa phải tích hợp thật.
- Khi sửa song song, chỉ sửa phần đã nhận. Phần contract/chung phải ghi một người hoặc agent chịu trách nhiệm chỉnh sửa. Đọc lại file nếu đã thay đổi trên đĩa; không ghi đè từ bản cũ.
- Nếu thay đổi yêu cầu đã chốt, ghi đề xuất và tác động; chỉ cập nhật quyết định sau khi người dùng duyệt. Các lựa chọn triển khai thông thường trong phạm vi đã giao không cần xin duyệt lại.
- Không tạo thêm tầng tài liệu, task tracker, biên bản hoặc báo cáo định kỳ nếu các file hiện tại đã đủ dùng.
- Không lưu mật khẩu, token hoặc thông tin thanh toán trong tài liệu.
