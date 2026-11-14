# Cấu hình dữ liệu và balance

GD sở hữu luật và giá trị balance; BE sở hữu validation và thực thi; BE thực hiện cả Admin UI validate/publish; Client ánh xạ data với asset và hiển thị. Không duy trì công thức riêng khác nhau ở các ứng dụng.

## Dữ liệu cần đặc tả

| Nhóm | Trường/quan hệ cần làm rõ |
| --- | --- |
| Nhân vật | Level, EXP Req, Strength, Hit Zone Increase, Rare/Large Fish Luck |
| Cá | ID, rarity, khoảng chiều dài, HP, EXP, giá bán, tỷ lệ spawn |
| Cần câu | 5 loại, chỉ số, giá Gold, cần mặc định. Mồi/dây/lưỡi để sau |
| Vé/ghế/shop | Thời lượng mỗi vé, đơn giá vé chung, số vé tối đa mỗi lần mua và tổng thời gian tối đa; 20 vị trí ngồi (không Tier, không buff); hàng bán trong Shop, điều kiện mua/dùng, giới hạn |
| Minigame | Theo rarity: thời gian, tốc độ kim, vùng xanh/vàng gốc, mức trừ giờ, độ xê dịch |
| Skin | 5–10 ID và asset, quyền dùng/chọn; không tự thêm chỉ số/shop skin |
| Social/ranking | Chat tối đa 160 ký tự, bong bóng 10 giây, thông báo loài mới chạy 3 lần cho tất cả user, mỗi con cá share 1 lần (GD 2026-11-13); lịch sử chat 50 tin, mỗi user gửi cách nhau tối thiểu 2 giây; emoji ID, phạm vi khoe cá, cooldown; bảng xếp hạng tuần (số cá, thưởng top 50 từ 400 tới 50 Gold) và Giải đấu cần thủ (điểm theo độ hiếm 1/6/10/20/50, cá vương miện gấp đôi, tỷ lệ vương miện Admin đặt theo loài, thưởng top 20 từ 500 Gold + danh hiệu tới 100 Gold) (GD 2026-11-14, số tạm để test); làm mới 30 phút; thêm vào mô phỏng kinh tế |
| Thành tựu | 8 thành tựu × 5 mốc, thưởng mỗi mốc 100 Gold (GD 2026-11-13, số tạm để test); thêm vào mô phỏng kinh tế vì là nguồn Gold mới |
| Nguồn ban đầu | 100 Gold cho người chơi mới; không tự thêm quà ngày/nhiệm vụ |
| Loot — để sau | Chưa cấu hình spawn/nhặt trong v1 |
| Công thức | ATK và HP, random chiều dài, input Manual, thất bại và thưởng. Idle: nhịp tự bấm, giới hạn và thưởng (chờ GD chốt) |

Đây là danh mục thiết kế, chưa phải schema hoặc số balance đã duyệt. Số liệu tạm để test nằm ở [GAMEPLAY_SCOPE.md](GAMEPLAY_SCOPE.md). Mỗi trường cần kiểu, đơn vị, khoảng hợp lệ, mặc định và nguồn quyết định. ID ổn định; tên hiển thị có thể đổi mà không đổi ID.

## Quy trình thay đổi đề xuất

1. GD ghi phiên bản và lý do thay đổi, giá trị cũ/mới, tác động tới trải nghiệm và kinh tế.
2. BE kiểm tra ID trùng, tham chiếu thiếu, giá trị âm/ngoài khoảng, xác suất và tổng phân phối theo mô hình đã chốt; kiểm tra dữ liệu có thể khiến thưởng vô hạn hoặc tiêu hao sai.
3. Chạy mô phỏng/kịch bản cho công thức ngẫu nhiên với bộ data cụ thể. Ghi seed khi phù hợp, số mẫu và phân phối; mô phỏng không thay thế chơi thử.
4. Admin preview/validate trước publish, Server kiểm tra quyền và ghi người thao tác, thời gian, version, thay đổi. Không đưa secret vào audit.
5. Chốt thời điểm áp dụng: lượt đang câu dùng version nào, phiên đang mở làm gì, có rollback được không. Đây là quyết định cần thống nhất trước publish thật.
6. QA kiểm tra cấu hình được tải đúng, Client/Server cùng phiên bản theo contract và rollback hoạt động. Giữ phiên bản cũ để truy vết lịch sử/ledger.

Thay đổi schema cần kế hoạch tương thích và migration riêng. Không sửa lịch sử phần thưởng chỉ để khớp balance mới.

Cập nhật user 2026-11-09: bỏ thính; đơn giá ghế theo block thời gian và gia hạn, không khóa 10 phút/phiên. 100/200 Gold là ví dụ. Giá 120/70/40 trong fixture chỉ là test kế thừa; min/max thời lượng và bảng giá cuối chờ duyệt.

Cập nhật GD 2026-11-10: vé không gắn ghế, một đơn giá chung × số lượng; bỏ Tier ghế, buff ghế (Luck, Lure Time), giá theo ghế và cooldown. Luck tối đa còn +6. Giá test mới 50 Gold/vé 10 phút, mỗi lần mua tối đa 60 phút (6 vé), mua thêm khi còn vé vẫn cộng đủ dù tổng vượt 60 phút (tạm để test). Cập nhật GD 2026-11-13: tổng thời gian vé còn lại tối đa 24 giờ, mua vượt thì chặn. Giá 120/70/40 theo Tier không còn dùng; kết quả mô phỏng BE-B-09 dựa trên Tier cần chạy lại, thêm trường hợp Idle.
