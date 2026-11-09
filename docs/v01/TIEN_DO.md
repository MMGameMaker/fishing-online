# Bảng tiến độ v0.1

Worker chỉ sửa dòng task của mình (Người làm, Trạng thái, Ngày, Ghi chú). Lead cập nhật phần Tổng quan và Thông báo. Trạng thái và cách chuyển: xem [QUY_TRINH.md](QUY_TRINH.md) mục 2.

## Tổng quan (lead cập nhật)

- **Cập nhật lần cuối:** 2026-11-09
- **Cổng đã Đạt:** chưa có
- **Trạng thái M0:** user đã duyệt cơ chế/mặc định cụ thể tại SPEC0.4; còn kiểm tra parse/contract để nghiệm thu. Field chưa có số/lựa chọn cụ thể bổ sung theo task, không chặn toàn bộ BE.

| Nhóm | Tổng task | Xong | Đang làm / Chờ review | Bị chặn |
| --- | --- | --- | --- | --- |
| [BE-A — Nền tảng Server](nhom/BE-A-nen-tang-server.md) | 6 | 0 | 0 | 0 |
| [BE-B — Luật câu cá (thư viện thuần)](nhom/BE-B-luat-cau-ca.md) | 9 | 0 | 0 | 0 |
| [BE-C — Phòng hồ, di chuyển, ghế và vé](nhom/BE-C-phong-va-ghe.md) | 9 | 0 | 0 | 0 |
| [BE-D — Kinh tế và tiến trình](nhom/BE-D-kinh-te-tien-trinh.md) | 8 | 0 | 0 | 0 |
| [BE-E — Tích hợp lần câu trên Server](nhom/BE-E-tich-hop-cau-ca.md) | 9 | 0 | 0 | 1 |
| [CL-A — Nền tảng Client (Phaser 3 + TypeScript)](nhom/CL-A-nen-tang-client.md) | 7 | 0 | 0 | 0 |
| [CL-B — Map hồ, nhân vật, di chuyển, ghế](nhom/CL-B-map-nhan-vat.md) | 7 | 0 | 0 | 0 |
| [CL-C — Giao diện câu cá và minigame](nhom/CL-C-cau-ca-minigame.md) | 5 | 0 | 0 | 0 |
| [CL-D — HUD, Shop, túi đồ, tiến trình, Codex](nhom/CL-D-hud-shop-tui.md) | 6 | 0 | 0 | 0 |
| [SOC — Skin, chat/emoji, khoe cá, bảng xếp hạng (Server + Client)](nhom/SOC-social-skin-ranking.md) | 7 | 0 | 0 | 2 |
| [AD — Admin Tool (React + TypeScript) và Admin API](nhom/AD-admin.md) | 7 | 0 | 0 | 1 |
| [ART — Asset 2D pixel art](nhom/ART-asset.md) | 6 | 0 | 0 | 0 |
| [QA — Kiểm thử xuyên nhóm](nhom/QA-kiem-thu.md) | 4 | 0 | 0 | 0 |

## Thông báo thay đổi spec

| Ngày | Nội dung | Nhóm cần làm gì |
| --- | --- | --- |
| 2026-11-09 | SPEC_CHUNG 0.4: M0 duyệt; Client outcome, pool cộng dồn, BE tuần tự | Tất cả: đọc trước khi nhận task |
| 2026-11-09 | Bổ sung map mới và Admin thả cá; user chốt quần thể hữu hạn | CL-B/AD/BE-E/QA: đọc task mới; contract tồn và luật cạn cá còn chờ thống nhất |

## Chi tiết task

### BE-A — Nền tảng Server

| Task | Tên | Độ lớn | Phụ thuộc | Người làm | Trạng thái | Ngày | Ghi chú |
| --- | --- | --- | --- | --- | --- | --- | --- |
| BE-A-01 | Khung module, envelope, lỗi, project test | M | không | | Chưa nhận | |  |
| BE-A-02 | Đăng nhập Firebase và phiên | L | BE-A-01; Firebase project dev (người dùng tạo, secret ngoài repo) | | Chưa nhận | |  |
| BE-A-03 | Ví Gold và ledger | M | BE-A-01 | | Chưa nhận | |  |
| BE-A-04 | Idempotency | S | BE-A-01 | | Chưa nhận | |  |
| BE-A-05 | Config gameplay | M | BE-A-01, BE-B-01 (record `GameplayConfig`; việc S, làm sớm) | | Chưa nhận | |  |
| BE-A-06 | Hồ sơ người chơi | S | BE-A-02, BE-A-03 | | Chưa nhận | |  |

### BE-B — Luật câu cá (thư viện thuần)

