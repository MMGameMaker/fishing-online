# BE-A-06 — Hồ sơ người chơi

- **Worker:** Claude
- **Branch / PR:** chưa tạo nhánh/PR; thay đổi chưa commit trên working tree `main`
- **Ngày gửi review:** 2026-11-09 (chờ commit/PR theo yêu cầu người dùng)
- **Spec áp dụng:** SPEC_CHUNG v0.8, config `v0-test-2026-11-09-monitoring-05`

## Đã làm

- Mở rộng `players` (level, exp, skin, cần, inventoryVersion), `GET /me`, `PUT /me/display-name` unique không phân biệt hoa thường.

## File thay đổi

- `server/FishingOnline.Api/Persistence/GameDbContext.cs`
- `server/FishingOnline.Api/Modules/Identity/*`
- `server/FishingOnline.Api.Tests/FoundationTests.cs`
- `server/FishingOnline.Api/Persistence/Migrations/*_BE_CoreGameplay*`
- `docs/v01/TIEN_DO.md` — dòng BE-A-06

## Lệnh kiểm tra đã chạy

```
dotnet restore server --locked-mode → exit 0
dotnet build server -warnaserror → 0 Warning, 0 Error
dotnet test server → Domain 159/159; Api 169/169, 0 Skipped (chạy lại 2026-11-10 sau BE-E-08) (PostgreSQL 17.6 portable, 127.0.0.1:55432)
```

## Nghiệm thu

| Tiêu chí (chép từ task) | Kết quả | Bằng chứng |
| --- | --- | --- |
| Tên 2 ký tự → 400 | Đạt | `ShortName_Returns400` |
| Tên trùng → 409 `STATE_CONFLICT` | Đạt | `DuplicateName_IgnoringCase_Returns409` |
| `/me` khớp mẫu `api-samples.v0.json` | Đạt | `Me_MatchesSampleShape` |

## Lệch spec / giả định

- Player mới có tên tạm `Fisher<8 hex>` để giữ unique trước khi đặt tên.

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
