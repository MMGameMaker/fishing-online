# Server development

.NET SDK 10.0.401, ASP.NET Core/SignalR + EF Core/Npgsql + StackExchange.Redis. Đã có đăng nhập Firebase, ví, config, phòng hồ, ghế, kinh tế, vòng câu, cá hữu hạn, chat/emoji/skin và Admin API (`/api/v1/admin`); chưa có giao diện Admin. Tài khoản Admin tạo bằng biến môi trường `Admin__BootstrapUsers__0__Email` và `Admin__BootstrapUsers__0__Roles__0`... Chưa kiểm chứng để triển khai production.

## Test trên máy không có Docker

`dotnet test server` tự dùng PostgreSQL local nếu có, không thì dùng Testcontainers:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\server\start-postgres-portable.ps1
dotnet test server
```

Bản portable ở `D:\Tools\postgres`, dữ liệu ở `D:\Tools\postgres-data`, cổng 55432, chỉ nghe localhost và không có mật khẩu, nên chỉ dùng cho máy dev. Biến `FISHING_TEST_POSTGRES` trỏ sang server khác. Test tải: `.\server\run-load-test.ps1` (BE-C-08).

Ngoài Development bắt buộc đặt biến `Auth__JwtSigningKey` (tối thiểu 32 byte), không commit giá trị này.

## Chạy nhanh bằng file .bat (client + server thật)

Chạm đúp ở thư mục gốc repository (script thật là [tools/run-local.ps1](../tools/run-local.ps1)):

| File | Làm gì |
| --- | --- |
| `run-mock.bat` | Chỉ chạy client với dữ liệu giả. Không cần Docker/server. Mở `pier.html`. |
| `run-real.bat` | Tự mở Docker Desktop (nếu chưa chạy), bật Postgres + Redis, áp migration, chạy API thật cổng 5080 ở cửa sổ riêng (map `fishing-pier` 16 ghế, **không** dev-bypass), rồi chạy client nối server thật và mở `pier.html`. Vào trang bấm một lần để đăng nhập bằng tài khoản Google thật (Firebase project `fishing-online-c111f`, máy cần có mạng để server xác minh token). |

| `stop-all.bat` | Tắt client, API (cùng cửa sổ của nó), Postgres + Redis (giữ dữ liệu, không xoá volume), rồi thoát Docker Desktop nếu máy không còn container khác. Thêm `-KeepDocker` khi chạy `tools\stop-local.ps1` để giữ Docker Desktop. |

Chế độ được đặt bằng biến `VITE_USE_MOCK` của tiến trình (ưu tiên hơn `client-v0/.env.local`), nên đổi chế độ chỉ cần chạy file kia; script tự tắt Vite cũ đang giữ cổng 5173. API đang chạy sẵn đúng chế độ đăng nhập thì được dùng lại, sai chế độ thì tự tắt và chạy lại. Chỉ khi cần test nhiều người chơi trên một máy mà không có nhiều tài khoản Google: chạy `powershell -File tools\run-local.ps1 -Mode real -DevLogin` (bật `Auth__DevBypass`, mở `pier.html?dev=Anh`, thêm người bằng `?dev=Tên` khác); lần chạy `run-real.bat` sau sẽ tự tắt bypass. Đóng cửa sổ "Fishing Online API" để tắt API; Postgres/Redis vẫn chạy trong Docker (dừng bằng lệnh `docker compose ... stop` ở dưới). Nếu số ghế hoặc `mapId` của map pier đổi, sửa `$pierMap` đầu `tools/run-local.ps1`.

## Chạy local

Tại root repository, sau khi Docker Desktop đã chạy:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\server\start-infra.ps1
# Lần đầu hoặc sau khi pull migration mới; không tự migrate khi API khởi động
powershell -NoProfile -ExecutionPolicy Bypass -File .\server\migrate-local.ps1
# Giữ terminal này chạy API
powershell -NoProfile -ExecutionPolicy Bypass -File .\server\start-api.ps1
```

