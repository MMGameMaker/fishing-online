# Kế hoạch BE — cập nhật 2026-11-09

Nguồn scope: [PROJECT](../PROJECT.md), [GAMEPLAY_SCOPE](../../doc/GAMEPLAY_SCOPE.md). Nguồn kế hoạch thực hiện: [v01/README](../v01/README.md), [SPEC_CHUNG 0.4](../v01/SPEC_CHUNG.md), [TIEN_DO](../v01/TIEN_DO.md). M0 đã duyệt cơ chế/mặc định cụ thể; cổng/test và task vẫn chưa tự hoàn tất.

## Scope hiện hành

BE ASP.NET Core/SignalR + PostgreSQL/Redis, Firebase Google trước/Facebook sau; Client Phaser/TypeScript, Admin React/TypeScript do BE thực hiện. Một hồ/map mới 20 ghế, thuê theo thời lượng chọn và gia hạn theo đơn giá từng ghế; Manual, 5 cần, 9 loài/5 rarity, chiều dài lưu đơn vị 0,1 cm; 100 Gold và cần mặc định cấp đúng một lần; shop cần/bán cá, EXP/level/Codex/history; 5–10 skin/social/ranking. Quần thể cá hữu hạn, Admin quản lý đợt thả cá theo loài/số lượng/thời gian.

Thính đã bỏ. Dây/lưỡi/mồi, Idle, loot, Gem gameplay, payment và giải đấu để sau. Không tự xây luật compatibility hay kho vé dạng số lượt cho v0.1.

## Thứ tự thực hiện

| Luồng | Đầu ra |
| --- | --- |
| BE-A | Module/envelope, Firebase/session, ví/ledger, idempotency, config và player |
| BE-B | Luật C# RNG/stats/spawn/length/params, wait chỉ trừ buff ghế; minigame TS Client tự xử lý |
| BE-C | Map/presence/movement, mua thời lượng ghế, expiry/cooldown/reconnect, BE-C-09 gia hạn |
| BE-D | Cần/inventory/shop/bán cá/EXP/Codex; BE-D-05 đã loại, không triển khai |
| BE-E | Hub vòng câu và settlement; BE-E-08 quần thể hữu hạn/không giảm thưởng trùng |
| AD | Config/lookup/audit và AD-06/07 lịch thả cá/tồn cá; giá thời gian từng ghế |
| QA | Các cổng M0–M5; contention/retry/restart và đối soát cá/ví/thời lượng |

Client làm mock theo fixture cùng version, các module dùng interface để không chờ UI. Không đồng nhất nhóm việc với thêm nhân sự. Task map/thả cá và trạng thái xem bảng v01; không tạo backlog khác ở đây.

## Quyết định thời lượng và kiểm tra

User chọn thời gian và trả trước; trong phiên có thể gia hạn, expiresAt tăng từ hạn cũ. Server tính tổng phí theo đơn giá ghế và block cấu hình; 10 phút/100 hoặc 200 Gold là ví dụ. Fixture giá/block là số test, bước/min/max và giá cuối chờ duyệt. Chống mua/gia hạn lặp bằng requestId/receipt, ví + hạn phiên transaction; expired không hồi sinh bằng gia hạn. Kiểm tra cạnh tranh ghế, renew/expiry race, giá đổi, thiếu Gold, reconnect giữ hạn mới nhất.

Hiện có persistence/readiness scaffold đã kiểm chứng ở S01; chưa có gameplay/auth/Admin runtime. Luật cạn cá, các field chưa có lựa chọn cụ thể như tồn ban đầu/cạn cá và social/skin/ranking bổ sung theo lát.


BE thực hiện tuần tự toàn bộ được; BE-A..E chỉ nhãn module. Ưu tiên khung/config → auth/ví → ghế/gia hạn → RNG/kinh tế → pool/thả cộng dồn → vòng câu outcome → E2E/Admin/social. Thiếu credential hoặc dữ kiện một task thì ghi rõ và tiếp tục task độc lập. Client fake win được chấp nhận, Server vẫn kiểm soát attempt và tối đa1 catch/EXP/pool decrement.


Sau khi vòng câu/settlement chạy đúng, làm BE-E-09 anomaly chỉ quan sát theo SPEC0.5; Admin tra cứu signal, QA kiểm tra false positive/retry/dedupe. Không trì hoãn vòng câu để làm anti-cheat tap đã loại.
