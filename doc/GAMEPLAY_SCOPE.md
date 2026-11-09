# Gameplay và scope Playable v0.1

## Đã chốt

- 2D Pixel Art; web client Cocos Creator 3.8.x + TypeScript.
- ASP.NET Core + SignalR; PostgreSQL + Redis. Admin React + TypeScript riêng, do BE thực hiện cùng Server; hai luồng Client kiêm Art và BE kiêm Admin.
- Một map hồ đi lại, 20 ghế/phòng; phòng và Lake là một. Login, vào phòng, chọn ghế, mua vé theo lượt.
- Bản đầu tập trung làm câu Manual; Idle GD cập nhật sau.
- Chỉ cần có cần câu là câu được; mỗi người chơi mặc định có 1 cần cấp thấp. Bản đầu làm 5 loại cần (bảng Fishing Rod).
- 9 loài cá mẫu thuộc 5 bậc rarity (bảng Fish Codex); inventory, lịch sử câu, thành tích cá nhân.
- Thính là vật phẩm tiêu hao, thuộc inventory/shop. Bản đầu có 1 loại để test.
- Shop dùng Gold, có ledger: bán cần câu và thính; user bán cá đã câu tại Shop. Gem không dùng trong bản đầu; chưa tự suy ra có shop Gem hoặc payment.
- Khoảng 5–10 skin nhân vật, chọn và đồng bộ; quyền dùng/mở khóa chưa khóa.
- Chat, emoji, thông báo khoe cá và bảng xếp hạng bắt buộc trong v1; GD mô tả sau.

Loot/nhặt đồ trên map (GD bỏ khỏi bản đầu 2026-11-05; user chỉ dùng tiền để mua vé), hệ thống mồi câu, dây và lưỡi (GD bỏ khỏi bản đầu 2026-11-06; bổ sung sau nếu quyết định triển khai), kỹ năng riêng của từng loài cá, giải đấu và payment thật kể cả sandbox để sau. V1 được hiểu là bản đầu đang mang nhãn v0.1, chưa tự đổi version release. Không thêm stamina, nông trại hoặc hệ ngày/đêm từ ảnh tham khảo vào v0.1.

## Cơ chế ghế

**Đã chốt** (GD bổ sung 2026-11-05):

- Một Lake có tối đa 20 ghế. Ghế ở trạng thái **Available** khi không có user nào đang dùng. Muốn dùng ghế phải mua vé của chính ghế đó.
- Mỗi user sở hữu tối đa 1 ghế trong khu vực câu cá.
- Nhiều user cùng bấm mua vé một ghế: BE xác định ai bấm trước thì được mua. Các user còn lại nhận thông báo "ghế đang được sử dụng".
- Giá vé khác nhau theo Tier của ghế (Tier 1/2/3). Tier cao tương ứng vị trí câu đẹp, cá dễ cắn câu hơn.
- Thứ hạng Tier: Tier 1 tốt nhất, Tier 2 bình thường, Tier 3 thấp nhất.
- Phân bổ 20 ghế, buff và giá vé theo bảng Tier ghế bên dưới.
- **Một lượt = một vé = 10 phút dùng ghế.** Trong 10 phút, user câu hay không là tùy user. Không bắt buộc câu, không giới hạn số cá bắt được.
- Hết 10 phút khi đang câu dở: lần câu đó tự động bị hủy, không cho câu tiếp.
- Khi đang giữ ghế và không trong lần câu, nhân vật được đi lại trong phạm vi nhỏ, quy định khi xây map.
- Trong 10 phút, nếu user ra khỏi khu vực câu cá thì coi như bỏ ghế, ghế tự động chuyển về Available. Khu vực câu cá là phạm vi của Lake. Hiện tại khoanh vùng Lake thành khu vực câu cá; cách định nghĩa này để sau mở rộng map có nhiều khu vực liền nhau.
- Không hoàn vé, kể cả khi bỏ ghế sớm.
- Hết lượt 10 phút: user tự động rời ghế.
- Cooldown 10 giây luôn áp dụng mỗi khi ghế chuyển từ đang dùng về trống, bất kể lý do (hết lượt, rời Lake, quá thời gian reconnect). Hết cooldown mới cho mua vé; mọi user mua như ghế trống, kể cả user vừa dùng.
- Mất kết nối hoặc đóng tab: user có 2 phút để reconnect và giữ ghế. Quá 2 phút tính là bỏ ghế. Đồng hồ 10 phút của lượt vẫn chạy độc lập trong lúc mất kết nối. Nếu đang câu dở thì lần câu đó bị hủy ngay khi mất kết nối.
- Vé mua bằng Gold; bản đầu không có nguồn vé miễn phí. Người chơi mới được tặng 100 Gold.