| Task | Tên | Độ lớn | Phụ thuộc | Người làm | Trạng thái | Ngày | Ghi chú |
| --- | --- | --- | --- | --- | --- | --- | --- |
| BE-B-01 | Project, model config, nạp fixture | S | không | | Chưa nhận | |  |
| BE-B-02 | Bảng level và chỉ số | S | BE-B-01 | | Chưa nhận | |  |
| BE-B-03 | Thời gian chờ cá cắn | S | BE-B-01 | | Chưa nhận | |  |
| BE-B-04 | Chọn loài | S | BE-B-01 | | Chưa nhận | |  |
| BE-B-05 | Random chiều dài | S | BE-B-01 | | Chưa nhận | |  |
| BE-B-06 | Params minigame cho Client | S | BE-B-01, BE-B-02 | | Chưa nhận | |  |
| BE-B-07 | Fixture params/kết quả minigame | S | BE-B-06 | | Chưa nhận | |  |
| BE-B-08 | Máy trạng thái lần câu | M | BE-B-03 đến BE-B-06 | | Chưa nhận | |  |
| BE-B-09 | Script mô phỏng balance | S | BE-B-08 | | Chưa nhận | |  |

### BE-C — Phòng hồ, di chuyển, ghế và vé

| Task | Tên | Độ lớn | Phụ thuộc | Người làm | Trạng thái | Ngày | Ghi chú |
| --- | --- | --- | --- | --- | --- | --- | --- |
| BE-C-01 | Nạp map và kiểm tra vị trí | S | không | | Chưa nhận | |  |
| BE-C-02 | Vào phòng, presence, snapshot | M | BE-C-01 | | Chưa nhận | |  |
| BE-C-03 | Di chuyển | M | BE-C-02 | | Chưa nhận | |  |
| BE-C-04 | Bảng ghế, mua vé | L | BE-C-01; IWallet (giả được) | | Chưa nhận | |  |
| BE-C-05 | Kết thúc phiên và cooldown | M | BE-C-04 | | Chưa nhận | |  |
| BE-C-06 | Mất kết nối và vào lại | M | BE-C-05 | | Chưa nhận | |  |
| BE-C-07 | Khôi phục sau restart | S | BE-C-05, BE-C-06 | | Chưa nhận | |  |
| BE-C-08 | Test tải phòng | S | BE-C-04 | | Chưa nhận | |  |

| BE-C-09 | Gia hạn thời lượng giữ ghế | M | BE-C-04/05, BE-A-04 | | Chưa nhận | | Atomic ví/hạn phiên/receipt |

### BE-D — Kinh tế và tiến trình

| Task | Tên | Độ lớn | Phụ thuộc | Người làm | Trạng thái | Ngày | Ghi chú |
| --- | --- | --- | --- | --- | --- | --- | --- |
| BE-D-01 | Cần câu sở hữu và cần đang dùng | S | không | | Chưa nhận | |  |
| BE-D-02 | Túi đồ | S | BE-D-01 | | Chưa nhận | |  |
| BE-D-03 | Shop mua hàng | M | BE-D-02; IWallet | | Chưa nhận | |  |
| BE-D-04 | Bán cá | M | BE-D-02; IWallet | | Chưa nhận | |  |
| BE-D-05 | Loại khỏi v0.1 — giữ ID | — | — | | Loại khỏi v0.1 | 2026-11-09 | User bỏ thính; không tính Xong |
| BE-D-06 | Ghi cá bắt được, EXP, level, Codex | M | BE-D-02; LevelTable (BE-B-02) | | Chưa nhận | |  |
| BE-D-07 | Chỉ số và tiến trình | S | BE-D-01; StatCalculator (BE-B-02) | | Chưa nhận | |  |
| BE-D-08 | Codex và lịch sử | S | BE-D-06; bảng `fishing_attempts` của BE-E (đọc) | | Chưa nhận | |  |

### BE-E — Tích hợp lần câu trên Server

| Task | Tên | Độ lớn | Phụ thuộc | Người làm | Trạng thái | Ngày | Ghi chú |
| --- | --- | --- | --- | --- | --- | --- | --- |
| BE-E-01 | Bảng lần câu và IFishingState | S | không | | Chưa nhận | |  |
| BE-E-02 | CastLine và vòng thời gian | M | BE-E-01; BE-B-08 (hoặc bản giả) | | Chưa nhận | |  |
| BE-E-03 | HookFish và minigame | M | BE-E-02; BE-B-06 | | Chưa nhận | |  |
| BE-E-04 | Kết thúc lần câu và trả thưởng | M | BE-E-03; BE-D-06 (hoặc giả) | | Chưa nhận | |  |
| BE-E-05 | Hủy theo luật | S | BE-E-02 | | Chưa nhận | |  |
| BE-E-06 | Khôi phục sau restart | S | BE-E-04 | | Chưa nhận | |  |
| BE-E-07 | Test end-to-end Server | M | BE-E-01 đến BE-E-06, BE-C, BE-D xong | | Chưa nhận | |  |

