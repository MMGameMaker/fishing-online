# Quy trình giao việc, kiểm tra kết quả và xác nhận tiến độ

Áp dụng cho mọi worker (người hoặc AI agent) làm task trong `docs/v01/nhom/`. Bổ sung cho [AGENTS.md](../../AGENTS.md) và [REPOSITORY.md](../../doc/REPOSITORY.md), không thay chúng.

## 1. Vai trò

| Vai trò | Việc |
| --- | --- |
| **Lead** | Giữ SPEC_CHUNG và fixture, giao task, quyết định thay đổi spec, chạy cổng tích hợp, cập nhật phần tổng của TIEN_DO |
| **Worker** | Làm 1 task một lúc, chỉ sửa file trong phạm vi nhóm, viết báo cáo |
| **Reviewer** | Người khác worker (lead, worker nhóm khác hoặc agent review riêng). Chạy checklist mục 4 |
| **GD** | Trả lời câu hỏi "CHỜ GD", duyệt số liệu |

Một agent không được review task của chính nó.

## 2. Trạng thái task

`Chưa nhận` → `Đang làm` → `Chờ review` → `Xong`
`Chờ review` → `Làm lại` → `Đang làm`
Bất kỳ → `Bị chặn` (ghi lý do và task/câu hỏi đang chặn)

Chỉ reviewer được chuyển sang `Xong`.

## 3. Worker làm một task

1. **Nhận:** chọn task `Chưa nhận` có mọi phụ thuộc `Xong` (hoặc phụ thuộc cho phép dùng bản giả theo ghi chú nhóm). Sửa dòng task trong [TIEN_DO.md](TIEN_DO.md): Người làm, `Đang làm`, ngày.
2. **Branch:** `v01/<TASK-ID>-<mo-ta-ngan>` từ nhánh chính mới nhất. Ví dụ `v01/BE-C-04-mua-ve`.
3. **Làm:** chỉ sửa file trong "Phạm vi file" của nhóm. Cần sửa file ngoài phạm vi → dừng, ghi vào báo cáo mục "Cần lead quyết".
4. **Spec chưa rõ hoặc sai:** không tự đổi SPEC_CHUNG. Làm theo cách hiểu hợp lý nhất, ghi rõ trong báo cáo mục "Lệch spec / giả định".
5. **Tự kiểm tra:** chạy đủ lệnh ở mục 5 và từng dòng "Nghiệm thu" của task.
6. **Báo cáo:** tạo `docs/v01/bao-cao/<TASK-ID>.md` theo [mẫu](bao-cao/_MAU.md). Ghi lệnh đã chạy và kết quả thật (dán output rút gọn). Không ghi "đạt" cho mục chưa chạy.
7. **Gửi review:** mở PR tên `[<TASK-ID>] <tên task>`, link báo cáo; chuyển TIEN_DO sang `Chờ review`.

### Prompt mẫu giao cho AI worker

```
Bạn là worker cho task <TASK-ID> của dự án Fishing Online, repo D:\Fishing-Online.
Đọc theo thứ tự: AGENTS.md, docs/v01/README.md, docs/v01/QUY_TRINH.md, docs/v01/SPEC_CHUNG.md,
docs/v01/nhom/<file nhóm>.md (chỉ task <TASK-ID>).
Làm đúng spec của task, chỉ sửa file trong phạm vi nhóm. Không sửa SPEC_CHUNG, fixture hay task khác.
Khi xong: chạy lệnh kiểm tra ở QUY_TRINH mục 5 và từng tiêu chí nghiệm thu, viết báo cáo
docs/v01/bao-cao/<TASK-ID>.md theo mẫu, cập nhật dòng của task trong TIEN_DO.md sang "Chờ review".
Gặp điểm spec không rõ: chọn cách hợp lý nhất, ghi vào mục "Lệch spec / giả định" của báo cáo.
```

## 4. Checklist reviewer

Reviewer ghi kết quả từng mục vào cuối báo cáo của task (mục "Review").

| # | Kiểm tra | Cách làm |
| --- | --- | --- |
| R1 | Đúng phạm vi | `git diff --stat main...` chỉ có file trong phạm vi nhóm + báo cáo + dòng TIEN_DO |
| R2 | Build và lint sạch | Chạy lệnh mục 5 của phần bị ảnh hưởng trên máy reviewer |
| R3 | Test tự động pass | Chạy lại, không tin output trong báo cáo |
| R4 | Nghiệm thu | Tự chạy từng dòng "Nghiệm thu" của task; dòng nào không tự động thì làm tay và ghi kết quả |
| R5 | Đúng contract | Tên field, kiểu, mã lỗi khớp SPEC mục 3-5 và `api-samples`; Client: type trong `contract.ts` |
| R6 | Không hard-code số balance | Giá, thời gian, tỷ lệ đọc từ config; tìm số như 600000, 120, 0.06 trong diff |
| R7 | Server quyết định | Client không tự cộng Gold/EXP/cá; Server không tin giá/kết quả client gửi |
| R8 | Migration | (BE) chạy trên DB trống và DB có dữ liệu của nhánh chính; chỉ 1 migration |
| R9 | Báo cáo trung thực | Mọi "đạt" có bằng chứng; mục chưa chạy ghi rõ |
| R10 | Lệch spec | Đọc mục "Lệch spec / giả định"; giả định ảnh hưởng nhóm khác → chuyển lead |

