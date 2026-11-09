# BE-D — Kinh tế và tiến trình

Mục tiêu: Shop, túi đồ, cần câu, bán cá, ghi cá bắt được, level/EXP, Codex, lịch sử.
Đọc trước: [SPEC_CHUNG](../SPEC_CHUNG.md) mục 2.4, 2.5, 2.9-2.11, 3, 6.
Phạm vi file: `server/FishingOnline.Api/Modules/{Economy,Progress}/`, `GameHub.Economy.cs`, migration `BED_*`.
Độc lập: dùng `IWallet`, `IIdempotency`, `IConfigProvider`, `ICurrentPlayer`, `ISeatSessions` qua interface; dùng `LevelTable`, `StatCalculator` của BE-B (nếu BE-B chưa xong, viết theo SPEC và thay khi có).

---

### BE-D-01 Cần câu sở hữu và cần đang dùng
- **Độ lớn:** S. **Phụ thuộc:** không.
- **Spec:** bảng `rods_owned(playerId, rodId, acquiredAt)` PK đôi. Triển khai `INewPlayerGrant` (BE-A gọi khi tạo player): thêm `rod_old`, set `equippedRodId = rod_old`. `PUT /me/equipped-rod {rodId}`: phải sở hữu (`ROD_NOT_OWNED`); đang có lần câu (`IFishingState.IsBusy`) → `ATTEMPT_ACTIVE`.
- **Nghiệm thu:** player mới có `rod_old`; trang bị cần chưa có → 422.

### BE-D-02 Túi đồ
- **Độ lớn:** S. **Phụ thuộc:** BE-D-01.
- **Spec:** bảng `item_stacks` chỉ thêm khi có vật phẩm khác được duyệt; chưa seed vật tư trong v0.1. `catches(catchId PK, playerId, attemptId unique, speciesId, rarity, lengthTenthCm, caughtAt, soldAt null, configVersion)`. `GET /me/inventory` đúng SPEC mục 3, `fish` chỉ gồm `soldAt is null`, sắp xếp `caughtAt desc`. `inventoryVersion` tăng mỗi lần túi đổi.
- **Nghiệm thu:** response khớp schema mẫu trong `api-samples.v0.json`.

### BE-D-03 Shop mua hàng
- **Độ lớn:** M. **Phụ thuộc:** BE-D-02; IWallet.
- **Spec:** `POST /shop/buy {offerId, quantity}` [Idempotent "shop.buy"]. Offer lấy từ `config.shopOffers`. Cần: quantity phải = 1, đã có → `ROD_ALREADY_OWNED`.  Một transaction: debit (`buy_rod`), thêm hàng, receipt.
- **Nghiệm thu:** mua Steel Awl với 299 Gold → `INSUFFICIENT_GOLD`, không đổi gì; mua lại → `ROD_ALREADY_OWNED`; gửi lặp cùng key → 1 lần trừ.

### BE-D-04 Bán cá
- **Độ lớn:** M. **Phụ thuộc:** BE-D-02; IWallet.
- **Spec:** `POST /shop/sell-fish` [Idempotent "shop.sell"]. `{catchIds}` (1-200 id) hoặc `{all:true}`. Khóa các dòng catch; id nào không thuộc user hoặc đã bán → `FISH_NOT_FOUND` cho cả request (không bán phần nào). Tổng giá theo `fish.sellGold`; set `soldAt`; credit `sell_fish` với refId = id request.
- **Nghiệm thu:** bán 1 con perch → +5; bán lại → `FISH_NOT_FOUND`; `all:true` khi túi trống → `soldCount 0`, không ghi ledger; kỷ lục Codex không đổi sau khi bán.

### BE-D-05 Đã loại khỏi v0.1 — giữ ID lịch sử
- **Trạng thái:** Loại khỏi v0.1 theo user 2026-11-09. Không triển khai thính/item/effect/UseChum. Không phải task Xong. Các nhóm Client/Admin/Art/mock không tạo chức năng tương ứng.

### BE-D-06 Ghi cá bắt được, EXP, level, Codex
- **Độ lớn:** M. **Phụ thuộc:** BE-D-02; LevelTable (BE-B-02).
- **Spec:** triển khai `ICatchRecorder.RecordAsync` chạy trong transaction của BE-E: insert `catches` (unique attemptId → gọi lần 2 trả kết quả cũ), upsert `species_records(playerId, speciesId, firstCaughtAt, totalCaught, bestLengthTenthCm, bestCatchId)`, cộng `players.exp`, tính level mới. Trả `{catchId, isNew, isRecord, expGained, level, levelUp}` theo SPEC 2.9.
- **Nghiệm thu:** lần đầu bắt perch → isNew true, isRecord false; con dài hơn → isRecord true; con ngắn hơn → cả hai false; exp 35 + 5 → Lv2, levelUp true; gọi lặp cùng attemptId không cộng EXP 2 lần.

### BE-D-07 Chỉ số và tiến trình
- **Độ lớn:** S. **Phụ thuộc:** BE-D-01; StatCalculator (BE-B-02).
- **Spec:** triển khai `IProgress.GetStatsAsync(playerId)` = level + cần đang dùng + buff ghế nếu đang giữ ghế. `GET /me/progress` đúng SPEC.
- **Nghiệm thu:** player Lv1 cần mặc định → strength 11; đang ngồi Tier 1 → largeLuck 1.

### BE-D-08 Codex và lịch sử
- **Độ lớn:** S. **Phụ thuộc:** BE-D-06; bảng `fishing_attempts` của BE-E (đọc).
- **Spec:** `GET /me/codex` trả đủ 9 loài, loài chưa bắt `discovered:false` và các số null. `GET /me/history`: đọc `fishing_attempts` đã kết thúc của user, cursor opaque (base64 của `endedAt|attemptId`), limit mặc định 20 tối đa 100.
- **Nghiệm thu:** 45 lần câu → 3 trang 20/20/5, không trùng, không sót.
- **Ghi chú:** khi BE-E chưa có bảng, viết theo schema ở BE-E-01 và test với dữ liệu seed.
