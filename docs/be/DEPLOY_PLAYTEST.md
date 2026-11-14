# Phương án deploy bản chơi thử

**Đã chốt (người dùng, 2026-11-14): máy nội bộ + Tailscale Funnel, chạy production, public, chi phí 0; máy đích là máy khác máy dev.** Các phương án còn lại bên dưới là đề xuất tham khảo, không chọn. Chưa triển khai, chưa kiểm chứng trên máy đích (đặc biệt WebSocket qua Funnel).

Mục tiêu: public bản chơi thử (`pier.html`) cho tester với **chi phí 0**, dùng **một máy nội bộ làm server**. Soạn 2026-11-14. Nội dung chính cần theo: mục "Nếu bản test cũng là bản production" và "Deploy lên máy khác"; PA2 là cấu hình production; PA1 (LAN + dev login) không dùng.

Chưa kiểm chứng: điều kiện/hạn mức của Tailscale, Cloudflare, Oracle, Render chỉ đối chiếu qua tìm kiếm web, chưa đọc kỹ trang chính thức; WebSocket qua Funnel chưa được xác nhận bằng nguồn chính thức. Cần thử thật trước khi mời tester. Phần "Hiện trạng liên quan" đã đối chiếu với mã trong repo.

## Hiện trạng liên quan

- Client build tĩnh bằng Vite (`client-v0/dist`); server đích ghi cứng lúc build qua `VITE_API_BASE` (mặc định `http://localhost:5080`), `VITE_USE_MOCK=false` khi build.
- API ASP.NET Core cổng 5080, SignalR hub `/hubs/game`; **không serve file tĩnh** → cần web server tĩnh hoặc reverse proxy riêng cho client.
- CORS theo config `ClientOrigins` (ngoài Development chỉ origin liệt kê mới được gọi).
- PostgreSQL 15432 + Redis 6379 chạy Docker, chỉ bind loopback — giữ nguyên, không mở ra mạng.
- Đăng nhập Google qua Firebase (project `fishing-online-c111f`): chỉ chạy trên `http://localhost` hoặc **HTTPS + domain nằm trong Authorized domains** của Firebase. `http://<IP LAN>` không thêm được và không phải secure context → **Google login thật không chạy trên LAN qua IP**.
- `Auth__DevBypass` chỉ có hiệu lực khi `ASPNETCORE_ENVIRONMENT=Development` (IdentityModule kiểm tra IsDevelopment); khi đó `/dev/topup` cũng mở.
- Ngoài Development bắt buộc đặt `Auth__JwtSigningKey` ≥ 32 byte (không commit).

## PA1 — LAN nội bộ, đăng nhập dev (nhanh nhất)

Dành cho chơi thử trong cùng mạng (văn phòng/Wi-Fi), tin cậy người trong mạng.

- Máy nội bộ chạy: Docker (Postgres/Redis như hiện tại) → `migrate-local.ps1` → API 5080 với `ASPNETCORE_ENVIRONMENT=Development` + `Auth__DevBypass=true`, lắng nghe `http://0.0.0.0:5080`.
- Build client: `VITE_USE_MOCK=false`, `VITE_API_BASE=http://<IP-máy>:5080`; serve `client-v0/dist` bằng web server tĩnh bất kỳ (ví dụ `npx serve dist -l 8080` hoặc Caddy). CORS: thêm `http://<IP-máy>:8080` vào `ClientOrigins` (Development đã nới local origin nhưng IP LAN cần khai báo tường minh).
- Tester mở `http://<IP-máy>:8080/pier.html?dev=<Tên>` — mỗi người một tên, không cần tài khoản Google.
- Windows Firewall: mở inbound TCP 8080 và 5080 (profile Private).
- Hạn chế chấp nhận: không auth thật; ai trong mạng cũng topup được Gold qua `/dev/topup`; chỉ phù hợp tester nội bộ. Khớp rủi ro client-fake user đã chấp nhận 2026-11-09.

## PA2 — Public qua Tailscale Funnel, Google login thật (khuyến nghị khi mời tester ngoài)

Tailscale gói free cá nhân; Funnel phát hành URL HTTPS public **ổn định** dạng `https://<máy>.<tailnet>.ts.net`, hỗ trợ WebSocket, không cần mở cổng router, không cần mua domain/cert.

