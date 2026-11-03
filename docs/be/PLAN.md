# Kế hoạch BE v1

Ngày 2026-11-03, Codex phụ trách BE trong lượt này. Nguồn scope đã duyệt: [PROJECT](../PROJECT.md); ID/acceptance: [backlog Notion](https://app.notion.com/p/40d5f439904b8116956dca7b922a1067). Đây là kế hoạch thực hiện BE kiêm Admin, không thay backlog nguồn và không cam kết lịch hoàn thành. Chỉ S01 nền tảng/contract được khởi động; các lát còn lại là kế hoạch.

## Phạm vi

Server authoritative ASP.NET Core + SignalR + PostgreSQL + Redis; một map/20 ghế, movement, phiên Player/Admin, vé theo lượt, Gold/ledger/shop, bốn slot cần/dây/lưỡi/mồi và thính riêng, Idle/Manual, 5 cá, history/thành tích, 5–10 skin, chat/emoji/khoe cá/ranking. Admin React/TS riêng do BE làm, không có nguồn lực thứ ba. S07 loot, A05 nâng cao, payment kể cả sandbox và giải đấu để sau. Không tự thêm bán cá, shop skin, thưởng ranking hoặc gameplay Gem.

## Thứ tự triển khai và đầu ra

| Lát / ID | Việc BE và dependency | Cổng kiểm tra trước chuyển lát |
| --- | --- | --- |
| Nền / S01 | Scaffold, môi trường, contract phiên bản và fixture; đồng bộ map/seat với Client | Build/run health và SignalR thật; Client review schema nền, GD xác nhận điểm còn mở |
| Phiên / S02 | Provider login được thống nhất, session/revoke, Player/Admin, DB migration người chơi | Token sai/hết hạn/logout bị chặn; Player nhận 403 ở Admin; restart không mất player |
| Phòng / S03 | Join/leave/snapshot, 20 ghế atomic, movement validation, reconnect | 2 người tranh ghế có đúng 1 thắng; reconnect/restart không avatar/ghế trùng |
| Kinh tế / S04 | Inventory/loadout/shop/vé/thính, ledger và idempotency; cần luật nguồn cấp/tiêu hao S01 | Retry/concurrent purchase không âm/trùng; ledger khớp balance và item; lỗi rollback toàn bộ |
| Idle / S05 | Attempt state, RNG, tương thích 5 loài, config pin, reward transaction; cần S03/S04 và phase GD | Cùng attempt chỉ 1 settlement; hết vật tư dừng; kiểm tra bảng tương thích và thính |
| Manual / S06 | Input seq/deadline và validation, dùng chung settlement S05 | Input giả/trễ/trùng/timeout/hủy/reconnect có kết quả đúng luật |
| Dữ liệu / S08 | History/thành tích từ settlement, truy vấn phân trang | Chỉ đọc dữ liệu được phép; đăng nhập lại giữ đúng kỷ lục |
| Admin / S09 + A01–A04 | API quyền/audit, draft/validate/publish config; React login/form/lookup; làm xen kẽ khi API sẵn | Publish lỗi bị chặn, concurrent edit được phát hiện, version pin theo lượt; UI gọi Server thật |
| Hoàn chỉnh / S13, S11, S12 + A06 | Skin sau S02/S03; social sau S03, khoe cá/ranking sau S05/S08 và luật GD; Admin hỗ trợ tối thiểu | Quyền skin, chống giả catch, rate limit; ranking đối chiếu fixture; phạm vi moderation được chốt |
| Phát hành / S10 | Migration/seed/package, observability, load 20 phiên, restart/recovery; phụ thuộc các lát trên | End-to-end Client/Admin thật, latency/error/resource số đo, không lặp thưởng; ghi lỗi còn lại |

Mỗi lát giao schema + fixture thành công/lỗi trước; Client làm mock cùng version trong lúc BE viết harness. Tiếp theo demo API độc lập rồi tích hợp thật. Admin tính vào cùng tải BE, triển khai sau API từng phần. Ước lượng ngày công sau lát S02/S03 và đo vận tốc; chưa có dữ liệu để chốt hạn toàn v1.

## Đầu vào cần chốt theo lát

- GD → S04: nguồn Gold/vé/mồi ban đầu khi không loot, giá, giới hạn túi, quy tắc tiêu hao/hoàn vé; không seed số balance tự nghĩ.
- GD → S05/S06: 5 loài/cân nặng/rarity, ma trận mồi/thính/cần/dây/lưỡi, từng phase/input/deadline, hủy/disconnect và phạm vi/thời hạn thính.
- GD → S11/S12/S13/A06: trigger/phạm vi/lưu social, ranking metric/chu kỳ/tie/refresh, quyền mở skin và mức hỗ trợ Admin.
- Client ↔ BE: map origin/đơn vị/walkable/seat ID, giới hạn movement, DTO và version/error; nguồn contract do BE chỉnh, chờ Client xác nhận trước tích hợp.
- S02: phương thức đăng nhập/nguồn identity chưa chốt. Scaffold không mở dev-login tự nhận player/admin.

Đầu ra và bằng chứng lượt này ở [S01](../work/S01-cap-nhat-scope-ke-hoach-v1.md); không mở hàng loạt task chưa bắt đầu.
