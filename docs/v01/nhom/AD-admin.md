# AD — Admin Tool (React + TypeScript) và Admin API

Mục tiêu: vận hành tối thiểu: sửa config có kiểm tra, tra cứu người chơi, xem audit.
Đọc trước: [SPEC_CHUNG](../SPEC_CHUNG.md); phần Admin trong [contracts/v1-draft.md](../../contracts/v1-draft.md) (giữ nguyên quy ước, đổi schema theo luật mới).
Phạm vi file: `server/FishingOnline.Api/Modules/Admin/`, migration `AD_*`, `admin/`.
Độc lập: đọc dữ liệu qua DbContext chung (chỉ đọc bảng của nhóm khác); không có API sửa tiền trực tiếp.

---

### AD-01 Đăng nhập Admin và quyền
- **Độ lớn:** M. **Phụ thuộc:** BE-A-01.
- **Spec:** [Đề xuất] Admin đăng nhập Google qua Firebase, email phải nằm trong bảng `admin_users(email, roles[], disabled)`; token `aud=admin` riêng, sống 30 phút. Quyền: `config.read`, `config.write`, `config.publish`, `player.read`, `audit.read`. Mọi request ghi `admin_audit(actor, action, target, before, after, at)` cho thao tác thay đổi.
- **Nghiệm thu:** token player gọi `/admin/*` → 403; email không có trong bảng → 401.

### AD-02 Config draft, validate, publish
- **Độ lớn:** L. **Phụ thuộc:** AD-01, BE-A-05.
- **Spec:** `POST /admin/config/drafts {baseVersion}`, `PUT /admin/config/drafts/{id} {expectedRevision, document}`, `POST .../validate`, `POST .../publish {expectedRevision, expectedActiveVersion}`. Validate dùng chung validator BE-A-05. Publish tạo version mới, active; phiên ghế và lần câu đang chạy giữ version cũ (đã pin). Rollback = publish lại nội dung version cũ thành version mới.
- **Nghiệm thu:** 2 admin sửa cùng draft → người sau nhận 409; config sai không publish được; lần câu đang chạy vẫn dùng số cũ.

### AD-03 Tra cứu
- **Độ lớn:** M. **Phụ thuộc:** AD-01.
- **Spec:** `GET /admin/players?query=` (tên hoặc playerId), `/admin/players/{id}` (profile, ví, cần, thính), `/ledger`, `/catches`, `/attempts`, `/seat-sessions` (phân trang cursor). `GET /admin/lake` (ghế và người đang online).
- **Nghiệm thu:** tổng ledger hiển thị khớp số dư.

### AD-04 Giao diện Admin
- **Độ lớn:** L. **Phụ thuộc:** AD-01 đến AD-03.
- **Spec:** `admin/` Vite + React + TS strict. Trang: đăng nhập; Config (bảng sửa cho level, cần, cá, Tier ghế, minigame, thính, spawn; nút Validate hiện lỗi theo đường dẫn field; Publish có xác nhận; lịch sử version); Người chơi (tìm, chi tiết, tab ledger/cá/lần câu/phiên ghế); Hồ (ghế realtime); Audit.
- **Nghiệm thu:** sửa giá vé Tier 3 từ 40 lên 50, publish, người chơi mua vé mới bị trừ 50.

### AD-05 Hỗ trợ social tối thiểu — CHỜ GD (A06)
- **Độ lớn:** S. **Phụ thuộc:** SOC-03.
- **Spec khung:** xem chat 7 ngày theo player; [Đề xuất] khóa chat một player trong N giờ.
