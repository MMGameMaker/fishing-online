# BE-C-07 — Khôi phục sau restart

- **Worker:** Claude
- **Branch / PR:** chưa tạo nhánh/PR; thay đổi chưa commit trên working tree `main`
- **Ngày gửi review:** 2026-11-09 (chờ commit/PR theo yêu cầu người dùng)
- **Spec áp dụng:** SPEC_CHUNG v0.8, config `v0-test-2026-11-09-monitoring-05`

## Đã làm

- Khi khởi động xử lý mọi phiên mở rồi quét ngay; Server ghi mốc còn sống mỗi 5 giây vào `lake_runtime`.

## File thay đổi

- `server/FishingOnline.Api/Modules/Lake/SeatSessions.cs`
- `server/FishingOnline.Api/Modules/Lake/LakeModels.cs`
- `server/FishingOnline.Api.Tests/LakeTests.cs`
- `server/FishingOnline.Api/Persistence/Migrations/*_BE_CoreGameplay*`
- `docs/v01/TIEN_DO.md` — dòng BE-C-07

## Lệnh kiểm tra đã chạy

```
dotnet restore server --locked-mode → exit 0
dotnet build server -warnaserror → 0 Warning, 0 Error
dotnet test server → Domain 159/159; Api 169/169, 0 Skipped (chạy lại 2026-11-10 sau BE-E-08) (PostgreSQL 17.6 portable, 127.0.0.1:55432)
```

## Nghiệm thu

| Tiêu chí (chép từ task) | Kết quả | Bằng chứng |
| --- | --- | --- |
| Tắt server, bật lại sau 30 giây → còn ghế | Đạt | `Restart_KeepsOrLosesSeatByDowntime(30, false)` |
| Tắt 3 phút → mất ghế | Đạt | `Restart_KeepsOrLosesSeatByDowntime(180, true)` |

## Lệch spec / giả định

- Spec ghi `disconnectedAt = thời điểm khởi động`, nhưng như vậy tắt 3 phút vẫn còn ghế, trái tiêu chí nghiệm thu. Mình dùng mốc Server còn sống gần nhất; chưa có mốc thì mới dùng thời điểm khởi động.

## Cần lead quyết

- Xác nhận cách hiểu trên để sửa câu chữ trong BE-C-07.

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
