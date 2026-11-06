# QA và phát hành

Chưa có build hay CI được kiểm chứng tại thời điểm tạo hướng dẫn. Team chọn trình duyệt, thiết bị, số kết nối đồng thời và ngưỡng hiệu năng mục tiêu trước nghiệm thu; 20 ghế/phòng không tự chứng minh server chịu tải nhiều phòng.

## Ma trận kiểm tra tối thiểu theo phạm vi đã triển khai

| Luồng | Kiểm tra |
| --- | --- |
| Login/phòng/ghế | Auth hết hạn, phòng đủ 20 ghế, hai người tranh một ghế, rời/vào lại |
| Di chuyển/skin | Biên map, chọn/lưu/đồng bộ 5–10 skin, animation/hướng/pivot; reconnect và 20 avatar |
| Social/ranking | Chat/emoji đúng phạm vi và giới hạn; khoe catch thật không giả/lặp; bảng điểm đúng luật/phân trang/update time |
| Câu Idle/Manual | Điều kiện trang bị/vé, input hợp lệ/sai, thành công/thất bại/hủy theo luật GD |
| Inventory/shop | Thiếu Gold/vật phẩm, gửi lặp, request đồng thời, không âm hoặc cộng thưởng trùng |
| Mạng/persistence | Timeout, mất mạng/reconnect, event trễ/trùng, reload, restart và đồng bộ lại |
| Admin/data | Phân quyền, dữ liệu sai, publish/audit, phiên bản cấu hình và rollback |
| Hình ảnh/web | Pixel art/atlas, animation, HUD/input và tải asset trên thiết bị mục tiêu |

Mỗi ca có precondition, data/version, bước làm, kết quả mong đợi và bằng chứng. Bug ghi build, môi trường, mức ảnh hưởng, bước tái hiện, expected/actual; che token và dữ liệu cá nhân. Mock chỉ xác nhận luồng mock, không xác nhận tích hợp.

Loot map tạm hoãn, không phải gate v1. Phase câu còn bổ sung dần; chỉ nghiệm thu các luật đã được xác nhận, phân biệt mock và Server thật.

## Trước phát hành

1. Xác nhận acceptance áp dụng đã đạt và lỗi chặn đã xử lý hoặc được người có thẩm quyền chấp nhận rõ.
2. Build từ revision xác định với phiên bản công cụ/lockfile đã khóa; chạy kiểm tra tự động phù hợp và smoke test trên bản build thật.
3. Kiểm tra HTTPS, biến môi trường, origin/CORS, quyền Admin, cấu hình kết nối và migration bằng cấu hình triển khai thực tế; không ghi giá trị secret vào checklist.
4. Sao lưu và kiểm tra khả năng phục hồi dữ liệu trước migration có rủi ro. Chuẩn bị bản ứng dụng/config trước đó và người quyết định rollback; rollback app không tự đảo được migration dữ liệu.
5. Ghi release version, revision, config version, migration, thay đổi người chơi thấy, hạn chế và cách khôi phục. Theo quy trình quyền phát hành của dự án.
6. Sau triển khai smoke test login → phòng → ghế → câu → nhận thưởng, skin/social/ranking và Admin theo tính năng có thật; kiểm tra lỗi, disconnect, ledger. Nếu sai tài nguyên hoặc dữ liệu, dừng luồng ảnh hưởng và xử lý/khôi phục theo kế hoạch đã thống nhất.

Đóng việc chỉ khi các vai trò áp dụng đã đạt; báo riêng phần chưa kiểm tra và bước tiếp theo, không ghi “Xong” dựa trên tài liệu hoặc mock.
