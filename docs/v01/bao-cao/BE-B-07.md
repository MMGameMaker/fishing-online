# BE-B-07 — Fixture params/kết quả minigame

- **Worker:** Claude
- **Branch / PR:** chưa tạo nhánh/PR; thay đổi chưa commit trên working tree `main`
- **Ngày gửi review:** 2026-11-09 (chờ commit/PR theo yêu cầu người dùng)
- **Spec áp dụng:** SPEC_CHUNG v0.5, config `v0-test-2026-11-09-monitoring-05`

## Đã làm

- `docs/v01/fixtures/minigame-vectors.v0.json`: 6 mẫu params + outcome, đủ 5 rarity, có success, failed, gửi ngay sau Hook (0 ms), gửi đúng deadline, gửi quá deadline. Không có bộ tap.
- Giá trị trong fixture tính tay từ bảng config và GAMEPLAY_SCOPE, rồi đối chiếu với `MinigameParams.Create`. Mẫu đầu trùng `AttemptUpdate minigame` trong `api-samples`.
- Harness cấp Domain `MinigameFixtureTests`: Start → bite → Hook → gửi outcome của mẫu → kiểm tra phase, reason, lỗi, số lần thưởng.

## File thay đổi

- `docs/v01/fixtures/minigame-vectors.v0.json`.
- `server/FishingOnline.Domain.Tests/MinigameFixtureTests.cs`, `FishingOnline.Domain.Tests.csproj`.
- `docs/v01/TIEN_DO.md` — dòng BE-B-07.

## Lệnh kiểm tra đã chạy

```
dotnet restore server --locked-mode → exit 0
dotnet build server -warnaserror    → 0 Warning, 0 Error
dotnet test server                  → Domain 142/142; Api 32 Passed, 1 Skipped (PostgreSQL cần Docker, thuộc BE-A-01)
```

## Nghiệm thu

| Tiêu chí (chép từ task) | Kết quả | Bằng chứng |
| --- | --- | --- |
| Harness gửi được kết quả theo attempt đã Hook | Đạt ở cấp Domain | `Outcome_SentAfterHook_EndsAsTheSampleExpects` (6 mẫu). Gửi qua hub thật thuộc BE-E-03, chưa có |
| Params parse được | Đạt | `Hook_ProducesTheParamsInTheSample`, parse nghiêm (thiếu/thừa field là lỗi) |
| Không có per-tap Server endpoint | Đạt | Tìm `tap`/`replay` trong `server/FishingOnline.Api/**/*.cs`: không có kết quả; `Domain_HasNoPerTapOrReplayLogic` |

## Lệch spec / giả định

- Test `Fixture_MatchesCurrentConfig_...` cố ý báo đỏ khi `configVersion` đổi, để fixture được tính lại theo config mới.

## Cần lead quyết

- **Trùng tên file:** `nhom/BE-B-luat-cau-ca.md` và `README.md:21` giao `minigame-vectors.v0.json` cho BE-B-07, còn SPEC mục 7 và `nhom/CL-C` ghi đây là vector TS của CL-C. Vector TS thật đang ở `client-v0/src/online/fishing/`, nên hiện chưa đụng nhau. Mình đặt theo phạm vi file của BE-B và ghi rõ trong `purpose`. Đề xuất: sửa SPEC mục 7 cho khớp, hoặc đổi tên fixture này.

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
