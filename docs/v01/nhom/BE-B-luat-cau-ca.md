# BE-B — Luật câu cá (thư viện thuần)

Mục tiêu: toàn bộ công thức và máy trạng thái câu cá nằm trong một thư viện C# không có I/O, test được 100% bằng unit test. BE-E chỉ việc gọi.
Đọc trước: [SPEC_CHUNG](../SPEC_CHUNG.md) mục 2; `fixtures/gameplay-config.v0.json`.
Phạm vi file: `server/FishingOnline.Domain/`, `server/FishingOnline.Domain.Tests/`, `docs/v01/fixtures/minigame-vectors.v0.json`.
Độc lập với: mọi nhóm. Không tham chiếu ASP.NET, EF, Redis.

Quy tắc chung: mọi random đi qua interface `IRandomSource { double NextDouble(); int NextInt(int minInclusive, int maxInclusive); }` để test cố định được. Config truyền vào dạng record `GameplayConfig` (BE-B định nghĩa trong Domain, BE-A tái dùng).

---

### BE-B-01 Project, model config, nạp fixture
- **Độ lớn:** S. **Phụ thuộc:** không.
- **Spec:** tạo 2 project net10.0, thêm vào solution. Record `GameplayConfig` và các record con khớp từng field của `gameplay-config.v0.json`. Hàm `GameplayConfigJson.Parse(string)`.
- **Nghiệm thu:** test parse fixture, kiểm tra vài giá trị (Moonfin hp 160, Tier 1 vé 120, Lv10 expReq 440).

### BE-B-02 Bảng level và chỉ số
- **Độ lớn:** S. **Phụ thuộc:** BE-B-01.
- **Spec:** `LevelTable.LevelForExp(int totalExp)`, `ExpToNext(int totalExp)` (0 ở Lv10). `StatCalculator.Compute(level, rod, seatTier?) → Stats` theo SPEC 2.4, `largeLuck` chặn 7.
- **Nghiệm thu:** exp 0→Lv1; 39→Lv1; 40→Lv2; 110→Lv3; 1850→Lv10; 99999→Lv10. Lv10 + Giant Caster + Tier 1: strength 33, largeLuck 7, rareLuck 7.

### BE-B-03 Thời gian chờ cá cắn
- **Độ lớn:** S. **Phụ thuộc:** BE-B-01.
- **Spec:** `FishingRules.WaitMs(IRandomSource, int seatLureMs, bool chumActive) = NextInt(3000, 6000) − seatLureMs − (chum ? 1000 : 0)`.
- **Nghiệm thu:** 10.000 mẫu Tier 1 + thính nằm trong [1000, 4000]; Tier 3 không thính trong [3000, 6000].

### BE-B-04 Chọn loài
- **Độ lớn:** S. **Phụ thuộc:** BE-B-01.
- **Spec:** `SpawnPicker.Pick(IRandomSource, config, int rareLuck) → speciesId` theo SPEC 2.8. Nếu `rareLuckMode = "none"` bỏ qua rareLuck. Để sẵn điểm mở rộng `IRareLuckModel`.
- **Nghiệm thu:** 100.000 mẫu, tỷ lệ mỗi rarity lệch ≤ 0,5 điểm % so với 60/25/10/4/1; trong common mỗi loài khoảng 1/3.

### BE-B-05 Random chiều dài
- **Độ lớn:** S. **Phụ thuộc:** BE-B-01.
- **Spec:** `LengthRoller.Roll(IRandomSource, Fish fish, int largeLuck) → (int lengthTenthCm, string tierId)` theo SPEC 2.9. Dùng số nguyên bp để chọn bậc: `r = NextInt(0, 9999)`, so tích lũy.
- **Nghiệm thu:** L=0: 100.000 mẫu tỷ lệ 70/25/4,9/0,1 (lệch ≤ 0,5 điểm); L=7: 56/35,5/8,4/0,1. Bậc max cho đúng `maxTenthCm`. Mọi kết quả nằm trong [min, max]. Ví dụ cố định: Minnow, pos 0.5 → 150.

