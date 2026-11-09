# Kế hoạch chi tiết theo từng phần — Playable v0.1

**Trạng thái: M0 cơ chế/mặc định đã được user đồng ý 2026-11-09; tham chiếu SPEC0.4, chưa phải các task đã triển khai.** Lập từ [GAMEPLAY_SCOPE.md](GAMEPLAY_SCOPE.md) (bản đã đổi client sang Phaser + TypeScript) và mã nguồn hiện có trong repo. Không thay backlog Notion; cột "Backlog" giữ ID S/W/A để đối chiếu. Không ghi ngày hay ngày công.

**Quy ước:**
- **Bên làm:** C = Web Client (kiêm Art), B = Server, A = Admin (BE làm), GD = Game Design.
- **Ưu tiên:** P0 = cần cho vòng chơi chính (login → ghế → câu → bán cá), P1 = bắt buộc trong v1 nhưng không chặn vòng chơi, P2 = làm sau nếu còn nguồn lực.
- **Hiện trạng:** tình trạng trong repo ngày 2026-11-09. "Chưa có" nghĩa là chưa có mã.

## 0. Hiện trạng chung

| Phần | Hiện trạng trong repo | Ghi chú |
| --- | --- | --- |
| Client Phaser + TS | `phaser engine/` chỉ có `dist/` (bản build) và `node_modules`, **không có mã nguồn** | Cần tạo project nguồn mới |
| Prototype `client-v0/` | Phaser 3 + JS, server Node/Socket.IO, lưu JSON. Có di chuyển, va chạm, ghế, câu cá, bag, shop cần, skin, chat, 27 test | Dùng lại được logic va chạm, nội suy, UI panel khi viết lại sang TS. **Không dùng art** trong `public/assets` (lấy từ game tham khảo) |
| Server | ASP.NET Core: health, bootstrap, hub Ping; DB chỉ có bảng `players` | Chưa có auth, gameplay |
| Contract | `docs/contracts/v1-draft.md` 0.1-draft | Lệch luật mới: 4 slot cần/dây/lưỡi/mồi, cân nặng gram, vé là số dư, user tự hủy câu, Idle |
| Map | W02: hồ 10 chòi × 3 = 30 chỗ; bản Fan-tasy 64×64 chưa có ghế | Cần làm lại thành 20 ghế 3 Tier |

## 1. Chuẩn bị chung (Phase 0)

| ID | Việc | Bên làm | Ưu tiên | Phụ thuộc | Nghiệm thu | Backlog |
| --- | --- | --- | --- | --- | --- | --- |
| 1.1 | Sửa contract lên 0.3-draft theo luật mới: bỏ dây/lưỡi/mồi, Idle, `CancelFishing`; đổi cân nặng sang chiều dài (số nguyên đơn vị 0,1 cm); vé thành `BuySeatTicket {seatId,durationUnits,expectedPriceVersion}` | B | P0 | — | Client đọc và xác nhận; không còn field trái luật | S01 |
| 1.2 | Định nghĩa file config gameplay JSON: level, cần, cá, Tier ghế, minigame, bậc chiều dài, đơn giá thời gian từng ghế, Gold tặng | B, GD duyệt | P0 | — | Server và Client cùng đọc một file có `configVersion` | S01 |
| 1.3 | Cập nhật `docs/be/PLAN.md`, `ARCHITECTURE.md`, `doc/README.md`, `docs/PROJECT.md` theo luật mới và Phaser | B, C | P0 | 1.1 | Không còn nhắc Cocos, 4 slot, cân nặng | S01 |
| 1.4 | Tạo project client Phaser 3 + TS + Vite: cấu trúc `net/`, `state/`, `scenes/`, `ui/`, `entities/`; lint, build | C | P0 | — | `npm run build` chạy; mở scene trống trên trình duyệt | W01 |
| 1.5 | Lớp mạng client: HTTP + SignalR (`@microsoft/signalr`), adapter mock/real, xử lý lỗi theo contract | C | P0 | 1.1, 1.4 | Chạy được với mock và với hub Ping thật | W01 |

