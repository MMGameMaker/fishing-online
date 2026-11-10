# BE-C-02 — Vào phòng, presence, snapshot

- **Worker:** Claude
- **Branch / PR:** chưa tạo nhánh/PR; thay đổi chưa commit trên working tree `main`
- **Ngày gửi review:** 2026-11-09 (chờ commit/PR theo yêu cầu người dùng)
- **Spec áp dụng:** SPEC_CHUNG v0.8, config `v0-test-2026-11-09-monitoring-05`

## Đã làm

- `JoinLake` trả `LakeSnapshot`, phát `PlayerJoined`; kết nối mới thay kết nối cũ; presence trong RAM qua hàng đợi tuần tự; giới hạn `Lake:MaxPlayers`.

## File thay đổi

- `server/FishingOnline.Api/Modules/Lake/LakeRoom.cs`
- `server/FishingOnline.Api/Modules/Lake/LakeCommands.cs`
- `server/FishingOnline.Api/Modules/Lake/GameHub.Lake.cs`
- `server/FishingOnline.Api.Tests/LakeTests.cs`
- `server/FishingOnline.Api/Persistence/Migrations/*_BE_CoreGameplay*`
- `docs/v01/TIEN_DO.md` — dòng BE-C-02

## Lệnh kiểm tra đã chạy

```
dotnet restore server --locked-mode → exit 0
dotnet build server -warnaserror → 0 Warning, 0 Error
dotnet test server → Domain 159/159; Api 169/169, 0 Skipped (chạy lại 2026-11-10 sau BE-E-08) (PostgreSQL 17.6 portable, 127.0.0.1:55432)
```

## Nghiệm thu

| Tiêu chí (chép từ task) | Kết quả | Bằng chứng |
| --- | --- | --- |
| 2 client vào, mỗi bên thấy bên kia | Đạt | `TwoClients_SeeEachOther` |
| Mở tab thứ 2 cùng tài khoản → tab 1 bị ngắt, phòng vẫn chỉ 1 avatar | Đạt | `SecondTab_ReplacesFirst_OneAvatar` |

## Lệch spec / giả định

- Chưa thêm cờ offline vào PlayerView: phần này là [Đề xuất] và SPEC chưa có field.

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
