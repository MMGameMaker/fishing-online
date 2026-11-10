# BE-D-06 — Ghi cá bắt được, EXP, level, Codex

- **Worker:** Claude
- **Branch / PR:** chưa tạo nhánh/PR; thay đổi chưa commit trên working tree `main`
- **Ngày gửi review:** 2026-11-09 (chờ commit/PR theo yêu cầu người dùng)
- **Spec áp dụng:** SPEC_CHUNG v0.8, config `v0-test-2026-11-09-monitoring-05`

## Đã làm

- `ICatchRecorder` trong transaction của BE-E, khóa hàng player, unique `attemptId`, upsert `species_records`.

## File thay đổi

- `server/FishingOnline.Api/Modules/Economy/*`
- `server/FishingOnline.Api.Tests/EconomyTests.cs`
- `server/FishingOnline.Api/Persistence/Migrations/*_BE_CoreGameplay*`
- `docs/v01/TIEN_DO.md` — dòng BE-D-06

## Lệnh kiểm tra đã chạy

```
dotnet restore server --locked-mode → exit 0
dotnet build server -warnaserror → 0 Warning, 0 Error
dotnet test server → Domain 159/159; Api 169/169, 0 Skipped (chạy lại 2026-11-10 sau BE-E-08) (PostgreSQL 17.6 portable, 127.0.0.1:55432)
```

## Nghiệm thu

| Tiêu chí (chép từ task) | Kết quả | Bằng chứng |
| --- | --- | --- |
| Lần đầu bắt perch → isNew true, isRecord false | Đạt | `Record_FirstLongerShorter_NewAndRecordFlags` |
| Con dài hơn → isRecord true; con ngắn hơn → cả hai false | Đạt | Cùng test |
| exp 35 + 5 → Lv2, levelUp true | Đạt | `Record_Exp35Plus5_LevelsUp_RepeatDoesNotDoubleExp` |
| Gọi lặp cùng attemptId không cộng EXP 2 lần | Đạt | Cùng test |

## Lệch spec / giả định

- `RecordAsync` có thêm tham số `configVersion` so với SPEC mục 6, để dùng đúng config đã pin của lần câu.

## Cần lead quyết

- Không có.

## Việc còn lại

- Không có trong phạm vi task.

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
