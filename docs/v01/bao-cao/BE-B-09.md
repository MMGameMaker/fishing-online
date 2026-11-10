# BE-B-09 — Script mô phỏng balance

- **Worker:** Claude
- **Branch / PR:** chưa tạo nhánh/PR; thay đổi chưa commit trên working tree `main`
- **Ngày gửi review:** 2026-11-09 (chờ commit/PR theo yêu cầu người dùng)
- **Spec áp dụng:** SPEC_CHUNG v0.8 (chạy lại sau khi SPEC đổi luồng tự câu), config `v0-test-2026-11-09-monitoring-05`

## Đã làm

- Console `FishingOnline.Sim`, một lệnh sinh [BE-B-09-ket-qua.md](BE-B-09-ket-qua.md) cho GD:

  ```
  dotnet run --project server/FishingOnline.Sim
  ```

  Tùy chọn: `--sessions`, `--trials`, `--seed`, `--units`, `--config`, `--output`. Chạy khoảng 9 giây; cùng config và seed cho file giống hệt.
- Bốn nhóm bảng: tỷ lệ thắng rarity × level × cần; so sánh theo kỹ năng; số lần câu và Gold mỗi phiên theo Tier; thời gian lên Lv10.
- Mỗi lần câu chạy qua `FishingAttempt` thật (wait, chọn loài, Hook, thưởng, hủy khi hết phiên). Thời lượng = `units × billingUnitMinutes` từ config.
- Minigame dùng `ClientMinigameModel`, bản sao luật của `minigameCore.ts` chỉ để mô phỏng. Domain và Api không tham chiếu project này, nên Server vẫn không tính tap (SPEC 2.7).

## File thay đổi

- `server/FishingOnline.Sim/` (mới): `Program.cs`, `BalanceReport.cs`, `SessionSimulator.cs`, `PlayerModel.cs`, `ClientMinigameModel.cs`, csproj, lock file.
- `server/FishingOnline.Domain.Tests/BalanceSimTests.cs`, `FishingOnline.Domain.Tests.csproj`, lock file.
- `server/FishingOnline.slnx`.
- `docs/v01/bao-cao/BE-B-09-ket-qua.md` (sinh tự động), `docs/v01/TIEN_DO.md` — dòng BE-B-09.

## Lệnh kiểm tra đã chạy

```
dotnet restore server --locked-mode → exit 0
dotnet build server -warnaserror    → 0 Warning, 0 Error
dotnet test server                  → Domain 153/153; Api 32 Passed, 1 Skipped (PostgreSQL cần Docker, thuộc BE-A-01)
dotnet run --project server/FishingOnline.Sim → exit 0, ghi báo cáo
Chạy lại từ thư mục server, so hash → giống hệt
--sessions 0                        → exit 2, in hướng dẫn tùy chọn
```

## Nghiệm thu

| Tiêu chí (chép từ task) | Kết quả | Bằng chứng |
| --- | --- | --- |
| Chạy được bằng một lệnh | Đạt | Lệnh ở trên, chạy được từ gốc repo và thư mục `server` |
| Xuất Markdown vào `docs/v01/bao-cao/BE-B-09-ket-qua.md` cho GD | Đạt | File đã sinh; `Report_IsReproducible_AndHasEverySection` |
| Bảng tỷ lệ thắng rarity × level × cần | Đạt | 5 bảng, 10 level × 5 cần, 2000 ván mỗi ô |
| Số lần câu/phiên, Gold/phiên theo Tier | Đạt | 3 Tier × 3 thời lượng × 3 mốc người chơi, 500 phiên mỗi dòng |
| Thời gian lên Lv10 | Đạt | 3 Tier × 2 chiến lược cần, 500 lượt mỗi dòng |

Kiểm tra thêm: `ClientMinigameModel` khớp 85/85 tap được chấp nhận trong 15 vector của Client (`Model_MatchesEveryAcceptedTapInTheClientVectors`).

## Nhận xét từ số liệu (cho GD, chưa phải đề xuất đổi config)

Số dưới đây dùng mức kỹ năng giả định Trung bình.

- **Người mới không mua nổi Tier 1:** vé 120 Gold, khởi đầu 100 Gold. Bảng Lv10 ở Tier 1 vì vậy là 0%.
- **Tier đắt không có lợi về Gold cho người mới:** Lv1 lãi 218 Gold/10 phút ở Tier 1, 269 ở Tier 3. Lv10 + Giant Caster thì Tier 1 có lời hơn (938 và 867).
- **Lên Lv10 mất khoảng 39-44 phút giữ ghế,** khoảng 270 lần câu và 4-5 vé.
- **Legendary gần như không thắng được ở đầu game:** Lv1 + cần mặc định 1,2%; Lv10 + Giant Caster 73%.
- **Tỷ lệ thắng rất nhạy với sai số giả định:** Rare ở Lv1 là 13% với Mới chơi, 94% với Giỏi. Cần playtest để hiệu chỉnh trước khi dùng các số này chốt balance.

## Lệch spec / giả định

- **Mô hình "trúng theo độ rộng ± sai số":** làm bằng sai số thời điểm bấm theo phân phối chuẩn (100/60/30 ms). Xác suất trúng do đó phụ thuộc cả độ rộng vùng lẫn tốc độ kim.
- **Số giả định không có trong config:** thời gian nhắm lại 250 ms, người chơi chạm đóng popup sau 1 giây, luôn nhắm giữa vùng vàng. Thua chờ 2 giây theo SPEC 0.8 (`FAIL_HOLD_MS` của Client). Client tự quăng cần lại nên không còn thời gian bấm.
- **Bảng Gold giữ chỉ số cố định** trong phiên; bảng Lv10 mới cộng EXP và đổi level theo từng lần câu.
- **Chưa mô phỏng** tồn cá (SPEC chưa chốt), độ trễ mạng, cooldown ghế và thời gian giữa hai phiên.
- **Ngoài phạm vi file nhóm BE-B:** tạo `server/FishingOnline.Sim` (task yêu cầu) và thêm một dòng vào `FishingOnline.slnx`.
- Test link tới `client-v0/src/online/fishing/minigame-vectors.v0.json`; nếu Client chuyển file này thì phải sửa đường dẫn trong csproj test.

## Cần lead quyết

- Không có câu hỏi mới về luật. GD xem các nhận xét trên; giá vé và tồn cá vẫn là giá trị test/chưa chốt.

## Việc còn lại

- Không có trong phạm vi task. Chạy lại lệnh khi config đổi hoặc khi có số đo playtest.

---

## Review (reviewer điền)

- **Reviewer:** <tên>  **Ngày:** <yyyy-mm-dd>

| # | Kết quả | Ghi chú |
| --- | --- | --- |
| R1 Phạm vi | | |
| R2 Build/lint | | |
| R3 Test | | |
| R4 Nghiệm thu | | |
| R5 Contract | | |
| R6 Không hard-code | | |
| R7 Server quyết định | | |
| R8 Migration | | |
| R9 Báo cáo trung thực | | |
| R10 Lệch spec | | |

**Kết luận:** Đạt / Làm lại. <danh sách lỗi nếu Làm lại>
