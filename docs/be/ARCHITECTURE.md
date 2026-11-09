# Service, dữ liệu và luồng chơi BE

Thiết kế kỹ thuật đề xuất 0.1-draft; scope theo [PROJECT](../PROJECT.md), chưa thay luật GD. Triển khai ban đầu một ASP.NET Core modular monolith, một instance sở hữu phòng; không tự tách microservice. Đã có transport diagnostic, EF Core/Npgsql DbContext, migration profile nền tảng và Redis multiplexer; readiness truy vấn thật. Module gameplay bên dưới vẫn là thiết kế chưa triển khai.

## Service cần thiết

| Module | Trách nhiệm / dữ liệu bền vững dự kiến |
| --- | --- |
| IdentitySession | Identity ngoài hoặc tài khoản theo phương án S02, player, session/revocation, role; không tin playerId từ request |
| RoomPresence | Join/leave/move/seat, snapshot và room revision; room/seat config trong Postgres, presence tạm trong Redis |
| InventoryEquipment | 5 cần/ownership/equipped rod và catches; không vật tư/effect đã bỏ |
| EconomyShop | Wallet, append-only ledger, seat purchase/extension receipts, receipt idempotency; giá lấy config Server |
| FishingAttempt | Attempt, phase/input/deadline, RNG server, configVersion và loadout snapshot; state chưa là luật đã duyệt |
| SettlementHistory | Atomic consume/reward/catch/history/achievement và outbox; unique attempt settlement |
| Config | Immutable published version, draft/validate/publish, compatibility data và audit; lượt đã bắt đầu giữ version |
| Skin | Catalog/entitlement/selected skin persist; broadcast snapshot/event, không thêm chỉ số |
| Social | Membership, payload validation, rate limit, emoji allowlist, catch ownership và dedupe showcase |
| Ranking | Projection catch hợp lệ qua outbox, dedupe event; query/cursor/updatedAt theo luật GD |
| AdminAudit | Quyền config.read/config.publish/player.read/audit.read, audit actor/action/version; không API sửa tiền trực tiếp |

Postgres là nguồn chân lý wallet/item/attempt/catch/session/config/audit; Redis chỉ cache/presence/rate limit, không là ledger. Đã có migration game.players tối thiểu, chưa có schema phiên/kinh tế/gameplay. Dự kiến constraints: unique identity, unique (roomId, seatId) cho seat đang giữ và unique player đang ngồi, unique (playerId, operation, requestId), unique settlement(attemptId), unique projection(eventId). Không lưu token thô hoặc dữ liệu nhạy cảm trong log.

## Nhất quán và phục hồi

- Command tài nguyên: transaction Postgres khóa hàng liên quan theo thứ tự ổn định, kiểm tra version/số dư, ghi balance + ledger + inventory + receipt + outbox cùng commit. Unique constraint là hàng rào cuối; không chỉ khóa trong RAM.
- Request lặp cùng user/operation/key và payload hash trả receipt cũ; payload khác trả conflict. Receipt tài nguyên giữ cùng dữ liệu nghiệp vụ, không cho phép thực thi lại khi key hết cache. Không dùng connectionId làm identity/idempotency.
- Một room command queue tuần tự hóa movement/seat trong instance; quyền giữ ghế bền vững phải có lease/generation và kiểm tra transaction. TTL/release grace cần thống nhất theo S03/GD; không tự quy định disconnect mất vé.
- Broadcast chỉ sau commit. Outbox retry với eventId ổn định; consumer dedupe. Mất broadcast thì client lấy snapshot, không suy ra giao dịch thất bại.
- Restart: tải attempt chưa kết thúc và deadline/config đã pin, resolve theo luật GD; không roll RNG lại để cấp thưởng. S03/S05 phải định nghĩa recovery trước nghiệm thu. Redis mất có thể rebuild từ DB, phòng chưa phục hồi thì từ chối command.
- Scale nhiều instance để sau benchmark: cần room ownership với fencing token và routing/backplane; chỉ thêm Redis backplane không tự giải quyết ownership.

## Luồng chơi mục tiêu

1. Login nhận access/session; bootstrap trả config/catalog version, hồ sơ và khả năng server. Kết nối hub có auth, join phòng và lấy snapshot đầy đủ.
2. Chọn skin có quyền; di chuyển trong walkable map; chọn ghế atomic. Server trả trạng thái và phát event cùng room revision.
3. Chọn thời lượng ghế, trả trước theo đơn giá ghế; gia hạn còn hiệu lực cộng vào expiresAt cũ. Ví/ledger/session/receipt atomic. Trang bị cần đã sở hữu; không thính/mồi/dây/lưỡi trong bản đầu.
4. Start attempt Manual: kiểm tra seat/quyền/tài nguyên/loadout, pin config. Thời điểm trừ tài nguyên phụ thuộc GD; không coi scaffold phase là thiết kế hoàn chỉnh.
5. Khung phase **đề xuất**: Created → Waiting → Bite → Hooked → Reeling → Settled; nhánh Failed/Cancelled. Manual gửi input theo seq và deadline server; Idle để sau. GD có thể thay khung trước triển khai.
6. Settlement transaction trả catch/kết quả, balance/inventory version; cập nhật history/thành tích, outbox ranking/showcase nếu luật cho phép. Client chỉ diễn hoạt kết quả.
7. Chat/emoji theo phòng; khoe catch đã xác minh; ranking chỉ đọc projection có updatedAt. Không tự thêm thưởng hay chat global.
8. Reconnect: giữ pending requestId, kết nối lại rồi join/resume lấy snapshot/attempt/receipt; không tự tạo lượt hoặc retry mutation bằng ID mới. Hủy/thoát/timeout giải quyết theo luật GD còn mở.

## Kiểm tra bắt buộc khi triển khai

Auth/role/expiry/revoke; 20 ghế/20 phiên và tranh ghế; concurrent mua/equip/start; request trùng khác payload; mất mạng ngay trước/sau commit; restart giữa phase/settlement/outbox; config publish khi đang câu; gia hạn/expiry race/giá đổi; Manual input giả/trễ; social payload/rate/membership; ranking dedupe/tie; tra cứu Admin/audit và migration trên DB trống. Chưa thực hiện các kiểm tra gameplay này ở bootstrap.


**Nguồn contract hiện tại:** docs/v01/SPEC_CHUNG.md 0.3; không dùng state khung trong tài liệu này thay luật Manual đã chốt. Quần thể hữu hạn và reservation xem BE-E-08 (reservation còn là đề xuất); Admin AD-06/07 thả cá. Gia hạn không reset attempt/config gameplay đang pin; chỉ cập nhật hạn phiên và giao dịch giá mới.