| BE-E-08 | Quần thể cá hữu hạn và tích hợp lượt câu | L | BE-E-04/05/06, BE-B-04, BE-D-06, AD-06 | | Bị chặn | | Thiếu dữ kiện cạn cá/initial stock; reservation bite đã duyệt |

| BE-E-09 | Cảnh báo nghi vấn gian lận BE (chỉ quan sát) | M | BE-E-03/04, BE-A-05 | | Chưa nhận | | Rule config, không auto-ban/reject outcome hợp lệ |

### CL-A — Nền tảng Client (Phaser 3 + TypeScript)

| Task | Tên | Độ lớn | Phụ thuộc | Người làm | Trạng thái | Ngày | Ghi chú |
| --- | --- | --- | --- | --- | --- | --- | --- |
| CL-A-01 | Khởi tạo project | S | không | | Chưa nhận | |  |
| CL-A-02 | Kiểu dữ liệu contract | S | CL-A-01 | | Chưa nhận | |  |
| CL-A-03 | HTTP client và phiên | M | CL-A-02 | | Chưa nhận | |  |
| CL-A-04 | Hub client | M | CL-A-02 | | Chưa nhận | |  |
| CL-A-05 | Kho state | M | CL-A-02 | | Chưa nhận | |  |
| CL-A-06 | Mock server trong trình duyệt | L | CL-A-03, CL-A-04 | | Chưa nhận | |  |
| CL-A-07 | Màn đăng nhập | M | CL-A-03; Firebase Web config (người dùng cung cấp) | | Chưa nhận | |  |

### CL-B — Map hồ, nhân vật, di chuyển, ghế

| Task | Tên | Độ lớn | Phụ thuộc | Người làm | Trạng thái | Ngày | Ghi chú |
| --- | --- | --- | --- | --- | --- | --- | --- |
| CL-B-01 | Dựng map hồ mới và export schema | M | CL-B-07, ART-01 | | Chưa nhận | |  |
| CL-B-02 | Scene hồ | M | CL-A-01 | | Chưa nhận | |  |
| CL-B-03 | Nhân vật và animation | M | CL-B-02; sprite từ ART-02 (placeholder trước) | | Chưa nhận | |  |
| CL-B-04 | Điều khiển và đồng bộ di chuyển | M | CL-B-02, CL-A-04 | | Chưa nhận | |  |
| CL-B-05 | Ghế và mua vé | M | CL-B-02, CL-A-05 | | Chưa nhận | |  |
| CL-B-06 | Mất kết nối | S | CL-A-04, CL-B-05 | | Chưa nhận | |  |

| CL-B-07 | Thiết kế và duyệt bố cục hồ câu mới | M | ART-01 | | Chưa nhận | | Không dùng nguyên map 30 anchor cũ |

### CL-C — Giao diện câu cá và minigame

| Task | Tên | Độ lớn | Phụ thuộc | Người làm | Trạng thái | Ngày | Ghi chú |
| --- | --- | --- | --- | --- | --- | --- | --- |
| CL-C-01 | Lõi minigame TS | S | CL-A-01 | | Chưa nhận | |  |
| CL-C-02 | Nút câu | S | CL-A-05 | | Chưa nhận | |  |
| CL-C-03 | Quăng, chờ, cá cắn | M | CL-C-02, CL-B-03 | | Chưa nhận | |  |
| CL-C-04 | Màn minigame | L | CL-C-01 | | Chưa nhận | |  |
| CL-C-05 | Kết quả | M | CL-C-04; icon cá (ART-04) | | Chưa nhận | |  |

### CL-D — HUD, Shop, túi đồ, tiến trình, Codex

| Task | Tên | Độ lớn | Phụ thuộc | Người làm | Trạng thái | Ngày | Ghi chú |
| --- | --- | --- | --- | --- | --- | --- | --- |
| CL-D-01 | UI kit | M | CL-A-01 | | Chưa nhận | |  |
| CL-D-02 | HUD chính | S | CL-D-01, CL-A-05 | | Chưa nhận | |  |
| CL-D-03 | Shop | M | CL-D-01 | | Chưa nhận | |  |
| CL-D-04 | Túi đồ và chọn cần | M | CL-D-01 | | Chưa nhận | |  |
| CL-D-05 | Tiến trình và chỉ số | S | CL-D-02 | | Chưa nhận | |  |
| CL-D-06 | Codex và lịch sử | M | CL-D-01 | | Chưa nhận | |  |

