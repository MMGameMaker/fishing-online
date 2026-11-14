# Gameplay và scope Playable v0.1

## Đã chốt

- 2D Pixel Art; web client Phaser Engine + TypeScript.
- ASP.NET Core + SignalR; PostgreSQL + Redis. Admin React + TypeScript riêng, do BE thực hiện cùng Server; hai luồng Client kiêm Art và BE kiêm Admin.
- Một map hồ đi lại, 20 vị trí ngồi câu/phòng; phòng và Lake là một. Login, vào phòng, mua vé câu cá theo thời gian, đi tới ghế trống và nhấn F hoặc bấm icon chọn ghế để ngồi câu (GD cập nhật 2026-11-10; feedback người dùng 2026-11-11 đổi phím E thành F).
- Bản đầu có câu Manual và chế độ Idle (GD bổ sung 2026-11-10, mục Chế độ Idle).
- Chỉ cần có cần câu là câu được; mỗi người chơi mặc định có 1 cần cấp thấp. Bản đầu làm 5 loại cần (bảng Fishing Rod).
- 9 loài cá mẫu thuộc 5 bậc rarity (bảng Fish Codex); inventory, lịch sử câu, thành tựu cá nhân (mục Thành tựu, GD 2026-11-13).
- **Thính đã bỏ khỏi bản đầu theo quyết định 2026-11-09**: không item/shop/nút dùng/effect hoặc tác động thời gian chờ.
- Shop dùng Gold, có ledger: bán cần câu; user bán cá đã câu tại Shop. Gem không dùng trong bản đầu; chưa tự suy ra có shop Gem hoặc payment.
- Khoảng 5–10 skin nhân vật, chọn và đồng bộ; quyền dùng/mở khóa chưa khóa.
- Chat, emoji, thông báo khoe cá và bảng xếp hạng bắt buộc trong v1. Luật chat và khoe cá đã chốt 2026-11-13 (mục Chat và khoe cá); luật bảng xếp hạng chốt 2026-11-14 (mục Bảng xếp hạng); emoji (ưu tiên thấp) và chi tiết Idle GD mô tả sau.

Loot/nhặt đồ trên map (GD bỏ khỏi bản đầu 2026-11-05; user chỉ dùng tiền để mua vé), hệ thống mồi câu, dây và lưỡi (GD bỏ khỏi bản đầu 2026-11-06; bổ sung sau nếu quyết định triển khai), kỹ năng riêng của từng loài cá, giải đấu lớn (ngoài Giải đấu cần thủ ở mục Bảng xếp hạng) và payment thật kể cả sandbox để sau. V1 được hiểu là bản đầu đang mang nhãn v0.1, chưa tự đổi version release. Không thêm stamina, nông trại hoặc hệ ngày/đêm từ ảnh tham khảo vào v0.1.

## Vé câu cá và ghế

Cập nhật 2026-11-10 thay luật vé theo ghế (2026-11-05, 06 và 09). Vé không còn gắn với ghế; bỏ Tier ghế, buff ghế (Rare/Large Fish Luck, Lure Time), giá theo ghế và cooldown khi ghế về trống.

**Đã chốt** (GD cập nhật 2026-11-10):

