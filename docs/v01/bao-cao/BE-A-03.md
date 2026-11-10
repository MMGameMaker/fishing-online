# BE-A-03 — Ví Gold và ledger

- **Worker:** Claude
- **Branch / PR:** chưa tạo nhánh/PR; thay đổi chưa commit trên working tree `main`
- **Ngày gửi review:** 2026-11-09 (chờ commit/PR theo yêu cầu người dùng)
- **Spec áp dụng:** SPEC_CHUNG v0.8, config `v0-test-2026-11-09-monitoring-05`

## Đã làm

- Bảng `wallets` (CHECK gold ≥ 0, version), `ledger_entries` chỉ thêm; `IWallet` khóa hàng `FOR UPDATE`, dùng chung transaction của caller.

## File thay đổi

- `server/FishingOnline.Api/Modules/Wallet/WalletModule.cs`
- `server/FishingOnline.Api.Tests/FoundationTests.cs`
- `server/FishingOnline.Api/Persistence/Migrations/*_BE_CoreGameplay*`
- `docs/v01/TIEN_DO.md` — dòng BE-A-03

## Lệnh kiểm tra đã chạy

```
dotnet restore server --locked-mode → exit 0
dotnet build server -warnaserror → 0 Warning, 0 Error
dotnet test server → Domain 159/159; Api 169/169, 0 Skipped (chạy lại 2026-11-10 sau BE-E-08) (PostgreSQL 17.6 portable, 127.0.0.1:55432)
```

## Nghiệm thu

| Tiêu chí (chép từ task) | Kết quả | Bằng chứng |
| --- | --- | --- |
| 50 debit song song 10 Gold trên ví 100 → đúng 10 thành công, số dư 0, không âm | Đạt | `FiftyParallelDebits_ExactlyTenSucceed_AndLedgerMatchesBalance` |
| Tổng delta của ledger = số dư | Đạt | Cùng test |
| Rollback của caller thì ledger cũng không còn | Đạt | `CallerRollback_RemovesLedger` |

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