`start-api.ps1` đọc server/.env theo khóa cho phép, không thực thi nội dung file, rồi truyền connection strings qua biến môi trường của tiến trình. Mặc định DB localhost:15432, Redis localhost:6379; biến `ConnectionStrings__Postgres`/`ConnectionStrings__Redis` đã thiết lập được ưu tiên khi chạy API. `migrate-local.ps1` luôn dùng cấu hình Compose local, bỏ qua connection string từ môi trường trong thời gian chạy và phục hồi sau đó. Không in/chia sẻ các biến chứa connection string.

Terminal khác:

```powershell
Invoke-RestMethod http://localhost:5080/health/live
Invoke-RestMethod http://localhost:5080/health/ready
node server/smoke.mjs
```

Readiness trả `200 {status:"ready",checks:{postgres:"ready",redis:"ready"}}` khi DB kết nối được, không còn migration pending, đọc được bảng game.players và Redis PING đạt. Thiếu config, chưa migrate hoặc dependency mất → 503 với trạng thái từng dependency, không lộ exception/credentials. Liveness vẫn 200 khi dependency mất. Hub Ping chỉ bật Development; readiness đạt không có nghĩa gameplay/auth đã sẵn sàng. Khi chạy DLL trực tiếp, dùng working directory server/FishingOnline.Api để nạp appsettings.

## Build và kiểm tra persistence

```powershell
. .\server\load-local-env.ps1
# .env chỉ đọc vào tiến trình hiện tại; không in các biến connection strings
 dotnet tool restore
 dotnet restore server/FishingOnline.IntegrationChecks --locked-mode
 dotnet build server/FishingOnline.IntegrationChecks --no-restore
 dotnet run --project server/FishingOnline.IntegrationChecks --no-build
```

Integration harness chỉ chấp nhận DB nguồn fishing_online ở localhost, tạo một database `fishing_check_<UUID>` riêng rồi xóa đúng DB đó trong finally. Không xóa/ghi player của DB ứng dụng. User local cần CREATEDB (user Compose hiện có quyền). Redis dùng key UUID có TTL và cleanup. Nếu máy bị tắt giữa test, kiểm tra DB/key thử còn sót trước dọn, không xóa database ứng dụng. Không chạy harness với credentials production.

Đã kiểm chứng: build 0 warning/error; locked restore; migration trên DB trống và chạy lặp; lưu/đọc profile qua DbContext khác; primary key chặn trùng; DB trống/mất bảng không ready; Redis SET/GET/TTL. Smoke Node 22+ đạt HTTP/CORS/SignalR, missing config 503; dừng riêng PostgreSQL/Redis dự án → 503 rồi bật lại → 200 trên cùng tiến trình API. Hạ tầng cuối kiểm tra được khôi phục healthy. Chưa test Cocos/auth/gameplay/tải 20 phiên.

## Migration

Migration đầu tạo `game.players` (Id UUID, DisplayName max 80, CreatedAt UTC), không seed tài khoản/quyền/Gold/vé/cá. Phương thức login vẫn chờ S02; chưa có endpoint ghi player. EF tool 10.0.14 nằm trong .config/dotnet-tools.json; runtime/design EF cùng 10.0.14, Npgsql provider 10.0.3, Redis client 3.4.31, dependencies khóa trong packages.lock.json.