### BE-B-06 Minigame engine
- **Độ lớn:** M. **Phụ thuộc:** BE-B-01, BE-B-02.
- **Spec:**
  - `Mulberry32` đúng SPEC 2.7. Test: seed 123456789, 5 giá trị đầu khớp giá trị tham chiếu ở SPEC 2.7.
  - `MinigameParams.Create(config, rarity, Stats, uint seed)` tính greenWidth, yellowWidth.
  - `MinigameState` có `Hp`, `PenaltyMs`, `TapSeq`, `LastTapMs`, `GreenStart`, `YellowStart`, `Outcome`. `ApplyTap(int seq, int tMs, int serverElapsedMs) → TapResult { Accepted, RejectReason, Kind, Hp, RemainingMs }` theo thuật toán và luật xác thực SPEC 2.7. Tap bị từ chối không tiêu RNG.
  - `CheckTimeout(int serverElapsedMs)`.
- **Nghiệm thu:** tap đúng vùng vàng trừ 2×atk; ranh giới vùng (p đúng bằng mép) tính là trúng; trượt cộng penalty; tMs lùi → từ chối; tMs vượt serverElapsed + 300 → từ chối; HP về 0 → `Won`; quá hạn → `Lost`. Vùng xanh không bao giờ ra ngoài [0,1].

### BE-B-07 Bộ test vector minigame
- **Độ lớn:** S. **Phụ thuộc:** BE-B-06.
- **Spec:** công cụ console hoặc test sinh `docs/v01/fixtures/minigame-vectors.v0.json`: 20 kịch bản (4 mỗi rarity, có cả atk/zone khác nhau), mỗi kịch bản: params, danh sách tap `{seq, tMs, serverElapsedMs}`, kết quả mong đợi từng tap `{accepted, kind, hp, remainingMs, greenStart, yellowStart}` và outcome cuối. Có kịch bản thắng, thua do hết giờ, có tap bị từ chối.
- **Nghiệm thu:** test C# đọc lại file và khớp 100%; CL-C dùng cùng file cho bản TS.

### BE-B-08 Máy trạng thái lần câu
- **Độ lớn:** M. **Phụ thuộc:** BE-B-03 đến BE-B-06.
- **Spec:** `FishingAttempt` thuần (không timer thật; nhận `now` từ ngoài):
  - `Start(now, waitMs)` → `waiting`, `BiteAt = now + waitMs`.
  - `Tick(now)`: waiting quá BiteAt → `bite`, chốt loài, `BiteDeadline = BiteAt + 3000`; bite quá `BiteDeadline + 300` → `failed/missed_bite`; minigame quá hạn → `failed/timeout`.
  - `Hook(now)`: chỉ trong bite và `now ≤ BiteDeadline + 300` → `minigame` với seed mới.
  - `Tap(...)` ủy quyền cho MinigameState; thắng → `success` và gọi `LengthRoller`.
  - `Cancel(reason)` ở mọi trạng thái chưa kết thúc.
  - Trả danh sách sự kiện domain (`PhaseChanged`, `Succeeded{speciesId, length, exp}`) để BE-E phát event và ghi DB.
  - Có `Snapshot()`/`Restore()` để BE-E lưu và khôi phục khi restart.
- **Nghiệm thu:** test từng chuyển trạng thái hợp lệ/không hợp lệ; Hook 2 lần → lần 2 lỗi; Cancel sau success không đổi gì; Restore từ snapshot cho kết quả giống hệt khi tiếp tục.

### BE-B-09 Script mô phỏng balance
- **Độ lớn:** S. **Phụ thuộc:** BE-B-08.
- **Spec:** console `FishingOnline.Sim`: mô phỏng N phiên 10 phút với mô hình người chơi (thời gian phản ứng bite 400-1200 ms, xác suất tap trúng vùng theo độ rộng ± sai số). Xuất bảng: tỷ lệ thắng theo rarity × level × cần; số lần câu/phiên; Gold kiếm được/phiên theo Tier; thời gian lên Lv10.
- **Nghiệm thu:** chạy được bằng một lệnh, xuất Markdown vào `docs/v01/bao-cao/BE-B-09-ket-qua.md` cho GD.
