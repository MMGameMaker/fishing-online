# S02 — Firebase Authentication và quản lý tài khoản

Ngày 2026-11-03, Codex BE phụ trách nguồn. **Đã được người dùng chọn:** Firebase Authentication, Google login trước, Facebook login để sau. **Còn là đề xuất:** phiên ứng dụng, TTL, multi-device, Admin/MFA và DTO bên dưới; chờ Client review trước tích hợp. Chưa code auth/API/migration Firebase. Bản này thay phương án tự quản mật khẩu ASP.NET Identity đã đề xuất trước đó.

## Ranh giới

- Firebase quản lý identity/provider login, credential Google/Facebook, ID token và refresh của Firebase. Lát đầu Google; không triển khai email/password riêng trong BE hoặc tạo thêm kho password Identity.
- ASP.NET Core quản lý account nội bộ, trạng thái khóa/quyền, phiên ứng dụng và quyền điều khiển gameplay; PostgreSQL giữ player/inventory/ledger/history; Redis hỗ trợ rate limit/cache/coordination. Không cần Firestore, Realtime Database hoặc Firebase Hosting cho lựa chọn này.
- Map duy nhất `(firebaseProjectId, firebaseUid) → accountId → playerId`; accountId/playerId UUID nội bộ ổn định. Email nullable/chỉ metadata, không khóa identity, không tự gộp account theo email. Provider thiếu email vẫn có thể có UID hợp lệ khi được bật sau này.

## Luồng Google trước

1. Người chơi bấm “Đăng nhập Google”. Client Cocos Web gọi Firebase JavaScript SDK từ adapter auth, mở popup trực tiếp từ thao tác bấm; cancel/popup blocked có trạng thái UI rõ. Redirect fallback phải kiểm tra trên browser/mobile và auth domain thực tế, chưa coi Cocos tích hợp được khi chưa build thử.
2. Firebase login thành công; Client lấy **Firebase ID token**, không gửi Google access token/custom token thay nó, không gửi role/playerId tự khai để xác thực.
3. Client POST `/api/v1/auth/login` với `{firebaseIdToken,requestId}` qua HTTPS. Server Firebase Admin .NET xác minh chữ ký/issuer/audience/expiry và revocation/user disabled theo chính sách; chỉ chấp nhận project được cấu hình. Google là provider được phép ở lát đầu.
4. Xác minh thành công → transaction upsert account theo project/UID và tạo đúng một PlayerProfile nếu mới. Unique constraints và receipt/requestId chặn login concurrent tạo account/profile/session trùng. Tên Google chỉ gợi ý tên hiển thị ban đầu, qua validate; login sau không tự ghi đè tên người chơi đã đổi.
5. Kiểm tra account suspension/quyền nội bộ. Cấp phiên ứng dụng theo phương án đang đề xuất; trả me và accessToken. Không nhận quyền Admin từ email/domain/provider/client. Không cấp lại Gold/vé/mồi mỗi lần đăng nhập; grant S04 tách riêng có ledger và unique grant key theo luật GD.
6. Client GET /me, kết nối SignalR bằng access token ứng dụng, join/resume snapshot. Reconnect không tạo lại character/attempt hoặc roll lại cá.

Đăng ký và đăng nhập dùng cùng nút Google: lần đầu tạo account, lần sau tìm account cũ. Không cần form tạo mật khẩu, mail verify/reset riêng cho Google-only; tài khoản Google do Google/Firebase xử lý credential. Account bị khóa trong game vẫn bị chặn dù Firebase login thành công.

## Facebook về sau và liên kết tài khoản

- Bật Facebook provider khi nhận lát đó; cần Meta app, App ID/secret phía Firebase, OAuth redirect URI, domain/chính sách và cấu hình phát hành theo yêu cầu Meta lúc triển khai. Không hiển thị nút Facebook hoạt động khi chưa cấu hình/test thật.
- Người chơi Google hiện có chọn “Liên kết Facebook” trong hồ sơ; reauthenticate rồi dùng Firebase account linking. Sau liên kết vẫn cùng Firebase UID và cùng account/player, giữ inventory/history.
- Với lỗi account-exists-with-different-credential, yêu cầu đăng nhập lại bằng provider hiện hữu rồi link có proof; không merge chỉ vì trùng email. Không nhận UID tùy ý từ Client để chuyển tài sản.
- Nếu đã có hai UID gắn hai account game có tiến độ, không auto-merge; cần quy trình xử lý riêng được duyệt. Unlink không được loại bỏ phương thức truy cập cuối cùng khi chưa có cách đăng nhập khác.

