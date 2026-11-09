# BE-B-01 — Project, model config, nạp fixture

- **Worker:** Claude
- **Branch / PR:** chưa tạo nhánh/PR; thay đổi chưa commit trên working tree `main` (có thay đổi của luồng khác đang mở)
- **Ngày gửi review:** 2026-11-09 (chờ commit/PR theo yêu cầu người dùng)
- **Spec áp dụng:** SPEC_CHUNG v0.5, config `v0-test-2026-11-09-monitoring-05`

## Đã làm

- Project `FishingOnline.Domain` (thư viện thuần, không package ngoài) và `FishingOnline.Domain.Tests`, net10.0, đã thêm vào `server/FishingOnline.slnx`.
- Record `GameplayConfig` và các record con khớp từng field của `gameplay-config.v0.json`.
- `GameplayConfigJson.Parse(string)` ở chế độ nghiêm: thiếu field, thừa field, null sai chỗ, rarity lạ đều ném `JsonException`. Thêm `Serialize` để kiểm tra round-trip và để BE-A-05 lưu config.

## File thay đổi

- `server/FishingOnline.Domain/*` — project và model config.
- `server/FishingOnline.Domain.Tests/*` — test; fixture được link từ `docs/v01/fixtures/`, không chép.
- `server/FishingOnline.slnx` — thêm 2 project, theo yêu cầu task.
- `docs/v01/TIEN_DO.md` — dòng BE-B-01.

## Lệnh kiểm tra đã chạy

```
dotnet restore server --locked-mode                → exit 0
dotnet build server -warnaserror                   → 0 Warning, 0 Error
dotnet test server/FishingOnline.Domain.Tests      → Total 10, Passed 10
dotnet test server                                 → Domain 10/10; Api 32 Passed, 1 Skipped (PostgreSQL cần Docker, thuộc BE-A-01)
```

## Nghiệm thu

| Tiêu chí (chép từ task) | Kết quả | Bằng chứng |
| --- | --- | --- |
| Test parse fixture, kiểm tra vài giá trị (Moonfin hp 160, Tier 1 unitPriceGold test 120, Lv10 expReq 440) | Đạt | `Parse_Fixture_ReadsAcceptanceValues` |
| Record khớp từng field của fixture (phần Spec) | Đạt | `Serialize_RoundTripsEveryFixtureField`: đọc rồi ghi lại bằng đúng fixture |
| Không tham chiếu ASP.NET, EF, Redis (quy định nhóm) | Đạt | `Domain_DoesNotReferenceInfrastructure` |

## Lệch spec / giả định

- `seatNumbers` `[1, 5]` được hiểu là khoảng gồm cả hai đầu, vì ba khoảng 1-5, 6-10, 11-20 phủ đủ 20 ghế. Model giữ nguyên mảng hai số như fixture; BE-A-05/BE-C-01 cần xử lý theo khoảng.
- `unitPriceGold` là chuỗi trong JSON (Gold theo contract) nhưng là `long` trong model. Các trường Gold khác của fixture là số và giữ nguyên.
- `perSeatOverrides` chưa có định dạng phần tử ở SPEC/fixture nên để JSON thô (`JsonElement`).
- `initialStock`, `depletionPolicy` đang là chữ `"not specified"` nên để `string`. Khi đổi sang số, parse sẽ báo lỗi và model phải cập nhật theo, đây là chủ ý.
- Chế độ nghiêm nghĩa là mọi field mới trong fixture cần thêm vào record tương ứng cùng lúc.

## Cần lead quyết

- Không có.

## Việc còn lại

- Không có trong phạm vi task. Cổng M0 còn cần review và kiểm chứng phần Client (CL-A-01, CL-A-02).

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
