# Danh mục công việc đang mở

Mỗi việc phối hợp dùng một file trong work/, có phần GD, Web Client, Server và Admin Tool khi tham gia. Dùng ID S/W/A từ backlog Notion. Không lặp lại backlog dự kiến hoặc nội dung bàn giao tại đây. Dùng [mẫu công việc](work/_TEMPLATE.md) khi nhận việc thực tế.

| ID / Công việc | GD | Web Client | Server | Admin Tool | Link |
| --- | --- | --- | --- | --- | --- |
| S01 / Scope & kế hoạch v1 | Luật còn mở | Client trong `client-v0/src/online/` chạy mock, chờ review, chưa tích hợp thật; xem [TIEN_DO](v01/TIEN_DO.md) | Persistence/migration/readiness + outage test đạt; contract draft | Có plan/API draft; chưa React | [Chi tiết](work/S01-cap-nhat-scope-ke-hoach-v1.md) |
| S02 / Login & tài khoản | Chờ review phiên chơi | Chờ review auth contract | Đã chọn Firebase/Google; Facebook sau; session đề xuất, chưa code | Đề xuất quyền/MFA/lookup, chưa code | [Chi tiết](work/S02-login-quan-ly-tai-khoan.md) |
| W02 / Art và map hồ | Chờ tiêu chí map thật | Prototype hồ có 10 chòi và 30 anchor; chờ kiểm tra scene Cocos và tích hợp | — | — | [Chi tiết](work/W02-art-map-ho.md) |

S01 đã nhận phần BE nền tảng/contract/môi trường; S02 chỉ nhận phần đề xuất login/tài khoản, chưa bắt đầu code. Các ID khác không mặc định đã được giao.

## Đã thiết lập

Codex đã cập nhật Overview Notion v2.0 và lịch 2 tuần theo 2D Pixel Art/Cocos, khôi phục loot vào scope v0.1, phân ba nhóm Server/Web Client/Admin và lập 25 đầu việc có ID/dependency/acceptance. Đã kiểm tra 10 mục, tham chiếu dependency và không có chu kỳ; đã bỏ định hướng Future Development về hình ảnh cũ theo quyết định mới nhất. Đây là cập nhật tài liệu, chưa triển khai hoặc kiểm thử gameplay. Quy trình nhiều agent chưa được chạy thử; lịch sử từng việc giữ trong work/ sau khi đóng.


## Bổ sung hướng dẫn local — 2026-11-03

Codex (phạm vi tài liệu quy trình) đã tạo 8 file Markdown trong D:\Zen-Workplace\fishing-online\doc theo yêu cầu người dùng: README, DEVELOPMENT, REPOSITORY, GAMEPLAY_SCOPE, ASSET_PIPELINE_2D, CLIENT_SERVER_API, DATA_BALANCE, QA_RELEASE. Bản soạn giữ tại doc/ của workspace hiện tại. Repo đích ban đầu chỉ có .git, trạng thái Git sạch; sau tạo có ?? doc/. Không ghi đè file; đã kiểm tra đủ 8 file, đọc được tiếng Việt và các link Markdown nội bộ trong README đều tồn tại. Quy ước triển khai ghi là đề xuất; ghi nhận quyết định ở thời điểm đó; thính nay đã bỏ theo cập nhật 2026-11-09; chưa kiểm thử gameplay, build, CI hoặc nội dung Notion trực tuyến. Bước tiếp theo: team đọc bộ hướng dẫn, thống nhất quy ước kỹ thuật khi khởi tạo mã và nhận ID công việc thực tế; không đánh dấu hoàn tất các đầu việc triển khai.