- Vé là quyền câu cá theo thời gian. Trong thời gian vé còn hiệu lực, user câu ở bất kỳ ghế trống nào, không giới hạn ghế hay vị trí.
- Mua được nhiều vé một lần: tổng Gold = đơn giá vé × số lượng.
- Khu vực câu cá có 20 vị trí ngồi. Muốn câu, user đi tới ghế trống; khi icon chọn ghế hiện thì nhấn **F** hoặc bấm vào icon để ngồi (feedback 2026-11-11, thay phím E).
- Nhân vật chỉ di chuyển bằng phím (hoặc joystick trên mobile); bấm chuột lên map không làm nhân vật đi (feedback 2026-11-11).
- Sau khi bấm nút thu cần (mục Quy trình câu cá), user không được rời ghế.
- Vé mua bằng Gold; bản đầu không có nguồn vé miễn phí. Người chơi mới được tặng 100 Gold. Không hoàn vé.
- Mỗi vé là một block thời gian lấy từ config (`billingUnitMinutes`).
- Mua khi vé còn hạn thì cộng nối vào hạn hiện tại; mua khi không còn vé thì tính từ thời điểm mua. Không tự gia hạn.
- Đồng hồ vé chạy theo giờ Server từ lúc mua, kể cả khi không ngồi ghế hoặc mất kết nối.
- Mỗi ghế một người. Nhiều user cùng ngồi vào một ghế: Server chọn người tới trước, những người còn lại nhận thông báo "ghế đang được sử dụng". Mỗi user ngồi tối đa 1 ghế.
- Nhấn F (hoặc bấm icon) khi không có vé hoặc vé đã hết: mở popup mua vé.
- Rời ghế bằng phím di chuyển: nhân vật tự đứng dậy. Phím di chuyển bị chặn từ lúc user nhấn nút thu cần cho tới khi có kết quả minigame.
- Vé hết hạn khi đang minigame: cho câu nốt lần đó rồi kết thúc câu.
- Vé hết hạn khi đang chờ cá cắn (chưa thu cần): dừng câu, nhân vật tự đứng dậy ngay.
- Mất kết nối khi đang ngồi: giữ ghế khoảng 2 phút; quá hạn thì ghế trống. Lần câu đang dở, kể cả đang minigame, bị hủy ngay khi mất kết nối.
- Mua thêm khi còn vé luôn cộng đủ thời gian của số vé mua, kể cả khi tổng vượt 60 phút (ví dụ còn 55 phút, mua 1 vé thành 65 phút).
- **Tổng thời gian vé còn lại tối đa 24 giờ** (GD chốt 2026-11-13). Nếu thời gian còn lại cộng thời gian của số vé định mua vượt 24 giờ thì chặn, không trừ Gold, không cộng giờ; hiện thông báo: "Không thể vượt quá 24h câu cá, xin thử lại sau!". Server là bên kiểm tra cuối cùng.

**Số tạm để test** (GD 2026-11-10): 50 Gold cho mỗi vé 10 phút. Một lần mua tối đa 1 tiếng (6 vé). Tổng tối đa 24 giờ là luật, không phải số tạm.

**Giữ từ luật trước** (yêu cầu kỹ thuật, không đổi theo luật mới):

- Server tính giá; trừ Gold + ledger + cập nhật hạn vé + receipt trong một transaction. Gửi lại cùng request không trừ tiền hay cộng thời gian lần hai. Client gửi phiên bản giá đang hiển thị; giá đổi thì Server trả PRICE_CHANGED trước khi thu tiền.
- Rời ghế thì ghế trống ngay cho người khác, không cooldown.


## Quy trình câu cá

**Đã chốt** (GD bổ sung 2026-11-06, cập nhật bước 1-3 và 5 ngày 2026-11-10):

1. **Mua vé:** user chọn số vé, xác nhận tổng Gold rồi thanh toán (mục Vé câu cá và ghế).
2. **Ngồi câu:** user đi tới ghế trống, nhấn F hoặc bấm icon chọn ghế. Ngồi xong nhân vật **tự động vung cần**; không còn nút bấm để quăng câu.
3. **Cá cắn câu:** sau 3-6 giây kể từ khi vung cần, có tín hiệu cá cắn: chấm than trên đầu nhân vật, cần động đậy. Nút lớn có biểu tượng **móc câu** hiện gần giữa màn hình, kèm thanh đếm ngược 3 giây (feedback 2026-11-11, trước đây ở góc phải). Server chốt loài cá tại thời điểm này; chiều dài chỉ random khi bắt được cá.
   - Nhấn phím Space hoặc bấm nút móc câu (thu cần): sau 0,75 giây thì hiện minigame (feedback 2026-11-11; thời gian minigame tính từ lúc hiện). Từ lúc thu cần user không được rời ghế cho tới khi có kết quả.
   - Không nhấn kịp: hủy trạng thái câu, nhân vật **tự đứng dậy khỏi ghế**.