## 2. Login và tài khoản

| ID | Việc | Bên làm | Ưu tiên | Phụ thuộc | Nghiệm thu | Backlog |
| --- | --- | --- | --- | --- | --- | --- |
| 2.1 | Firebase project dev, bật Google; secret để ngoài repo | B | P0 | — | Đăng nhập Google trả ID token | S02 |
| 2.2 | `POST /auth/login`, refresh, logout; Server xác minh token Firebase | B | P0 | 2.1 | Token sai/hết hạn trả 401; logout chặn token cũ | S02 |
| 2.3 | Tạo player lần đầu: tặng 100 Gold, Old Fishing Rod, ghi ledger, cùng một transaction | B | P0 | 2.2, 10.1 | Đăng nhập lần 2 không tặng lại | S02/S04 |
| 2.4 | Hub yêu cầu đăng nhập; `GET /me` | B | P0 | 2.2 | Kết nối hub không token bị từ chối | S02 |
| 2.5 | Màn đăng nhập Google, đặt tên hiển thị, vào game | C | P0 | 1.5, 2.2 | Login thật, thấy tên và 100 Gold | W tương ứng |

**GD cần chốt:** lấy tên Google hay cho người chơi nhập tên.

## 3. Map hồ và di chuyển

| ID | Việc | Bên làm | Ưu tiên | Phụ thuộc | Nghiệm thu | Backlog |
| --- | --- | --- | --- | --- | --- | --- |
| 3.1 | Vẽ lại bố cục hồ 20 ghế: ghế 1-5 Tier 1 (vị trí đẹp nhất), 6-10 Tier 2, 11-20 Tier 3 | C | P0 | — | Preview có đủ 20 ghế đánh số | W02 |
| 3.2 | File fixture map: seatId, Tier, tọa độ, phạm vi đi lại quanh ghế, vùng Lake, điểm spawn, ô đi được | C | P0 | 3.1 | B và C cùng dùng một file | W02/S03 |
| 3.3 | Scene Phaser: tilemap Tiled, va chạm, sắp lớp theo độ sâu, camera theo nhân vật | C | P0 | 1.4, 3.2 | Đi quanh hồ không xuyên vật cản | W02 |
| 3.4 | Nhân vật mẫu: 4 hướng đi/đứng, ngồi, animation câu (quăng, chờ, giật, kéo) | C | P0 | — | Đủ animation cho cả vòng câu | W02/W13 |
| 3.5 | Server: JoinRoom, snapshot, Move có kiểm tra ô đi được và tốc độ; PlayerJoined/Left/Moved | B | P0 | 2.4, 3.2 | Đi xuyên tường bị kéo về; 20 người thấy nhau | S03 |
| 3.6 | Client: joystick + bàn phím, nội suy người khác, sửa vị trí theo Server | C | P0 | 3.3, 3.5 | Di chuyển mượt khi có 20 người | W tương ứng |

## 4. Cơ chế ghế và vé

