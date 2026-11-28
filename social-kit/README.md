# SocialKit

Module dùng lại được cho các tính năng Google / Facebook: đăng nhập, ảnh tài khoản, chia sẻ lên Facebook, vào nhóm Facebook (xác nhận bằng mã), đếm lượt chia sẻ, popup phía người chơi và bảng thống kê cho Admin. Chưa publish lên npm hay NuGet; dự án khác tham chiếu thẳng thư mục này (sao chép hoặc submodule).

Trạng thái: tách từ Fishing Online ngày 2026-11-28, game đang dùng chính module này. Đã kiểm chứng bằng test và mock; **chưa chạy với Facebook thật** (cần Meta app và bật Facebook trong Firebase).

## Gồm những gì

```
social-kit/
  server/SocialKit        thư viện .NET (net10, ASP.NET Core + EF Core)
  server/SocialKit.Tests  test xUnit của thư viện (24 test)
  client/                 TypeScript: đăng nhập Firebase, popup Cộng đồng (DOM thuần, không phụ thuộc Phaser)
  admin/                  React: bảng thống kê cộng đồng
```

| Tính năng | Server | Client / Admin |
|---|---|---|
| Đăng nhập Google, Facebook | `JwksFirebaseTokenVerifier` xác minh Firebase ID token (chữ ký Google JWKS, issuer, audience, hạn, provider) | `client/src/firebaseAuth.ts` (`createSocialAuth`) |
| Ảnh tài khoản | `AvatarService` tải claim `picture` về DB, `GET /me/avatar` | popup hiển thị |
| Vào nhóm Facebook | `CommunityService`: ghi lượt bấm link, xác nhận bằng mã ghim, giới hạn 10 lần sai/giờ | `CommunityPopup` |
| Chia sẻ | đếm lượt bấm (tối đa 10/ngày/người), phân loại `feed` / `group` | nút mở `facebook.com/sharer/sharer.php?u=` |
| Thống kê | `CommunityService.StatsAsync` | `admin/src/CommunityStatsView.tsx` |

## Giới hạn do Meta (đừng hứa quá với người dùng)

- Groups API đã bị gỡ ngày 22/4/2024: **không kiểm tra được ai đã vào nhóm**, không đọc được react hay bài đăng trong nhóm. "Đã vào nhóm" ở đây nghĩa là người chơi nhập đúng mã ghim trong nhóm; chỉ có ý nghĩa với nhóm riêng tư (nhóm công khai ai cũng thấy mã).
- "Số lần chia sẻ" là số lần bấm nút trong game, không phải số bài thật trên Facebook.
- Facebook và Google là hai UID Firebase khác nhau nên là hai tài khoản game riêng, trừ khi host làm liên kết tài khoản.
- Claim `picture` của Facebook qua Firebase chưa được thử với Meta app thật.

## Tích hợp vào dự án khác

### 1. Server (ASP.NET Core)

1. Thêm `ProjectReference` tới `social-kit/server/SocialKit/SocialKit.csproj`.
2. Viết hai lớp keo (mẫu: `server/FishingOnline.Api/Modules/SocialKitAdapters/SocialKitAdapters.cs`):
   - `ISocialCurrentUser` → trả `UserId` của người đang đăng nhập;
   - `ISocialAccountStats` → đếm tổng người chơi và số tài khoản Google/Facebook.
3. Đăng ký và map:

   ```csharp
   services.AddSocialKit<MyDbContext>(configuration);          // MyDbContext là DbContext của host
   services.AddScoped<ISocialCurrentUser, MySocialUser>();
   services.AddScoped<ISocialAccountStats, MySocialStats>();
   app.MapSocialKit(new SocialKitEndpointOptions {
       Ok = data => MyEnvelope.Ok(data),                       // bọc dữ liệu theo envelope của host (mặc định Results.Ok)
       Configure = route => route.RequireAuthorization(),
       Prefix = "/api/v1",
   });
   ```
4. Trong `OnModelCreating` của DbContext host thêm
   `modelBuilder.ApplyConfigurationsFromAssembly(typeof(SocialKit.SocialKitModule).Assembly);` rồi tạo migration của host (ba bảng: `player_avatars`, `community_state`, `share_events`; bảng đặt trong schema mặc định của host).
5. Middleware lỗi của host bắt `SocialKit.SocialException` (có `Code`, `HttpStatus`, `Message`, `Retryable`) và trả về theo định dạng lỗi của host. Đối chiếu code của host với mã: `UNAUTHENTICATED`, `VALIDATION_FAILED`, `RATE_LIMITED`, `GROUP_CODE_INVALID`.
6. Khi đăng nhập, host gọi `IFirebaseTokenVerifier.VerifyAsync(idToken)` để lấy `FirebaseIdentity` (Uid, Provider, Email, Picture ...) rồi tự tạo/tìm tài khoản; gọi `IAvatarService` để lưu ảnh nếu muốn (mẫu: `AuthService` của game).
7. Admin: host tự tạo route (ví dụ `GET /admin/community/stats`) gọi `CommunityService.StatsAsync` để bảo vệ bằng cơ chế admin riêng.