## Phiên ứng dụng — mặc định được user đồng ý M0 ngày 2026-11-09

- Tách Firebase session khỏi game session. Firebase token dùng làm proof để mở phiên BE; token game không giả là Firebase token. Firebase SDK lo refresh Firebase, `/auth/refresh` nếu chọn dưới đây chỉ refresh **phiên BE**.
- Access token game 10 phút Player, 5 phút Admin, chỉ trong memory; refresh game cookie HttpOnly/Secure/host-only, Player 7 ngày hoặc 30 ngày Remember me, Admin 8h tuyệt đối. Cookie/CSRF/Origin/CORS và topology cùng site phải Client/BE thống nhất trước triển khai.
- Refresh token game opaque lưu hash, rotate atomic, phát hiện reuse thu hồi family. Client single-flight xuyên tab; mất response sau rotation có thể phải login lại, không hứa retry luôn an toàn. Không lưu provider access token hoặc Firebase refresh token trong DB BE.
- Logout game revoke phiên + đóng hub và Client signOut Firebase nếu người dùng chọn đăng xuất app; chỉ signOut Firebase ở browser không tự thu hồi phiên BE. Logout-all/password-security event/suspension phải có kiểm tra trạng thái hiện hành.
- Phiên BE không được tách khỏi revocation Firebase vô thời hạn: lưu firebaseAuthTime, revalidate bằng Firebase ID token mới tối đa mỗi 10 phút (đề xuất), từ chối refresh nếu không có proof hợp lệ sau hạn đó. Sự kiện Admin disable/revoke phải revoke cả phiên game khi do hệ thống quản lý thực hiện. Thay đổi ngoài Firebase Console có độ trễ phát hiện theo chu kỳ, không tuyên bố cắt ngay. Khi Firebase không truy cập được tại lúc cần kiểm chứng thì không phát/refresh phiên mới.
- Mỗi request bảo vệ/hub command kiểm tra session/account/authVersion từ nguồn bền vững, không chỉ JWT còn hạn. Hub hết token phải đóng và reconnect sau refresh. Redis mất không được cho qua trạng thái khóa.
- Đã đồng ý tối đa 3 thiết bị đăng nhập, chỉ 1 phiên điều khiển gameplay. Tiếp quản cần xác nhận, tăng controlGeneration atomic, chuyển snapshot/attempt giữ nguyên; lease/deadline/logout không tự hủy/hoàn vé khi GD chưa duyệt.

## Quản lý user/data

| Dữ liệu | Trường/constraint dự kiến |
| --- | --- |
| Accounts | id UUID, firebaseProjectId, firebaseUid; unique(project,uid); email nullable, emailVerified metadata, status/suspendedUntil, authVersion, createdAt,lastLoginAt; không passwordHash |
| game.players | id UUID hiện có, accountId FK unique, displayName, createdAt; thêm skin theo S13; không đổi ID khi link provider |
| Provider metadata | providerId/providerUid chỉ từ Firebase verified user info; optional cache hiển thị, không thay project/UID mapping nguồn |
| AuthSessions | id,accountId,clientType,deviceLabel,createdAt,lastSeenAt,expiresAt,revokedAt/reason,authVersion,firebaseAuthTime,lastFirebaseValidatedAt,mfaAt? |
| RefreshTokens | tokenHash unique,sessionId,familyId,createdAt,expiresAt,usedAt/replacedBy,revokedAt; chỉ nếu duyệt game refresh session |
| Roles/Permissions | policy do Server/vận hành cấp, không tự cấp Admin từ Google email hoặc UI |
| AuthAudit | actor/target/event/result/time/correlationId, metadata lọc; không token/provider secrets/mail body |

User được xem hồ sơ, đổi displayName, xem/revoke phiên; đổi Google email/password làm tại provider, BE cập nhật metadata từ nguồn xác minh, không chuyển ownership theo email mới. Admin lookup/khóa/mở khóa/revoke có policy/audit. Chính sách xóa account và retention/anonymization ledger/history cần duyệt riêng; không xóa cascade dữ liệu kinh tế. Đề xuất Admin account riêng, MFA và phiên/audience riêng; M0 user đồng ý Admin Google qua Firebase với account/quyền riêng và MFA theo proposal; không tự cấp Admin từ email/provider.

## API và contract review

Các endpoint dưới đây chưa triển khai; schema cuối cần Client review.

