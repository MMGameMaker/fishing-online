# BE-C-05 — Kết thúc phiên và cooldown

- **Worker:** Claude
- **Branch / PR:** chưa tạo nhánh/PR; thay đổi chưa commit trên working tree `main`
- **Ngày gửi review:** 2026-11-09 (chờ commit/PR theo yêu cầu người dùng)
- **Spec áp dụng:** SPEC_CHUNG v0.9, config v0-test-2026-11-10-ticket-01

## Đã làm

- SPEC 0.9: bỏ cooldown; kết thúc ghế theo left_seat, missed_bite, ticket_expired (đợi xong minigame), disconnect_timeout; LeaveSeat bị từ chối khi đang minigame.
- `EndAsync`, `LeaveSeat`, cooldown theo config, `BackgroundService` quét 250 ms; khóa hàng để race với gia hạn có một kết quả.

## File thay đổi

- `server/FishingOnline.Api/Modules/Lake/SeatSessions.cs`
- `server/FishingOnline.Api/Modules/Lake/LakeCommands.cs`
- `server/FishingOnline.Api.Tests/LakeTests.cs`
- `server/FishingOnline.Api/Persistence/Migrations/*_BE_CoreGameplay*`
- `docs/v01/TIEN_DO.md` — dòng BE-C-05

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
| SPEC 0.9: hết vé thì đứng dậy, giữa minigame thì câu nốt | Đạt | `TicketExpiry_StandsUpSeatedPlayer`, `TicketExpiringInMinigame_FinishesTheCatch_ThenStandsUp`, `LeaveSeat_InMinigame_IsRejected` |
| Với đồng hồ giả, phiên kết thúc đúng expiresAt mới nhất | Đạt | `Session_EndsAtExpiry_ThenCooldownTenSeconds`, `Extend_RacingExpiryTimer_HasOneConsistentResult` |
| Ghế available đúng 10.000 ms sau | Đạt | Cùng test (9999 ms vẫn cooldown) |
| Người vừa rời mua lại trong cooldown → `SEAT_COOLDOWN` | Đạt | `LeaveSeat_EndsSession_AndWithoutSeatFails` |

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
