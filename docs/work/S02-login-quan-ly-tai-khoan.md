# S02 — Đề xuất login và quản lý tài khoản

- **Trạng thái chung:** Đã chọn Firebase/Google trước, Facebook sau; đã cập nhật thiết kế, session/Admin chờ review, chưa code auth.
- **Nguồn yêu cầu:** Người dùng 2026-11-03; PROJECT.md, backlog S02 và contract 0.1-draft.
- **Phạm vi / tiêu chí:** Đề xuất flow/logic/data/API, dependency và test gate; không chốt luật hay login thay người dùng.
- **Người sửa nguồn chung:** Codex BE sở hữu docs/be/ACCOUNT_AUTH.md; contract chung chưa thay endpoint auth trước Client review.

## GD
- Chờ review ảnh hưởng phiên chơi/tiếp quản; logout/reconnect không tự hủy/hoàn vé ngoài luật GD.

## Web Client (kiêm Art/asset 2D)
- Chưa nhận code. Cần review form/DTO/error, memory access token/cookie refresh, multi-tab và snapshot reconnect; chưa tích hợp thật.

## Server (BE)
- **Agent / trạng thái:** Codex BE, hoàn tất bản đề xuất, chờ duyệt trước triển khai.
- **Phạm vi / đầu ra:** [ACCOUNT_AUTH.md](../be/ACCOUNT_AUTH.md): Firebase UID mapping, Google login trước/Facebook linking sau, data/session/revoke và Admin đề xuất, API outline/test gate. Thay bản đề xuất Identity/email-password; lựa chọn provider đã duyệt, cơ chế phiên chưa duyệt.
- **Kiểm tra:** Đối chiếu scope/contract và tài liệu Microsoft/OWASP; không có auth code/migration hoặc test runtime auth. Kiểm tra link nội bộ/diff trước stage.
- **Tiếp theo:** Thiết lập Firebase project dev/Google provider và secret ngoài repo; Client review adapter/DTO/session rồi triển khai theo lát. Không đánh dấu Xong S02.

## Admin Tool
- BE đề xuất account lookup/suspend/revoke/audit và admin login riêng có MFA; chưa UI/API, chưa tự thêm moderation nâng cao.

## Contract Web Client/Admin ↔ Server
- **Phiên bản / trạng thái:** Phụ lục đề xuất S02, chưa thống nhất; nguồn [ACCOUNT_AUTH.md](../be/ACCOUNT_AUTH.md).
- **Tác động:** Bổ sung refresh cookie/CSRF, route tài khoản và phân biệt Admin audience; không gọi API dự kiến là API đã tồn tại.

## Trao đổi cần xử lý
- BE → người dùng: Firebase/Google trước và Facebook sau đã chọn; còn session TTL, quyền điều khiển một phiên, phương thức cấp tài khoản Admin/MFA.
- BE → Client: xác nhận topology cùng site/cookie, DTO và xử lý multi-tab/reconnect.
- BE → vận hành: project dev fishing-online-c111f/Web config đã cung cấp; người dùng xác nhận Google Enabled và localhost authorized ngày 2026-11-09. Credential Admin SDK/ADC cho BE còn cần thiết lập ngoài repo; không gửi private key vào chat.

## Kiểm tra tích hợp
- Chưa thực hiện auth integration; chỉ có nền persistence/readiness S01 được kiểm chứng trước đó.


**Cập nhật scope 2026-11-09:** các đầu vào lịch sử về vé/mồi/vật tư không là luật hiện hành. Thính đã bỏ; ghế mua theo thời lượng và gia hạn theo đơn giá từng ghế. Nguồn thực thi hiện tại: doc/GAMEPLAY_SCOPE.md và docs/v01/SPEC_CHUNG.md v0.3; chưa có runtime cho thay đổi này.

**Đầu vào Firebase 2026-11-09:** đã nhận Project ID, Web config và xác nhận Console từ user; chưa có runtime auth test. Tiếp theo tích hợp verifier BE, UID mapping/session và Client Google login; chưa coi hoàn tất S02.

**Lưu ý phạm vi 2026-11-10 (Claude):** đã có đăng nhập Google thật chạy được, nhưng **không phải cho hệ thống mô tả ở tài liệu này** (ASP.NET Core BE + PostgreSQL theo ACCOUNT_AUTH.md). Người dùng yêu cầu đăng nhập cho app `client-v0/index.html` (game nhân vật/phòng/câu cá kiểu cũ, server Node/Express `client-v0/server/app.js`, lưu account trong `client-v0/data/db.json`) — **đây là app khác với `client-v0/src/online/` + Server C# mà PROJECT.md mô tả là client Playable v0.1**. Đã làm: `client-v0/src/firebaseAuth.js` (popup Google qua Firebase SDK, dùng chung project `fishing-online-c111f`), server xác minh ID token bằng JWKS (`jose`, không cần Admin SDK, cùng cách BE C# làm) trong `server/app.js`, tự tạo account Node theo Firebase UID lần đầu đăng nhập, giữ nguyên đường `{username}` cũ cho 30 test sẵn có. Đây là hai hệ thống đăng nhập độc lập, không chia sẻ account/dữ liệu. Cần người dùng/GD xác nhận: app pixadom có tiếp tục phát triển song song với Playable v0.1 không, và có cần đồng bộ ID công việc (S/W/A) cho nó trong backlog không — hiện chưa có ID nào trong Notion mô tả app này.
