# QA — Kiểm thử xuyên nhóm

Mục tiêu: kịch bản kiểm thử theo luật, chạy ở mỗi cổng tích hợp, độc lập với người viết code.
Đọc trước: [SPEC_CHUNG](../SPEC_CHUNG.md), [QA_RELEASE](../../../doc/QA_RELEASE.md), [QUY_TRINH](../QUY_TRINH.md).
Phạm vi file: `qa/`.
Độc lập: viết kịch bản từ spec ngay từ đầu, chưa cần mã.

---

### QA-01 Bộ ca kiểm thử theo luật
- **Độ lớn:** M. **Phụ thuộc:** không.
- **Spec:** `qa/cases/*.md`, mỗi ca: ID, luật nguồn (mục SPEC), điều kiện đầu, bước, kết quả mong đợi. Tối thiểu: ghế (tranh chấp, cooldown, rời ghế, hết lượt, reconnect 1 phút/2 phút 10 giây, restart), câu (mỗi nhánh của 2.6), minigame (mỗi rarity thắng/thua, báo success giả được chấp nhận nhưng result trùng/attempt giả/sai owner bị chặn), chiều dài (hiển thị, Mới/Kỷ lục), kinh tế (mua/bán/gửi lặp), level, social.
- **Nghiệm thu:** mỗi dòng "[Chốt]" trong SPEC mục 2 có ít nhất 1 ca.

### QA-02 E2E tự động với Playwright
- **Độ lớn:** L. **Phụ thuộc:** CL-A-06; sau đó Server thật.
- **Spec:** `qa/e2e/` Playwright chạy client-web; chế độ mock (chạy mọi lúc) và chế độ Server thật (dev bypass login). Kịch bản: vào hồ → mua vé → câu → thắng (bấm theo vị trí vùng đọc từ state test hook `window.__test`) → bán cá. 2 trình duyệt tranh ghế.
- **Nghiệm thu:** `npx playwright test --trace off` chạy xanh ở chế độ mock.

### QA-03 Chạy cổng tích hợp
- **Độ lớn:** S mỗi cổng. **Phụ thuộc:** theo cổng ở QUY_TRINH.
- **Spec:** chạy kịch bản demo của cổng, ghi `docs/v01/bao-cao/CONG-<Mx>.md`: môi trường, commit, ca đạt/không đạt, bug.
- **Nghiệm thu:** cổng chỉ được đánh dấu Đạt khi báo cáo này có và không còn bug mức Chặn.

### QA-04 E2E thả cá và đối soát quần thể
- **Độ lớn:** M. **Phụ thuộc:** AD-06/07, BE-E-08; Client vòng câu M3 và luật quần thể đã duyệt.
- **Spec:** Admin đặt lịch thả nhiều loài → đến giờ tăng tồn đúng → Player câu thành công → tồn giảm đúng 1, catch/EXP/history và bảng Admin cùng khớp. Kiểm tra hồ/loài cạn cá theo luật chốt; cạnh tranh cá cuối; failed/cancel/disconnect; batch retry, lịch hủy, server restart trước/sau commit; Admin trái quyền không thả được.
- **Nghiệm thu:** báo cáo E2E có đối soát số đầu + thả - bắt = số cuối, không số âm/đúp, không reservation sót; API/UI dùng cùng hồ và updatedAt. Bổ sung vào M4, kiểm tra recovery ở M5; chưa có runtime evidence thì không đánh dấu đạt.


**Ca ghế cập nhật:** mua 2 block, gia hạn 1 block, kiểm tra 3 block tổng; bấm lặp/cạnh tranh, thiếu Gold, priceVersion cũ, expired/leave race, reconnect/restart dùng expiresAt mới; gia hạn khi đang câu không reset attempt. Fixture không chứa chum hoặc UseChum.


**Minigame Client (M0 duyệt):** không yêu cầu Server đối chiếu thao tác. Kiểm tra mỗi attempt tối đa1 catch/EXP/giảm tồn dù callback/gửi lại/100request đổi key; timeout/cancel/failed không hồi sinh. Pool thả tiếp cộng dồn:30+100=130, cùng batch retry không cộng thêm, restart/publish không reset. Test concurrency/catch-stock và restore reservation.


**Anomaly monitoring BE:** kiểm tra rule/window/min sample, dedupe signal/attempt/event, retry hợp lệ không tăng risk, review audit; fake win accepted vẫn1 reward/attempt. Khi detector lỗi/dừng/restart, settlement không fail/rollback/thưởng lại. Cảnh báo không tự ban/reject hợp lệ hoặc gọi dịch vụ gửi thông báo ngoài.
