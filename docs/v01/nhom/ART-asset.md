# ART — Asset 2D pixel art

Mục tiêu: dùng resource dự án, đúng kích thước, giao theo tên file cố định để Client thay placeholder không phải sửa mã.
Đọc trước: [ASSET_PIPELINE_2D](../../../doc/ASSET_PIPELINE_2D.md), [W02](../../work/W02-art-map-ho.md).
Phạm vi file: `client-v0/public/online/assets/`, `art-src/` (file nguồn .aseprite/.psd), `LICENSE.md` trong từng thư mục asset.
Độc lập: không phụ thuộc mã. Quy ước chung: 1 ô tile = 32 px [Đề xuất, chốt ở ART-01], nhân vật khung 32×48, xuất PNG + atlas JSON (định dạng Phaser JSON Hash). Được dùng art trong `client-v0/public/assets` và scene Coral Cove ; giữ source/frame mapping khi tái sử dụng.

---

### ART-01 Chốt bộ tile và danh mục nguồn
- **Độ lớn:** S. **Phụ thuộc:** không.
- **Spec:** chọn bộ tile phù hợp từ resource hợp lệ của dự án (Fan-tasy, Farming Game World hoặc bộ hiện có); lưu nguồn/tác giả/thông tin giấy phép đi kèm vào `client-v0/public/online/assets/tiles/LICENSE.md` kèm link và ngày tải. Chốt kích thước ô.
- **Nghiệm thu:** chốt bộ tile/kích thước ô và manifest mapping trước khi CL-B-01 tích hợp; quyền dùng resource không là blocker.

### ART-02 Nhân vật mẫu (1 skin)
- **Độ lớn:** L. **Phụ thuộc:** ART-01.
- **Spec:** `characters/skin_01.png` + `.json`. Animation (tên frame `<anim>_<dir>_<i>`, dir = down/up/left/right): idle 4, walk 6, sit 2 (nếu ngồi ghế), cast 6, wait 4 (lặp), bite 4, reel 6, success 6, fail 4. Pivot chân thống nhất. Cần câu tách lớp `rods/<rodId>.png` cùng khung để ghép.
- **Nghiệm thu:** trang debug CL-B-03 chạy đủ animation, không giật pivot; lead duyệt trước khi làm skin khác.

### ART-03 Thêm 4-9 skin
- **Độ lớn:** L (lớn nhất). **Phụ thuộc:** ART-02 duyệt; GD chốt số skin.
- **Spec:** `skin_02..skin_10` cùng khung và tên frame như skin_01.
- **Nghiệm thu:** script kiểm tra mọi skin có đủ tên frame như skin_01.

### ART-04 Icon cá và UI câu cá
- **Độ lớn:** M. **Phụ thuộc:** ART-01.
- **Spec:** `fish/<speciesId>.png` 32×32 cho 9 loài + bản 64×64 cho popup; khung rarity 5 màu; UI minigame (thanh, kim, vùng xanh, vùng vàng, icon cá trên thanh), nút câu, nút chấm than, emoji buồn, phao.
- **Nghiệm thu:** đủ file theo danh sách, đúng kích thước.

### ART-05 Icon cần, UI chung
- **Độ lớn:** M. **Phụ thuộc:** ART-01.
- **Spec:** `rods/icons/<rodId>.png`, panel 9-slice, nút, icon Gold, phông pixel có tiếng Việt (ghi giấy phép).
- **Nghiệm thu:** phông hiển thị đủ dấu tiếng Việt.

### ART-06 Âm thanh
- **Độ lớn:** S. **Phụ thuộc:** không.
- **Spec:** quăng, cá cắn, trúng, trúng điểm yếu, trượt, thắng, thua, mua hàng, nhạc nền hồ; ghi giấy phép.
- **Nghiệm thu:** file OGG + MP3, có LICENSE.md.
