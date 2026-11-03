# Repo, branch, commit và PR

## Hiện trạng và cấu trúc đề xuất

Lúc thiết lập tài liệu, repo đích chỉ có `.git`; chưa xác nhận có mã nguồn, build hoặc CI. `doc/` chứa hướng dẫn theo yêu cầu. Khi khởi tạo mã, có thể dùng `client/`, `server/`, `admin/`; giữ `docs/` cho nguồn quyết định và phối hợp nếu hệ tài liệu đó được đưa vào repo. Chốt đường dẫn thực tế khi khởi tạo, không tạo thêm tầng tài liệu nếu nguồn hiện tại đủ dùng.

Khóa patch Cocos 3.8.x, phiên bản .NET/Node/package manager và lockfile trong repo. README của từng ứng dụng phải ghi cách chạy, biến môi trường mẫu và cách kiểm tra. Không commit `.env` thật, token, mật khẩu, build/cache hay dữ liệu cá nhân. Giữ file `.meta` của Cocos cùng asset; không đổi UUID tùy tiện.

## Quy ước đề xuất

- Giữ nhánh chính có thể build. Branch ngắn theo việc: `feat/W01-login`, `fix/S03-seat-race`, `docs/workflow`.
- Commit một ý, ví dụ `feat(client): add seat selection (W03)`; dùng `feat`, `fix`, `docs`, `refactor`, `test`, `chore`. ID phải đúng việc thực tế, ví dụ ở đây không gán tên chính thức cho backlog.
- Trước sửa: kiểm tra trạng thái và file đang thay đổi. Không reset, clean hoặc bỏ sửa của người khác. Không force push nhánh chung.
- PR nhỏ theo phạm vi; dẫn file việc và quyết định. Nêu hành vi trước/sau, phần thay đổi, kiểm tra thực tế, ảnh/video nếu có UI, tác động contract/data và cách khôi phục.
- Chủ phần bị ảnh hưởng review; thay đổi contract cần Client/BE và Admin nếu áp dụng cùng xác nhận. GD review luật, QA review bằng chứng nghiệm thu.
- Merge khi kiểm tra bắt buộc của repo đạt, review đã xử lý và dependency rõ. Cách merge/protection cụ thể do team cấu hình, chưa được bộ tài liệu này thiết lập.

Binary lớn nên dùng cơ chế lưu trữ phù hợp đã thống nhất; kiểm tra giới hạn hosting trước khi chọn Git LFS. Không đưa asset thiếu quyền sử dụng vào bản phát hành.
