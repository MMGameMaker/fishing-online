# Bộ tài liệu triển khai v0.1 cho nhiều worker

**Trạng thái: Đề xuất 2026-11-09, chờ duyệt.** Tổng hợp từ [GAMEPLAY_SCOPE.md](../../doc/GAMEPLAY_SCOPE.md) (bản client Phaser + TypeScript) và hiện trạng repo. Bộ này để nhiều worker (người hoặc AI agent) làm song song mà không cần đọc lịch sử chat. Khi được duyệt, đây là nguồn giao việc cho v0.1; backlog Notion giữ vai trò tham chiếu ID.

## Đọc theo thứ tự

1. [AGENTS.md](../../AGENTS.md): quy tắc chung của repo.
2. File này: bản đồ nhóm và phụ thuộc.
3. [QUY_TRINH.md](QUY_TRINH.md): nhận task, báo cáo, review, cổng tích hợp.
4. [SPEC_CHUNG.md](SPEC_CHUNG.md): luật viết thành công thức, contract HTTP/SignalR, mã lỗi, interface giữa module, quyền sửa file.
5. File nhóm của task được giao trong `nhom/`.

## Thành phần

| File | Nội dung |
| --- | --- |
| [SPEC_CHUNG.md](SPEC_CHUNG.md) | Nguồn duy nhất về luật, contract, mã lỗi, interface |
| [fixtures/gameplay-config.v0.json](fixtures/gameplay-config.v0.json) | Toàn bộ số liệu tạm của GAMEPLAY_SCOPE dạng máy đọc |
| [fixtures/lake-map.placeholder.json](fixtures/lake-map.placeholder.json) | Map tạm 20 ghế để code trước khi có map thật |
| [fixtures/api-samples.v0.json](fixtures/api-samples.v0.json) | Mẫu response/event cho mock |
| `fixtures/minigame-vectors.v0.json` | Test vector minigame (BE-B-07 tạo) |
| [nhom/](nhom/) | 13 nhóm việc, 89 ID (88 task thực hiện, 1 task đã loại) có spec và tiêu chí nghiệm thu |
| [QUY_TRINH.md](QUY_TRINH.md) | Quy trình worker, checklist reviewer, cổng M0-M5 |
| [TIEN_DO.md](TIEN_DO.md) | Bảng trạng thái mọi task |
| [bao-cao/_MAU.md](bao-cao/_MAU.md) | Mẫu báo cáo task kèm phần review |

## Các nhóm việc

