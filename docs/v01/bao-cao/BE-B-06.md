# BE-B-06 — Chuẩn bị params minigame cho Client

- **Worker:** Claude
- **Branch / PR:** chưa tạo nhánh/PR; thay đổi chưa commit trên working tree `main`
- **Ngày gửi review:** 2026-11-09 (chờ commit/PR theo yêu cầu người dùng)
- **Spec áp dụng:** SPEC_CHUNG v0.5, config `v0-test-2026-11-09-monitoring-05`

## Đã làm

- `MinigameParams.Create(minigameConfig, fish, stats, seed, startedAt)` đủ 12 field theo SPEC 2.7; `deadlineAt = startedAt + durationMs + resultGraceMs`.
- Độ rộng vùng theo GAMEPLAY_SCOPE: `gốc/100 × (1 + hitZonePct/100)`, xanh chặn ở 1, vàng không rộng hơn xanh. Cùng công thức với mock Client (`client-v0/src/online/mock/rules.ts`).
- Không có C# ApplyTap, replay, kiểm tra trúng/thắng.

## File thay đổi

- `server/FishingOnline.Domain/Rules/MinigameParams.cs`.
- `server/FishingOnline.Domain.Tests/MinigameParamsTests.cs`.
- `docs/v01/TIEN_DO.md` — dòng BE-B-06.

## Lệnh kiểm tra đã chạy

```
dotnet restore server --locked-mode → exit 0
dotnet build server -warnaserror    → 0 Warning, 0 Error
dotnet test server                  → Domain 142/142; Api 32 Passed, 1 Skipped (PostgreSQL cần Docker, thuộc BE-A-01)
```

## Nghiệm thu

| Tiêu chí (chép từ task) | Kết quả | Bằng chứng |
| --- | --- | --- |
| Params từng rarity khớp config/stats | Đạt | `Level1_UsesBaseValuesOfTheRarity` (5 rarity), `HitZoneIncrease_WidensZones_AndAtkIsStrength` |
| Duration dương | Đạt | `EveryCombination_HasPositiveDuration_AndZonesInsideTheBar` (mọi loài × level × cần), `NonPositiveDuration_IsRejected` |
| Zone nằm [0,1] | Đạt | Như trên, `HugeIncrease_IsClampedToTheBar_AndYellowStaysInsideGreen` |
| Không nhận quantity/species/EXP từ Client | Đạt | `ClientReport_CarriesOnlyTheOutcome`: `ReportOutcome` chỉ nhận outcome và thời điểm Server |
| Không có ApplyTap/replay | Đạt | `Domain_HasNoPerTapOrReplayLogic` |

## Lệch spec / giả định

- Chữ ký truyền `Fish` thay vì rarity riêng, vì `fishHp` lấy theo loài.
- JSON có đúng 12 key của contract khi dùng tùy chọn web mặc định (`Json_HasExactlyTheContractFields`); `seed` giữ đủ uint32.

## Cần lead quyết

- SPEC mục 6 (dòng ghi chú Domain) còn nhắc `MinigameEngine`, không còn đúng từ v0.5.

## Việc còn lại

- Không có trong phạm vi task.

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