4. **Bắt cá (minigame):** một cây kim chạy qua lại trên thanh đo. Giao diện theo ảnh mẫu `doc/feedback/minigame-ui.png` (feedback 2026-11-11): đồng hồ tròn bên trái, thanh khoảng cách tới cá (số cm còn lại) ở trên, thanh đo ở dưới.
   - Bấm khi kim ở vùng xanh dương: kéo cá lại gần.
   - Bấm khi kim ở vùng vàng ("điểm yếu"): kéo được gấp đôi.
   - Bấm trượt ra ngoài vùng: bị trừ mạnh thời gian.
   - Thắng khi khoảng cách tới cá về 0. Thua khi hết giờ.
   - Độ khó minigame thay đổi theo độ hiếm của cá, cấu hình theo bảng: khoảng cách tới cá, độ rộng vùng và tốc độ kim tăng độ khó dần theo độ hiếm. Vùng xanh và vùng vàng luôn đổi vị trí sau mỗi lần tap; cá bậc thấp xê dịch ít hơn. Số liệu ở mục Bảng độ khó minigame.
5. **Kết quả:**
   - Thành công: popup gồm hình ảnh cá (hiện ngay khi popup mở), tên, độ hiếm và chiều dài, **chỉ user đó thấy**. Hiện text "Mới" khi câu được loài lần đầu, "Kỷ lục" khi con cá dài hơn mọi con cùng loài user từng câu. User **phải tự tắt popup bằng cách chạm/bấm ra ngoài popup** mới câu tiếp được (GD chốt 2026-11-10, xác nhận lại 2026-11-13); bấm nút share bên cạnh popup không tính là bấm ra ngoài. Tắt xong nhân vật tự vung cần lần mới (bước 3). Người chơi khác chỉ thấy hình cá trên đầu nhân vật của user vừa câu được; hình biến mất sau khoảng 5 giây.
   - Thất bại: hiện icon buồn/thất vọng trên đầu nhân vật, người chơi khác cũng thấy; rồi nhân vật tự vung cần lần mới (bước 3). Không nhận EXP.
   - Vé đã hết hạn trong lúc minigame: hiện kết quả như trên rồi kết thúc câu, không vung cần tiếp.

- Rời ghế bằng phím di chuyển, được phép bất cứ lúc nào trừ khoảng từ khi nhấn thu cần tới khi có kết quả minigame (thay luật cũ "user không thể tự hủy lần câu").
- Đã chốt 2026-11-09: Client tự xử lý minigame và gửi success/failed; Server chỉ quản attempt/ownership/deadline và trao tối đa 1 cá/attempt, không kiểm chứng tap. Chấp nhận gian lận thắng minigame nhưng không cấp cá/thưởng lặp.

**Chưa chốt:**

- Icon cá trên đầu nhân vật có khác nhau theo loài/độ hiếm không.

## Chế độ Idle

**Đã chốt** (GD bổ sung 2026-11-10): khi bật Idle, hệ thống tự làm thay user, lặp liên tục cho tới khi user rời ghế:

1. Tự nhấn nút thu cần khi cá cắn câu.
2. Trong minigame, tự bấm trúng vùng xanh nước biển (Normal Hit Zone); không nhắm vùng vàng.
3. Tự tắt popup nhận cá.
4. Tự vung cần câu con tiếp theo.

Idle chỉ trúng vùng xanh nên mỗi lần trúng trừ HP bằng ATK, không có lần nào gấp đôi; cá càng hiếm càng tốn nhiều lần bấm.

**GD mô tả chi tiết sau.** Các điểm cần có trước khi triển khai Idle:

- Bật/tắt Idle ở đâu, có điều kiện gì (ví dụ cần vé, cấp độ, hay mở mặc định).
- Idle có chạy khi tắt tab hoặc mất kết nối không. Hiện minigame do Client tính, nên Idle cần game đang mở; muốn câu khi offline thì Server phải tự tính kết quả.
- Nhịp tự bấm trong minigame, và Idle có thể thua không (hết giờ trước khi kéo được cá hiếm).
- Có giới hạn thời gian Idle, chống treo máy farm Gold, hoặc giảm thưởng so với câu tay không.

**Tham khảo:** clip `ref minigame.mp4` chỉ minh họa cơ chế minigame; art/UI tự làm. Số đo được trong clip (khoảng 12 giây; trúng thường trừ 10 cm, điểm yếu trừ 20 cm) không phải yêu cầu.

## Chat và khoe cá

**Đã chốt** (GD 2026-11-13):

**Chat**

