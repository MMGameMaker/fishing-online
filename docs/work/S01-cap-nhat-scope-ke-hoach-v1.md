# S01 — Cập nhật scope và kế hoạch bản đầu v1

- **Trạng thái chung:** BE nhận nền tảng/contract; scaffold kiểm tra đạt, contract dự thảo chờ Client/GD; chưa Xong toàn việc.
- **Nguồn yêu cầu:** Người dùng ngày 2026-11-03; [Overview v2.1](https://app.notion.com/p/40d5f439904b81fca8e0dd63f26802c7).
- **Phạm vi:** tài liệu scope/kế hoạch và BE bootstrap/môi trường/contract; chưa chốt contract hai bên hay phase câu.
- **Người sửa phần chung:** Codex BE phụ trách nguồn contract dự thảo và server; Client cần xác nhận trước tích hợp.

## GD

- **Agent / trạng thái:** Codex hỗ trợ cập nhật tài liệu; luật chi tiết còn chờ GD.
- **Đầu ra:** Overview v2.1: 5–10 skin, social/ranking trong v1, loot hoãn, BE kiêm Admin; phase câu bổ sung dần.
- **Kế hoạch:** [Client & BE và khối lượng Art](https://app.notion.com/p/40d5f439904b8102ad9ffb12a209e72a); [backlog](https://app.notion.com/p/40d5f439904b8116956dca7b922a1067) giữ ID loot hoãn và thêm ID social/skin/ranking.
- **Kiểm tra:** đọc trang gốc, cập nhật qua Notion và đọc lại các trang; số frame 24 × 4 × (5 hoặc 10) = 480/960; art nền 17–27 ngày + 1–2 mỗi skin thêm, dự phòng 20%. Đây là estimate, không phải kết quả sản xuất.
- **Tiếp theo:** chốt nguồn tài nguyên khi bỏ loot, quyền skin, phạm vi/trigger social, tiêu chí ranking và từng phase câu; không ép tất cả GDD phải xong trước bootstrap.

## Web Client (kiêm Art/asset 2D)

- **Trạng thái:** chưa nhận triển khai; đầu vào kế hoạch đã có.
- **Đầu ra dự kiến:** Cocos/Web bootstrap, một skin mẫu/map 20 ghế, mock/real adapter, fixture; mở rộng 5–10 skin sau art gate.
- **Kiểm tra / tiếp theo:** chưa có build/gameplay/asset thực tế; đo skin mẫu để tính lại tải Art, không cộng Art như nhân sự riêng.

## Server (BE)

- **Agent / trạng thái:** Codex BE nhận nền tảng/contract/môi trường ngày 2026-11-03; chưa triển khai toàn backlog.
- **Phạm vi:** server/, global.json, .gitignore, docs/be/, docs/contracts/; BE sở hữu nguồn contract, chờ Client xác nhận trước tích hợp.
- **Đầu ra:** [kế hoạch](../be/PLAN.md), [service/luồng chơi](../be/ARCHITECTURE.md), [contract](../contracts/v1-draft.md), [Client kết nối](../be/CLIENT_CONNECTION.md), [môi trường](../../server/README.md).
- **API thật:** health live/ready, bootstrap và hub Development Ping; chưa có auth/gameplay/DB adapter/migration. Contract 0.1-draft chưa được Client/GD thống nhất.
- **Kiểm tra:** .NET 10.0.401 build đạt 0 warning/error; Node 24.20.0 smoke HTTP live/ready/bootstrap, CORS allow/deny, SignalR negotiate/handshake/Ping đạt. Test loopback ngoài sandbox; đã dừng tiến trình.
- **Còn thiếu:** Docker không có trong PATH nên Compose PostgreSQL/Redis chưa kiểm chứng; workspace không có .git. Chưa chạy Cocos/Admin/gameplay/tải 20 phiên.
- **Tiếp theo:** cài/bật Docker và chạy Compose; Client review DTO/map fixture; GD chốt luật theo lát; thống nhất login trước S02. Admin đã có kế hoạch/API dự thảo, chưa code React.

## Admin Tool

- **Trạng thái:** BE thực hiện, không có nhóm Admin độc lập.
- **Phạm vi:** A01–A04/A06 theo kế hoạch; A05 nâng cao và config loot hoãn.
- **Kiểm tra / tiếp theo:** chưa có UI/API thật; tính chung tải BE, không mặc định hỗ trợ moderation nâng cao.

## Contract Web Client/Admin ↔ Server

- **Phiên bản / trạng thái:** 0.1-draft, BE đề xuất, chờ Client/GD; không phải API gameplay đã chạy.
- **Nguồn duy nhất:** [contract dùng chung S02–S13/Admin](../contracts/v1-draft.md); Codex BE chỉnh nguồn.
- **Nội dung / tác động:** API/event/lỗi/đơn vị/idempotency/snapshot/reconnect; Client cần review DTO/origin/map/seat và adapter, Admin theo schema/policy Server. Phase/login/config/ranking cần hoàn thiện schema trước tích hợp.

## Trao đổi cần xử lý

- **GD → Client/BE:** cách hiểu v1 là bản đầu đang mang nhãn v0.1 là giả định làm việc; chưa đổi version release.
- **GD cần chốt:** 5 hay 10 skin cụ thể trong khoảng, art spec, tài nguyên không loot, phase câu/social/ranking. Không cản phần nền tảng độc lập.

## Kiểm tra tích hợp

- BE build và transport smoke thực tế đạt; tái chạy `node server/smoke.mjs` khi API Development đang chạy. Chưa kiểm tra Cocos/Admin end-to-end, persistence hoặc gameplay. Không đóng S01/toàn playable.
