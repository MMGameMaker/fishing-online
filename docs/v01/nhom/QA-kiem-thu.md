# QA — Kiểm thử xuyên nhóm

Mục tiêu: kịch bản kiểm thử theo luật, chạy ở mỗi cổng tích hợp, độc lập với người viết code.
Đọc trước: [SPEC_CHUNG](../SPEC_CHUNG.md), [QA_RELEASE](../../../doc/QA_RELEASE.md), [QUY_TRINH](../QUY_TRINH.md).
Phạm vi file: `qa/`.
Độc lập: viết kịch bản từ spec ngay từ đầu, chưa cần mã.

---

### QA-01 Bộ ca kiểm thử theo luật
- **Độ lớn:** M. **Phụ thuộc:** không.
- **Spec:** `qa/cases/*.md`, mỗi ca: ID, luật nguồn (mục SPEC), điều kiện đầu, bước, kết quả mong đợi. Tối thiểu: ghế (tranh chấp, cooldown, rời ghế, hết lượt, reconnect 1 phút/2 phút 10 giây, restart), câu (mỗi nhánh của 2.6), minigame (mỗi rarity thắng/thua, tap giả), chiều dài (hiển thị, Mới/Kỷ lục), kinh tế (mua/bán/thính, gửi lặp), level, social.
- **Nghiệm thu:** mỗi dòng "[Chốt]" trong SPEC mục 2 có ít nhất 1 ca.

### QA-02 E2E tự động với Playwright
- **Độ lớn:** L. **Phụ thuộc:** CL-A-06; sau đó Server thật.
- **Spec:** `qa/e2e/` Playwright chạy client-web; chế độ mock (chạy mọi lúc) và chế độ Server thật (dev bypass login). Kịch bản: vào hồ → mua vé → câu → thắng (bấm theo vị trí vùng đọc từ state test hook `window.__test`) → bán cá. 2 trình duyệt tranh ghế.
- **Nghiệm thu:** `npx playwright test --trace off` chạy xanh ở chế độ mock.

### QA-03 Chạy cổng tích hợp
- **Độ lớn:** S mỗi cổng. **Phụ thuộc:** theo cổng ở QUY_TRINH.
- **Spec:** chạy kịch bản demo của cổng, ghi `docs/v01/bao-cao/CONG-<Mx>.md`: môi trường, commit, ca đạt/không đạt, bug.
- **Nghiệm thu:** cổng chỉ được đánh dấu Đạt khi báo cáo này có và không còn bug mức Chặn.
