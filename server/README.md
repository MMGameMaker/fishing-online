# Server development

Bootstrap S01, .NET SDK 10.0.401, ASP.NET Core/SignalR. Chưa có auth, gameplay, database adapter hoặc migration. Không triển khai production từ scaffold này.

Từ root repository, PowerShell:

```powershell
$env:DOTNET_CLI_HOME = "$PWD/.local/dotnet"
$env:DOTNET_SKIP_FIRST_TIME_EXPERIENCE = '1'
dotnet restore server/FishingOnline.Api
dotnet build server/FishingOnline.Api --no-restore
$env:ASPNETCORE_ENVIRONMENT = 'Development'
dotnet run --project server/FishingOnline.Api --no-build --urls http://localhost:5080
```

Terminal khác: `Invoke-RestMethod http://localhost:5080/health/live` và `/api/v1/bootstrap`. `/health/ready` trả 503 có chủ ý đến khi có adapter và migration. Hub diagnostic chỉ bật Development, `Ping()` không phải login/gameplay.

Smoke test (Node 22+): `node server/smoke.mjs`. Đã đạt HTTP/CORS/SignalR ngày 2026-11-03. Khi chạy DLL trực tiếp, đặt working directory tại server/FishingOnline.Api để nạp appsettings. Chưa kiểm tra persistence/gameplay.

## PostgreSQL / Redis

Cần Docker Desktop với Linux containers/Compose v2. Máy hiện tại chưa có Docker; cấu hình dưới đây chưa chạy kiểm chứng. Cài Docker Desktop và bật engine, rồi:

```powershell
Copy-Item server/.env.example server/.env
# Điền mật khẩu local tự chọn vào server/.env, không lưu trong tài liệu.
docker compose --project-directory server -f server/compose.yaml up -d --wait
docker compose --project-directory server -f server/compose.yaml ps
docker compose --project-directory server -f server/compose.yaml exec postgres pg_isready -U fishing_dev -d fishing_online
docker compose --project-directory server -f server/compose.yaml exec redis redis-cli ping
```

DB `fishing_online`, user `fishing_dev`, localhost:5432; Redis localhost:6379. Chỉ bind loopback. Tag image cố định để tái lập, chưa kiểm định image/security; review trước dùng ngoài local. `docker compose ... stop` giữ dữ liệu; không dùng `down -v` nếu cần giữ DB.

Khi thêm adapter: lấy connection string từ `ConnectionStrings__Postgres` và `ConnectionStrings__Redis` qua env/user-secrets; không đưa credentials vào appsettings. Chưa có schema/seed nên không chạy lệnh migration giả. Tiếp theo thêm EF Core/Npgsql, Redis client, migration và readiness kiểm tra truy vấn thật trong S02–S04. Không coi TCP mở là dữ liệu đã sẵn sàng.

## Nguồn triển khai

- [Kế hoạch BE](../docs/be/PLAN.md)
- [Service và luồng chơi](../docs/be/ARCHITECTURE.md)
- [API/SignalR dự thảo](../docs/contracts/v1-draft.md)
- [Kết nối Cocos](../docs/be/CLIENT_CONNECTION.md)

.NET 10 là LTS: https://dotnet.microsoft.com/en-us/platform/support/policy/dotnet-core. SignalR client: https://learn.microsoft.com/en-us/aspnet/core/signalr/javascript-client?view=aspnetcore-10.0. CORS phải cấu hình đúng origin preview thực tế; không thay bằng wildcard khi dùng credentials. HTTPS bắt buộc cho môi trường chia sẻ; URL HTTP trên chỉ để local.
