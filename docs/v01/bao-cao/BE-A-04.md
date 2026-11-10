# BE-A-04 — Idempotency

- **Worker:** Claude
- **Branch / PR:** chưa tạo nhánh/PR; thay đổi chưa commit trên working tree `main`
- **Ngày gửi review:** 2026-11-09 (chờ commit/PR theo yêu cầu người dùng)
- **Spec áp dụng:** SPEC_CHUNG v0.8, config `v0-test-2026-11-09-monitoring-05`

## Đã làm

- Bảng `idempotency_receipts`, `IIdempotency.RunAsync` khóa advisory theo key và ghi receipt cùng transaction; filter `.Idempotent("op")` cho HTTP; job dọn sau 7 ngày.

## File thay đổi

- `server/FishingOnline.Api/Modules/Common/Idempotency.cs`
- `server/FishingOnline.Api.Tests/FoundationTests.cs`
- `server/FishingOnline.Api/Persistence/Migrations/*_BE_CoreGameplay*`
- `docs/v01/TIEN_DO.md` — dòng BE-A-04

## Lệnh kiểm tra đã chạy

```
dotnet restore server --locked-mode → exit 0
dotnet build server -warnaserror → 0 Warning, 0 Error
dotnet test server → Domain 159/159; Api 169/169, 0 Skipped (chạy lại 2026-11-10 sau BE-E-08) (PostgreSQL 17.6 portable, 127.0.0.1:55432)
```

## Nghiệm thu

| Tiêu chí (chép từ task) | Kết quả | Bằng chứng |
| --- | --- | --- |
| Gửi 2 lần cùng key cùng body → response giống hệt, chỉ 1 dòng ledger | Đạt | `SameKeySameBody_ReturnsIdenticalResponse_OneLedger` |
| Cùng key khác body → 409 `IDEMPOTENCY_CONFLICT` | Đạt | `SameKeyDifferentBody_Returns409` |
| 2 request cùng key song song → 1 thực thi | Đạt | `SameKeyInParallel_ExecutesOnce` (8 request) |

## Lệch spec / giả định

- Minimal API không có attribute nên dùng `.Idempotent("op")` thay `[Idempotent("op")]`. Lệnh ném lỗi không ghi receipt, lần gửi lại tính lại theo trạng thái hiện tại.

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