Thêm migration sau thay model: dot-source load-local-env.ps1, chạy `dotnet ef migrations add <Name> --project server/FishingOnline.Api --output-dir Persistence/Migrations`, review Up/Down rồi chạy migrate-local.ps1. Không chỉnh migration đã áp dụng trong môi trường dùng chung. Production dùng migration job/bundle/SQL được review, không DDL tự động từ API startup. [EF migrations](https://learn.microsoft.com/en-us/ef/core/managing-schemas/migrations/applying), [Npgsql 10](https://www.npgsql.org/efcore/release-notes/10.0.html), [Redis multiplexer](https://github.com/StackExchange/StackExchange.Redis/blob/main/docs/Basics.md).

## PostgreSQL / Redis

Đã thiết lập ngày 2026-11-03 tại repo `D:\Zen-Workplace\fishing-online`: WSL 2.5.10, Docker Desktop 4.97.0, Docker CLI 29.9.2, Compose v5.6.1, Linux engine. PostgreSQL 17.6 và Redis 7.4.2 healthy; SELECT 1, truy vấn PostgreSQL có xác thực, Redis PING và TCP localhost đều đạt. Không cần cài Ubuntu riêng cho môi trường này.

Mở Docker Desktop, đợi engine chạy; mở PowerShell tại repo:

```powershell
Set-Location D:\Zen-Workplace\fishing-online
powershell -NoProfile -ExecutionPolicy Bypass -File .\server\start-infra.ps1
```

Script tìm Docker CLI cả khi terminal chưa nhận PATH mới, tạo `.env` với mật khẩu ngẫu nhiên nếu chưa có, giữ nguyên `.env` cũ, validate Compose, bật hai service và kiểm tra SQL/PING. Không in mật khẩu. `ExecutionPolicy Bypass` chỉ áp dụng cho tiến trình PowerShell này. Nếu engine chưa chạy, mở Docker Desktop rồi chạy lại. Nếu Docker báo cần restart Windows, lưu công việc và tự restart, sau đó mở Docker và chạy lại script; lần thiết lập này không cần restart.

Thông tin kết nối local:

| Service | Host / port | Database / user |
| --- | --- | --- |
| PostgreSQL | 127.0.0.1:15432 | fishing_online / fishing_dev |
| Redis | 127.0.0.1:6379 | DB 0, không auth, chỉ bind loopback |

Mật khẩu PostgreSQL nằm trong `server/.env`, Git đã ignore; không gửi nội dung lên chat hoặc commit. `POSTGRES_PORT` tùy chọn trong `.env`, mặc định 15432 vì cổng 5432 đang do tiến trình khác sử dụng. Không thay mật khẩu `.env` khi volume đã có DB rồi coi đó là đổi mật khẩu DB; cần đổi qua SQL có kiểm soát. Không xóa volume để khắc phục tùy tiện.

Các lệnh quản lý (mở terminal mới sau cài Docker để nhận PATH):

```powershell
# Xem trạng thái và log
 docker compose --project-directory server -f server/compose.yaml ps
 docker compose --project-directory server -f server/compose.yaml logs --tail 50 postgres redis
# Dừng mà giữ dữ liệu; chạy lại start-infra.ps1 để bật lại
 docker compose --project-directory server -f server/compose.yaml stop
```

Dữ liệu nằm trong named volumes PostgreSQL/Redis. Không dùng `down -v` nếu cần giữ dữ liệu. Tag image cố định để tái lập; review patch/security trước môi trường dùng chung. Hướng dẫn Docker chính thức: https://docs.docker.com/desktop/setup/install/windows-install/ và https://docs.docker.com/desktop/features/wsl/.

API lấy connection string từ `ConnectionStrings__Postgres` và `ConnectionStrings__Redis`; không đưa credentials vào appsettings. Redis multiplexer dùng singleton và reconnect; Postgres dùng DbContext scoped. Chưa seed luật/tài nguyên hoặc triển khai session/cache nghiệp vụ. Lát S02–S04 bổ sung schema theo contract và luật được chốt.

## Nguồn triển khai

- [Kế hoạch BE](../docs/be/PLAN.md)
- [Service và luồng chơi](../docs/be/ARCHITECTURE.md)
- [API/SignalR dự thảo](../docs/contracts/v1-draft.md)
- [Kết nối Cocos](../docs/be/CLIENT_CONNECTION.md)
- [Phương án deploy chơi thử / production chi phí 0](../docs/be/DEPLOY_PLAYTEST.md) (đã chốt, chưa triển khai)

.NET 10 là LTS: https://dotnet.microsoft.com/en-us/platform/support/policy/dotnet-core. SignalR client: https://learn.microsoft.com/en-us/aspnet/core/signalr/javascript-client?view=aspnetcore-10.0. CORS phải cấu hình đúng origin preview thực tế; không thay bằng wildcard khi dùng credentials. HTTPS bắt buộc cho môi trường chia sẻ; URL HTTP trên chỉ để local.
