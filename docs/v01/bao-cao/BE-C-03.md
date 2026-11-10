# BE-C-03 — Di chuyển

- **Worker:** Claude
- **Branch / PR:** chưa tạo nhánh/PR; thay đổi chưa commit trên working tree `main`
- **Ngày gửi review:** 2026-11-09 (chờ commit/PR theo yêu cầu người dùng)
- **Spec áp dụng:** SPEC_CHUNG v0.8, config `v0-test-2026-11-09-monitoring-05`

## Đã làm

- `Move`: bỏ seq cũ, kiểm tra quãng đường, `CanStand`, `roamRadius`, `IFishingState.IsBusy`, giới hạn 20 lệnh/giây; sai thì `PositionCorrected`, đúng thì `PlayerMoved` cho người khác.

## File thay đổi

- `server/FishingOnline.Api/Modules/Lake/LakeCommands.cs`
- `server/FishingOnline.Api.Tests/LakeTests.cs`
- `server/FishingOnline.Api/Persistence/Migrations/*_BE_CoreGameplay*`
- `docs/v01/TIEN_DO.md` — dòng BE-C-03

## Lệnh kiểm tra đã chạy

```
dotnet restore server --locked-mode → exit 0
dotnet build server -warnaserror → 0 Warning, 0 Error
dotnet test server → Domain 159/159; Api 169/169, 0 Skipped (chạy lại 2026-11-10 sau BE-E-08) (PostgreSQL 17.6 portable, 127.0.0.1:55432)
```

## Nghiệm thu

| Tiêu chí (chép từ task) | Kết quả | Bằng chứng |
| --- | --- | --- |
| Nhảy 500 px → bị kéo về | Đạt | `JumpFar_IsCorrected` |
| Đi vào ô nước → bị kéo về | Đạt | `WalkIntoWater_IsCorrected` |
| Giữ ghế đi xa 100 px → bị kéo về | Đạt | `SeatedPlayer_LeavingRoamRadius_IsCorrected` |

## Lệch spec / giả định

- Δt trong công thức tốc độ chặn tối đa 1 giây, để đứng yên lâu rồi không dịch chuyển xa được; spec không nêu.

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