| ID | Việc | Bên làm | Ưu tiên | Phụ thuộc | Nghiệm thu | Backlog |
| --- | --- | --- | --- | --- | --- | --- |
| 4.1 | Bảng `seats` (20 ghế, Tier) và `seat_sessions` (người giữ, bắt đầu, hết hạn, lý do kết thúc) | B | P0 | 3.2 | Migration chạy trên DB trống | S03 |
| 4.2 | `BuySeatTicket`: ghế Available, không cooldown, user chưa giữ ghế khác, đủ Gold = đơn giá hiện hành của ghế × durationUnits; giá 120/70/40 mỗi block chỉ để test. Trừ Gold + ledger + mở phiên trong một transaction | B | P0 | 4.1, 10.1 | 2 người bấm cùng lúc: đúng 1 người được và bị trừ tiền; người kia nhận "ghế đang được sử dụng", không mất tiền | S03/S04 |
| 4.3 | Hết expiresAt mới nhất: tự rời ghế; đang câu dở thì hủy lần câu | B | P0 | 4.2, 5.2 | Đúng hạn đã mua/gia hạn theo giờ Server | S03 |
| 4.4 | Cooldown 10 giây mỗi lần ghế về trống, mọi lý do; ai cũng mua lại như nhau | B | P0 | 4.2 | Mua trong cooldown bị từ chối, kể cả người vừa dùng | S03 |
| 4.5 | Giữ ghế được đi lại trong phạm vi nhỏ; ra khỏi vùng Lake là bỏ ghế | B, C | P0 | 3.5, 4.2 | Đi quá phạm vi bị chặn hoặc mất ghế theo luật | S03 |
| 4.6 | Mất kết nối: hủy lần câu ngay; có 2 phút để vào lại và giữ ghế; đồng hồ theo expiresAt mới nhất vẫn chạy | B | P0 | 4.2 | Vào lại sau 1 phút còn ghế; sau 2 phút 10 giây mất ghế | S03 |
| 4.7 | Lưu hạn giờ trong DB để Server khởi động lại vẫn xử lý đúng phiên quá hạn | B | P0 | 4.3–4.6 | Restart Server không làm ghế kẹt | S03 |
| 4.8 | UI: ghế trên map theo màu trạng thái, popup mua vé (Tier, buff, giá), đồng hồ theo expiresAt mới nhất, nút rời ghế | C | P0 | 4.2 | Trạng thái ghế đổi cho mọi người ngay khi có người mua | W tương ứng |
| 4.9 | Buff ghế: Rare Luck, Large Luck, Lure Time theo Tier, chỉ khi đang giữ ghế | B | P0 | 4.2, 1.2 | Giá trị lấy từ config | S06 |

**GD cần chốt:** đã bị giới hạn phạm vi đi quanh ghế thì "ra khỏi Lake" xảy ra thế nào (đề xuất: có nút Rời ghế, ra khỏi Lake chỉ khi đổi map). Có cho quăng câu khi lượt sắp hết không.

## 5. Quy trình câu cá

| ID | Việc | Bên làm | Ưu tiên | Phụ thuộc | Nghiệm thu | Backlog |
| --- | --- | --- | --- | --- | --- | --- |
| 5.1 | Bảng `fishing_attempts` (lần câu, trạng thái, loài, configVersion, seed, kết quả) | B | P0 | 4.1 | Mỗi lần câu có 1 dòng | S06 |
| 5.2 | Trạng thái lần câu: Chờ cắn → Cá cắn (3 giây) → Minigame → Thành công / Thất bại / Bị hủy | B | P0 | 5.1 | Không có đường cho user tự hủy | S06 |
| 5.3 | Quăng câu: chỉ khi giữ ghế, không có lần câu khác, có cần đang dùng | B | P0 | 4.2, 7.3 | Không giữ ghế thì bị từ chối | S06 |
| 5.4 | Thời gian chờ: random 3-6 giây trừ Lure Time của ghế (Tier 1: 2-5 giây) | B | P0 | 4.9 | Thống kê 1.000 lần đúng khoảng | S06 |
| 5.5 | Lúc cá cắn: Server chốt loài; user có 3 giây để bấm, không bấm là thất bại | B | P0 | 5.2, 8.3 | Bấm sau 3 giây bị tính thua | S06 |
| 5.6 | Thành công: random chiều dài, cộng EXP, thêm cá vào túi, cập nhật Codex/kỷ lục; báo cho phòng hiện icon cá 5 giây | B | P0 | 6.2, 8.4 | Một lần câu chỉ được trả thưởng 1 lần, kể cả gửi lặp hay restart | S06/S08 |
| 5.7 | Thất bại: không EXP; chỉ owner nhận kết quả | B | P0 | 5.2 | Người khác không thấy | S06 |
| 5.8 | Client: nút câu góc phải, tắt joystick khi đang câu, chấm than + cần rung + thanh đếm 3 giây | C | P0 | 3.4, 5.2 | Khớp thời gian Server gửi | W tương ứng |
| 5.9 | Popup thành công 3 giây: ảnh, tên, độ hiếm, chiều dài, "Mới", "Kỷ lục"; emoji buồn khi thua; icon cá trên đầu người khác 5 giây | C | P0 | 5.6 | Popup tự đóng rồi quay lại bước quăng | W tương ứng |

