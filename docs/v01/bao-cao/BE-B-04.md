# BE-B-04 — Chọn loài

- **Worker:** Claude
- **Branch / PR:** chưa tạo nhánh/PR; thay đổi chưa commit trên working tree `main`
- **Ngày gửi review:** 2026-11-09 (chờ commit/PR theo yêu cầu người dùng)
- **Spec áp dụng:** SPEC_CHUNG v0.5, config `v0-test-2026-11-09-monitoring-05`

## Đã làm

- `SpawnPicker.Pick(random, config, rareLuck)` theo SPEC 2.8: `linear_basis_points`, clamp luck trong 0..`maxRareLuck`, random rarity bằng số nguyên bp rồi chọn đều trong rarity.
- `BasisPoints.PickIndex` dùng chung với BE-B-05.
- `RarityTable.For(rarity)` trong model config.

## File thay đổi

- `server/FishingOnline.Domain/Rules/SpawnPicker.cs`, `BasisPoints.cs`, `Config/GameplayConfig.cs`.
- `server/FishingOnline.Domain.Tests/RollTests.cs`, `TestSupport.cs`.
- `docs/v01/TIEN_DO.md` — dòng BE-B-04.

## Lệnh kiểm tra đã chạy

```
dotnet restore server --locked-mode → exit 0
dotnet build server -warnaserror    → 0 Warning, 0 Error
dotnet test server                  → Domain 70/70; Api 32 Passed, 1 Skipped (PostgreSQL cần Docker, thuộc BE-A-01)
```

## Nghiệm thu

| Tiêu chí (chép từ task) | Kết quả | Bằng chứng |
| --- | --- | --- |
| 100.000 mẫu, tỷ lệ mỗi rarity lệch ≤ 0,5 điểm % so với 60,5/25/10/4/0,5 ở L=0 | Đạt | `RarityRates_MatchSpec(0, ...)`, seed cố định |
| Như trên, 47,2/28,5/15,6/7,5/1,2 ở L=7 | Đạt | `RarityRates_MatchSpec(7, ...)`, seed cố định |
| Trong common mỗi loài khoảng 1/3 | Đạt | `CommonSpecies_AreEquallyLikely`, lệch ≤ 1 điểm % |

## Lệch spec / giả định

- "Khoảng 1/3" được kiểm với sai số 1 điểm %, spec không ghi số.
- Tổng bp khác 10.000, rarity không có loài, hoặc `rareLuckMode` khác `linear_basis_points` đều ném lỗi, không tự chuẩn hóa. Chưa xét tồn cá; phần quần thể thuộc BE-E-08.

## Cần lead quyết

- Không có.

## Việc còn lại

- Không có trong phạm vi task. Chọn loài theo tồn cá và fallback khi cạn chờ BE-E-08.

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
