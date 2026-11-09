# Asset pipeline 2D Pixel Art

Web Client chịu trách nhiệm Art/asset và tích hợp, không tách vai trò Art riêng. Nguồn có thể mua sẵn, import hoặc AI tạo; chỉ mua khi bộ asset/ngân sách đã được duyệt.

1. GD và Client liệt kê asset cho luồng được giao: map hồ/bờ/cầu/ghế, nhân vật đi/câu, 9 cá, cần câu, HUD, chọn skin/chat/emoji/khoe cá/ranking; loot map/FX nhặt đồ hoãn. Ghi kích thước hiển thị, trạng thái/animation cần dùng; ưu tiên placeholder để kiểm tra gameplay.
2. Chuẩn bị một skin mẫu đủ animation trước rồi mở rộng 5–10 skin; dùng chung pivot/sheet nếu phù hợp. Ước tính frame/ngày công và giả định có tại [kế hoạch Art](https://app.notion.com/p/40d5f439904b8102ad9ffb12a209e72a); không coi estimate là sản lượng đã có. Client đề xuất và khóa quy cách trước sản xuất hàng loạt: kích thước tile/sprite, tỉ lệ pixel, palette, hướng nhìn, pivot, frame rate, cách scale và kích thước atlas. Bộ này chưa ấn định con số.
3. Ghi nguồn, tác giả/nhà cung cấp, liên kết, giấy phép và hạn chế sử dụng cạnh asset. Asset AI cần ghi công cụ và kiểm tra điều kiện sử dụng. Ảnh concept/tham khảo không mặc nhiên có quyền dùng runtime.
4. Tách nguồn chỉnh sửa khỏi bản xuất runtime. Tên nhất quán, ví dụ `fish_<id>_idle.png`; map ID với data, không phụ thuộc tên hiển thị.
5. Xuất sprite/tileset/sheet có nền alpha phù hợp; kiểm tra frame, padding và pivot trước import. Nhập Cocos kèm `.meta`, cấu hình lọc/scale theo pixel art đã chốt; kiểm tra bleeding, viền alpha và atlas trên web build.
6. Kiểm tra animation tại kích thước chơi thật, các độ phân giải mục tiêu, phân lớp và điểm tương tác/collision. Không dùng vùng vẽ làm vùng tương tác nếu chưa kiểm tra.
7. Bàn giao trong phần Client: file nguồn/runtime, mapping ID, quy cách, quyền sử dụng, ảnh/video trong game, asset placeholder còn lại và kết quả kiểm tra.

Chỉ đánh dấu final sau khi tích hợp và kiểm tra build thật. Không coi một ảnh AI là sprite sheet/tileset hoặc animation runtime đã đạt.