- Bản đầu chỉ có chat chung (chat all) trong khung UI chat; chưa làm chat riêng (private).
- Mỗi lần gửi tối đa 160 ký tự.
- Gửi xong, nội dung hiện thành bong bóng trên đầu nhân vật của người gửi, tồn tại 10 giây.

**Khoe cá kiểu 1 — hệ thống tự thông báo**

- Trigger: user câu được một loài cá chưa từng có ai câu được.
- Hiện cho tất cả user: thông báo text nhỏ chạy ngang ở nửa trên màn hình, chạy lặp 3 lần.
- Đồng thời ghi lại một bản vào khung chat (tin hệ thống).
- Nội dung: "Chúc mừng [username] là người đầu tiên câu được [tên cá]".
- Server xác định "người đầu tiên"; nếu hai người bắt cùng loài gần như đồng thời thì chỉ người được Server ghi nhận trước được thông báo.

**Khoe cá kiểu 2 — người chơi tự khoe trong chat**

- Có nút share cạnh popup Catch Fish. User bấm nút thì thông tin con cá vừa câu được gửi vào khung chat.
- Nội dung: "Tôi đã câu được [tên cá] [độ hiếm] [chiều dài]".
- [tên cá] là liên kết: người khác bấm vào thì mở popup Catch Fish hiển thị đúng con cá được khoe (loài, độ hiếm, chiều dài).
- Mỗi con cá chỉ được share 1 lần; share xong nút share không bấm được nữa.
- Popup Catch Fish mở từ liên kết không hiện tên người câu, không hiện nhãn "Mới" hay "Kỷ lục".
- Thông tin khoe lấy từ bản ghi con cá trên Server, Client không tự gửi tên/độ hiếm/chiều dài.

- Bản đầu chưa lọc từ ngữ chat.
- Chống spam: mỗi user gửi chat cách nhau ít nhất 2 giây; Server từ chối tin gửi sớm hơn.
- Khung chat giữ 50 tin gần nhất, tính cả tin hệ thống và tin share. Server lưu 50 tin này; user vào sau hoặc kết nối lại thấy 50 tin đó, tin cũ hơn bị bỏ (Claude đề xuất, GD duyệt 2026-11-13).

## Thành tựu

**Đã chốt** (GD 2026-11-13; số liệu tạm để test):

| # | Tên | Điều kiện đếm | Lv1 | Lv2 | Lv3 | Lv4 | Lv5 | Thưởng mỗi level |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Cần thủ chăm chỉ | Tổng số cá đã câu | 10 | 50 | 200 | 500 | 1.000 | 100 Gold |
| 2 | Nhà sưu tầm | Số loài cá đã mở khóa | 3 | 6 | 9 | 12 | 15 | 100 Gold |
| 3 | Săn cá hiếm | Số cá bậc Rare trở lên đã câu | 5 | 20 | 50 | 100 | 150 | 100 Gold |
| 4 | Huyền thoại hồ câu | Số cá Legendary đã câu | 1 | 3 | 5 | 10 | 15 | 100 Gold |
| 5 | Cá khủng | Số cá đạt kích thước tối đa | 1 | 3 | 5 | 7 | 10 | 100 Gold |
| 6 | Người tiên phong | Số loài user là người đầu tiên câu được (khoe cá kiểu 1) | 1 | 3 | 5 | 7 | 10 | 100 Gold |
| 7 | Thương nhân | Tổng Gold kiếm được từ bán cá | 500 | 2.000 | 10.000 | 50.000 | 70.000 | 100 Gold |
| 8 | Người bền bỉ | Thời gian ngồi câu | 60 | 360 | 600 | 3.000 | 5.000 | 100 Gold |

- Mỗi thành tựu có 5 level, điều kiện là mốc cộng dồn. Đạt mốc level nào thì nhận thưởng level đó một lần; đủ 5 level là nhận thưởng 5 lần.
- Phần thưởng hiển thị dạng icon và số đè lên biểu tượng của thành tựu.
- Đạt mốc mà chưa nhận thưởng: hiện chấm tròn đỏ ở góc trên bên phải thành tựu để user chú ý bấm vào.
- Khi chưa nhận thưởng, thanh tiến độ giữ ở mức đầy của level đang chờ nhận (ví dụ Lv1 = 10 cá thì hiện 10/10), nhưng hệ thống vẫn đếm tiếp và cộng vào level sau. Nhận thưởng xong UI cập nhật theo số đếm thật (ví dụ đã câu 14 cá thì hiện Lv2 14/50).
- Nếu số đếm đã vượt nhiều mốc, mỗi lần nhận chỉ nhận một level; chấm đỏ còn cho tới khi nhận hết các level đã đạt (Claude đề xuất cách hiểu, chờ GD xác nhận).
- Server đếm tiến độ và trao thưởng; nhận thưởng ghi ledger, gửi lại cùng request không nhận hai lần.

