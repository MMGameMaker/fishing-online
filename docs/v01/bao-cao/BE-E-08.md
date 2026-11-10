# BE-E-08 — Quần thể cá hữu hạn và tích hợp lượt câu

- **Worker:** Claude
- **Branch / PR:** chưa tạo nhánh/PR; thay đổi chưa commit trên working tree `main`
- **Ngày gửi review:** 2026-11-10 (chờ commit/PR theo yêu cầu người dùng)
- **Spec áp dụng:** SPEC_CHUNG v0.8 mục 2.12; luật cạn cá theo đề xuất user duyệt 2026-11-10

## Luật đã duyệt (2026-11-10)

- Tồn ban đầu mỗi loài: common 200, uncommon 100, rare 40, epic 15, legendary 3 (`Fishing:InitialStock`, chỉnh được).
- Loài hết cá: chọn đều trong các loài cùng rarity còn cá. Cả rarity hết: hạ dần xuống rarity thấp hơn còn cá.
- Hồ trống: vẫn thuê ghế và quăng cần được, nhưng cá không cắn. Không hiển thị số cá cho người chơi.

## Đã làm

- Bảng `lake_fish_populations` (CHECK `remaining >= reserved >= 0`) và `lake_fish_movements` chỉ thêm, unique theo `(kind, sourceId, lake, species)`.
- Khi cắn: khóa hàng quần thể theo thứ tự speciesId, chọn loài theo cá còn lại, `reserved + 1`, đánh dấu `PopulationReserved` trên attempt; cùng transaction với attempt.
- Khi kết thúc: thắng thì `remaining − 1`, `reserved − 1` và ghi movement `catch` theo attemptId, cùng transaction với catch, EXP và Codex. Thua, hủy, hoặc restart thì chỉ trả `reserved`.
- `FishPopulation.StockAsync(batchId, lines)`: thả cộng dồn, gửi lại cùng batch không cộng lần hai, batch mới luôn cộng. AD-06 gọi service này; API Admin thuộc nhóm AD.
- Tồn ban đầu chỉ tạo cho loài chưa có, nên login, restart hay publish config không reset hồ.
- Cá về muộn: lúc cắn tính từ lúc thấy cá, để người chơi vẫn đủ 3 giây Kéo.

## File thay đổi

- `server/FishingOnline.Api/Modules/Fishing/Population.cs` (mới), `FishingService.cs`, `FishingModels.cs`.
- `server/FishingOnline.Api/appsettings.json` — `Fishing:InitialStock`, `Fishing:EmptyLakeRetryMs`.
- `server/FishingOnline.Api/Persistence/Migrations/*_BEE_FishPopulation*`.
- `server/FishingOnline.Domain/Rules/SpawnPicker.cs` (`PickAvailable`, `PickRarity`), `Domain/Attempts/FishingAttempt.cs`, `AttemptTypes.cs` (`PickSpecies` trả null được, `BiteDeferred`).
- `server/FishingOnline.Api.Tests/PopulationTests.cs`, `server/FishingOnline.Domain.Tests/PopulationPickTests.cs`.
- `docs/v01/TIEN_DO.md` — dòng BE-E-08.

## Lệnh kiểm tra đã chạy

```
dotnet restore server --locked-mode → exit 0
dotnet build server -warnaserror    → 0 Warning, 0 Error
dotnet test server                  → Domain 159/159; Api 169/169, 0 Skipped (PostgreSQL 17.6 portable)
dotnet test server --filter Category=E2E → 1 Passed
dotnet ef migrations has-pending-model-changes → No changes
```

## Nghiệm thu

| Tiêu chí (chép từ task) | Kết quả | Bằng chứng |
| --- | --- | --- |
| Hồ có 1 cá, 2 attempt cạnh tranh không thể tạo 2 catch | Đạt | `OneFish_TwoAttempts_OnlyOneCanCatch` |
| Thành công giảm 1, thất bại/hủy không giảm remaining | Đạt | `RepeatedSuccess_ReducesOnce`, `Failed_ReleasesReservation_WithoutReducingRemaining`, `Cancel_And_Restart_ReleaseReservation` |
| Retry/restart không giảm trùng hoặc giữ reservation vĩnh viễn | Đạt | Hai test trên (gửi lặp 20 lần; recovery trả reserved) |
| Đợt thả chạy đồng thời với catch không mất cập nhật | Đạt | `StockingDuringCatch_LosesNoUpdate_AndLedgerReconciles` (5 catch song song với 5 đợt thả) |
| Đối chiếu tổng thả − tổng bắt = remaining | Đạt | Cùng test: tổng movement từng loài = remaining |
| Test điều kiện hồ/loài hết cá theo luật được duyệt | Đạt | `EmptyLake_NoBite_UntilStocked`; Domain `EmptySpecies_PicksAnotherOfSameRarity`, `EmptyRarity_FallsToLowerRarity`, `EmptyLake_ReturnsNull`, `LateFish_BiteWindowStartsWhenFishArrives` |
| Còn 30, thả 100 → 130; reserved không đổi; 2 batch giống nhau đều cộng, retry cùng batch cộng 1 lần | Đạt | `Stocking_IsAdditive_KeepsReserved_BatchRetryOnce` |
| Không reset pool sau login/restart/publish | Đạt | `Seed_UsesApprovedStockPerRarity_AndDoesNotResetOnRestart` |

## Lệch spec / giả định

- **Không còn rarity thấp hơn:** đề xuất chỉ nói hạ xuống. Nếu rarity thấp hơn cũng hết cá (ví dụ chỉ còn epic), mình lên rarity gần nhất còn cá thay vì để cá không cắn khi hồ vẫn còn cá. Tỷ lệ gốc không bị chuẩn hóa lại.
- **Hồ trống:** attempt ở `waiting` và Server thử lại mỗi `EmptyLakeRetryMs` (1 giây). Hết hạn ghế thì hủy theo luật cũ.
- Một instance có một hồ `lake-01` (theo `mapId`).
- Có sửa file Domain của nhóm BE-B (`SpawnPicker`, `FishingAttempt`) để thêm luật cạn cá; các test BE-B cũ vẫn đạt.

## Cần lead quyết

- Bổ sung luật trên vào SPEC 2.12 và fixture (tồn ban đầu đang nằm ở appsettings vì fixture do lead giữ).

## Việc còn lại

- API và màn hình thả cá thuộc AD-06/AD-07; QA-04 kiểm tra xuyên suốt.

---

## Review (reviewer điền)

- **Reviewer:** <tên>  **Ngày:** <yyyy-mm-dd>

| # | Kết quả | Ghi chú |
| --- | --- | --- |
| R1 Phạm vi | | |
| R2 Build/lint | | |
| R3 Test | | |
| R4 Nghiệm thu | | |
| R5 Contract | | |
| R6 Không hard-code | | |
| R7 Server quyết định | | |
| R8 Migration | | |
| R9 Báo cáo trung thực | | |
| R10 Lệch spec | | |

**Kết luận:** Đạt / Làm lại. <danh sách lỗi nếu Làm lại>
