# BE-A-01 — Khung module, envelope, lỗi, project test

- **Worker:** Claude
- **Branch / PR:** chưa tạo nhánh/PR; thay đổi chưa commit trên working tree `main` (có thay đổi `client-web/` của luồng khác đang mở)
- **Ngày gửi review:** chưa gửi; còn thiếu một dòng nghiệm thu cần Docker
- **Spec áp dụng:** SPEC_CHUNG v0.5, config chưa dùng trong task này

## Đã làm

- `Modules/Common`: `ApiResult` (`{data, traceId}`), `GameException`, `ErrorCatalog` (mã lỗi SPEC mục 5 → HTTP), `GameExceptionMiddleware` (`{error:{code,message,retryable}, traceId}`).
- Hub: `GameHub` partial ở `/hubs/game` thay `DiagnosticHub`; `CommandAck`, `IHubCommand`; `CommandAckHubFilter` đổi exception thành ack `ok=false` cho mọi method trả `CommandAck`, và từ chối requestId không phải uuid.
- Quy ước module: `CommonModule` có `AddCommon`/`MapCommon` làm mẫu; `GameDbContext` gọi `ApplyConfigurationsFromAssembly`. Method hub lấy service bằng `[FromServices]`, không dùng constructor, để các file partial không đụng nhau.
- Chỉ Development: `Ping`, hub `DevProbe`, HTTP `/api/v1/dev/probe`, `/api/v1/dev/echo`. Môi trường khác: route 404, method hub bị từ chối.
- Project `FishingOnline.Api.Tests`: xUnit v3 + `WebApplicationFactory` + Testcontainers PostgreSQL (`postgres:17.6-alpine`, cùng image với compose). Thiếu Docker thì test DB báo Skipped.

## File thay đổi

- `server/FishingOnline.Api/Modules/Common/*` — khung envelope, lỗi, hub, module.
- `server/FishingOnline.Api/Program.cs` — dùng `AddCommon`, middleware, `MapCommon`; bỏ `DiagnosticHub`.
- `server/FishingOnline.Api/Persistence/GameDbContext.cs` — thêm `ApplyConfigurationsFromAssembly`; không đổi model, không có migration.
- `server/FishingOnline.Api.Tests/*` — project test mới, kèm `packages.lock.json`.
- `server/FishingOnline.slnx` — solution mới, để chạy được lệnh chuẩn QUY_TRINH mục 5.
- `docs/v01/TIEN_DO.md` — dòng BE-A-01.

## Lệnh kiểm tra đã chạy

```
dotnet restore server --locked-mode      → exit 0
dotnet build server -warnaserror         → 0 Warning, 0 Error
dotnet test server                       → Total 33, Passed 32, Skipped 1, Failed 0
  Skipped: PostgresTests.Migrations_ApplyOnEmptyDatabase_AndPersistPlayer (máy chưa có Docker)
node server/smoke.mjs (EXPECT_READY_STATUS=503, API thật trên Kestrel, không có DB/Redis)
  → PASS: live, readiness, bootstrap, CORS allow/deny, SignalR negotiate/handshake/Ping
GET /api/v1/dev/probe?code=SEAT_TAKEN    → 409 {"error":{"code":"SEAT_TAKEN","message":"Seat is in use","retryable":false},"traceId":"9a4b..."}
```

## Nghiệm thu

| Tiêu chí (chép từ task) | Kết quả | Bằng chứng |
| --- | --- | --- |
| Endpoint thử ném `GameException("SEAT_TAKEN")` trả 409 đúng JSON | Đạt | `GameException_SeatTaken_Returns409WithErrorEnvelope`; gọi thật trên Kestrel |
| Hub method thử trả ack lỗi | Đạt | `GameHubTests.GameException_ReturnsFailedAck` |
| `dotnet test` chạy được trên máy sạch có Docker | **Chưa chạy** | Máy chưa cài Docker; 32 test không cần Docker đạt, test PostgreSQL mới đi qua nhánh Skipped, chưa từng chạy với container thật |

## Lệch spec / giả định

- Mã không có trong bảng HTTP của task, tự chọn: `OUT_OF_RANGE` 422; `NO_ACTIVE_ATTEMPT`, `BITE_EXPIRED`, `RESULT_EXPIRED` 409. `INVALID_DURATION` 400, `PRICE_CHANGED`/`SEAT_SESSION_EXPIRED` 409 theo SPEC mục 5, `STATE_CONFLICT` 409 theo BE-A-06.
- Chỉ `RATE_LIMITED` có `retryable=true`.
- `/hubs/game` map ở mọi môi trường theo task, nhưng ngoài Development chưa có method nào dùng được; hub chưa có xác thực cho tới BE-A-02.
- Tham số hub sai kiểu JSON bị SignalR từ chối trước filter, nên Client nhận lỗi invocation chứ không phải ack.
- `xunit.v3.mtp-off` thay `xunit.v3` vì bản mặc định chặn VSTest trên SDK 10, làm hỏng lệnh `dotnet test server`.
- `/api/v1/bootstrap` và `contractVersion` `0.1-draft` giữ nguyên vì ngoài phạm vi task và `smoke.mjs` đang dựa vào.

## Cần lead quyết

- Thêm `INTERNAL_ERROR` (500, `retryable=false`) vào SPEC mục 5 không? Server đang dùng cho lỗi không lường trước, nhưng mã này chưa có trong SPEC và `ERROR_CODES` của Client, nên guard Client chưa nhận diện được.
- `server/FishingOnline.slnx` và `Persistence/GameDbContext.cs` nằm ngoài "Phạm vi file" nhóm BE-A; slnx cần cho lệnh chuẩn mục 5, GameDbContext do chính task yêu cầu.
- `fixtures/api-samples.v0.json` dùng requestId `r1`, `r2`, không phải uuid như SPEC mục 4. Client thật sinh uuid nên không ảnh hưởng; mock/fixture gọi hub thật sẽ bị `VALIDATION_FAILED`.

## Việc còn lại

- Chạy lại `dotnet test server` sau khi cài Docker để xác nhận test PostgreSQL, rồi tạo nhánh `v01/BE-A-01-khung-module` + PR khi người dùng yêu cầu commit, chuyển sang Chờ review.

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
