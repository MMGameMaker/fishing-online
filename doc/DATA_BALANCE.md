# Cấu hình dữ liệu và balance

GD sở hữu luật và giá trị balance; BE sở hữu validation và thực thi; BE thực hiện cả Admin UI validate/publish; Client ánh xạ data với asset và hiển thị. Không duy trì công thức riêng khác nhau ở các ứng dụng.

## Dữ liệu cần đặc tả

| Nhóm | Trường/quan hệ cần làm rõ |
| --- | --- |
| Nhân vật | Level, EXP Req, Strength, Hit Zone Increase, Rare/Large Fish Luck |
| Cá | ID, rarity, khoảng chiều dài, HP, EXP, giá bán, tỷ lệ spawn |
| Cần câu | 5 loại, chỉ số, giá Gold, cần mặc định. Mồi/dây/lưỡi để sau |
| Thính | Tác dụng, giá Gold, thời hạn, không cộng dồn |
| Ghế/vé/shop | Tier ghế, buff, Lure Time, giá vé, hàng bán trong Shop, điều kiện mua/dùng, giới hạn |
| Minigame | Theo rarity: thời gian, tốc độ kim, vùng xanh/vàng gốc, mức trừ giờ, độ xê dịch |
| Skin | 5–10 ID và asset, quyền dùng/chọn; không tự thêm chỉ số/shop skin |
| Social/ranking | Emoji ID, trigger/phạm vi khoe cá, giới hạn; chỉ số/chu kỳ/đồng hạng/update time |
| Nguồn ban đầu | 100 Gold cho người chơi mới; không tự thêm quà ngày/nhiệm vụ |
| Loot — để sau | Chưa cấu hình spawn/nhặt trong v1 |
| Công thức | ATK và HP, random chiều dài, input Manual, thất bại và thưởng. Idle cập nhật sau |

Đây là danh mục thiết kế, chưa phải schema hoặc số balance đã duyệt. Số liệu tạm để test nằm ở [GAMEPLAY_SCOPE.md](GAMEPLAY_SCOPE.md). Mỗi trường cần kiểu, đơn vị, khoảng hợp lệ, mặc định và nguồn quyết định. ID ổn định; tên hiển thị có thể đổi mà không đổi ID.

## Quy trình thay đổi đề xuất

1. GD ghi phiên bản và lý do thay đổi, giá trị cũ/mới, tác động tới trải nghiệm và kinh tế.
2. BE kiểm tra ID trùng, tham chiếu thiếu, giá trị âm/ngoài khoảng, xác suất và tổng phân phối theo mô hình đã chốt; kiểm tra dữ liệu có thể khiến thưởng vô hạn hoặc tiêu hao sai.
3. Chạy mô phỏng/kịch bản cho công thức ngẫu nhiên với bộ data cụ thể. Ghi seed khi phù hợp, số mẫu và phân phối; mô phỏng không thay thế chơi thử.
4. Admin preview/validate trước publish, Server kiểm tra quyền và ghi người thao tác, thời gian, version, thay đổi. Không đưa secret vào audit.
5. Chốt thời điểm áp dụng: lượt đang câu dùng version nào, phiên đang mở làm gì, có rollback được không. Đây là quyết định cần thống nhất trước publish thật.
6. QA kiểm tra cấu hình được tải đúng, Client/Server cùng phiên bản theo contract và rollback hoạt động. Giữ phiên bản cũ để truy vết lịch sử/ledger.

Thay đổi schema cần kế hoạch tương thích và migration riêng. Không sửa lịch sử phần thưởng chỉ để khớp balance mới.
