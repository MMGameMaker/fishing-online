# BE-E-09 — Cảnh báo nghi vấn gian lận — chỉ quan sát

- **Worker:** Claude
- **Branch / PR:** chưa tạo nhánh/PR; thay đổi chưa commit trên working tree `main`
- **Ngày gửi review:** 2026-11-09 (chờ commit/PR theo yêu cầu người dùng)
- **Spec áp dụng:** SPEC_CHUNG v0.8, config `v0-test-2026-11-09-monitoring-05`

## Đã làm

- Outbox `fishing_outcome_events` ghi cùng transaction, kênh `invalid_result_events` có giới hạn, `player_security_signals` dedupe theo player/rule/bucket; worker 1 giây, truy vấn theo player/rule/thời gian, xóa sau 30 ngày. Không từ chối kết quả, không ban.

## File thay đổi

- `server/FishingOnline.Api/Modules/Fishing/Monitoring.cs`
- `server/FishingOnline.Api.Tests/FishingTests.cs`
- `server/FishingOnline.Api/Persistence/Migrations/*_BE_CoreGameplay*`
- `docs/v01/TIEN_DO.md` — dòng BE-E-09

## Lệnh kiểm tra đã chạy

```
dotnet restore server --locked-mode → exit 0
dotnet build server -warnaserror → 0 Warning, 0 Error
dotnet test server → Domain 159/159; Api 169/169, 0 Skipped (chạy lại 2026-11-10 sau BE-E-08) (PostgreSQL 17.6 portable, 127.0.0.1:55432)
```

## Nghiệm thu

| Tiêu chí (chép từ task) | Kết quả | Bằng chứng |
| --- | --- | --- |
| 50/50 success tạo 1 signal, vẫn đúng 1 cá/attempt | Đạt | `FiftyWins_OpensOneInformationalSignal`, `FortyNineWins_NoSignal` |
| 5 success ≤ 1s tạo fast signal | Đạt | `FastSuccess_FourNo_FifthYes` |
| Invalid burst ghi warning và validation vẫn chặn | Đạt | `InvalidBurst_SignalsWarning_AndStaysRejected` |
| Retry 100 lần không tăng mẫu | Đạt | `RetryingValidResult_AddsOneSampleOnly` |
| Restart không signal trùng | Đạt | `Reprocessing_DoesNotDuplicateSignal` |
| Không log token/payload | Đạt | Bảng và log chỉ giữ id, loại lỗi, rule |

## Lệch spec / giả định

- `failed` do hết giờ cũng tính vào mẫu win rate nếu đã vào minigame; `missed_bite` và `cancelled` thì không.

## Cần lead quyết

- Không có.

## Việc còn lại

- Trang tra cứu thuộc nhóm AD.

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
