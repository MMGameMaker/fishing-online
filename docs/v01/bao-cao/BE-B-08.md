# BE-B-08 — Máy trạng thái lần câu

- **Worker:** Claude
- **Branch / PR:** chưa tạo nhánh/PR; thay đổi chưa commit trên working tree `main`
- **Ngày gửi review:** 2026-11-09 (chờ commit/PR theo yêu cầu người dùng)
- **Spec áp dụng:** SPEC_CHUNG v0.5, config `v0-test-2026-11-09-monitoring-05`

## Đã làm

- `FishingAttempt` thuần: `Start`, `Tick`, `Hook`, `ReportOutcome`, `Cancel`, `Snapshot`, `Restore`; không có timer thật, `now` truyền từ ngoài.
- Mỗi lệnh trả `AttemptStep(Events, Error)`, sự kiện `PhaseChanged` và `Succeeded{speciesId, length, exp}`.
- `Hook` và `ReportOutcome` cập nhật theo thời gian trước khi xử lý, nên kết quả không phụ thuộc nhịp ticker 50 ms. Một `Tick` trễ có thể đi qua nhiều phase.

## File thay đổi

- `server/FishingOnline.Domain/Attempts/FishingAttempt.cs`, `AttemptTypes.cs`.
- `server/FishingOnline.Domain.Tests/FishingAttemptTests.cs`.
- `docs/v01/TIEN_DO.md` — dòng BE-B-08.

## Lệnh kiểm tra đã chạy

```
dotnet restore server --locked-mode → exit 0
dotnet build server -warnaserror    → 0 Warning, 0 Error
dotnet test server                  → Domain 142/142; Api 32 Passed, 1 Skipped (PostgreSQL cần Docker, thuộc BE-A-01)
```

## Nghiệm thu

| Tiêu chí (chép từ task) | Kết quả | Bằng chứng |
| --- | --- | --- |
| Test từng chuyển trạng thái hợp lệ | Đạt | `Tick_AtBiteAt_...`, `Hook_AtLastAllowedMoment_...`, `Report_Success_...`, `Report_Failed_...`, `Tick_InBite_...`, `Tick_InMinigame_...`, `Cancel_FromOpenPhase_...` |
| Test từng chuyển trạng thái không hợp lệ | Đạt | `Hook_BeforeBite_...`, `Report_BeforeHook_...`, `Report_AfterMissedBiteOrCancel_...`, `Terminal_RejectsHook`, `Report_DifferentOutcomeAfterSuccess_...` |
| Hook 2 lần → lần 2 lỗi | Đạt | `Hook_Twice_SecondIsRejected_AndSeedStays` |
| Cancel sau success không đổi gì | Đạt | `Terminal_IgnoresCancelAndTick` (cả 5 kiểu kết thúc) |
| Restore từ snapshot cho kết quả giống hệt khi tiếp tục | Đạt | `Restore_ContinuesExactlyLikeTheOriginal` ở 3 điểm, có qua JSON |

## Lệch spec / giả định

- **`BiteDeadline = BiteAt + 3000`** theo task; SPEC 2.6 ghi `now + 3000`. Hai cách chỉ khác độ trễ ticker. Số 3000 và 300 đọc từ config.
- **`Start` là hàm tạo tĩnh, không trả sự kiện:** chưa có trạng thái trước `waiting`; BE-E gửi `AttemptUpdate waiting` từ `Snapshot()`.
- **Stats chốt lúc `Start`,** vì bite cần rareLuck trước Hook. BE-E-04 ghi "stats lúc hook"; kết quả như nhau nếu BE-E chặn đổi cần khi đang câu qua `IFishingState.IsBusy`.
- **Chọn loài qua `AttemptContext.PickSpecies`,** bản mặc định gọi `SpawnPicker`. Chưa xét tồn cá, không tự thêm fallback (BE-E-08).
- **Lặp kết quả:** `failed` trên attempt đã `failed/timeout` trả không lỗi, kể cả sau deadline; `success` sau khi hết hạn trả `ResultExpired`; `success` sau khi Client đã báo `failed` trước deadline trả `StateConflict`. Giống `commandSubmit` trong mock Client.
- `Cancel` lý do ngoài 3 giá trị SPEC là lỗi lập trình, ném `ArgumentException`.

## Cần lead quyết

- **Reason khi Client báo `failed`:** SPEC chưa định nghĩa. Mình dùng `timeout` như mock Client (`MockBackend.ts:817`), nên chưa phân biệt được "Client báo thua" với "Server hết hạn" qua `reason`. Nếu BE-E-09 cần phân biệt thì thêm một giá trị reason.

## Việc còn lại

- Bản `IRandomSource` dùng thật, ánh xạ `AttemptError` sang `ErrorCatalog` và khóa/transaction: thuộc BE-E.

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