**Bảng Tier ghế** (GD cung cấp 2026-11-06; giá vé là số tạm để test, đã cân lại):

| Tier | Ghế số | Số ghế | Rare Fish Luck | Large Fish Luck | Lure Time (giây) | Giá vé (Gold) |
| --- | --- | --- | --- | --- | --- | --- |
| Tier 1 | 1-5 | 5 | +1 | +1 | 1 | 120 |
| Tier 2 | 6-10 | 5 | 0 | +1 | 0,5 | 70 |
| Tier 3 | 11-20 | 10 | 0 | 0 | 0 | 40 |

Buff ghế có hiệu lực khi user đang giữ ghế và cộng với Luck từ level và cần. Lure Time là số giây giảm thời gian chờ cá cắn sau khi quăng câu: gốc 3-6 giây, Tier 1 còn 2-5 giây, Tier 2 còn 2,5-5,5 giây.

## Quy trình câu cá

**Đã chốt** (GD bổ sung 2026-11-06):

1. **Mua vé:** user mua vé để có slot ghế câu cá.
2. **Quăng câu:** nút câu cá hiện ở góc phải màn hình, user chủ động bấm để bắt đầu.
   - Trong lúc câu, nhân vật không di chuyển được (tắt joystick).
   - User không thể tự hủy lần câu. Thời gian minigame tối đa theo Bảng độ khó (12-20 giây). Hệ thống vẫn tự hủy khi hết lượt 10 phút hoặc mất kết nối (mục Cơ chế ghế).
   - Trước khi bấm nút, user có thể chọn quăng thính. Bản đầu có 1 loại thính, giá 30 Gold: giảm 1 giây Lure Time, có hiệu lực đến khi user rời ghế, không cộng dồn. Cộng với Lure Time của ghế, thời gian chờ ngắn nhất là 1-4 giây (Tier 1 + thính).
3. **Cá cắn câu:** sau 3-6 giây kể từ khi bắt đầu câu (trừ Lure Time của ghế và thính), có tín hiệu cá cắn: chấm than trên đầu nhân vật, cần động đậy, nút câu cá hiện thanh đếm ngược. Server chốt loài cá tại thời điểm này; chiều dài chỉ random khi bắt được cá. User có 3 giây để bấm nút và chuyển sang bước bắt cá. Không bấm thì tính là thất bại và quay lại bước 2.
4. **Bắt cá (minigame):** một cây kim chạy qua lại trên thanh đo.
   - Bấm khi kim ở vùng xanh dương: kéo cá lại gần.
   - Bấm khi kim ở vùng vàng ("điểm yếu"): kéo được gấp đôi.
   - Bấm trượt ra ngoài vùng: bị trừ mạnh thời gian.
   - Thắng khi khoảng cách tới cá về 0. Thua khi hết giờ.
   - Độ khó minigame thay đổi theo độ hiếm của cá, cấu hình theo bảng: khoảng cách tới cá, độ rộng vùng và tốc độ kim tăng độ khó dần theo độ hiếm. Vùng xanh và vùng vàng luôn đổi vị trí sau mỗi lần tap; cá bậc thấp xê dịch ít hơn. Số liệu ở mục Bảng độ khó minigame.
5. **Kết quả:**
   - Thành công: popup gồm hình ảnh cá, tên, độ hiếm và chiều dài. Hiện text "Mới" khi câu được loài lần đầu, "Kỷ lục" khi con cá dài hơn mọi con cùng loài user từng câu. Popup tự đóng sau 3 giây, user quay lại bước 2. Người chơi khác thấy icon cá trên đầu nhân vật của user vừa câu được; icon biến mất sau khoảng 5 giây.
   - Thất bại: hiển thị emoji mặt buồn, chỉ user đó thấy. Không nhận EXP.

**Chưa chốt:**

- Cách Server xác thực lần bấm trong minigame khi có độ trễ mạng.
- Icon cá trên đầu nhân vật có khác nhau theo loài/độ hiếm không.

**Tham khảo:** clip `ref minigame.mp4` chỉ minh họa cơ chế minigame; art/UI tự làm. Số đo được trong clip (khoảng 12 giây; trúng thường trừ 10 cm, điểm yếu trừ 20 cm) không phải yêu cầu.

## Chỉ số nhân vật

Nhân vật có tối đa 10 level. Số liệu trong 3 bảng dữ liệu (nhân vật, cần, cá) là bản tạm để test, GD cho phép chỉnh 2026-11-06. EXP Req là lượng EXP để lên level đó từ level trước; tổng 1.850 EXP để đạt Lv10.

