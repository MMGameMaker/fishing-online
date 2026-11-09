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
- **Spec:** `GET /admin/players?query=` (tên hoặc playerId), `/admin/players/{id}` (profile, ví, cần), `/ledger`, `/catches`, `/attempts`, `/seat-sessions` (phân trang cursor). `GET /admin/lake` (ghế và người đang online).
- **Nghiệm thu:** tổng ledger hiển thị khớp số dư.

### AD-04 Giao diện Admin
- **Độ lớn:** L. **Phụ thuộc:** AD-01 đến AD-03.
- **Spec:** `admin/` Vite + React + TS strict. Trang: đăng nhập; Config (bảng sửa cho level, cần, cá, Tier ghế, minigame, spawn; nút Validate hiện lỗi theo đường dẫn field; Publish có xác nhận; lịch sử version); Người chơi (tìm, chi tiết, tab ledger/cá/lần câu/phiên ghế); Hồ (ghế realtime); Audit.
- **Nghiệm thu:** sửa đơn giá test Tier 3 từ 40 lên 50 Gold/block, publish; mua/gia hạn 2 block mới bị trừ 100, phần đã trả không đổi; giá theo ghế có override và priceVersion; quote cũ nhận PRICE_CHANGED.

### AD-05 Hỗ trợ social tối thiểu — CHỜ GD (A06)
- **Độ lớn:** S. **Phụ thuộc:** SOC-03.
- **Spec khung:** xem chat 7 ngày theo player; [Đề xuất] khóa chat một player trong N giờ.

### AD-06 Dữ liệu và API quản lý các đợt thả cá
- **Độ lớn:** L. **Phụ thuộc:** AD-01, BE-A-04/05; phối hợp BE-E-08; contract stocking do lead thống nhất trước tích hợp.
- **Nguồn:** người dùng chốt 2026-11-09: hồ có quần thể hữu hạn, bắt thành công thì giảm số cá. Task bổ sung vào kế hoạch, chưa triển khai.
- **Spec đề xuất:** mỗi đợt chọn lakeId cụ thể, danh sách `{speciesId, quantity}` (số nguyên dương), thời điểm thả `scheduledAt` UTC, timezone chỉ để nhập/hiển thị, ghi chú và người tạo. Số loại/tổng số con tính từ danh sách, không nhập các tổng mâu thuẫn. Hỗ trợ thả ngay hoặc một lần theo lịch; lịch lặp để đề xuất riêng, chưa tự thêm.
- **Dữ liệu đề xuất:** `fish_stocking_batches`, `fish_stocking_lines`, `fish_population_movements` append-only; idempotency key và unique execution theo batchId. State draft/scheduled/executing/completed/cancelled/failed; validate loài có trong catalog và hồ đích tồn tại. API dự kiến list/detail/create/edit draft/schedule/cancel/execute-now, phân trang, optimistic concurrency, quyền stocking.read/write/execute và audit. Không sửa trực tiếp số tồn đã phát sinh.
- **Scheduler:** xử lý đúng một lần về hiệu ứng dù nhiều worker/retry/restart; cộng tồn và movement/đánh dấu hoàn thành trong transaction. Thả lỗi rollback, không cộng một nửa; crash sau commit không chạy cộng lần nữa. Cách xử lý lịch quá hạn khi server ngừng phải được chốt (đề xuất chạy bù một lần có audit).
- **Nghiệm thu:** thả 100 minnow + 20 koi vào hồ chỉ cộng đúng các số đó; request lặp/chạy cùng batch song song chỉ 1 hiệu ứng; lịch chưa đến giờ không thực hiện, lịch bị hủy không cộng; restart không nhân số cá; trái quyền bị chặn; loài sai/quantity âm bị từ chối.

### AD-07 Trang Admin quản lý thả cá và tồn cá trong hồ
- **Độ lớn:** L. **Phụ thuộc:** AD-04, AD-06; đọc tồn cá từ BE-E-08; có thể làm mock theo schema đã thống nhất.
- **Spec:** trang “Thả cá”: lọc theo hồ/trạng thái/thời gian, bảng các đợt, form chọn nhiều loài và số lượng từng loài, tổng số loại/tổng số cá, ngày giờ + timezone; thả ngay hoặc đặt lịch, xác nhận trước thực thi. Detail có trạng thái, số dự kiến/đã thả, actor/thời điểm, lỗi và lịch sử audit. Chỉ sửa/hủy trạng thái cho phép, xử lý 409 khi người khác vừa đổi.
- **Tồn cá:** bảng theo hồ/loài với số đã thả, đã bắt, còn lại và đang giữ cho attempt nếu luật reservation được duyệt; có updatedAt và refresh. Tên trường phải phân biệt remaining/available/reserved để không cộng trùng. Không có nút sửa tồn trực tiếp; điều chỉnh tồn ngoài thả/catch cần quy trình riêng.
- **Nghiệm thu:** tạo đợt 2 loài, đặt lịch và thấy đúng lượng tồn sau chạy; hủy trước giờ không thả; bấm thực thi 2 lần không nhân số; hiển thị lỗi/empty/loading/denied; UI không tự cộng số thay Server.


**Giá thời gian ghế (2026-11-09):** AD-02/04 cho sửa unitPriceGold từng ghế (fallback Tier), billingUnitMinutes và priceVersion, kiểm tra giá nguyên không âm/đơn vị dương; preview phí theo thời lượng. Giá mới chỉ áp giao dịch mới được user xác nhận, không thay expiresAt đã thanh toán hoặc config gameplay đã pin. Không biểu mẫu vật phẩm đã bỏ.
