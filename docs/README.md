# Tài liệu chung — Fishing Online

GD, Web Client và BE (bao gồm Admin Tool) trao đổi qua Markdown trong thư mục này. Web Client kiêm Art/asset 2D. Chat dùng để thảo luận; thông tin để người/agent tiếp theo làm việc phải được lưu tại nguồn được liên kết rõ ràng.

## Cấu trúc

| Nơi lưu | Nội dung |
| --- | --- |
| [PROJECT.md](PROJECT.md) | Quyết định đã chốt, link Overview Notion và nguồn đặc tả |
| [HANDOFF.md](HANDOFF.md) | Danh mục việc đang mở, trạng thái từng vai trò, link file công việc |
| work/ | Một file mỗi công việc phối hợp, dùng [mẫu chung](work/_TEMPLATE.md) |
| gd/, client/, be/, admin/ | Đặc tả chuyên môn; asset thuộc client/assets/; chỉ tạo khi cần |
| contracts/ | Chỉ tách contract khi nhiều công việc dùng chung; còn lại ghi trong file công việc |

## Nguồn triển khai hiện tại

Đọc [GAMEPLAY_SCOPE](../doc/GAMEPLAY_SCOPE.md), [kế hoạch v01](v01/README.md), [SPEC_CHUNG 0.5](v01/SPEC_CHUNG.md) và fixture cùng phiên bản. Các tài liệu chuyên môn cũ dẫn về nguồn này; không dùng Notion cũ thay luật repo.

## Vai trò

Đầu ra BE S01: [kế hoạch](be/PLAN.md), [service/luồng chơi](be/ARCHITECTURE.md), [contract dự thảo](contracts/v1-draft.md), [kết nối Client](be/CLIENT_CONNECTION.md), [chạy server](../server/README.md).

- **GD:** luật gameplay, dữ liệu cân bằng, luồng chơi và tiêu chí nghiệm thu.
- **Web Client (kiêm Art/asset):** Phaser Engine + TypeScript; scene 2D Pixel Art, input, sprite/atlas/animation, UI game, API/realtime và toàn bộ chuẩn bị/tích hợp asset 2D.
- **BE:** luật server, phòng/ghế, kết quả câu, dữ liệu, kinh tế, xác thực và API/realtime.
- **Admin Tool (BE thực hiện):** React + TypeScript riêng; cấu hình, validate/publish, tra cứu và audit qua Admin API của Server. Không tự định nghĩa luật khác Server.
- **Nguồn asset do Web Client quản lý:** mua sẵn/import/AI tạo; dùng placeholder khi thiếu. Ghi nguồn/quyền sử dụng; concept chưa phải sprite sheet/tileset runtime đã kiểm tra. Bàn giao trong phần Client, không tạo vai trò Art riêng. Mua khi asset/ngân sách đã được duyệt.

Client không tự quyết định cá, tiền hoặc phần thưởng. BE không tự đổi luật GD đã chốt. Vai trò không bắt buộc là những người/agent khác nhau.

## Quy trình tinh gọn

1. Đọc PROJECT.md, nguồn đặc tả liên quan và file công việc trước khi làm. Không mặc định biết lịch sử chat khác.
2. Dùng lại hoặc tạo một file work/<ID>-<ten-viec>.md. Ghi agent và phạm vi file đang sửa trong phần vai trò của mình. Thêm link vào HANDOFF.md cho việc mới.
3. Hai luồng Client kiêm Art và BE kiêm Admin làm độc lập phần đủ thông tin bằng contract/fixture; GD bổ sung luật theo từng lát. Admin cùng nguồn lực BE, không tính thêm nhóm song song. Client/Admin có thể dùng mock theo contract; Server làm API độc lập. Dùng ID S01–S13, W01–W13, A01–A06 từ doc Phân rã công việc Playable v0.1; không coi backlog dự kiến là việc đang triển khai. Phần phụ thuộc luật chưa chốt thì chờ, phần độc lập tiếp tục.
4. Cuối lượt có thay đổi đáng kể, mỗi bên cập nhật đầu ra, kiểm tra thực tế và bước tiếp theo trong phần của mình. Câu hỏi ghi rõ GD → BE, BE → Client… và bên nhận cập nhật câu trả lời.
5. Client và BE kiểm tra luồng tích hợp thật, đối chiếu tiêu chí GD. Chỉ đóng toàn việc khi các phần áp dụng đều đạt. Bỏ dòng khỏi danh mục đang mở nhưng giữ file work để tra cứu.

Mỗi phần bàn giao nên ngắn khoảng 5–8 dòng khi có thể. Việc nhỏ không ảnh hưởng người khác không cần file riêng. Không chép hội thoại, log dài hoặc cùng nội dung vào nhiều nơi.

## Contract và sửa file song song

Client và BE thống nhất request/response/event, kiểu và đơn vị dữ liệu, mã lỗi, trạng thái, retry/xử lý trùng nếu có thay đổi tài nguyên. Ghi phiên bản và một người/agent sửa phần contract/chung. Các bên khác đề xuất trong phần trao đổi.

Mỗi agent chỉ sửa phần đã nhận; không ghi đè thay đổi của người khác. Đọc lại file khi đã có thay đổi trên đĩa trước khi sửa. Nếu cần sửa cùng đoạn mã hoặc tài liệu, phân chia lại phạm vi hoặc bàn giao tuần tự.

Thay đổi contract phải ghi tác động và bên cần cập nhật. Mock hoàn tất không đồng nghĩa tích hợp hoàn tất. Điều chỉnh kỹ thuật thông thường do Client/BE thống nhất trong phạm vi đã giao; thay đổi luật hoặc phạm vi đã duyệt cần người dùng duyệt.

## Một nguồn chính

Overview trên Notion là nguồn tổng thể; PROJECT.md dẫn link thay vì sao chép. Mỗi đặc tả chi tiết có một nguồn chính và trạng thái Đề xuất/Đã duyệt. Bàn giao chỉ báo tiến độ, không tự thay thế đặc tả.

Thư mục chỉ dùng chung với agent có quyền truy cập repository. Agent ở môi trường khác cần được cung cấp repo/file liên quan; không có đồng bộ chat tự động. Không lưu secret trong tài liệu.