| Level | EXP Req | Strength | Normal Hit Zone Increase (%) | Weakness Hit Zone Increase (%) | Rare Fish Luck | Large Fish Luck |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | — | 10 | 0 | 0 | 0 | 0 |
| 2 | 40 | 12 | 2 | 2 | 0 | 0 |
| 3 | 70 | 14 | 2 | 2 | 1 | 1 |
| 4 | 100 | 16 | 4 | 4 | 1 | 1 |
| 5 | 140 | 18 | 6 | 4 | 2 | 2 |
| 6 | 180 | 20 | 8 | 6 | 2 | 2 |
| 7 | 230 | 22 | 10 | 6 | 3 | 3 |
| 8 | 290 | 24 | 12 | 8 | 3 | 3 |
| 9 | 360 | 26 | 14 | 8 | 3 | 3 |
| 10 | 440 | 28 | 15 | 10 | 4 | 4 |

- **Strength:** tăng lực kéo mỗi lần trúng. ATK = Strength theo level + Strength của cần. HP của cá cố định theo loài và là khoảng cách trong minigame. Tap trúng vùng thường (xanh) trừ HP bằng ATK; tap trúng vùng điểm yếu (vàng) trừ HP bằng ATK x 2. Phần vàng chồng lên xanh tính theo vàng. HP về 0 thì bắt được cá.
- **Normal Hit Zone Increase:** % tăng so với kích thước gốc của vùng trúng thường.
- **Weakness Hit Zone Increase:** % tăng so với kích thước gốc của vùng điểm yếu.
- **Rare Fish Luck:** tăng khả năng xuất hiện cá hiếm và huyền thoại.
- **Large Fish Luck:** tăng khả năng xuất hiện cá lớn.

## Fishing Rod

Chốt 5 loại cần. Buff của cần cộng cho nhân vật. Old Fishing Rod là cần mặc định, luôn ở trạng thái đã sở hữu, không cần mua.

| # | Name | Price (Gold) | Strength | Normal Hit Zone Increase (%) | Weakness Hit Zone Increase (%) | Rare Fish Luck | Large Fish Luck |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Old Fishing Rod | Mặc định | 1 | 0 | 0 | 0 | 0 |
| 2 | Steel Awl | 300 | 3 | 10 | 0 | 1 | 0 |
| 3 | High Performer | 300 | 3 | 0 | 10 | 0 | 1 |
| 4 | Bliss | 800 | 4 | 15 | 15 | 1 | 1 |
| 5 | Giant Caster | 2.000 | 5 | 20 | 20 | 2 | 2 |

## Fish Codex

Chốt 9 loài cá, 5 bậc rarity. Kích thước cá tính bằng chiều dài (cm), không dùng cân nặng; chiều dài random trong khoảng Min-Max khi bắt được cá. Chiều dài không ảnh hưởng độ khó minigame, chỉ để so sánh giữa các user. Người chơi bán cá để kiếm Gold. Bản đầu chưa dùng cột Appears during và Found in, vì chỉ có 1 nơi câu.

| # | id | Name | Rarity | Min. Length (cm) | Max. Length (cm) | HP | EXP | Giá bán (Gold) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | minnow | Minnow | common | 7.5 | 22.5 | 55 | 5 | 5 |
| 2 | perch | Perch | common | 7.5 | 22.5 | 55 | 5 | 5 |
| 3 | carp | Carp | common | 7.5 | 22.5 | 55 | 5 | 5 |
| 4 | trout | Trout | uncommon | 10 | 30 | 70 | 8 | 10 |
| 5 | bass | Bass | uncommon | 10 | 30 | 70 | 8 | 10 |
| 6 | goldcarp | Golden Carp | rare | 25 | 75 | 85 | 12 | 20 |
| 7 | puffer | Pufferfish | rare | 25 | 75 | 85 | 12 | 20 |
| 8 | koi | Koi | epic | 30 | 120 | 100 | 20 | 50 |
| 9 | moonfin | Moonfin | legendary | 50 | 150 | 160 | 40 | 150 |

**Spawn cá** (GD duyệt 2026-11-09; số tạm để test): tại thời điểm cá cắn, Server random độ hiếm theo bảng dưới, rồi chọn đều một loài trong độ hiếm đó.

| Rarity | Tỷ lệ gốc | Mỗi điểm Rare Fish Luck | Ở mức +7 |
| --- | --- | --- | --- |
| common | 60,5% | -1,9% | 47,2% |
| uncommon | 25% | +0,5% | 28,5% |
| rare | 10% | +0,8% | 15,6% |
| epic | 4% | +0,5% | 7,5% |
| legendary | 0,5% | +0,1% | 1,2% |

