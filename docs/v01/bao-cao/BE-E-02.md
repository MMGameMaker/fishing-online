# BE-E-02 — CastLine và vòng thời gian

- **Worker:** Claude
- **Branch / PR:** chưa tạo nhánh/PR; thay đổi chưa commit trên working tree `main`
- **Ngày gửi review:** 2026-11-09 (chờ commit/PR theo yêu cầu người dùng)
- **Spec áp dụng:** SPEC_CHUNG v0.8, config `v0-test-2026-11-09-monitoring-05`

## Đã làm

- `CastLine` pin config của phiên, `FishingTicker` 50 ms; mỗi lệnh khóa hàng và dựng lại `FishingAttempt` từ snapshot; `IRandomSource` dùng thật.

## File thay đổi

- `server/FishingOnline.Api/Modules/Fishing/*`
- `server/FishingOnline.Api.Tests/FishingTests.cs`
- `server/FishingOnline.Api/Persistence/Migrations/*_BE_CoreGameplay*`
- `docs/v01/TIEN_DO.md` — dòng BE-E-02

## Lệnh kiểm tra đã chạy

```
dotnet restore server --locked-mode → exit 0
dotnet build server -warnaserror → 0 Warning, 0 Error
dotnet test server → Domain 159/159; Api 169/169, 0 Skipped (chạy lại 2026-11-10 sau BE-E-08) (PostgreSQL 17.6 portable, 127.0.0.1:55432)
```

## Nghiệm thu

| Tiêu chí (chép từ task) | Kết quả | Bằng chứng |
| --- | --- | --- |
| Tier 3 chuyển bite sau 3-6 giây | Đạt | `Bite_ArrivesInsideWaitWindow(seat-11)` |
| Tier 1 1-4 giây | Đạt theo công thức | `Bite_ArrivesInsideWaitWindow(seat-01)` kiểm 2-5 giây |
| Không giữ ghế → `NOT_IN_SEAT` | Đạt | `Cast_WithoutSeat_NotInSeat` |

## Lệch spec / giả định

- Tiêu chí ghi Tier 1 là 1-4 giây, nhưng SPEC 2.6 với lure 1000 ms cho 2-5 giây. Mình làm theo SPEC.
- SPEC không có event cho cờ `fishing`, nên phát lại `PlayerJoined` với PlayerView mới; Client đang ghi đè theo playerId.

## Cần lead quyết

- Sửa tiêu chí Tier 1 thành 2-5 giây, hoặc thêm event riêng cho cờ `fishing` nếu muốn tách.

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