**GD cần chốt:** icon cá trên đầu có khác theo loài/độ hiếm không. Client có được biết loài trước khi thắng không (đề xuất: không).

## 6. Minigame

| ID | Việc | Bên làm | Ưu tiên | Phụ thuộc | Nghiệm thu | Backlog |
| --- | --- | --- | --- | --- | --- | --- |
| 6.1 | Thông số theo độ hiếm từ config: thời gian, tốc độ kim, vùng xanh/vàng gốc, trừ giờ khi trượt, độ xê dịch | B | P0 | 1.2 | Đổi config không cần sửa mã | S06 |
| 6.2 | Client xử lý tap/HP/ATK/thắng-thua cục bộ; chỉ gửi SubmitFishingResult | C | P0 | 5.2, 7.4 | Server không xác minh tap, chỉ settle1 lần/attempt | S06 |
| 6.3 | Sau mỗi tap vùng xanh dịch ngẫu nhiên, không ra ngoài thanh; vùng vàng đặt lại trong vùng xanh | C | P0 | 6.2 | Cá bậc thấp dịch ít hơn | S06 |
| 6.4 | Server nhận success/failed; kiểm tra owner/phase/deadline/seat; unique catch attemptId, transaction thưởng và giảm pool | B | P0 | 6.2 | Gửi lặp/kể cả đổi key chỉ1 cá; fake attempt không thưởng | S06 |
| 6.5 | Client: thanh đo, kim, vùng xanh/vàng, đồng hồ, khoảng cách tới cá; xử lý cục bộ, chỉ hiển thị phần thưởng sau settlement Server | C | P0 | 6.4 | Chơi mượt khi ping 150 ms | W tương ứng |
| 6.6 | Script mô phỏng tỷ lệ thắng theo level/cần/độ hiếm | B | P1 | 6.2 | Có bảng số liệu cho GD cân | — |

**Đã chốt 2026-11-09:** Client tự xử lý minigame, Server không xác minh tap; vẫn chặn thưởng/pool lặp.

## 7. Chỉ số nhân vật và cần câu

| ID | Việc | Bên làm | Ưu tiên | Phụ thuộc | Nghiệm thu | Backlog |
| --- | --- | --- | --- | --- | --- | --- |
| 7.1 | Lưu level, EXP; lên level theo bảng (tổng 1.850 EXP tới Lv10), tối đa Lv10 | B | P0 | 2.3 | Vượt mốc thì lên đúng level | S06/S08 |
| 7.2 | Bảng `rods_owned`; Old Fishing Rod luôn sở hữu | B | P0 | 2.3 | Player mới có sẵn cần mặc định | S04 |
| 7.3 | Chọn cần đang dùng (đề xuất: chỉ đổi khi không trong lần câu) | B, C | P0 | 7.2 | Đổi giữa lần câu bị từ chối | S04 |
| 7.4 | Tổng chỉ số: ATK = Strength level + cần; Hit Zone, Rare/Large Luck = level + cần (+ ghế); Large Luck tối đa +7 | B | P0 | 7.1, 7.3, 4.9 | Có test cho từng công thức | S06 |
| 7.5 | UI: thanh EXP, thông báo lên level, bảng chỉ số, chọn cần | C | P1 | 7.1, 7.3 | Số trên UI khớp Server | W tương ứng |
| 7.6 | Art 5 cần câu (icon + cần trên tay nhân vật) | C | P1 | 3.4 | Đổi cần thì hình trên tay đổi theo | W tương ứng |