| Route /api/v1 | Đề xuất |
| --- | --- |
| POST /auth/login | {firebaseIdToken,requestId} → accessToken,expiresAt,me; refresh game cookie nếu duyệt |
| POST /auth/refresh | game refresh cookie + CSRF, Firebase ID token mới khi tới hạn revalidate → game access token |
| POST /auth/logout; /auth/logout-all | revoke game session, 204; không chỉ logout Firebase SDK |
| GET /me; PATCH /me/profile | owner profile / displayName; không ghi email/provider/role tự khai |
| GET /me/sessions; DELETE /me/sessions/{id} | owner-only sanitized sessions / revoke |
| Admin account read/suspend/unsuspend/revoke | policy riêng, lý do/audit; Admin login/MFA contract còn mở |

Provider login/link/unlink chạy qua Firebase SDK; không tạo endpoint BE nhận mật khẩu Google/Facebook. BE nhận diện UID từ token đã verify, không từ body profile. Login rate limit theo IP và UID chỉ sau verify; token Firebase/Google/Facebook, header Authorization không được log.

## Thiết lập và cổng kiểm tra

1. Firebase project dev riêng, đăng ký Web App, bật Authentication Google và support email, cấu hình authorized domains/localhost/redirect URI theo môi trường. Chỉ bật Facebook sau.
2. Cung cấp projectId và Web App config cho Client. Firebase web config không phải service-account credential; vẫn cấu hình domain/quota phù hợp. Admin SDK credentials chỉ trong secret/env ngoài repo, không gửi private key vào chat và không đặt trong Client. Ưu tiên ADC/secret store; chưa cần Firestore.
3. Client kiểm tra Firebase SDK trên Phaser + TypeScript Web PC/mobile; BE dùng Firebase Admin .NET + migration mapping, fake verifier trong test riêng không được bật bypass production. Emulator tests không thay Google end-to-end.
4. Gate: Google thật → BE verify → profile persist; concurrent login chỉ 1 account/profile; token sai/hết hạn/project khác/custom token bị chặn; suspension/role/hub/refresh/revoke/Redis outage; popup cancel/blocked/reconnect. Facebook linking sau phải giữ nguyên UID/player/tài sản, chặn auto-merge email. Chưa chạy test auth nào.

Nguồn: [Verify ID tokens](https://firebase.google.com/docs/auth/admin/verify-id-tokens), [Google Web](https://firebase.google.com/docs/auth/web/google-signin), [Account linking](https://firebase.google.com/docs/auth/web/account-linking), [Facebook Web](https://firebase.google.com/docs/auth/web/facebook-login), [Session revocation](https://firebase.google.com/docs/auth/admin/manage-sessions).

## Firebase Web App config đã cung cấp — 2026-11-09

Nguồn: người dùng sao chép từ Firebase Console trong chat. Project dùng cho thiết lập dev hiện tại: `fishing-online-c111f`. Đây là cấu hình Web Client, không phải Firebase Admin service-account credential; được lưu theo yêu cầu người dùng. Người dùng xác nhận ngày 2026-11-09: Google provider đã Enabled và localhost đã thêm vào Authorized domains. Agent chưa kiểm chứng trực tiếp Console hoặc Google login end-to-end.

```javascript
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";

const firebaseConfig = {
  apiKey: "AIzaSyCROH7-RSB7Xgl0cFA1Dwj3T5aE2Dl_JA8",
  authDomain: "fishing-online-c111f.firebaseapp.com",
  projectId: "fishing-online-c111f",
  storageBucket: "fishing-online-c111f.firebasestorage.app",
  messagingSenderId: "477185422341",
  appId: "1:477185422341:web:ef2a6c0ddb575ac07e986c",
  measurementId: "G-KDS7P0SZKF"
};

const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
```

Đoạn trên lưu cấu hình và ví dụ khởi tạo do người dùng cung cấp, chưa phải code đã tích hợp. Google login sẽ dùng `firebase/auth`; Analytics là chức năng riêng, không bắt buộc cho login. BE cấu hình projectId tương ứng; credential Admin SDK qua secret/env ngoài repo, không đặt trong tài liệu này.


**M0 2026-11-09:** Các đề xuất cụ thể về phiên/reauth/quyền điều khiển/MFA được user đồng ý; contract auth/session phải đồng bộ theo nguồn này (Player10 phút, Admin5 phút). Khi tiếp quản gây ngắt kết nối cũ, luật gameplay disconnect vẫn hủy attempt, không cấp cá cho attempt hủy; giữ dữ liệu nhân vật/ghế theo rule hiện hành. Không phải bằng chứng auth runtime đã chạy.
