# Fishing Online — Điểm bắt đầu

## Nguồn chính

Scope hiện hành: [GAMEPLAY_SCOPE](../doc/GAMEPLAY_SCOPE.md); kế hoạch/contract/fixture: [docs/v01](v01/README.md) và [SPEC 0.3](v01/SPEC_CHUNG.md). Repo là nguồn làm việc chính; Notion dưới đây là tham chiếu tổng quan, không dùng nội dung cũ ghi đè quyết định mới trong repo.

[Fishing Online – Project Overview](https://app.notion.com/p/40d5f439904b81fca8e0dd63f26802c7) — v2.1, 10 mục; phạm vi Playable v0.1 và roadmap tổng quan ở mục 10, để GD phát triển tiếp; backlog chi tiết đã tách riêng. Luật chi tiết và con số chưa khóa được ghi là đầu vào GD/đề xuất, không phải kết quả triển khai.

## Quyết định hiện hành

- Playable v0.1: **2D Pixel Art**, Web Client **Phaser Engine + TypeScript**. Khóa phiên bản Phaser/package khi khởi tạo.
- Server giữ **ASP.NET Core + SignalR + PostgreSQL + Redis**.
- **Player authentication:** Firebase Authentication; Google login trước, Facebook login để sau (người dùng chốt 2026-11-03). Account/player và dữ liệu game vẫn ở PostgreSQL; không tự thêm hệ mật khẩu Identity song song. Chi tiết phiên/Admin còn là đề xuất trong [S02](be/ACCOUNT_AUTH.md).
- Admin Tool giữ **React + TypeScript**, là ứng dụng riêng với UI game Phaser; **BE thực hiện cả Server và Admin Tool**, không tính nhóm/nhân sự Admin riêng.
- **Chi tiết gameplay đã chốt và số liệu tạm để test nằm ở [GAMEPLAY_SCOPE.md](../doc/GAMEPLAY_SCOPE.md)** (người dùng chốt 2026-11-05 và 2026-11-06).
- **Bổ sung 2026-11-09:** dựng map hồ câu mới; Admin quản lý các đợt thả cá (loài, số lượng, thời gian). Người dùng chốt quần thể cá hữu hạn, bắt thành công giảm số cá. Luật cạn cá/reservation/tồn khởi đầu và contract còn cần thống nhất; task tại docs/v01/README.md.
- Một map hồ 2D, 20 ghế; phòng và Lake là một. Login, vào phòng, chọn ghế, chọn thời lượng ghế, trả Gold theo đơn giá riêng từng ghế, gia hạn được khi còn giữ ghế; không cố định một phiên 10 phút.
- Chỉ cần có cần câu là câu được; bản đầu có 5 loại cần, mỗi người chơi mặc định có 1 cần cấp thấp. **Mồi, dây và lưỡi bỏ khỏi bản đầu**, bổ sung sau nếu quyết định triển khai.
- Bản đầu chỉ làm **Manual**; Idle cập nhật sau. 9 loài cá mẫu thuộc 5 bậc rarity; kích thước tính bằng chiều dài (cm), chỉ để so sánh giữa các user. Có inventory, lịch sử câu, thành tích cá nhân.
- **Thính bỏ khỏi bản đầu** (user chốt 2026-11-09): không shop/item/nút dùng/effect.
- Không dùng cấp/giá trang bị để tự bảo đảm cá hiếm. Logic spawn cá đã chốt ở GAMEPLAY_SCOPE (người dùng chốt 2026-11-09); thành tích GD bổ sung sau. Yêu cầu tổng quan và nguồn tham khảo ở mục 03 Notion; chi tiết triển khai cập nhật ở doc Phân rã công việc, giữ nguyên ID.
- **Loot map/nhặt đồ tạm hoãn khỏi bản đầu**, thay quyết định đưa loot trở lại trước đây. Vẫn giữ di chuyển quanh hồ. Người chơi mới được tặng 100 Gold; vé mua bằng Gold, kiếm Gold bằng cách bán cá tại Shop.
- Shop dùng Gold và có ledger: bán cần câu, nhận bán cá. Gem không dùng trong bản đầu. **Chat, emoji, thông báo khoe cá và bảng xếp hạng bắt buộc trong v1**, luật GD mô tả sau. Giải đấu và payment thật kể cả sandbox để sau.
- **Khoảng 5–10 skin nhân vật**; chọn/hiển thị/đồng bộ skin. Quyền dùng/mở khóa, số hướng và animation chưa khóa; không tự thêm shop skin hoặc chỉ số.
- Người dùng gọi bản đầu là v1; tài liệu hiện còn nhãn Playable v0.1. Tạm hiểu cùng bản đầu, chưa tự đổi version release. Quy trình câu Manual đã chốt ở GAMEPLAY_SCOPE; khung trạng thái/prototype khác với quy trình này chưa phải luật đã duyệt.
- Hai luồng triển khai: **Client kiêm Art** và **BE kiêm Admin Tool**; GD cung cấp luật/data/acceptance. Admin vẫn tách ứng dụng và quyền, cùng nguồn lực BE.
- Asset mua sẵn/import/AI tạo; Client chuẩn hóa sprites/tileset/atlas/animation 2D và tích hợp. Ghi nguồn/quyền sử dụng; mua asset cần duyệt bộ asset/ngân sách. Placeholder không phải asset final.

## Nguồn backlog và lịch

- Backlog trong [Phân rã công việc Playable v0.1](https://app.notion.com/p/40d5f439904b8116956dca7b922a1067): S01–S13 Server, W01–W13 Web Client, A01–A06 Admin (BE đảm nhận). S07/W08 loot hoãn, A05 nâng cao để sau; ID cũ giữ nguyên. Thêm S11–S13/W11–W13 cho social/ranking/skin và A06 hỗ trợ social/ranking tối thiểu (chi tiết mức hỗ trợ còn cần chốt). Mỗi việc có ưu tiên, dependency và acceptance criteria. Đây là kế hoạch, chưa tự phân công hoặc đánh dấu đang làm.
- [Kế hoạch Client & BE và khối lượng Art v1](https://app.notion.com/p/40d5f439904b8102ad9ffb12a209e72a) đã chuyển sang hai luồng chạy độc lập bằng contract/fixture, các cổng tích hợp, khởi động 10 ngày tham khảo và khối lượng Art. Lịch 2 tuần cũ không còn là lịch hoàn thành toàn scope. Chưa có ngày bắt đầu hoặc cam kết nhân lực. Không cắt scope để ép vừa lịch khi chưa được duyệt.
- Không chép backlog/tiến độ thành nhiều nguồn. Khi nhận việc thật, dùng ID tương ứng trong docs/work/ và thêm link vào HANDOFF.md.

## Ảnh tham khảo gameplay 2D

[Cảnh câu cá Pixel Art](assets/pixel-art-fishing-reference.jpg) — ảnh người dùng cung cấp, đã chèn tại mục 07 Overview. Tên file gốc: How to Catch Fish in Everholm - Pixel Questing.jpg; nhận diện nguồn theo tên file, chưa có URL bài gốc. Tham khảo góc nhìn, map hồ/cầu/bờ, sprite và hotbar/HUD; không phải screenshot Fishing Online hoặc bộ asset đã được cấp quyền. Không đưa hệ ngày/giờ, stamina/mana/nông trại trong ảnh vào scope v0.1.


## Quy trình

[Quy tắc phối hợp qua Markdown trên Notion](https://app.notion.com/p/40d5f439904b81058e1bde77a20b7278) là doc riêng; phần quy trình đã được gỡ khỏi nội dung Overview để giữ tài liệu tập trung vào tổng quan game và đầu vào cho GD.

Đọc [README.md](README.md), dùng [mẫu công việc](work/_TEMPLATE.md). GD, Web Client, Server, Admin Tool cập nhật phần tham gia; Art/asset nằm trong Web Client. Chỉ tách đặc tả chuyên môn khi cần, liên kết nguồn và trạng thái Đề xuất/Đã duyệt.
