# BE-B-05 — Random chiều dài

- **Worker:** Claude
- **Branch / PR:** chưa tạo nhánh/PR; thay đổi chưa commit trên working tree `main`
- **Ngày gửi review:** 2026-11-09 (chờ commit/PR theo yêu cầu người dùng)
- **Spec áp dụng:** SPEC_CHUNG v0.5, config `v0-test-2026-11-09-monitoring-05`

## Đã làm

- `LengthRoller.Roll(random, tiers, fish, largeLuck)` → `(lengthTenthCm, tierId)` theo SPEC 2.9: chọn bậc bằng `NextInt(0, 9999)` so tích lũy, vị trí random đều trong bậc.
- `LengthRoller.LengthAt(fish, position)`: `round(min + (max − min) × pos)`, làm tròn nửa lên.

## File thay đổi

- `server/FishingOnline.Domain/Rules/LengthRoller.cs`.
- `server/FishingOnline.Domain.Tests/RollTests.cs`, `TestSupport.cs`.
- `docs/v01/TIEN_DO.md` — dòng BE-B-05.

## Lệnh kiểm tra đã chạy

```
dotnet restore server --locked-mode → exit 0
dotnet build server -warnaserror    → 0 Warning, 0 Error
dotnet test server                  → Domain 70/70; Api 32 Passed, 1 Skipped (PostgreSQL cần Docker, thuộc BE-A-01)
```

## Nghiệm thu

| Tiêu chí (chép từ task) | Kết quả | Bằng chứng |
| --- | --- | --- |
| L=0: 100.000 mẫu tỷ lệ 70/25/4,9/0,1 (lệch ≤ 0,5 điểm) | Đạt | `TierRates_MatchSpec(0, ...)`, seed cố định |
| L=7: 56/35,5/8,4/0,1 | Đạt | `TierRates_MatchSpec(7, ...)`, seed cố định |
| Bậc max cho đúng `maxTenthCm` | Đạt | `MaxTier_GivesExactMaximum` |
| Mọi kết quả nằm trong [min, max] | Đạt | `TierRates_MatchSpec`, `EachTier_StaysInsideItsPositionRange` |
| Ví dụ cố định: Minnow, pos 0.5 → 150 | Đạt | `Minnow_AtHalfPosition_Is150` |

## Lệch spec / giả định

- Thêm tham số `LengthTierConfig` so với chữ ký trong task, để bảng bậc đọc từ config (R6).
- `LengthAt` để public nhằm test đúng ví dụ pos 0.5 và cho bên khác dùng cùng công thức.
- Bậc `huge` có `posMax` 0.999 (spec ghi đóng): `NextDouble` trong [0, 1) nên giá trị thực chạm sát nhưng không vượt 0.999. Sau làm tròn vẫn có thể bằng `maxTenthCm`, như test `huge` [210, 225] cho Minnow.

## Cần lead quyết

- Không có.

## Việc còn lại

- Không có.

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