## 8. Fish Codex, spawn và chiều dài

| ID | Việc | Bên làm | Ưu tiên | Phụ thuộc | Nghiệm thu | Backlog |
| --- | --- | --- | --- | --- | --- | --- |
| 8.1 | 9 loài trong config: rarity, Min/Max cm, HP, EXP, giá bán | B | P0 | 1.2 | Đúng bảng Fish Codex | S06 |
| 8.2 | Bảng `catches` (từng con, chiều dài, đã bán chưa) và `species_records` (lần đầu, kỷ lục, tổng số) | B | P0 | 5.1 | Bán cá không mất kỷ lục | S06/S08 |
| 8.3 | Spawn rarity theo công thức đã chốt GAMEPLAY_SCOPE ngày09/11, RareLuck0..7; phối hợp pool hữu hạn | B | P0 | 8.1 | Tổng tỷ lệ100%, không fallback vô hạn khi cạn | S06 |
| 8.4 | Random chiều dài theo 4 bậc; mỗi điểm Large Luck: Thường −2%, Lớn +1,5%, Rất lớn +0,5%; làm tròn 0,1 cm, lưu số nguyên | B | P0 | 7.4, 8.1 | Thống kê 100.000 lần đúng tỷ lệ | S06 |
| 8.5 | Giao diện Codex: 9 loài, loài chưa bắt hiện khóa, kỷ lục từng loài | C | P1 | 8.2 | Khớp dữ liệu Server | W tương ứng |
| 8.6 | Art 9 icon cá + khung độ hiếm | C | P0 | — | Dùng được ở popup, túi, Codex | W tương ứng |

**GD cần chốt:** logic spawn và Rare Fish Luck; kiểm lại giá vé, giá cần, giá cá sau khi có logic spawn.

## 9. Vật phẩm đã bỏ

Các ID 9.1–9.3 đã loại khỏi v0.1 theo user 2026-11-09; không code/shop/icon/nút dùng/effect cho thính. Giữ ID lịch sử, không tính Xong.

## 10. Ví, Shop, túi đồ, bán cá

| ID | Việc | Bên làm | Ưu tiên | Phụ thuộc | Nghiệm thu | Backlog |
| --- | --- | --- | --- | --- | --- | --- |
| 10.1 | Ví Gold + ledger chỉ ghi thêm + chống xử lý trùng (Idempotency-Key) | B | P0 | 2.2 | Gửi lặp không trừ 2 lần; tổng ledger khớp số dư | S04 |
| 10.2 | Shop bán 4 cần (300/300/800/2.000); không mua lại cần đã có | B | P0 | 10.1, 7.2 | Thiếu Gold bị từ chối, không âm tiền | S04 |
| 10.3 | Bán cá tại Shop: từng con hoặc tất cả, giá theo loài | B | P0 | 8.2, 10.1 | Bán lại con đã bán bị từ chối | S04 |
| 10.4 | API túi đồ: cá (từng con), cần | B | P0 | 8.2 | Chỉ owner xem được | S04 |
| 10.5 | Client: HUD Gold, Shop, túi đồ, bán cá | C | P0 | 10.2–10.4 | Số Gold luôn lấy từ Server | W tương ứng |

**GD cần chốt:** túi có giới hạn không, đầy thì sao; bán theo con hay theo loài.

## 11. Lịch sử câu và thành tích

| ID | Việc | Bên làm | Ưu tiên | Phụ thuộc | Nghiệm thu | Backlog |
| --- | --- | --- | --- | --- | --- | --- |
| 11.1 | API lịch sử câu có phân trang (thành công/thất bại/hủy) | B | P1 | 5.1 | Đăng nhập lại vẫn thấy đủ | S08 |
| 11.2 | Thành tích cá nhân theo luật GD | B | P1 | 8.2, GD | Theo danh sách GD duyệt | S08 |
| 11.3 | UI lịch sử và thành tích | C | P1 | 11.1, 11.2 | Khớp Server | W tương ứng |