**Cần GD chốt:**

- Nhà sưu tầm Lv4–Lv5 (12, 15 loài) và Người tiên phong Lv4–Lv5 (7, 10 loài) vượt hoặc sát số loài hiện có (9 loài): giữ để chờ thêm loài sau, hay chỉnh mốc.
- Cá khủng: "kích thước tối đa" có phải bậc Tối đa (0,1%, đúng Max) trong bảng Random chiều dài không. Nếu đúng, Lv5 (10 con) cần khoảng 10.000 cá thắng, rất khó đạt.
- Người bền bỉ: đơn vị là phút phải không (60 phút = 1 giờ); có tính thời gian ngồi ở chế độ Idle không.
- Lần câu ở chế độ Idle có được tính cho các thành tựu khác không.
- Thành tựu có mở danh hiệu (ô danh hiệu ở màn Tài khoản) không.

## Bảng xếp hạng

**Đã chốt** (GD 2026-11-14): bảng xếp hạng áp dụng cho toàn server, gồm 2 loại.

**Loại 1 — Tổng số cá câu được trong tuần**

- Điểm là tổng số cá câu thành công trong tuần. Tuần bắt đầu thứ Hai 00:00 giờ Việt Nam.
- Đồng hạng: ai đạt số điểm đó trước xếp trên.
- Chống gian lận: mỗi lần câu (attempt) chỉ được tính một lần; Client gửi lại kết quả không cộng điểm lần hai.
- Hiển thị phân trang, có thời điểm cập nhật; dòng của user được tô nổi.
- Nghiệm thu: dữ liệu mẫu 3 người cho ra thứ hạng đúng; gửi lặp kết quả một lần câu không cộng điểm 2 lần.

**Loại 2 — Giải đấu cần thủ** (GD cập nhật 2026-11-14)

- Tổ chức theo đợt, Admin kích hoạt thủ công vào một ngày trong tuần. Lịch có thể thay đổi linh hoạt về sau.
- Giải mở từ 7:00 đến 22:00 cùng ngày. Tổng kết và trao thưởng lúc 7:00 sáng hôm sau.
- Mỗi con cá câu được trong giờ giải cho một lượng điểm theo bảng điểm cá (GD gửi sau). User thi đua tổng điểm tích lũy.
- Mọi con cá câu được trong giờ giải đều có điểm theo độ hiếm (bảng dưới).
- Cá vương miện (GD 2026-11-14): khi tạo giải, Admin chọn một hoặc một số loài có thể ra vương miện và đặt tỷ lệ ra vương miện cho từng loài. Tỷ lệ spawn loài/độ hiếm giữ nguyên; khi câu được con cá thuộc loài đã chọn, hệ thống random thêm theo tỷ lệ đó để quyết định con cá có vương miện hay không. Cá có vương miện nhận x2 điểm và được đánh dấu vương miện trong UI. User xem điểm từng loài, kể cả cá chỉ định, trong UI giải đấu.
- Chỉ tính cá câu được trong giờ giải, theo thời điểm Server ghi nhận câu thành công. Lần câu thắng sau 22:00 không tính, kể cả khi bắt đầu trước đó. Cá có sẵn trong túi từ trước không được tính.
- Đồng hạng và chống tính trùng làm như Loại 1.
- Điểm mỗi con cá theo độ hiếm (GD 2026-11-14, số tạm để test). Cột "Cá vương miện" là điểm x2 khi con cá có vương miện:

| Độ hiếm | Điểm | Cá vương miện |
| --- | --- | --- |
| Common | 1 | 2 |
| Uncommon | 6 | 12 |
| Rare | 10 | 20 |
| Epic | 20 | 40 |
| Legendary | 50 | 100 |