| Nhóm | Phạm vi | Có thể bắt đầu ngay? | Cách giữ độc lập |
| --- | --- | --- | --- |
| [BE-A Nền tảng Server](nhom/BE-A-nen-tang-server.md) | Login Firebase, ví/ledger, idempotency, config | Có | Cung cấp interface ở SPEC mục 6 |
| [BE-B Luật câu cá](nhom/BE-B-luat-cau-ca.md) | Công thức, RNG, minigame, máy trạng thái (C# thuần) | Có | Không I/O, chỉ unit test |
| [BE-C Phòng và ghế](nhom/BE-C-phong-va-ghe.md) | Vào hồ, di chuyển, mua vé, cooldown, reconnect | Có | Dùng ví/player giả trong test |
| [BE-D Kinh tế và tiến trình](nhom/BE-D-kinh-te-tien-trinh.md) | Shop, túi, cần, bán cá, EXP, Codex, lịch sử | Có | Dùng ví/phiên ghế giả |
| [BE-E Tích hợp câu cá](nhom/BE-E-tich-hop-cau-ca.md) | Nối BE-B + BE-C + BE-D qua hub | Một phần | Bắt đầu với bản giả; hoàn thành sau 3 nhóm kia |
| [CL-A Nền tảng Client](nhom/CL-A-nen-tang-client.md) | Project Phaser + TS, mạng, state, **mock server** | Có | Mock theo fixture, không cần Server |
| [CL-B Map và nhân vật](nhom/CL-B-map-nhan-vat.md) | Scene hồ, di chuyển, ghế, mua vé | Sau CL-A-01 | Mock + asset placeholder |
| [CL-C Câu cá và minigame](nhom/CL-C-cau-ca-minigame.md) | Nút câu, bite, minigame, popup | Sau CL-A-01 | Lõi minigame TS thuần + test vector |
| [CL-D HUD, Shop, túi](nhom/CL-D-hud-shop-tui.md) | UI kit, HUD, Shop, túi, Codex, lịch sử | Sau CL-A-01 | Mock |
| [SOC Social](nhom/SOC-social-skin-ranking.md) | Skin, chat, emoji, khoe cá, ranking (cả 2 phía) | Có (skin, chat) | Module riêng; phần khoe cá/ranking chờ GD |
| [AD Admin](nhom/AD-admin.md) | Admin API + React | Sau BE-A-01 | Chỉ đọc dữ liệu nhóm khác |
| [ART Asset](nhom/ART-asset.md) | Tile, nhân vật, skin, icon, UI, âm thanh | Có | Giao theo tên file cố định |
| [QA Kiểm thử](nhom/QA-kiem-thu.md) | Ca kiểm thử, E2E, chạy cổng | Có | Viết từ spec |

**Ba cơ chế giữ các nhóm độc lập:**
1. **Contract và fixture cố định** (SPEC_CHUNG + `fixtures/`): Client làm với mock, Server làm với test, khớp nhau khi tích hợp.
2. **Interface giữa module Server** (SPEC mục 6): mỗi nhóm BE dùng bản giả của nhóm khác trong test.
3. **Quyền sửa file** (SPEC mục 1): mỗi thư mục có một nhóm chủ, tránh xung đột merge.

## Phụ thuộc giữa nhóm

```
                SPEC_CHUNG duyệt (M0)
        ┌──────────┬────────┼─────────┬──────────┬──────┐
      BE-A       BE-B     CL-A       ART        QA    SOC(skin/chat)
     ┌──┴──┐       │    ┌──┼──┐       │
   BE-C  BE-D      │  CL-B CL-C CL-D   │ (asset thay placeholder)
     └──┬──┘       │    │
       BE-E ◄──────┘    │
        └───── tích hợp thật (M2, M3) ─┘
   AD sau BE-A; SOC khoe cá/ranking sau BE-E + GD
```

Đường găng tới mốc demo chính (M3): BE-A-01 → BE-A-03 → BE-C-04 → BE-C-05 → BE-E-02 → BE-E-04 → BE-E-07. Song song phía Client: CL-A-01 → CL-A-06 → CL-C-04.

**Số worker gợi ý:** tối đa 9 worker cùng lúc ở giai đoạn đầu (BE-A, BE-B, BE-C, BE-D, CL-A, CL-B/CL-C sau ngày đầu, ART, QA, SOC). Mỗi worker một task một lúc.

## Việc cần người dùng/GD làm trước

| # | Việc | Chặn |
| --- | --- | --- |
| 1 | Duyệt SPEC_CHUNG 0.3, đặc biệt các mục [Đề xuất] | M0, mọi nhóm |
| 2 | Tạo Firebase project dev, bật Google, đưa Web config cho Client và service account cho Server (ngoài repo) | BE-A-02, CL-A-07 |
| 3 | Duyệt điều khoản bộ tileset (ART-01) | CL-B-01 |
| 4 | GD trả lời: xác thực tap, rời Lake khi bị giới hạn phạm vi ghế; spawn/Rare Luck đã chốt 2026-11-09 | BE-B-04, BE-B-06, BE-C-03 (đã có mặc định, không chặn code) |
| 5 | GD trả lời: số skin và quyền, chat, khoe cá, ranking, thành tích, túi đầy | SOC-06, SOC-07, AD-05 |

## Lệch với tài liệu cũ

- `docs/contracts/v1-draft.md` (0.1-draft) còn 4 slot cần/dây/lưỡi/mồi, cân nặng gram, vé là số dư, Idle, user tự hủy câu. SPEC_CHUNG 0.3 thay thế khi được duyệt.
- `docs/PROJECT.md`, `doc/README.md`, `docs/work/_TEMPLATE.md` là các điểm vào scope. Đã đồng bộ phần scope hiện hành sang Phaser + TS ngày 2026-11-09; W02 cũ giữ lịch sử công cụ Cocos, không là runtime hiện tại.
- Map W02 có 30 chỗ ngồi (10 chòi × 3); luật là 20 ghế. CL-B-01 làm lại.
- `phaser engine/` chỉ có bản build và node_modules, không có mã nguồn; client mới đặt ở `client-web/`.

## Bổ sung kế hoạch 2026-11-09 theo yêu cầu người dùng

- **Map hồ mới:** CL-B-07 duyệt layout → CL-B-01 dựng/export map cuối → CL-B-02 chạy scene và BE-C-01 đọc cùng fixture. Map mới có đúng 20 ghế và đường đi/Shop/phạm vi Lake được kiểm chứng, không chỉ dừng ở chọn tileset hoặc prototype.
- **Thả cá:** người dùng chốt hồ có quần thể hữu hạn, bắt thành công giảm cá. AD-06 làm dữ liệu/API/lịch thả, AD-07 làm trang Admin quản lý số lượng từng loài, thời gian và tồn; BE-E-08 tích hợp tồn với lượt câu; QA-04 kiểm tra xuyên suốt.
- Đây là scope được bổ sung; trường dữ liệu, reservation, cách xử lý khi hết cá/lịch quá hạn còn là đề xuất. SPEC_CHUNG 0.3 chưa có contract quần thể: lead cần cập nhật phiên bản/fixture sau khi thống nhất, không tự coi tỷ lệ spawn là số tồn. M3 cần bổ sung vòng câu không âm tồn; M4 có Admin thả thật, M5 kiểm tra lịch/restart.


## Quyết định 2026-11-09: thuê ghế và bỏ vật phẩm

Thính bỏ khỏi v0.1; BE-D-05 giữ ID với trạng thái Loại khỏi v0.1. BuySeatTicket cho user chọn thời lượng/đơn giá ghế; BE-C-09 gia hạn phiên còn hiệu lực, CL-B-05 có UI chọn thêm giờ và xác nhận giá; AD-02/04 chỉnh đơn giá từng ghế/block. 10 phút và 100/200 Gold là ví dụ, fixture có giá test chưa chốt. SPEC/fixture lên 0.3; mock/contract cũ cần đổi đồng thời. M2/M3 phải thử mua nhiều block, gia hạn khi đang câu, hết hạn/race/retry/thiếu Gold.