Kết luận: **Đạt** (merge, TIEN_DO → `Xong`) hoặc **Làm lại** (liệt kê mục lỗi, TIEN_DO → `Làm lại`). Lỗi nhỏ không ảnh hưởng nghiệm thu có thể Đạt kèm task con mới.

## 5. Lệnh kiểm tra chuẩn

| Phần | Lệnh |
| --- | --- |
| Server | `dotnet restore server --locked-mode` · `dotnet build server -warnaserror` · `dotnet test server` |
| Domain | `dotnet test server/FishingOnline.Domain.Tests` |
| Client | `cd client-web && npm ci && npm run lint && npm test && npm run build` |
| Admin | `cd admin && npm ci && npm run lint && npm test && npm run build` |
| E2E | `cd qa && npx playwright test --trace off` |

Khi có CI, các lệnh trên chạy tự động trên mỗi PR; reviewer vẫn chạy R4 bằng tay.

## 6. Thay đổi spec

1. Worker hoặc reviewer ghi đề xuất trong báo cáo (mục "Cần lead quyết").
2. Lead quyết: giữ spec, hoặc sửa SPEC_CHUNG/fixture.
3. Khi sửa: tăng phiên bản ở đầu SPEC_CHUNG (0.2 → 0.3), ghi một dòng vào mục "Lịch sử thay đổi" cuối file (ngày, mục, nội dung, nhóm bị ảnh hưởng), báo các nhóm bị ảnh hưởng qua TIEN_DO mục "Thông báo".
4. Thay đổi luật đã chốt (nhãn [Chốt]) cần người dùng/GD duyệt trước (theo AGENTS.md).

## 7. Cổng tích hợp và xác nhận tiến độ

Tiến độ được xác nhận bằng **cổng**, không bằng số task. Một cổng Đạt khi QA (hoặc lead) chạy kịch bản trên bản build thật và có báo cáo `bao-cao/CONG-<Mx>.md`.

| Cổng | Cần Xong | Kịch bản demo |
| --- | --- | --- |
| **M0 Spec** | SPEC_CHUNG được duyệt; BE-B-01, CL-A-01, CL-A-02 | Client parse được mọi fixture; Domain parse được config |
| **M1 Nền tảng** | BE-A-01..06, CL-A-01..07 | Login Google thật → đặt tên → `/me` có 100 Gold; client chạy mock trọn vòng |
| **M2 Hồ và ghế** | BE-C-01..07, BE-C-09, CL-B-02..06 | 2 trình duyệt vào hồ thấy nhau; tranh ghế đúng 1 người thắng; chọn thời lượng/gia hạn và chống trừ/cộng lặp; hết lượt/cooldown/reconnect đúng luật trên Server thật |
| **M3 Vòng câu** (mốc demo chính) | BE-B-01..08, BE-D-01..04, BE-D-06..07, BE-E-01..07, CL-C-01..05 | Login → mua vé → câu thắng/thua → thấy cá trong túi, EXP tăng → bán cá; người khác thấy icon cá |
| **M4 Đủ v1** | CL-D-*, SOC-*, AD-01..04, ART-02..05 | Mọi màn có art thật; chat/emoji/skin/ranking chạy; Admin đổi giá vé có hiệu lực |
| **M5 Phát hành** | QA-01..03, BE-C-08, test tải, kiểm tra giấy phép asset | Ma trận QA_RELEASE đạt, không còn bug Chặn |

**Báo cáo tiến độ** (lead cập nhật đầu TIEN_DO sau mỗi lần merge hoặc mỗi ngày làm việc): số task theo trạng thái của từng nhóm, cổng gần nhất đã Đạt, việc đang bị chặn và đang chờ ai.

## 8. Mức bug

| Mức | Ví dụ | Chặn cổng? |
| --- | --- | --- |
| Chặn | Mất tiền, cộng thưởng 2 lần, 2 người cùng ghế, crash | Có |
| Cao | Sai luật đã chốt, UI không dùng được | Có (với cổng chứa tính năng) |
| Thường | Hiển thị sai, thiếu hiệu ứng | Không |
| Thấp | Chính tả, căn lề | Không |
