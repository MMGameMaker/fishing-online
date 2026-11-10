# BE-C-08 — Test tải phòng

- **Worker:** Claude
- **Branch / PR:** chưa tạo nhánh/PR; thay đổi chưa commit trên working tree `main`
- **Ngày gửi review:** 2026-11-09 (chờ commit/PR theo yêu cầu người dùng)
- **Spec áp dụng:** SPEC_CHUNG v0.8, config `v0-test-2026-11-09-monitoring-05`

## Đã làm

- Console `FishingOnline.LoadTest` và script `server/run-load-test.ps1`: API thật (Kestrel, WebSocket) + PostgreSQL thật, 20 kết nối, mua 20 ghế khác nhau, mỗi kết nối 10 Move/giây trong 2 phút.

## File thay đổi

- `server/FishingOnline.LoadTest/*`
- `server/run-load-test.ps1`
- `server/FishingOnline.Api/Persistence/Migrations/*_BE_CoreGameplay*`
- `docs/v01/TIEN_DO.md` — dòng BE-C-08

## Lệnh kiểm tra đã chạy

```
dotnet restore server --locked-mode → exit 0
dotnet build server -warnaserror → 0 Warning, 0 Error
dotnet test server → Domain 159/159; Api 169/169, 0 Skipped (chạy lại 2026-11-10 sau BE-E-08) (PostgreSQL 17.6 portable, 127.0.0.1:55432)
powershell -File server/run-load-test.ps1 -Seconds 120
{"clients":20,"seconds":120,"movesSent":24000,"playerMovedReceived":456000,"errors":0,"errorKinds":{},"latencyMs":{"p50":0.79,"p95":1.7,"p99":3.14,"max":19.73},"serverCpuPercentOfMachine":0.5,"serverPeakWorkingSetMb":174.2,"logicalProcessors":8}
```

## Nghiệm thu

| Tiêu chí (chép từ task) | Kết quả | Bằng chứng |
| --- | --- | --- |
| Không lỗi | Đạt | 0 lỗi, 24000 Move, 456000 PlayerMoved nhận được |
| p95 Move → PlayerMoved < 150 ms trên máy local | Đạt | p50 0.79 ms, p95 1.7 ms, p99 3.14 ms, max 19.73 ms |
| Ghi số đo CPU/RAM vào báo cáo | Đạt | CPU Server 0.5% toàn máy (8 luồng), RAM đỉnh 174.2 MB |

## Lệch spec / giả định

- Tool và Server chạy cùng máy; Server chạy bản Debug, fsync của PostgreSQL tắt (chỉ để test).
- Ghế được mua xong mới đi lại trong roamRadius, nên mọi Move đều hợp lệ và đều được phát.

## Cần lead quyết

- Không có.

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
