# SOC-03 — Chat phòng: Server

- **Worker:** Claude
- **Branch / PR:** chưa tạo nhánh/PR; thay đổi chưa commit trên working tree `main`
- **Ngày gửi review:** 2026-11-09 (chờ commit/PR theo yêu cầu người dùng)
- **Spec áp dụng:** SPEC_CHUNG v0.8, config `v0-test-2026-11-09-monitoring-05`

## Đã làm

- `SendChat`, giới hạn tần suất, lọc từ cấm, bảng `chat_messages` giữ 7 ngày.

## File thay đổi

- `server/FishingOnline.Api/Modules/Social/*`
- `server/FishingOnline.Api.Tests/SocialTests.cs`
- `server/FishingOnline.Api/Persistence/Migrations/*_BE_CoreGameplay*`
- `docs/v01/TIEN_DO.md` — dòng SOC-03

## Lệnh kiểm tra đã chạy

```
dotnet restore server --locked-mode → exit 0
dotnet build server -warnaserror → 0 Warning, 0 Error
dotnet test server → Domain 159/159; Api 169/169, 0 Skipped (chạy lại 2026-11-10 sau BE-E-08) (PostgreSQL 17.6 portable, 127.0.0.1:55432)
```

## Nghiệm thu

| Tiêu chí (chép từ task) | Kết quả | Bằng chứng |
| --- | --- | --- |
| Tin 101 ký tự → 400 | Đạt | `Chat_BadLength_IsRejected` |
| Gửi 3 tin trong 1 giây → tin 2, 3 bị chặn | Đạt | `Chat_ThreeInOneSecond_SecondAndThirdBlocked`, `Chat_BurstLimit_TenPerThirtySeconds` |

## Lệch spec / giả định

- `ChatReceived` có thêm `displayName`, `sentAt` theo task; SPEC mục 4 chỉ ghi 3 field.
- Danh sách từ cấm đang rỗng, chưa có nội dung được duyệt.

## Cần lead quyết

- Cung cấp danh sách từ cấm.

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
