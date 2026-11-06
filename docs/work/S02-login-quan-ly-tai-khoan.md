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
- BE → vận hành: Firebase project dev/Web config/authorized domains và Admin SDK credential qua secret store; chưa cần lưu secret trong docs.

## Kiểm tra tích hợp
- Chưa thực hiện auth integration; chỉ có nền persistence/readiness S01 được kiểm chứng trước đó.