**GD cần chốt:** thành tích gồm những gì.

## 12. Skin nhân vật

| ID | Việc | Bên làm | Ưu tiên | Phụ thuộc | Nghiệm thu | Backlog |
| --- | --- | --- | --- | --- | --- | --- |
| 12.1 | Art 5-10 skin, mỗi skin đủ 4 hướng và animation như nhân vật mẫu (3.4) | C | P1 | 3.4 duyệt | Không lệch pivot khi đổi skin | W13 |
| 12.2 | Danh sách skin, chọn, lưu, báo cho phòng (`SkinChanged`) | B | P1 | 3.5 | Người khác thấy skin mới ngay | S13 |
| 12.3 | Màn chọn skin | C | P1 | 12.1, 12.2 | Chọn xong vào lại vẫn giữ | W13 |

**GD cần chốt:** 5 hay 10 skin; mở miễn phí hay theo điều kiện.

## 13. Chat, emoji, khoe cá

| ID | Việc | Bên làm | Ưu tiên | Phụ thuộc | Nghiệm thu | Backlog |
| --- | --- | --- | --- | --- | --- | --- |
| 13.1 | Chat trong phòng: giới hạn độ dài, giới hạn tần suất | B | P1 | 3.5, GD | Gửi dồn bị chặn | S11 |
| 13.2 | Emoji theo danh sách cho phép | B | P1 | 3.5 | Emoji lạ bị từ chối | S11 |
| 13.3 | Khoe cá: chỉ cá thật của chính user | B | P1 | 8.2, GD | Không khoe được cá của người khác hay cá đã bán (nếu GD quy định) | S11 |
| 13.4 | UI: khung chat, bong bóng trên đầu, bảng emoji, thông báo khoe cá | C | P1 | 13.1–13.3 | Hiển thị cho mọi người trong phòng | W11 |

**GD cần chốt:** chat trong phòng hay toàn server; danh sách emoji; khoe cá tự động hay user bấm, ai thấy.

## 14. Bảng xếp hạng

| ID | Việc | Bên làm | Ưu tiên | Phụ thuộc | Nghiệm thu | Backlog |
| --- | --- | --- | --- | --- | --- | --- |
| 14.1 | Tính điểm từ các lần câu hợp lệ, không tính trùng | B | P1 | 5.6, GD | Đối chiếu đúng với dữ liệu mẫu | S12 |
| 14.2 | API bảng xếp hạng có phân trang, thời điểm cập nhật | B | P1 | 14.1 | Đồng hạng xử lý theo luật | S12 |
| 14.3 | UI bảng xếp hạng | C | P1 | 14.2 | Khớp Server | W12 |

**GD cần chốt:** xếp theo gì (cá dài nhất, tổng số cá, tổng giá trị...), chu kỳ, đồng hạng, bao lâu cập nhật một lần.

## 15. Admin

| ID | Việc | Bên làm | Ưu tiên | Phụ thuộc | Nghiệm thu | Backlog |
| --- | --- | --- | --- | --- | --- | --- |
| 15.1 | Đăng nhập Admin riêng, phân quyền, ghi audit | A | P1 | 2.2 | Player không vào được Admin | S09/A01 |
| 15.2 | Sửa config: nháp → kiểm tra → publish; quay lại bằng version mới | A | P1 | 1.2 | Config sai bị chặn; lần câu đang chạy giữ version cũ | S09/A02–A03 |
| 15.3 | Tra cứu player, ví/ledger, cá, phiên ghế | A | P1 | 10.1, 4.1 | Không có nút sửa tiền trực tiếp | A04 |
| 15.4 | Hỗ trợ chat/ranking tối thiểu | A | P2 | 13, 14 | Theo mức A06 được chốt | A06 |

Trong lúc chưa có Admin, config đọc từ file JSON có version để không chặn phần câu cá.

## 16. Kiểm thử và phát hành