Cấu hình:

| Khoá | Ý nghĩa |
|---|---|
| `SocialKit:Firebase:ProjectId` | Firebase project id (audience của token). Host có thể gán bằng `PostConfigure<FirebaseVerifierOptions>` như game đang lấy từ `Auth:FirebaseProjectId`. |
| `SocialKit:Firebase:AllowedProviders` | mặc định `google.com`, `facebook.com` |
| `Community:GroupUrl` | link nhóm Facebook; trống thì client ẩn nút vào nhóm |
| `Community:GroupCode` | mã ghim trong nhóm; trống thì tắt bước xác nhận (đổi mã bất cứ lúc nào, người đã xác nhận giữ nguyên) |
| `Community:ShareUrl` | trang web được chia sẻ (cần thẻ Open Graph); trống thì ẩn nút chia sẻ |
| `Community:MaxSharesPerDay`, `Community:MaxCodeAttemptsPerHour` | mặc định 10 và 10 |

### 2. Client (TypeScript, Vite)

`client/` không import gì từ game. Host trỏ alias vào thư mục và cung cấp những thứ phụ thuộc game (mẫu: `client-v0/vite.config.js`, `tsconfig.json`, `src/online/ui/community/communityHost.ts`, `src/firebaseAuth.js`):

- Alias `@social-kit` → `social-kit/client/src`; do file kit nằm ngoài dự án nên alias thêm `firebase/*` (và `vitest` nếu chạy test kit) về `node_modules` của host; `server.fs.allow` cho phép đọc thư mục cha.
- Đăng nhập: `createSocialAuth(() => ({ apiKey, projectId, authDomain, appId }))` trả `googleIdToken`, `facebookIdToken`, `currentIdToken`, `currentProviderId`, `currentDisplayName`, `signOut`. Popup phải mở ngay trong thao tác bấm. Host đổi ID token lấy access token của server như hiện nay.
- Popup: `new CommunityPopup(host)` với `CommunityHost` = `{ root, http: {get, post, getBlob}, toast, error, animateIn, animateOut, designSize, closeIconUrl }`; import `community.css`. Popup dùng lớp CSS khung của host (`shop`, `player-info`, `profile-dialog__btn`): dự án khác cần tự định nghĩa các lớp này hoặc ghi đè trong CSS của mình.
- Đường dẫn gọi API (tương đối với prefix host): `/me/community`, `/me/community/join-click`, `/me/community/verify-group`, `/me/community/share`, `/me/avatar` (ảnh cần token nên lấy bằng `getBlob`).
- `firebase` là peer dependency (`^11`).

### 3. Admin (React)

Alias `@social-kit-admin` → `social-kit/admin/src`; alias `react` về `node_modules` của host. Host tự gọi API và render `<CommunityStatsView data={...} onReload={...} />` (mẫu: `admin/src/pages/CommunityPage.tsx`).

## Cài đặt phía Meta và Firebase (làm tay)

1. Tạo Meta app (loại Consumer/Login), thêm sản phẩm Facebook Login.
2. Firebase Console → Authentication → Sign-in method: bật Google và Facebook (dán App ID/secret của Meta); copy redirect URI Firebase hiện ra, dán vào Valid OAuth Redirect URIs của Meta app. Chỉ xin `public_profile` (không cần App Review và không cần thêm quyền nào trong Meta app).
3. Thêm domain game vào Authorized domains của Firebase.
4. Tạo nhóm Facebook, ghim bài chứa mã nếu muốn xác nhận; đặt `Community:*`.
5. Lỗi `auth/operation-not-allowed` nghĩa là chưa bật provider ở bước 2.
6. Popup Facebook của Firebase luôn xin thêm quyền `email`; nếu Meta app không thêm được quyền này (báo `Invalid Scopes: email`), đặt `facebookAppId` (game: `VITE_FACEBOOK_APP_ID`) để đăng nhập qua Facebook JavaScript SDK chỉ với `public_profile`. Khi đó trong Meta: Cài đặt của Đăng nhập Facebook → bật "Đăng nhập bằng JavaScript SDK" và thêm domain (ví dụ `http://localhost:5173`) vào "Miền được phép cho JavaScript SDK". Đường này mình chưa chạy thật (2026-11-28).

## Kiểm tra

```bash
# server kit
dotnet test social-kit/server/SocialKit.Tests
# client (vitest chạy cả test của kit từ client-v0)
cd client-v0 && npx vitest run && npx tsc --noEmit
# admin
cd admin && npx vitest run && npx tsc --noEmit
```