- Phần thưởng Giải đấu cần thủ (top 20):

| Hạng | Thưởng |
| --- | --- |
| 1 | 500 Gold + danh hiệu "Thiên tài câu cá" (hết hạn khi giải mới bắt đầu) |
| 2 | 350 Gold |
| 3 | 250 Gold |
| 4–5 | 200 Gold |
| 6–10 | 150 Gold |
| 11–20 | 100 Gold |

- Kết quả giải được xem lại cho tới khi có giải mới.

**Chung cho cả hai bảng**

- Hiển thị top 50 người, kèm dòng của user nếu ngoài top.
- Phần thưởng bảng tuần (top 50, trao khi hết tuần):

| Hạng | Thưởng |
| --- | --- |
| 1 | 400 Gold |
| 2 | 300 Gold |
| 3 | 250 Gold |
| 4 | 200 Gold |
| 5 | 150 Gold |
| 6–10 | 100 Gold |
| 11–20 | 75 Gold |
| 21–50 | 50 Gold |

- Thưởng trao theo thứ hạng cuối cùng, không yêu cầu điểm tối thiểu.
- Điểm của chính user cập nhật ngay khi câu được cá; thứ hạng làm mới 30 phút một lần (GD duyệt đề xuất 2026-11-14). Từ 22:00 tới lúc tổng kết 7:00, bảng giải đấu vẫn tiếp tục cập nhật theo nhịp này để chốt thứ hạng; điểm chỉ tính cá câu trong 7:00–22:00.
- Không làm hòm thư. Đề xuất (chờ GD xác nhận): thưởng tự cộng vào tài khoản lúc tổng kết, lần vào game tiếp theo hiện popup báo hạng và phần thưởng.

**Cần GD chốt:**

- UI trang bị danh hiệu (GD cập nhật sau).
- Lần câu ở chế độ Idle có được tính điểm cho 2 bảng không.
- Có loại khỏi phần thưởng các tài khoản bị cảnh báo nghi vấn gian lận (BE-E-09) không.

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
| 1 | minnow | Anchovy | common | 7.5 | 22.5 | 55 | 5 | 5 |
| 2 | perch | Yellow Perch | common | 7.5 | 22.5 | 55 | 5 | 5 |
| 3 | carp | Bluegills | common | 7.5 | 22.5 | 55 | 5 | 5 |
| 4 | trout | Arctic Char | uncommon | 10 | 30 | 70 | 8 | 10 |
| 5 | bass | Bass | uncommon | 10 | 30 | 70 | 8 | 10 |
| 6 | goldcarp | Golden Goldfish | rare | 25 | 75 | 85 | 12 | 20 |
| 7 | puffer | Puffer Fish | rare | 25 | 75 | 85 | 12 | 20 |
| 8 | koi | Koi Carp | epic | 30 | 120 | 100 | 20 | 50 |
| 9 | moonfin | Marlin | legendary | 50 | 150 | 160 | 40 | 150 |

**Spawn cá** (GD duyệt 2026-11-09; số tạm để test): tại thời điểm cá cắn, Server random độ hiếm theo bảng dưới, rồi chọn đều một loài trong độ hiếm đó.

| Rarity | Tỷ lệ gốc | Mỗi điểm Rare Fish Luck | Ở mức +6 |
| --- | --- | --- | --- |
| common | 60,5% | -1,9% | 49,1% |
| uncommon | 25% | +0,5% | 28% |
| rare | 10% | +0,8% | 14,8% |
| epic | 4% | +0,5% | 7% |
| legendary | 0,5% | +0,1% | 1,1% |

- Rare Fish Luck cộng từ level và cần, tối đa +6 (Lv10 +4, Giant Caster +2). Ghế không còn cộng Luck từ 2026-11-10.
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
- Large Fish Luck cộng từ level và cần, tối đa +6. Ghế không còn cộng Luck từ 2026-11-10.

**Cần kiểm tra lại:** giá vé, giá cần và giá cá được cân bằng mô phỏng với tỷ lệ spawn cũ (60/25/10/4/1%) và buff/giá theo Tier ghế đã bỏ. Cần chạy lại mô phỏng với giá test 50 Gold/vé 10 phút, không buff ghế, thời gian chờ cá cắn cố định 3-6 giây, và thêm trường hợp Idle (chỉ trúng vùng xanh, tự đóng popup).

