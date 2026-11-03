# Gameplay và scope Playable v0.1

## Đã chốt

- 2D Pixel Art; web client Cocos Creator 3.8.x + TypeScript.
- ASP.NET Core + SignalR; PostgreSQL + Redis. Admin React + TypeScript riêng, do BE thực hiện cùng Server; hai luồng Client kiêm Art và BE kiêm Admin.
- Một map hồ đi lại, 20 ghế/phòng; login, vào phòng, chọn ghế, mua vé theo lượt.
- Câu Idle/Manual; bốn slot Rod/Line/Hook/Bait (cần/dây/lưỡi/mồi).
- Năm loài cá mẫu với rarity/cân nặng khác nhau; inventory, lịch sử câu, thành tích cá nhân.
- Khoảng 5–10 skin nhân vật, chọn và đồng bộ; quyền dùng/mở khóa chưa khóa.
- Chat, emoji, thông báo khoe cá và bảng xếp hạng bắt buộc trong v1.
- Loot map/nhặt đồ tạm để sau; vẫn giữ di chuyển quanh hồ.
- Thính là tiêu hao riêng với mồi, thuộc inventory/shop; giữ bốn slot hiện tại.
- Shop Gold và ledger trong playable. Gold/Gem giữ trong định hướng; chưa tự suy ra có shop Gem hoặc payment.

Giải đấu và payment thật kể cả sandbox để sau. V1 được hiểu là bản đầu đang mang nhãn v0.1, chưa tự đổi version release. Không thêm stamina, nông trại hoặc hệ ngày/đêm từ ảnh tham khảo vào v0.1.

## GD cần đặc tả trước triển khai phần phụ thuộc

Luồng dự kiến để viết acceptance: login → vào phòng → di chuyển/chọn ghế → kiểm tra vé/trang bị → câu → nhận kết quả → inventory/lịch sử; có chọn skin, chat/emoji, khoe cá và xem bảng xếp hạng, không có nhánh nhặt loot trong v1. Đây là khung mô tả, chưa chốt điều kiện chuyển trạng thái.

GD cần khóa: định nghĩa một lượt/vé, bắt đầu/kết thúc/hủy câu, khác biệt Idle/Manual và input, rời ghế/mất kết nối, nguồn Gold/vé/mồi khởi đầu khi không có loot, quyền skin, phạm vi/trigger/cooldown social, chỉ số/phạm vi/chu kỳ/đồng hạng ranking, túi đầy, thời hạn và phạm vi thính, tiêu hao mồi/thính, danh sách cá, rarity/cân nặng và thành tích.

Bảng tương thích cá với mồi/thính, phương pháp/cần, cỡ/kiểu lưỡi và dây phải tách các bước tiếp cận/cắn → mắc lưỡi → kéo cá. Không dùng cấp/giá trang bị để tự bảo đảm cá hiếm. Phase câu chi tiết còn thiếu, GD bổ sung dần: chuẩn bị → thả câu → chờ/tiếp cận → cắn → mắc → kéo → kết quả → tiếp tục/rời. Đây là khung đề xuất; mỗi phase cần entry/exit, input Idle/Manual, tiêu hao, thời gian, hủy/timeout/disconnect/retry và animation trước nghiệm thu. Công thức và số balance chưa khóa; không tự điền thành yêu cầu.

Server quyết định kết quả cá, tiền, vật phẩm và tài nguyên. Client hiển thị phản hồi/input; mock không phải kết quả server thật.
