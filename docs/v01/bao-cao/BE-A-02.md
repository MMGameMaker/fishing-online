# BE-A-02 — Đăng nhập Firebase và phiên

- **Worker:** Claude
- **Branch / PR:** chưa tạo nhánh/PR; thay đổi chưa commit trên working tree `main`
- **Ngày gửi review:** 2026-11-09 (chờ commit/PR theo yêu cầu người dùng)
- **Spec áp dụng:** SPEC_CHUNG v0.8, config `v0-test-2026-11-09-monitoring-05`

## Đã làm

- `POST /auth/login|refresh|logout`, bảng `accounts`, `sessions`; lần đầu tạo player + ví + 100 Gold (`grant_new_player`) + cần mặc định trong một transaction.
- Xác minh Firebase ID token bằng khóa công khai JWKS của Google (issuer, audience, hạn, chữ ký RS256, provider `google.com`).
- Access token JWT HS256 (`sub`, `playerId`, `sid`, `authVersion`, `aud=player`), refresh token 32 byte chỉ lưu hash, cookie `HttpOnly; Secure; SameSite=Lax`, xoay vòng và thu hồi cả phiên khi token cũ bị dùng lại.
- Hub đọc `access_token`, `ICurrentPlayer`, `Auth:DevBypass` chỉ có tác dụng trong Development.

## File thay đổi

- `server/FishingOnline.Api/Modules/Identity/*`
- `server/FishingOnline.Api/Modules/Common/GameHub.cs`
- `server/FishingOnline.Api.Tests/FoundationTests.cs`
- `server/FishingOnline.Api/Persistence/Migrations/*_BE_CoreGameplay*`
- `docs/v01/TIEN_DO.md` — dòng BE-A-02

## Lệnh kiểm tra đã chạy

```
dotnet restore server --locked-mode → exit 0
dotnet build server -warnaserror → 0 Warning, 0 Error
dotnet test server → Domain 159/159; Api 169/169, 0 Skipped (chạy lại 2026-11-10 sau BE-E-08) (PostgreSQL 17.6 portable, 127.0.0.1:55432)
```

## Nghiệm thu

| Tiêu chí (chép từ task) | Kết quả | Bằng chứng |
| --- | --- | --- |
| Token Firebase sai → 401 | Đạt | `BadFirebaseToken_Returns401`, `FirebaseVerifierTests` (sai issuer/audience/hạn/provider/chữ ký) |
| Hai lần login cùng UID → cùng playerId, chỉ 1 lần tặng Gold | Đạt | `LoginTwice_SamePlayer_GrantedOnce`, `ConcurrentFirstLogin_CreatesOneAccount` |
| Refresh token cũ sau xoay vòng → 401 | Đạt | `Refresh_Rotates_AndOldTokenFails` |
| Logout xong refresh → 401 | Đạt | `Logout_RevokesRefresh_AndAccessToken` |
| Hub không token bị từ chối | Đạt | `Hub_WithoutToken_IsRejected` |

## Lệch spec / giả định

- Dùng JWKS (task cho phép) thay vì Admin SDK: không cần service account, nhưng không phát hiện được tài khoản bị disable trên Firebase hay token bị revoke trước khi hết hạn.
- Thêm field tùy chọn `rememberMe` vào `POST /auth/login` để phân biệt 7/30 ngày; SPEC chưa có field này.
- Chính sách phiên theo "mặc định M0 đã duyệt" trong task; `docs/work/S02` còn ghi chưa duyệt.

## Cần lead quyết

- Có cần kiểm tra Firebase disable/revoke không? Nếu có thì phải cấp service account ngoài repo.
- Xác nhận chính sách phiên để cập nhật S02.

## Việc còn lại

- Chưa thử đăng nhập Google thật: phần này cần Client CL-A-07 và trình duyệt (cổng M1). Logic xác minh đã test bằng token tự ký với JWKS giả.

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