## Bảng độ khó minigame

Số tạm để test (đề xuất 2026-11-06, chỉnh bằng mô phỏng, chưa kiểm chứng với người chơi thật). HP lấy từ bảng Fish Codex.

| Rarity | Thời gian (giây) | Kim chạy hết thanh (giây) | Vùng xanh gốc (% thanh) | Vùng vàng gốc (% thanh) | Trừ giờ khi trượt (giây) | Xê dịch sau mỗi tap (% thanh) |
| --- | --- | --- | --- | --- | --- | --- |
| common | 12 | 0,72 | 20 | 6 | 2 | 5-15 |
| uncommon | 13 | 0,64 | 16 | 5 | 2 | 10-25 |
| rare | 15 | 0,56 | 13 | 4,5 | 2,5 | 15-35 |
| epic | 17 | 0,48 | 11 | 4 | 3 | 20-50 |
| legendary | 20 | 0,44 | 9 | 4 | 3,5 | 30-70 |

- Cột "Kim chạy hết thanh" đã giảm 20% so với đề xuất 2026-11-06 theo feedback người dùng 2026-11-11 (kim nhanh hơn).
- Kích thước thật = gốc x (1 + Hit Zone Increase / 100).
- Vùng vàng nằm trong vùng xanh, vị trí ngẫu nhiên trong vùng xanh.
- Sau mỗi lần tap, trúng hay trượt, vùng xanh dịch trái hoặc phải một khoảng ngẫu nhiên trong cột Xê dịch, tính so với vị trí cũ và không ra ngoài thanh đo.
- Trường hợp dài nhất cho một lần câu là 29 giây (Legendary): chờ 6 giây, 3 giây để bấm và 20 giây minigame.

## GD cần đặc tả trước triển khai phần phụ thuộc

Luồng dự kiến để viết acceptance: login → vào phòng → mua vé → đi tới ghế trống, nhấn F → tự câu theo mục Quy trình câu cá (Manual hoặc Idle) → inventory/lịch sử; có chọn skin, chat/emoji, khoe cá và xem bảng xếp hạng, không có nhánh nhặt loot trong v1. Đây là khung mô tả; các điểm chưa chốt nằm ở từng mục.

GD cần khóa: các điểm còn mở ở mục Vé câu cá và ghế, Quy trình câu cá, Chế độ Idle và Chat và khoe cá; quyền skin, emoji, các điểm còn mở ở mục Bảng xếp hạng, túi đầy và các điểm còn mở ở mục Thành tựu.

Không dùng cấp/giá trang bị để tự bảo đảm cá hiếm. Mỗi bước câu cần entry/exit, input, thời gian, hủy/timeout/disconnect/retry và animation trước nghiệm thu. Công thức và số balance chưa khóa; không tự điền thành yêu cầu.

Client quyết định thắng/thua minigame; Server quyết định loài/chiều dài/EXP/catch, tiền và tài nguyên, tối đa 1 cá mỗi attempt hợp lệ; mock không phải kết quả server thật.

## Quần thể hữu hạn và vận hành hồ (2026-11-09)

Cá trong mỗi hồ hữu hạn theo loài: đợt Admin thả cộng dồn vào số còn tồn, được thả tiếp nhiều lần, không reset/ghi đè pool; bắt thành công giảm đúng 1. Admin chọn hồ, loài, số lượng và thời gian thả. Reservation tại bite được duyệt 2026-11-09; tồn ban đầu và xử lý loài/hồ cạn cá chưa có lựa chọn cụ thể; không tự dùng RNG vô hạn làm fallback. Task map mới/thả cá nằm ở docs/v01.


## Quyết định M0 ngày 2026-11-09

User đồng ý các đề xuất cụ thể còn lại của M0; minigame xử lý cục bộ, pool thả cộng dồn và BE không bắt buộc song song. Xem SPEC0.4: Server không tin số cá/loài/phần thưởng do Client gửi; báo thắng giả được chấp nhận nhưng attempt terminal chỉ settle một lần. Các field chưa có giá trị (giá cuối/min-max/initial pool/cạn cá) tiếp tục bổ sung từng task; không tự điền hoặc tuyên bố cổng M0 đã test đạt.
