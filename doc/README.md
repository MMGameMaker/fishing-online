# Fishing Online — Hướng dẫn làm việc

Bộ hướng dẫn quy trình cho Playable v0.1. Đọc trước khi nhận việc; đây chưa phải bằng chứng game đã triển khai.

| Tài liệu | Dùng khi |
| --- | --- |
| [DEVELOPMENT.md](DEVELOPMENT.md) | Nhận việc, phối hợp và bàn giao |
| [REPOSITORY.md](REPOSITORY.md) | Tổ chức repo, branch, commit và PR |
| [GAMEPLAY_SCOPE.md](GAMEPLAY_SCOPE.md) | Xác định phạm vi và câu hỏi GD |
| [ASSET_PIPELINE_2D.md](ASSET_PIPELINE_2D.md) | Chuẩn bị, nhập và nghiệm thu asset |
| [CLIENT_SERVER_API.md](CLIENT_SERVER_API.md) | Thống nhất API và SignalR |
| [DATA_BALANCE.md](DATA_BALANCE.md) | Thiết kế, kiểm tra và phát hành cấu hình |
| [QA_RELEASE.md](QA_RELEASE.md) | Kiểm thử, phát hành và khôi phục |

## Nguồn và trạng thái

Bối cảnh người dùng đã chốt và quyết định hiện hành trong `docs/PROJECT.md` của workspace phối hợp là cơ sở cho bộ này. Nếu repo có `docs/README.md`, `docs/PROJECT.md`, `docs/HANDOFF.md`, đọc chúng trước; quyết định hiện hành ở PROJECT thay thế hướng dẫn cũ. Không tạo bản sao backlog hoặc một tracker trong `doc/`.

[Overview](https://app.notion.com/p/40d5f439904b81fca8e0dd63f26802c7) và [Phân rã Playable v0.1](https://app.notion.com/p/40d5f439904b8116956dca7b922a1067) là nguồn tham chiếu được tài liệu hiện hành dẫn lại; bộ này không xác nhận lại nội dung trực tuyến.

Nhãn **Đã chốt** chỉ dùng cho quyết định có nguồn. **Đề xuất** cần được duyệt nếu thay đổi scope/luật. **Đã kiểm chứng** cần kèm môi trường, cách kiểm tra và kết quả. Các quy ước kỹ thuật bên dưới là mặc định đề xuất để team áp dụng khi khởi tạo, không phải hiện trạng mã nguồn.

Ba nhóm triển khai: Server, Web Client (kiêm Art), Admin Tool. GD cung cấp luật và acceptance; QA kiểm chứng xuyên nhóm, không mặc định cần thêm nhân sự riêng.