- Rare Fish Luck cộng từ level, cần và ghế, tối đa +7. Thính không ảnh hưởng tỷ lệ spawn.
- Tổng tỷ lệ luôn bằng 100% ở mọi mức Luck.
- Dự kiến làm sau: bảo hiểm khi lâu không gặp cá hiếm (pity) và sự kiện cá hiếm theo hồ. Luật chi tiết chưa chốt.

**Random chiều dài** (GD duyệt 2026-11-06): sau khi user thắng minigame, Server random bậc kích thước, rồi random đều trong khoảng của bậc đó. Vị trí tính theo khoảng Min-Max của từng loài.

| Bậc | Tỷ lệ gốc | Vị trí trong khoảng Min-Max | Mỗi điểm Large Fish Luck |
| --- | --- | --- | --- |
| Thường | 70% | 0-60% | -2% |
| Lớn | 25% | 60-90% | +1,5% |
| Rất lớn | 4,9% | 90-99,9% | +0,5% |
| Tối đa | 0,1% | Đúng Max | Không đổi |

- Làm tròn đến 0,1 cm. Lưu dạng số nguyên theo đơn vị 0,1 cm (405 là 40,5 cm); UI hiển thị theo cm có 1 chữ số thập phân.
- Lưu kỷ lục chiều dài theo từng loài cho mỗi user.
- Large Fish Luck cộng từ level, cần và ghế, tối đa +7.

**Cần kiểm tra lại:** giá vé, giá cần và giá cá được cân bằng mô phỏng với tỷ lệ spawn cũ (60/25/10/4/1%); kiểm tra lại với tỷ lệ mới khi test thật.

## Bảng độ khó minigame

Số tạm để test (đề xuất 2026-11-06, chỉnh bằng mô phỏng, chưa kiểm chứng với người chơi thật). HP lấy từ bảng Fish Codex.

| Rarity | Thời gian (giây) | Kim chạy hết thanh (giây) | Vùng xanh gốc (% thanh) | Vùng vàng gốc (% thanh) | Trừ giờ khi trượt (giây) | Xê dịch sau mỗi tap (% thanh) |
| --- | --- | --- | --- | --- | --- | --- |
| common | 12 | 0,90 | 20 | 6 | 2 | 5-15 |
| uncommon | 13 | 0,80 | 16 | 5 | 2 | 10-25 |
| rare | 15 | 0,70 | 13 | 4,5 | 2,5 | 15-35 |
| epic | 17 | 0,60 | 11 | 4 | 3 | 20-50 |
| legendary | 20 | 0,55 | 9 | 4 | 3,5 | 30-70 |

- Kích thước thật = gốc x (1 + Hit Zone Increase / 100).
- Vùng vàng nằm trong vùng xanh, vị trí ngẫu nhiên trong vùng xanh.
- Sau mỗi lần tap, trúng hay trượt, vùng xanh dịch trái hoặc phải một khoảng ngẫu nhiên trong cột Xê dịch, tính so với vị trí cũ và không ra ngoài thanh đo.
- Trường hợp dài nhất cho một lần câu là 29 giây (Legendary): chờ 6 giây, 3 giây để bấm và 20 giây minigame.

## GD cần đặc tả trước triển khai phần phụ thuộc

Luồng dự kiến để viết acceptance: login → vào phòng → di chuyển/chọn ghế → mua vé → câu theo mục Quy trình câu cá → inventory/lịch sử; có chọn skin, chat/emoji, khoe cá và xem bảng xếp hạng, không có nhánh nhặt loot trong v1. Đây là khung mô tả; các điểm chưa chốt nằm ở từng mục.

GD cần khóa (lượt/vé, rời ghế và mất kết nối đã chốt ở mục Cơ chế ghế; các bước câu và thời hạn thính đã chốt ở mục Quy trình câu cá): quyền skin, phạm vi/trigger/cooldown social, chỉ số/phạm vi/chu kỳ/đồng hạng ranking, túi đầy và thành tích.

Không dùng cấp/giá trang bị để tự bảo đảm cá hiếm. Mỗi bước câu cần entry/exit, input, thời gian, hủy/timeout/disconnect/retry và animation trước nghiệm thu. Công thức và số balance chưa khóa; không tự điền thành yêu cầu.

Server quyết định kết quả cá, tiền, vật phẩm và tài nguyên. Client hiển thị phản hồi/input; mock không phải kết quả server thật.