- Cài Tailscale trên máy server (1 tài khoản, 1 máy — trong hạn mức free).
- Chạy reverse proxy một origin (Caddy, miễn phí) trên cổng nội bộ 8080: serve `client-v0/dist` + proxy `/api/*`, `/hubs/*`, `/health/*` về `localhost:5080`. Một origin nên không còn vấn đề CORS chéo; vẫn khai `ClientOrigins = ["https://<máy>.<tailnet>.ts.net"]`.
- `tailscale funnel 8080` → URL public HTTPS; Tailscale tự lo cert.
- Firebase Console → Authentication → Authorized domains: thêm `<máy>.<tailnet>.ts.net` một lần (URL ổn định nên không phải làm lại).
- API chạy `ASPNETCORE_ENVIRONMENT=Production`: DevBypass/`/dev/topup`/Hub Ping tự tắt; đặt `Auth__JwtSigningKey` qua biến môi trường; bind chỉ `localhost:5080` (chỉ Caddy ra ngoài qua Funnel).
- Build client: `VITE_API_BASE=https://<máy>.<tailnet>.ts.net` (same-origin qua proxy).
- Hạn chế: băng thông Funnel đi qua relay của Tailscale, đủ cho game pixel + SignalR với vài chục tester, không dành cho tải lớn; máy server phải bật và không sleep.

## Nếu bản test cũng là bản production (2026-11-14, đối chiếu web cùng ngày)

Yêu cầu: cùng một cấu hình chạy production, public, chi phí 0. Khi đó PA1 (dev bypass) bị loại; PA2 là cấu hình production. Cái cần chọn là chỗ đặt máy:

| Chỗ đặt | Chi phí | Điểm cần lưu ý |
| --- | --- | --- |
| Máy nội bộ + Tailscale Funnel | 0 | Funnel có giới hạn băng thông không công bố và không nâng được bằng tiền; chỉ nhận cổng public 443/8443/10000; gói Personal chỉ cho dùng phi thương mại. Máy phải luôn bật. |
| Máy nội bộ + Cloudflare Tunnel | Quick tunnel 0 nhưng URL ngẫu nhiên đổi mỗi lần chạy, không SLA; URL cố định cần domain trên Cloudflare (mất phí domain) | Không hợp vì Authorized domains của Firebase cần domain cố định. |
| Oracle Cloud Always Free (VM ARM) | 0 | Hạn mức bị cắt từ 2026-06-15 còn khoảng 2 OCPU/12 GB (nguồn mâu thuẫn về tài khoản PAYG); cần thẻ khi đăng ký; có thể thiếu capacity. Đủ chạy API + Postgres + Redis. Có IP public, tự cấp HTTPS bằng Caddy + domain miễn phí (DuckDNS). |
| Render free | 0 | Không hợp: Postgres free hết hạn sau 30 ngày; web service ngủ sau không hoạt động, SignalR bị ngắt. |

Lộ trình: bắt đầu bằng máy nội bộ + Tailscale Funnel; đóng gói bản production bằng Docker Compose (API + Postgres + Redis + Caddy) để chuyển nguyên sang VM Oracle Always Free nếu máy nội bộ không đủ ổn định. Việc thêm: Dockerfile cho API (hiện `server/compose.yaml` chỉ có Postgres/Redis, API chạy bằng `dotnet`), sao lưu `pg_dump` định kỳ ra ổ khác (production không có backup tự động).

## Deploy lên máy khác: việc đang cứng theo máy dev (2026-11-14, đối chiếu mã)

Máy đích cần Docker (hoặc Postgres 17 + Redis 7 cài sẵn), .NET SDK theo `global.json`, Node để build client, Caddy, Tailscale. Các điểm sẽ làm hỏng nếu chạy nguyên script hiện tại:

1. `server/start-api.ps1` ép `ASPNETCORE_ENVIRONMENT=Development` và bind `http://localhost:5080` → không dùng được cho production. Cần lệnh chạy riêng: `dotnet publish`, môi trường Production, `--urls http://127.0.0.1:5080`.
2. `AllowedHosts` trong `appsettings.json` là `localhost;127.0.0.1` → request qua `*.ts.net` bị host filtering từ chối (400). Đặt `AllowedHosts__0=<máy>.<tailnet>.ts.net` hoặc `*` (sau Caddy).
3. `Gameplay:ConfigPath` là `../../docs/v01/fixtures/gameplay-config.v0.json` tính từ thư mục chạy API → khi publish ra thư mục khác sẽ không thấy file. Copy fixture theo và đặt `Gameplay__ConfigPath` bằng đường dẫn tuyệt đối.
4. Map `pier`: mặc định server là `lake-01`/`1`/20 ghế; client `pier.html` cần `Lake__MapId=fishing-pier`, `Lake__MapVersion=pier-1`, `Lake__SeatCount=16` (chỉ `tools/run-local.ps1` đang đặt). Thiếu thì lệch map/ghế với client.
5. Migration: `migrate-local.ps1` chỉ dùng cấu hình Compose local. Máy đích cần chạy `dotnet ef database update` hoặc bundle với connection string của máy đó (API không tự migrate).
6. `.env` không có trong git: `server/.env` (mật khẩu Postgres, do `start-infra.ps1` tạo) và `client-v0/.env.local`. Build client cần `VITE_USE_MOCK=false`, `VITE_API_BASE=https://<máy>.<tailnet>.ts.net`, `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_PROJECT_ID` (+ `AUTH_DOMAIN`, `APP_ID`); thiếu key thì `firebaseAuth.js` ném lỗi.
7. `ClientOrigins` mặc định chỉ có localhost → đặt `ClientOrigins__0=https://<máy>.<tailnet>.ts.net`.
8. Dữ liệu/tài khoản trên máy dev không đi theo; máy đích bắt đầu DB trống (Gold 100 cho người mới, cá hữu hạn theo `Fishing:InitialStock`).
9. Admin: `Admin:RequireMfa=true`; tài khoản Admin tạo qua `Admin__BootstrapUsers__0__Email/Roles__0`; chưa có UI Admin, chỉ API.

## Biến thể cân nhắc rồi để sau

- **Cloudflare quick tunnel (trycloudflare.com):** cũng free + HTTPS, nhưng URL đổi mỗi lần chạy → phải sửa Authorized domains + build lại client mỗi lần. Chỉ dùng demo chớp nhoáng. Cloudflare Tunnel URL cố định cần domain riêng (tốn phí nếu chưa có).
- **Host client tĩnh free (GitHub Pages/Cloudflare Pages) + tunnel API:** tách hai origin, thêm việc CORS/cấu hình, không lợi hơn PA2 ở quy mô này.
- **Tailscale Serve (không Funnel):** HTTPS chỉ trong tailnet, tester phải cài Tailscale và được mời (free tối đa 3 user) — chỉ hợp nhóm rất nhỏ.

## Khuyến nghị và lộ trình

1. **PA1 ngay** cho chơi thử nội bộ: không chạm Firebase, không phụ thuộc dịch vụ ngoài; làm được trong ~1 buổi (script + firewall + hướng dẫn tester).
2. **PA2 khi mời tester ngoài mạng** hoặc cần Google login thật: thêm Caddy + Tailscale, checklist production ở trên. PA1 và PA2 dùng chung máy, không loại trừ nhau.

## Checklist trước khi mở cho tester (PA2)

- [ ] `ASPNETCORE_ENVIRONMENT=Production`, `Auth__JwtSigningKey` đã đặt, DevBypass tắt (xác nhận `/api/v1/me` + header `X-Dev-Player` trả 401).
- [ ] `ClientOrigins` = đúng URL public; `/health/ready` trả 200 qua URL public.
- [ ] Client build `VITE_USE_MOCK=false`, đăng nhập Google thật qua URL public thành công trên 1 máy ngoài mạng.
- [ ] Admin bootstrap qua `Admin__BootstrapUsers__*`; không có secret trong repo/log.
- [ ] Máy server tắt sleep; cách báo lỗi cho tester (link/nhóm chat) và cách tắt khẩn cấp (`stop-all.bat`).
- [ ] Dữ liệu playtest nằm trong Docker volume; chấp nhận có thể reset giữa các đợt, báo trước cho tester.

## Việc cần làm khi phương án được duyệt

1. Script `tools/run-playtest.ps1` (hoặc mở rộng `run-local.ps1`): build client với API base truyền vào, bật API đúng môi trường, serve dist, in URL cho tester.
2. PA2: Caddyfile + hướng dẫn cài Tailscale/bật Funnel + cập nhật Firebase Authorized domains.
3. Chạy thử end-to-end trên máy đích với 2 thiết bị thật rồi mới gửi link cho tester.
