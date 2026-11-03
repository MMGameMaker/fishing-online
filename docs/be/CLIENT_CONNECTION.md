# Client Cocos kết nối Server

Nguồn [contract 0.1-draft](../contracts/v1-draft.md). Chưa thống nhất Client; ví dụ hiện tại chỉ chứng minh transport, không có login/room/gameplay.

## Thử server nền thật

Chạy theo [server README](../../server/README.md). API base `http://localhost:5080`, origin Cocos preview mẫu `http://localhost:7456`; kiểm tra origin thực tế và thêm chính xác vào ClientOrigins. Dùng localhost nhất quán, 127.0.0.1 là origin khác. Client không chứa connection string DB hoặc secret.

Cài `@microsoft/signalr` vào dự án Client khi W01 nhận việc; khóa version và lockfile sau kiểm tra tương thích Cocos 3.8.x Web. Chưa chỉnh package của Client trong lượt BE.

```typescript
import { HubConnectionBuilder, LogLevel } from '@microsoft/signalr';

const apiBase = 'http://localhost:5080'; // lấy từ cấu hình môi trường
const bootstrap = await fetch(`${apiBase}/api/v1/bootstrap`).then(r => {
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json();
});
const connection = new HubConnectionBuilder()
  .withUrl(`${apiBase}${bootstrap.hubPath}`)
  .withAutomaticReconnect([0, 2000, 10000, 30000])
  .configureLogging(LogLevel.Warning)
  .build();
// Với gameplay sau này: đăng ký connection.on(...) trước start.
connection.onreconnecting(() => { /* khóa input gửi command */ });
connection.onreconnected(async () => {
  // Hiện chỉ Ping; khi S03 sẵn sàng phải JoinRoom/GetSnapshot lại.
  console.log(await connection.invoke('Ping'));
});
connection.onclose(() => { /* hiện offline, cho thử kết nối lại */ });
await connection.start(); // lỗi start ban đầu phải catch/retry có backoff ở adapter
console.log(await connection.invoke('Ping'));
// Khi scene/service bị hủy: await connection.stop(); bỏ listeners đã đăng ký.
```

`withAutomaticReconnect` không retry lần start ban đầu; xử lý Promise lỗi và chỉ có một vòng retry/connection owner trong app. Không tạo connection mới ở mỗi scene. Không log bearer token. Production dùng HTTPS/WSS và origin được phép.

## Khi lát auth/phòng được triển khai

1. Login theo provider được S02 thống nhất; giữ token trong bộ nhớ, `withUrl(url, {accessTokenFactory: () => tokenStore.current()})`. S02 phải hỗ trợ bearer cho HTTP và token transport SignalR; hiện scaffold chưa hỗ trợ.
2. HTTP dùng Authorization Bearer. Hết hạn → refresh theo S02; refresh thất bại thì stop hub, xóa session và về login. Không tự cấp token/role; không xem connectionId là playerId.
3. Bind event trước start; JoinRoom rồi lấy snapshot. Sau reconnect bắt buộc join lại group và snapshot, vì membership/connectionId có thể đổi. Chỉ mở input sau resync hoàn tất.
4. Quản lý eventId/revision theo contract, xử lý gap bằng snapshot. Pending mutation giữ requestId qua timeout/reconnect; tra receipt trước khi quyết định UI. Không cộng tiền/cá dự đoán từ animation hoặc ack.
5. Tách `GameTransport` khỏi scene/UI, có mock/real adapter cùng DTO. Hiển thị loading/denied/offline, reconcile movement từ Server. Mỗi event handler được đăng ký một lần và dọn khi adapter hủy.

## Gate phối hợp W03/S02/S03

Hai browser login khác nhau, cùng phòng thấy avatar và tranh ghế; ngắt mạng rồi reconnect không trùng listener/avatar; token sai/hết hạn bị chặn; thiếu tài nguyên có mã lỗi; gửi lại command tài nguyên giữ cùng key không trừ hai lần. Chỉ Ping/negotiate thành công chưa đạt gate này. Chưa chạy Cocos hoặc tích hợp Client thật.

Tham khảo chính thức: [SignalR JavaScript client](https://learn.microsoft.com/en-us/aspnet/core/signalr/javascript-client?view=aspnetcore-10.0).
