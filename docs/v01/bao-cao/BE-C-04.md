# BE-C-04 — Bảng ghế, mua vé

- **Worker:** Claude
- **Branch / PR:** chưa tạo nhánh/PR; thay đổi chưa commit trên working tree `main`
- **Ngày gửi review:** 2026-11-09 (chờ commit/PR theo yêu cầu người dùng)
- **Spec áp dụng:** SPEC_CHUNG v0.9, config v0-test-2026-11-10-ticket-01

## Đã làm

- SPEC 0.9: viết lại thành vé theo thời gian (BuyTicket, bảng tickets/ticket_purchases) và SitDown riêng (≤ 64 px, NO_TICKET, SEAT_TAKEN, ALREADY_HAS_SEAT); migration BEC_TicketsAndSeats chuyển thời gian còn lại của phiên ghế cũ thành vé và đổi config đã publish sang dạng mới.
- Bảng `seats` (seed từ map khi khởi động), `seat_sessions` (2 unique partial index), `seat_cooldowns`, `seat_purchases`; `BuySeatTicket` atomic với ví và idempotency; sau commit phát `SeatChanged`, `MySeatSession`, `PlayerMoved`.

## File thay đổi

- `server/FishingOnline.Api/Modules/Lake/LakeModels.cs`
- `server/FishingOnline.Api/Modules/Lake/SeatSessions.cs`
- `server/FishingOnline.Api.Tests/LakeTests.cs`
- `server/FishingOnline.Api/Persistence/Migrations/*_BE_CoreGameplay*`
- `docs/v01/TIEN_DO.md` — dòng BE-C-04

## Lệnh kiểm tra đã chạy

- 2026-11-10 SPEC 0.9: server: Domain.Tests 156 đạt, Api.Tests 200 đạt (PostgreSQL portable); migration BEC_TicketsAndSeats thử trên DB có dữ liệu cũ

```
dotnet restore server --locked-mode → exit 0
dotnet build server -warnaserror → 0 Warning, 0 Error
dotnet test server → Domain 159/159; Api 169/169, 0 Skipped (chạy lại 2026-11-10 sau BE-E-08) (PostgreSQL 17.6 portable, 127.0.0.1:55432)
```

## Nghiệm thu

| Tiêu chí (chép từ task) | Kết quả | Bằng chứng |
| --- | --- | --- |
| SPEC 0.9: vé cộng nối hạn, 10 người cùng ngồi một ghế chỉ 1 thắng | Đạt | `TicketTests`, `SeatTests` trong LakeTests.cs; migration thử trên DB có config cũ và phiên ghế đang mở |
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
