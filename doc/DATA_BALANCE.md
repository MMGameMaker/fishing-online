# Cấu hình dữ liệu và balance

GD sở hữu luật và giá trị balance; BE sở hữu validation và thực thi; Admin cung cấp UI validate/publish; Client ánh xạ data với asset và hiển thị. Không duy trì công thức riêng khác nhau ở các ứng dụng.

## Dữ liệu cần đặc tả

| Nhóm | Trường/quan hệ cần làm rõ |
| --- | --- |
| Cá | ID, rarity, khoảng cân nặng, điều kiện xuất hiện và tương thích |
| Trang bị | Rod/Line/Hook/Bait, chỉ số, yêu cầu dùng, tiêu hao |
| Thính | Tác dụng, thời hạn, phạm vi, tương tác với mồi |
| Vé/shop | Đơn vị, giá Gold, điều kiện mua/dùng, giới hạn |
| Loot | Loại thưởng, lượng, vị trí, thời điểm xuất hiện/hết hạn, quyền nhặt |
| Công thức | Các bước cắn/mắc/kéo, input Manual/Idle, thất bại và thưởng |

Đây là danh mục thiết kế, chưa phải schema hoặc số balance đã duyệt. Mỗi trường cần kiểu, đơn vị, khoảng hợp lệ, mặc định và nguồn quyết định. ID ổn định; tên hiển thị có thể đổi mà không đổi ID.

## Quy trình thay đổi đề xuất

1. GD ghi phiên bản và lý do thay đổi, giá trị cũ/mới, tác động tới trải nghiệm và kinh tế.
2. BE kiểm tra ID trùng, tham chiếu thiếu, giá trị âm/ngoài khoảng, xác suất và tổng phân phối theo mô hình đã chốt; kiểm tra dữ liệu có thể khiến thưởng vô hạn hoặc tiêu hao sai.
3. Chạy mô phỏng/kịch bản cho công thức ngẫu nhiên với bộ data cụ thể. Ghi seed khi phù hợp, số mẫu và phân phối; mô phỏng không thay thế chơi thử.
4. Admin preview/validate trước publish, Server kiểm tra quyền và ghi người thao tác, thời gian, version, thay đổi. Không đưa secret vào audit.
5. Chốt thời điểm áp dụng: lượt đang câu dùng version nào, phiên đang mở làm gì, có rollback được không. Đây là quyết định cần thống nhất trước publish thật.
6. QA kiểm tra cấu hình được tải đúng, Client/Server cùng phiên bản theo contract và rollback hoạt động. Giữ phiên bản cũ để truy vết lịch sử/ledger.

Thay đổi schema cần kế hoạch tương thích và migration riêng. Không sửa lịch sử phần thưởng chỉ để khớp balance mới.