| ID | Việc | Bên làm | Ưu tiên | Phụ thuộc | Nghiệm thu | Backlog |
| --- | --- | --- | --- | --- | --- | --- |
| 16.1 | Test tự động Server: tranh ghế, cooldown, reconnect, trả thưởng 1 lần, ledger, result trùng/attempt giả | B | P0 | 4–10 | Chạy trong CI | S10 |
| 16.2 | Test tải 20 người một phòng, khởi động lại Server giữa lần câu | B | P0 | 4–6 | Có số đo độ trễ, lỗi | S10 |
| 16.3 | Chạy ma trận trong `QA_RELEASE.md` với Server thật | B, C | P0 | Tất cả | Ghi rõ phần đã và chưa kiểm | S10 |
| 16.4 | Kiểm tra quyền dùng asset (Farming Game World, Fan-tasy) | C | P0 | — | Có nguồn và giấy phép cho từng bộ | — |
| 16.5 | Âm thanh, hiệu ứng, tối ưu atlas | C | P1 | 5, 6 | Tải trang dưới ngưỡng team chọn | W tương ứng |

## Thứ tự làm đề xuất

| Bước | Server | Client | Kết quả cần thấy |
| --- | --- | --- | --- |
| 1 | 1.1, 1.2, 2.1–2.4, 10.1 | 1.4, 1.5, 3.1, 3.2, 3.4 | Login Google thật, có 100 Gold |
| 2 | 3.5, 4.1–4.9 | 2.5, 3.3, 3.6, 4.8 | 20 người vào hồ, mua vé, chọn thời lượng và gia hạn ghế |
| 3 | 5.1–5.7, 6.1–6.4, 7.1–7.4, 8.1–8.4 | 5.8, 5.9, 6.5, 8.6 | Câu trọn vòng trên Server thật (mốc demo đầu tiên) |
| 4 | 10.2–10.4 | 10.5, 7.5, 7.6 | Mua cần, bán cá |
| 5 | 11, 12.2, 13, 14, 15 | 8.5, 11.3, 12.1, 12.3, 13.4, 14.3 | Đủ tính năng bắt buộc v1 |
| 6 | 16.1–16.3 | 16.3–16.5 | Sẵn sàng phát hành |

Art skin (12.1) là việc dài nhất phía Client, nên bắt đầu ngay khi nhân vật mẫu (3.4) được duyệt.

## Rủi ro

| Rủi ro | Ảnh hưởng | Cách xử lý |
| --- | --- | --- |
| Kinh tế dư Gold: tính thô, 1 vé Tier 3 (40 Gold) có thể thu khoảng 300 Gold từ bán cá | Mua hết cần trong khoảng 1 giờ | Chạy mô phỏng 6.6 rồi GD cân lại giá |
| Contract lệch luật | Client làm mock sai phải làm lại | Làm 1.1 trước tiên |
| Client Phaser chưa có mã nguồn | Toàn bộ phần Client bắt đầu từ đầu | Viết lại từ `client-v0` sang TS, chỉ lấy logic, không lấy art |
| Bot tự bấm minigame | Gian lận | Chấp nhận ở v1, ghi log tỷ lệ trúng |
| Hẹn giờ Server (expiresAt đã mua/gia hạn, cooldown, 2 phút reconnect) mất khi restart | Ghế kẹt, mất vé | Lưu hạn giờ vào DB (4.7), test ở 16.2 |


## Cập nhật ghế 2026-11-09

Bổ sung 4.10 / BE-C-09: gia hạn khi phiên còn hiệu lực, cộng thời gian vào expiresAt cũ, xác nhận đơn giá hiện hành; atomic ví/ledger/session/receipt và xử lý race hết hạn. Client 4.8 có chọn thời lượng trước mua và UI Gia hạn; Admin chỉnh đơn giá mỗi ghế/block. 10 phút/100 hoặc 200 Gold là ví dụ, không bảng giá cuối. Cổng ghế kiểm tra 20 phút + gia hạn 10 phút test, retry/thiếu Gold/price change/race. Không tự gia hạn.