### SOC — Skin, chat/emoji, khoe cá, bảng xếp hạng (Server + Client)

| Task | Tên | Độ lớn | Phụ thuộc | Người làm | Trạng thái | Ngày | Ghi chú |
| --- | --- | --- | --- | --- | --- | --- | --- |
| SOC-01 | Skin: Server | S | không | | Chưa nhận | |  |
| SOC-02 | Skin: Client | S | SOC-01 (hoặc mock), CL-B-03 | | Chưa nhận | |  |
| SOC-03 | Chat phòng: Server | M | không | | Chưa nhận | |  |
| SOC-04 | Emoji: Server | S | không | | Chưa nhận | |  |
| SOC-05 | Chat và emoji: Client | M | SOC-03, SOC-04 (hoặc mock) | | Chưa nhận | |  |
| SOC-06 | Khoe cá | M | BE-D-02 | | Bị chặn | | Chờ GD |
| SOC-07 | Bảng xếp hạng | M | BE-E-04 | | Bị chặn | | Chờ GD |

### AD — Admin Tool (React + TypeScript) và Admin API

| Task | Tên | Độ lớn | Phụ thuộc | Người làm | Trạng thái | Ngày | Ghi chú |
| --- | --- | --- | --- | --- | --- | --- | --- |
| AD-01 | Đăng nhập Admin và quyền | M | BE-A-01 | | Chưa nhận | |  |
| AD-02 | Config draft, validate, publish | L | AD-01, BE-A-05 | | Chưa nhận | |  |
| AD-03 | Tra cứu | M | AD-01 | | Chưa nhận | |  |
| AD-04 | Giao diện Admin | L | AD-01 đến AD-03 | | Chưa nhận | |  |
| AD-05 | Hỗ trợ social tối thiểu (A06) | S | SOC-03 | | Bị chặn | | Chờ GD |

| AD-06 | Dữ liệu, API và lịch thả cá | L | AD-01, BE-A-04/05; phối hợp BE-E-08 | | Chưa nhận | | Contract cần lead thống nhất |
| AD-07 | Trang quản lý thả cá và tồn hồ | L | AD-04, AD-06, BE-E-08 (mock được) | | Chưa nhận | | |

### ART — Asset 2D pixel art

| Task | Tên | Độ lớn | Phụ thuộc | Người làm | Trạng thái | Ngày | Ghi chú |
| --- | --- | --- | --- | --- | --- | --- | --- |
| ART-01 | Chốt bộ tile và quyền sử dụng | S | không | | Chưa nhận | |  |
| ART-02 | Nhân vật mẫu (1 skin) | L | ART-01 | | Chưa nhận | |  |
| ART-03 | Thêm 4-9 skin | L (lớn nhất) | ART-02 duyệt; GD chốt số skin | | Chưa nhận | |  |
| ART-04 | Icon cá và UI câu cá | M | ART-01 | | Chưa nhận | |  |
| ART-05 | Icon cần và UI chung | M | ART-01 | | Chưa nhận | |  |
| ART-06 | Âm thanh | S | không | | Chưa nhận | |  |

### QA — Kiểm thử xuyên nhóm

| Task | Tên | Độ lớn | Phụ thuộc | Người làm | Trạng thái | Ngày | Ghi chú |
| --- | --- | --- | --- | --- | --- | --- | --- |
| QA-01 | Bộ ca kiểm thử theo luật | M | không | | Chưa nhận | |  |
| QA-02 | E2E tự động với Playwright | L | CL-A-06; sau đó Server thật | | Chưa nhận | |  |
| QA-03 | Chạy cổng tích hợp | S mỗi cổng | theo cổng ở QUY_TRINH | | Chưa nhận | |  |

| QA-04 | E2E thả cá và đối soát quần thể | M | AD-06/07, BE-E-08; M3 | | Chưa nhận | | |

**Đếm task 2026-11-09:** 90 ID, gồm 89 task còn trong scope và 1 ID BE-D-05 đã loại; không ghi task loại là Xong. Nhóm BE-D giữ 8 ID để tra cứu, chỉ còn 7 task thực hiện.

**Thông báo M0 2026-11-09:** không cần xác thực tap phía Server. SubmitFishingResult thay MinigameTap; code chống replay phải dựa unique attemptId, không chỉ requestId. Pool thả tiếp cộng dồn; làm BE tuần tự được. Chưa task nào tự động chuyển Xong do chỉ duyệt tài liệu.

**Cập nhật 2026-11-09:** user xác nhận chấp nhận rủi ro minigame Client; thêm BE-E-09 cảnh báo nghi vấn chỉ quan sát, task chưa nhận/code. SPEC0.5, ngưỡng ban đầu là config test.
