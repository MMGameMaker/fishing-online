# BE-A-05 — Config gameplay

- **Worker:** Claude
- **Branch / PR:** chưa tạo nhánh/PR; thay đổi chưa commit trên working tree `main`
- **Ngày gửi review:** 2026-11-09 (chờ commit/PR theo yêu cầu người dùng)
- **Spec áp dụng:** SPEC_CHUNG v0.8, config `v0-test-2026-11-09-monitoring-05`

## Đã làm

- `GameplayConfigValidator`, bảng `config_versions`, nạp fixture khi bảng trống, `IConfigProvider` cache mọi version, `GET /catalog` bỏ khối `spawn`.

## File thay đổi

- `server/FishingOnline.Api/Modules/Config/ConfigModule.cs`
- `server/FishingOnline.Api/appsettings.json`
- `server/FishingOnline.Api.Tests/FoundationTests.cs`
- `server/FishingOnline.Api/Persistence/Migrations/*_BE_CoreGameplay*`
- `docs/v01/TIEN_DO.md` — dòng BE-A-05

## Lệnh kiểm tra đã chạy

```
dotnet restore server --locked-mode → exit 0
dotnet build server -warnaserror → 0 Warning, 0 Error
dotnet test server → Domain 159/159; Api 169/169, 0 Skipped (chạy lại 2026-11-10 sau BE-E-08) (PostgreSQL 17.6 portable, 127.0.0.1:55432)
```

## Nghiệm thu

| Tiêu chí (chép từ task) | Kết quả | Bằng chứng |
| --- | --- | --- |
| Config sai bị từ chối với danh sách lỗi | Đạt | `MissingSpecies_IsRejectedWithErrorList` |
| `/catalog` không chứa `spawn` | Đạt | `EmptyTable_LoadsFixture_AndCatalogHidesSpawn` |
| Test so khớp số với fixture | Đạt | Cùng test |

## Lệch spec / giả định

- Không có.

## Cần lead quyết

- `/catalog` theo đúng spec chỉ bỏ `spawn`, nên vẫn lộ ngưỡng `suspicionMonitoring` cho Client. Có muốn bỏ luôn khối này không?

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
