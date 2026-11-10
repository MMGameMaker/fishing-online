# BE-C-04 — Bảng ghế, mua vé

- **Worker:** Claude
- **Branch / PR:** chưa tạo nhánh/PR; thay đổi chưa commit trên working tree `main`
- **Ngày gửi review:** 2026-11-09 (chờ commit/PR theo yêu cầu người dùng)
- **Spec áp dụng:** SPEC_CHUNG v0.8, config `v0-test-2026-11-09-monitoring-05`

## Đã làm

- Bảng `seats` (seed từ map khi khởi động), `seat_sessions` (2 unique partial index), `seat_cooldowns`, `seat_purchases`; `BuySeatTicket` atomic với ví và idempotency; sau commit phát `SeatChanged`, `MySeatSession`, `PlayerMoved`.

## File thay đổi

- `server/FishingOnline.Api/Modules/Lake/LakeModels.cs`
- `server/FishingOnline.Api/Modules/Lake/SeatSessions.cs`
- `server/FishingOnline.Api.Tests/LakeTests.cs`
- `server/FishingOnline.Api/Persistence/Migrations/*_BE_CoreGameplay*`
- `docs/v01/TIEN_DO.md` — dòng BE-C-04

## Lệnh kiểm tra đã chạy

```
dotnet restore server --locked-mode → exit 0
dotnet build server -warnaserror → 0 Warning, 0 Error
dotnet test server → Domain 159/159; Api 169/169, 0 Skipped (chạy lại 2026-11-10 sau BE-E-08) (PostgreSQL 17.6 portable, 127.0.0.1:55432)
```

## Nghiệm thu

| Tiêu chí (chép từ task) | Kết quả | Bằng chứng |
| --- | --- | --- |
| 10 client cùng mua 1 ghế → 1 thành công, 9 nhận `SEAT_TAKEN`, chỉ 1 dòng ledger | Đạt | `TenClientsBuySameSeat_OneWins` |
| Mua ghế thứ 2 → `ALREADY_HAS_SEAT` | Đạt | `SecondSeat_AlreadyHasSeat` |
| Thiếu Gold → `INSUFFICIENT_GOLD`, ghế vẫn trống | Đạt | `NotEnoughGold_SeatStaysFree` |

## Lệch spec / giả định

- Chủ ghế nhận thêm `PositionCorrected` để tự dịch chuyển, giống mock Client.
- Trần kỹ thuật 525600 phút chỉ để chặn tràn số; min/max thời lượng SPEC chưa chốt.
- `perSeatOverrides` chưa có định dạng nên chưa áp dụng.

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
