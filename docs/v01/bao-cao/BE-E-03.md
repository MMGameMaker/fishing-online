# BE-E-03 — HookFish và nhận kết quả Client

- **Worker:** Claude
- **Branch / PR:** chưa tạo nhánh/PR; thay đổi chưa commit trên working tree `main`
- **Ngày gửi review:** 2026-11-09 (chờ commit/PR theo yêu cầu người dùng)
- **Spec áp dụng:** SPEC_CHUNG v0.8, config `v0-test-2026-11-09-monitoring-05`

## Đã làm

- `HookFish`, `SubmitFishingResult` khóa attempt, kiểm tra owner/state/deadline/ghế, không nhận tap.

## File thay đổi

- `server/FishingOnline.Api/Modules/Fishing/*`
- `server/FishingOnline.Api.Tests/FishingTests.cs`
- `server/FishingOnline.Api/Persistence/Migrations/*_BE_CoreGameplay*`
- `docs/v01/TIEN_DO.md` — dòng BE-E-03

## Lệnh kiểm tra đã chạy

```
dotnet restore server --locked-mode → exit 0
dotnet build server -warnaserror → 0 Warning, 0 Error
dotnet test server → Domain 159/159; Api 169/169, 0 Skipped (chạy lại 2026-11-10 sau BE-E-08) (PostgreSQL 17.6 portable, 127.0.0.1:55432)
```

## Nghiệm thu

| Tiêu chí (chép từ task) | Kết quả | Bằng chứng |
| --- | --- | --- |
| 100 request song song đổi requestId chỉ 1 catch/EXP | Đạt | `Hundred_ParallelResults_OneCatchOneExp` |
| Result trước Hook/sai owner/attempt giả/quá hạn không được thưởng | Đạt | `Result_BeforeHook_IsRejected`, `Result_FromOtherPlayerOrFakeAttempt_IsRejected`, `Result_AfterDeadline_ResultExpired` |
| Repeat trả kết quả cũ, outcome trái → `STATE_CONFLICT` | Đạt | `Result_RepeatReturnsSame_OppositeIsConflict` |
| Không có MinigameTap/replay | Đạt | Không có hub method tương ứng |
| Debit pool chỉ 1 lần | Đạt | Làm cùng BE-E-08: `RepeatedSuccess_ReducesOnce`, `OneFish_TwoAttempts_OnlyOneCanCatch` |

## Lệch spec / giả định

- Không có.

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
