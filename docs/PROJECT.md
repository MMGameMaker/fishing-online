# Fishing Online — Điểm bắt đầu

## Nguồn chính

[Fishing Online – Project Overview](https://app.notion.com/p/40d5f439904b81fca8e0dd63f26802c7) — v2.1, 10 mục; phạm vi Playable v0.1 và roadmap tổng quan ở mục 10, để GD phát triển tiếp; backlog chi tiết đã tách riêng. Luật chi tiết và con số chưa khóa được ghi là đầu vào GD/đề xuất, không phải kết quả triển khai.

## Quyết định hiện hành

- Playable v0.1: **2D Pixel Art**, Web Client **Cocos Creator 3.8.x + TypeScript**. Khóa patch 3.8.x khi khởi tạo.
- Server giữ **ASP.NET Core + SignalR + PostgreSQL + Redis**.
- Admin Tool giữ **React + TypeScript**, là ứng dụng riêng với UI game Cocos; **BE thực hiện cả Server và Admin Tool**, không tính nhóm/nhân sự Admin riêng.
- Một map hồ 2D, 20 ghế; login, vào phòng, chọn ghế, mua vé theo lượt; bốn loại trang bị: cần/dây/lưỡi/mồi.
- Idle/Manual, 5 loài cá mẫu với rarity/cân nặng khác nhau; inventory, lịch sử câu, thành tích cá nhân.
- Bổ sung **thính** là vật phẩm tiêu hao cùng nhóm với mồi, có trong inventory/shop. Mồi gắn lưỡi và thính dụ cá có tác dụng riêng; GD chốt cách dùng, tiêu hao, thời hạn và phạm vi ảnh hưởng. Giữ bốn slot cũ; cách hiển thị/dùng thính cần GD đặc tả.
- GD xây bảng tương thích mỗi loài với mồi/thính, phương pháp/loại cần, cỡ/kiểu lưỡi và dây theo nguyên tắc câu thực tế. Tách tiếp cận/cắn → mắc lưỡi → kéo cá; không dùng cấp/giá trang bị để tự bảo đảm cá hiếm. Quy tắc, số balance và danh sách 5 loài vẫn cần chốt. Yêu cầu tổng quan và nguồn tham khảo ở mục 03 Notion; chi tiết triển khai cập nhật ở doc Phân rã công việc, giữ nguyên ID.
- **Loot map/nhặt đồ tạm hoãn khỏi bản đầu**, thay quyết định đưa loot trở lại trước đây. Vẫn giữ di chuyển quanh hồ. GD cần chốt nguồn Gold/vé/mồi ban đầu và bổ sung khi không có loot.
- Gold/Gem giữ trong định hướng; shop Gold và ledger trong playable. **Chat, emoji, thông báo khoe cá và bảng xếp hạng bắt buộc trong v1**. Giải đấu và payment thật kể cả sandbox để sau.
- **Khoảng 5–10 skin nhân vật**; chọn/hiển thị/đồng bộ skin. Quyền dùng/mở khóa, số hướng và animation chưa khóa; không tự thêm shop skin hoặc chỉ số.
- Người dùng gọi bản đầu là v1; tài liệu hiện còn nhãn Playable v0.1. Tạm hiểu cùng bản đầu, chưa tự đổi version release. **Phase câu chi tiết còn thiếu**, GD bổ sung dần theo từng lát; khung trạng thái/prototype chưa phải luật đã duyệt.
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


