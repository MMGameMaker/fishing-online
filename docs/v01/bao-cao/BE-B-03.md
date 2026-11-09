# BE-B-03 — Thời gian chờ cá cắn

- **Worker:** Claude
- **Branch / PR:** chưa tạo nhánh/PR; thay đổi chưa commit trên working tree `main`
- **Ngày gửi review:** 2026-11-09 (chờ commit/PR theo yêu cầu người dùng)
- **Spec áp dụng:** SPEC_CHUNG v0.5, config `v0-test-2026-11-09-monitoring-05`

## Đã làm

- `IRandomSource` theo quy tắc chung của nhóm.
- `FishingRules.WaitMs(random, timing, seatLureMs)` = `NextInt(waitMinMs, waitMaxMs) − seatLureMs`.

## File thay đổi

- `server/FishingOnline.Domain/IRandomSource.cs`, `Rules/FishingRules.cs`.
- `server/FishingOnline.Domain.Tests/LevelAndStatTests.cs`, `TestSupport.cs`.
- `docs/v01/TIEN_DO.md` — dòng BE-B-03.

## Lệnh kiểm tra đã chạy

```
dotnet restore server --locked-mode → exit 0
dotnet build server -warnaserror    → 0 Warning, 0 Error
dotnet test server                  → Domain 70/70; Api 32 Passed, 1 Skipped (PostgreSQL cần Docker, thuộc BE-A-01)
```

## Nghiệm thu

| Tiêu chí (chép từ task) | Kết quả | Bằng chứng |
| --- | --- | --- |
| 10.000 mẫu Tier 1 nằm trong [2000, 5000]; Tier 3 trong [3000, 6000] | Đạt | `WaitMs_StaysInRangeForTier` (thêm Tier 2) |

## Lệch spec / giả định

- Thêm tham số `FishingTiming` so với chữ ký trong task, để 3000/6000 đọc từ config (R6, SPEC mục ký hiệu "luôn đọc config").

## Cần lead quyết

- Không có.

## Việc còn lại

- Chưa có bản `IRandomSource` dùng thật; task này chỉ có bản seed/script trong test. Làm khi nối vào attempt (BE-B-08/BE-E).

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
