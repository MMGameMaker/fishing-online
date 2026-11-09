# BE-B-02 — Bảng level và chỉ số

- **Worker:** Claude
- **Branch / PR:** chưa tạo nhánh/PR; thay đổi chưa commit trên working tree `main`
- **Ngày gửi review:** 2026-11-09 (chờ commit/PR theo yêu cầu người dùng)
- **Spec áp dụng:** SPEC_CHUNG v0.5, config `v0-test-2026-11-09-monitoring-05`

## Đã làm

- `LevelTable`: `LevelForExp`, `ExpToNext` (0 ở level cao nhất), theo EXP tích lũy SPEC 2.5.
- `StatCalculator.Compute(level, rod, seatTier?)` → `Stats` theo SPEC 2.4; chặn luck bằng `spawn.maxRareLuck`, `lengthTiers.maxLargeLuck`.

## File thay đổi

- `server/FishingOnline.Domain/Rules/LevelTable.cs`, `StatCalculator.cs`.
- `server/FishingOnline.Domain.Tests/LevelAndStatTests.cs`, `TestSupport.cs`.
- `docs/v01/TIEN_DO.md` — dòng BE-B-02.

## Lệnh kiểm tra đã chạy

```
dotnet restore server --locked-mode → exit 0
dotnet build server -warnaserror    → 0 Warning, 0 Error
dotnet test server                  → Domain 70/70; Api 32 Passed, 1 Skipped (PostgreSQL cần Docker, thuộc BE-A-01)
```

## Nghiệm thu

| Tiêu chí (chép từ task) | Kết quả | Bằng chứng |
| --- | --- | --- |
| exp 0→Lv1; 39→Lv1; 40→Lv2; 110→Lv3; 1850→Lv10; 99999→Lv10 | Đạt | `LevelForExp_UsesCumulativeRequirement` |
| Lv10 + Giant Caster + Tier 1: strength 33, largeLuck 7, rareLuck 7 | Đạt | `Level10_GiantCaster_Tier1` |

## Lệch spec / giả định

- `LevelTable` và `StatCalculator` là instance tạo từ config, để mức chặn 7 và bảng level không bị ghi cứng (R6). Chữ ký `Compute(level, rod, seatTier?)` giữ như spec.
- `ExpToNext` là số EXP còn thiếu, theo mẫu `api-samples` (exp 5 → 35).
- EXP âm ném `ArgumentOutOfRangeException`.

## Cần lead quyết

- Không có.

## Việc còn lại

- Không có.

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
