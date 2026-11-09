# CL-D — HUD, Shop, túi đồ, tiến trình, Codex

Mục tiêu: các màn quản lý ngoài vòng câu.
Đọc trước: [SPEC_CHUNG](../SPEC_CHUNG.md) mục 2.4, 2.5, 2.9-2.11, 3.
Phạm vi file: `client-web/src/ui/` trừ `ui/social`, `ui/skin`, `ui/ranking`.
Độc lập: chạy với mock của CL-A; icon placeholder tới khi ART giao.

Quy ước UI chung (nhóm này sở hữu, nhóm khác dùng lại): `src/ui/kit/` gồm Panel, Button, Tabs, Toast, ConfirmDialog, GoldLabel, phông pixel, bảng màu rarity (common xám, uncommon xanh lá, rare xanh dương, epic tím, legendary vàng cam).

---

### CL-D-01 UI kit
- **Độ lớn:** M. **Phụ thuộc:** CL-A-01.
- **Spec:** các thành phần trên vẽ bằng Phaser (hoặc DOM overlay nếu nhóm chọn, ghi rõ trong báo cáo), co giãn theo `Scale.FIT`, dùng được trên mobile (vùng chạm ≥ 44 px CSS). Toast hiển thị lỗi từ `ApiError.code` theo bảng thông điệp tiếng Việt `src/ui/kit/errorText.ts` (đủ mọi mã ở SPEC mục 5).
- **Nghiệm thu:** trang demo hiển thị mọi thành phần; mỗi mã lỗi có câu tiếng Việt.

### CL-D-02 HUD chính
- **Độ lớn:** S. **Phụ thuộc:** CL-D-01, CL-A-05.
- **Spec:** góc trên trái: tên, level, thanh EXP (`exp`, `expToNext`). Góc trên phải: Gold. Thanh nút: Túi, Shop, Codex, Lịch sử, (Skin, Xếp hạng, Chat do CL-E gắn vào).
- **Nghiệm thu:** số liệu cập nhật ngay khi có event/response mới.

### CL-D-03 Shop
- **Độ lớn:** M. **Phụ thuộc:** CL-D-01.
- **Spec:** tab Mua: 4 cần (tên, giá, chỉ số Strength/Hit Zone/Luck, nhãn "Đã có") (chọn số lượng 1-99). Tab Bán cá: danh sách cá trong túi (icon, tên, chiều dài, giá), chọn nhiều, "Bán đã chọn", "Bán tất cả" (có xác nhận). Gọi API theo SPEC, Gold cập nhật theo response.
- **Nghiệm thu:** thiếu Gold → toast đúng; bán xong cá biến khỏi danh sách, Gold tăng đúng tổng.

### CL-D-04 Túi đồ và chọn cần
- **Độ lớn:** M. **Phụ thuộc:** CL-D-01.
- **Spec:** tab Cá (lưới, sắp mới nhất, lọc theo rarity), tab Cần (cần đã có, nút "Dùng", cần đang dùng có dấu). Đổi cần khi đang câu → toast `ATTEMPT_ACTIVE`.
- **Nghiệm thu:** đổi cần → nhân vật cầm cần mới (CL-B-03) và bảng chỉ số đổi.

### CL-D-05 Tiến trình và chỉ số
- **Độ lớn:** S. **Phụ thuộc:** CL-D-02.
- **Spec:** panel chỉ số từ `GET /me/progress`: tổng và phần cộng từ level, cần, ghế. Thông báo "Lên cấp" khi result có `levelUp`.
- **Nghiệm thu:** số khớp response.

### CL-D-06 Codex và lịch sử
- **Độ lớn:** M. **Phụ thuộc:** CL-D-01.
- **Spec:** Codex lưới 9 ô theo thứ tự config; chưa bắt → bóng đen và "???"; đã bắt → tên, rarity, số lần bắt, kỷ lục (cm), ngày bắt đầu. Lịch sử: danh sách cuộn vô hạn theo cursor, mỗi dòng: giờ, kết quả (thành công/thất bại/hủy + lý do), loài, chiều dài.
- **Nghiệm thu:** cuộn hết lịch sử 45 lần câu không trùng dòng.
