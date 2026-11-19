# Đề xuất: Giúp đỡ câu, Hội câu, Câu theo nhóm

> **Trạng thái: ĐỀ XUẤT (2026-11-18), chưa phải quyết định đã chốt.** Do Claude soạn theo yêu cầu của Zen, chỉ gồm ý tưởng và luật dự kiến, **không có code**. Mọi con số là số tạm để thảo luận, không phải số balance. Phần nào GD duyệt thì mới chuyển vào `doc/GAMEPLAY_SCOPE.md` và `docs/PROJECT.md`.
>
> Ngoài phạm vi v0.1 hiện hành: `GAMEPLAY_SCOPE.md` chỉ chốt bản đầu gồm câu Manual và Idle, chat/khoe cá, bảng xếp hạng, thành tựu, bạn bè. Tài liệu này là hướng mở rộng cho các bản sau.

## 1. Vì sao cần ba tính năng này

Hiện tại mọi người cùng ngồi một hồ (Hồ Tây, 20 ghế) nhưng **mỗi người câu một mình**. Người khác chỉ thấy hình cá trên đầu và dòng chúc mừng. Hậu quả: không có lý do để ngồi cạnh nhau, không có lý do giữ liên lạc với bạn, thiếu mục tiêu dài hạn ngoài bảng xếp hạng cá nhân.

Ba tính năng giải quyết ba nhu cầu khác nhau, xếp từ nhẹ đến nặng:

| Tính năng | Nhu cầu | Quy mô | Độ nặng triển khai |
| --- | --- | --- | --- |
| Giúp đỡ câu | Cảm giác "có người bên cạnh" ngay trong lúc câu | 2 người, tức thời | Nhẹ |
| Câu theo nhóm | Chơi cùng bạn bè, cùng mục tiêu ngắn | 2–6 người, theo phiên | Vừa |
| Hội câu | Cộng đồng lâu dài, mục tiêu tuần/mùa | 10–50 người, dài hạn | Nặng |

### Nguyên tắc chung (áp dụng cho cả ba)

1. **Không pay-to-win.** Không bán lợi thế cho người trả tiền; bản đầu chưa có payment thật.
2. **Server là bên quyết định** cá, EXP, Gold và phần thưởng. Client chỉ hiển thị và gửi yêu cầu, như luật M0 đã chốt.
3. **Hỗ trợ có trần.** Bất kỳ buff nào từ người khác đều có giới hạn cứng để không phá cân bằng độ hiếm và không tạo nghề "cày hộ".
4. **Giúp nhau không được rẻ hơn tự câu**, và **tự câu một mình vẫn là cách chơi hoàn chỉnh**. Tính năng xã hội là phần thêm, không phải bắt buộc.
5. **Khớp luật hiện có:** vé câu theo thời gian, mỗi ghế một người, tối đa 24 giờ vé, không có mồi/dây/lưỡi, không có Gem.
6. **Chống lạm dụng ngay từ đầu:** mọi phần thưởng xã hội có giới hạn theo ngày và theo cặp người (mục 7).

## 2. Giúp đỡ câu

Ý tưởng: người đang ngồi câu có thể **nhận trợ giúp ngắn** từ người chơi khác trong hồ, và người giúp **nhận phần thưởng xã hội nhỏ** (không phải Gold dễ cày).

### 2.1. Cổ vũ (nhẹ nhất, nên làm trước)

- Khi ai đó **đang trong minigame**, người khác trong hồ thấy một nút **"Cổ vũ"** nổi trên đầu nhân vật đó (bấm được trong tầm nhìn).
- Mỗi lượt cổ vũ gây hiệu ứng nhỏ trên đầu người câu (tim, pháo giấy) và **tăng tạm thời vùng trúng** của người câu một ít (số tạm: +5% vùng thường trong lần minigame đó).
- **Trần:** tối đa 3 người cổ vũ/lần câu, tổng không quá +15%. Không cộng dồn qua nhiều lần câu.
- **Người cổ vũ nhận:** 1 "Điểm Nghĩa Tình" (mục 2.5), không nhận Gold, không nhận EXP.
- Mục tiêu: ai cũng tham gia được chỉ bằng một cú bấm, kể cả khi không có vé.

### 2.2. Kéo giúp (cá hiếm cần hai người)

- Chỉ với cá bậc **Sử thi trở lên** (ví dụ Cá Koi, Mực): khi cá cắn câu, người câu thấy nút **"Gọi giúp"** cạnh nút thu cần.
- Người ngồi **ghế liền kề** (hoặc cùng nhóm, xem mục 3) bấm **"Kéo giúp"** trong vòng 3 giây để vào chế độ phụ.
- Trong minigame, người phụ có **một thanh kim riêng** (đơn giản hơn: chỉ có vùng xanh, không có vùng vàng). Mỗi lần người phụ bấm trúng vùng xanh trừ thêm HP cá (bằng 50% ATK của người phụ).
- **Người chính vẫn là người quyết định thắng/thua** và là người nhận cá vào túi (giữ luật "tối đa 1 cá/attempt" và "popup chỉ người đó thấy").
- **Người phụ nhận:** EXP bằng 30% EXP của con cá, cộng 2 Điểm Nghĩa Tình. Không nhận cá.
- Người phụ phải đang ngồi ghế và **đang có vé** (để không biến thành vé miễn phí) hoặc không cần vé nhưng chỉ nhận Điểm Nghĩa Tình, không EXP. (Câu hỏi cần GD chốt, mục 9.)

### 2.3. Vớt cứu (cứu thua cuộc)

- Khi người câu **sắp hết giờ minigame** và cá còn xa, người ngồi cạnh thấy nút **"Vớt cứu"**.
- Bấm được **một lần mỗi lần câu**; cho người câu thêm 3 giây. Không hoàn thành thay.
- Mỗi người chỉ vớt cứu cùng một người tối đa 3 lần/ngày để chống thông đồng.

### 2.4. Nhờ giúp / Dẫn người mới

- **Bóng "Cần giúp":** người chơi mới (cấp 1–3, hoặc chưa câu đủ 10 cá) có thể bật cờ "Mới chơi"; người khác nhìn thấy huy hiệu nhỏ bên tên và bấm **"Chỉ dẫn"** để mở một lời nhắn gợi ý định sẵn (cách ngồi, cách vào minigame, cách mua vé).
- **Đàn anh dẫn đường:** người chơi cấp 5 trở lên giúp ít nhất 3 người mới (người mới câu được cá đầu tiên sau khi được chỉ dẫn) nhận danh hiệu **"Đàn anh Hồ Tây"** và huy hiệu. Danh hiệu mới nằm trong danh sách danh hiệu đang có.
- Không có phần thưởng Gold, chỉ danh hiệu, để không biến thành đường cày tài khoản phụ.

### 2.5. Điểm Nghĩa Tình

- Một loại điểm xã hội, **không phải tiền tệ**, chỉ cộng khi giúp người khác.
- Dùng để mở khóa: **danh hiệu**, **khung avatar**, **emoji** hiếm, **huy hiệu cạnh tên**. Không đổi được Gold, vé hay cần câu.
- Giới hạn cộng mỗi ngày (số tạm: 30 điểm/ngày) và mỗi cặp người (tối đa 5 điểm/cặp/ngày).
- Hiển thị trong màn Tài khoản: tổng điểm, mốc kế tiếp, các phần thưởng đã mở.

### 2.6. Tương tác với Idle

- Người đang **Idle** có thể **nhận** cổ vũ và kéo giúp (Idle tự bấm vùng xanh, nên người phụ vẫn có ích).
- Người đang Idle **không thể** giúp người khác (chống treo máy cày điểm).

## 3. Câu theo nhóm

Ý tưởng: bạn bè **tạo nhóm** (tối đa 4–6 người), ngồi gần nhau và **cùng đạt mục tiêu ngắn** trong một phiên câu.

### 3.1. Lập nhóm

- Mời từ **danh sách bạn bè** hoặc từ **popup thông tin người chơi** (đang có nút kết bạn, thêm nút "Mời nhóm").
- Nhóm tối đa **4 người ở bản đầu** (có thể tăng 6 sau). Có **trưởng nhóm** (người mời), trưởng nhóm đổi được.
- Nhóm **không bắt buộc ngồi chung hàng**; có nút "Về chỗ trưởng nhóm" chỉ dẫn tới ghế trống gần nhất.
- Nhóm tự giải tán khi mọi người rời hồ, hoặc khi trưởng nhóm bấm "Giải tán".
- Hiển thị: **khung nhóm** nhỏ ở góc trên trái (ảnh nhân vật, tên, trạng thái: đang câu, đang chờ, vừa câu được), dấu **chấm màu nhóm** trên đầu mỗi thành viên.

### 3.2. Ghế nhóm

- Khu hồ có **ghế quanh bàn** (ngồi chơi). Đề xuất **bàn nhóm**: 2–4 ghế liền nhau; nhóm nào chiếm bàn thì mọi ghế câu kề nhau được giữ **15 giây** khi cả nhóm đang tiến lại (chống bị chen).
- Server vẫn giữ luật: **mỗi ghế một người, ai tới trước được ghế**. Phần giữ chỗ chỉ là hạn ngắn, hết hạn là ghế mở lại.

### 3.3. Chuỗi nhóm (Combo)

- Khi **các thành viên liền kề** cùng bắt cá thành công trong vòng **30 giây**, nhóm đạt **Chuỗi**.
- Chuỗi 2: +10% EXP cho những người trong chuỗi, Chuỗi 3: +20%, Chuỗi 4: +30% (số tạm, trần 30%).
- Chuỗi không tăng độ hiếm hay kích cỡ cá, chỉ EXP. Tránh phá luật "Rare/Large Fish Luck" theo cấp và cần.
- Thanh **Chuỗi** hiện ở khung nhóm, có hiệu ứng nhẹ.

### 3.4. Nhiệm vụ nhóm (theo phiên)

Nhóm nhận ngẫu nhiên **1 nhiệm vụ** khi lập, hoàn thành trong 30 phút:

| Ví dụ nhiệm vụ | Điều kiện | Thưởng (số tạm) |
| --- | --- | --- |
| Cả nhóm 20 cá | Tổng số cá cả nhóm ≥ 20 | 100 Gold chia đều |
| Ba loài khác nhau | Mỗi người một loài khác nhau | Điểm Nghĩa Tình |
| Cá lớn | Có ít nhất 1 cá nặng hơn mốc theo loài | EXP thưởng |
| Mọi người cùng thắng | Không ai thất bại trong 10 lần | Khung avatar tạm |

- Thưởng **chỉ phát khi cả nhóm có người thật** (đếm nhóm có tối thiểu 2 người thật; bot không tính).
- Trần: 3 nhiệm vụ nhóm/ngày/người để không biến thành nguồn Gold chính.

### 3.5. Cá khổng lồ (câu đồng đội theo sự kiện)

- Admin (hoặc lịch cố định) thả một **cá khổng lồ** vào hồ trong khung giờ sự kiện (ví dụ Mực khổng lồ). Đây là một dạng "boss" nhưng không tấn công ai.
- Cá khổng lồ có **thanh HP chung toàn hồ**. Mọi người đang ngồi ghế (có vé) có nút **"Kéo cá khổng lồ"** thay cho vòng câu thường: mỗi lần bấm trúng vùng xanh trừ HP chung.
- Khi HP về 0, **mọi người đóng góp đủ ngưỡng** (số tạm: ≥ 5 lần bấm trúng) nhận **phần thưởng chia theo đóng góp** (Gold, EXP, vật phẩm trang trí hiếm, danh hiệu sự kiện). **Người kết liễu** nhận thêm một món nhỏ.
- Hết giờ mà HP chưa về 0: cá thoát, mọi người nhận **an ủi** nhỏ.
- Bám sát luật "Quần thể hữu hạn": cá khổng lồ phải **là một mục thả riêng của Admin**, không lấy từ pool loài thường, và không dùng RNG vô hạn làm fallback.
- Đây là điểm **phối hợp lớn nhất**, nên làm sau cùng (xem mục 8).

### 3.6. Câu đối kháng nhóm (tùy chọn, sau này)

- **Đua nhóm 10 phút:** hai nhóm cùng thi tổng điểm theo bảng điểm cá của Giải đấu cần thủ; nhóm thắng nhận thưởng.
- Dùng lại **bảng điểm cá** có sẵn, không tạo bảng điểm mới.

## 4. Hội câu

Ý tưởng: **Hội câu** là nhóm lâu dài, có tên, huy hiệu, quỹ chung, nhiệm vụ tuần và bảng xếp hạng riêng. Tên gợi ý của tính năng: **"Hội Câu Hồ Tây"** và các hội con do người chơi đặt tên.

### 4.1. Lập hội và gia nhập

- Điều kiện tạo hội: **cấp 5 trở lên** và trả phí lập hội bằng Gold (số tạm: 1.000 Gold, là **gold sink** hữu ích).
- Thông tin hội: **tên** (3–16 ký tự, chặn từ cấm, không trùng không phân biệt hoa thường), **biểu ngữ** (khẩu hiệu ≤ 60 ký tự), **huy hiệu** (chọn từ bộ có sẵn: hình cá, mỏ neo, cần câu, kết hợp màu), **thẻ hội** (3–4 ký tự, hiện cạnh tên).
- Gia nhập: **mở** (vào thẳng), **duyệt** (gửi đơn, hội trưởng/hội phó duyệt), hoặc **mời** (chỉ ai được mời). Mỗi người **một hội tại một thời điểm**.
- Rời hội: được phép bất cứ lúc nào, nhưng **không được vào hội khác trong 24 giờ** (tránh nhảy hội lấy thưởng).
- Người bị kick/hội giải tán: giữ mọi thứ cá nhân, chỉ mất quyền lợi hội.

### 4.2. Vai trò và quyền

| Vai trò | Số lượng | Quyền |
| --- | --- | --- |
| Hội trưởng | 1 | Mọi quyền; chuyển nhượng; giải tán |
| Hội phó | tối đa 3 | Duyệt đơn, mời, kick thành viên thường, đăng thông báo |
| Thành viên | còn lại | Câu, quyên góp, làm nhiệm vụ, chat hội |

- Hội trưởng không hoạt động quá **14 ngày**: quyền tự chuyển cho hội phó hoạt động gần nhất (hoặc thành viên đóng góp nhiều nhất).
- Mọi thao tác quyền lực (kick, duyệt, giải tán) ghi **audit** để Admin tra khi có khiếu nại.

### 4.3. Cấp hội và quy mô

| Cấp hội | Số thành viên tối đa | Mở khóa |
| --- | --- | --- |
| 1 | 10 | Chat hội, nhiệm vụ tuần |
| 2 | 20 | Khung huy hiệu, quỹ hội |
| 3 | 30 | Bàn hội (khu ghế riêng ưu tiên) |
| 4 | 40 | Buff nhỏ toàn hội (mục 4.5) |
| 5 | 50 | Trang trí hội, danh hiệu hội mùa |

- **Điểm Hội** tích lũy từ hoạt động của thành viên (cá câu được, nhiệm vụ tuần, quyên góp). Đạt mốc là lên cấp.
- Số thành viên/cấp và mốc điểm là **số tạm**.

### 4.4. Quỹ hội và quyên góp

- Thành viên có thể **quyên góp Gold** vào quỹ hội (tối thiểu 10 Gold, tối đa theo ngày 500/người).
- Quỹ hội dùng để: **nâng cấp** cấp hội, **mua trang trí**, **tổ chức sự kiện nội bộ** (giải hội), **thưởng nhiệm vụ tuần** (tự động).
- **Rút quỹ cá nhân bị cấm** để tránh biến quỹ thành két chung có thể bị rút trộm. Chỉ chi cho các mục định sẵn.
- Mọi khoản thu/chi quỹ có **ledger**, đúng tinh thần ledger Gold hiện có.

### 4.5. Buff hội (nhẹ, có trần)

Từ cấp hội 4, toàn hội nhận **buff nhỏ nhưng không ảnh hưởng độ hiếm**:

- +3% EXP khi câu (không cộng dồn với Chuỗi nhóm quá trần chung).
- Giảm 5% giá vé câu cá (bám đúng nguyên tắc vé do Server tính giá).
- Tuyệt đối **không** có buff Rare/Large Fish Luck, để giữ độ hiếm công bằng với người ngoài hội.

### 4.6. Nhiệm vụ tuần của hội

Mỗi tuần (khớp tuần bảng xếp hạng: **thứ Hai 00:00 giờ Việt Nam**) hội có **3 nhiệm vụ chung**, ví dụ:

| Nhiệm vụ | Mục tiêu (tạm) | Thưởng |
| --- | --- | --- |
| Hội câu chăm chỉ | Cả hội câu 500 cá | Điểm Hội + Gold vào quỹ |
| Kho cá đa dạng | Gom đủ 9 loài trong tuần | Trang trí hội |
| Đồng lòng | Có ít nhất 10 thành viên cùng câu trong tuần | Khung avatar hội |

- Mỗi thành viên có **đóng góp cá nhân** hiển thị rõ; ai đóng góp tối thiểu mới nhận phần thưởng cá nhân (số tạm: ≥ 20 cá) để tránh "ăn theo".
- Thưởng quỹ cho hội, thưởng cá nhân cho từng người; **không phát thưởng trùng với thưởng Giải đấu cần thủ**.

### 4.7. Bảng xếp hạng hội và mùa

- Thêm **Loại 3 — Hội câu** vào mục Bảng xếp hạng: điểm = tổng cá của thành viên trong tuần, đồng hạng ai đạt trước xếp trên (giống Loại 1).
- **Mùa hội** (4–8 tuần): cuối mùa top 3 hội nhận **danh hiệu mùa** cho toàn thành viên đóng góp đủ ngưỡng, và **khung huy hiệu mùa** vĩnh viễn.
- Khác với giải đấu cần thủ: giải đấu tính cá nhân theo giờ giải, bảng hội tính **tổng hội theo tuần/mùa**, nên không trùng lặp.

### 4.8. Chat hội và thông báo

- Thêm **kênh chat hội** vào chat hiện có (chat đã có luật riêng 2026-11-13; kênh hội dùng cùng luật kiểm duyệt, giới hạn tốc độ).
- **Bảng thông báo hội** do hội trưởng/hội phó đăng (≤ 200 ký tự).
- **Thông báo khoe cá** có thể hiện thẻ hội, và khi một thành viên câu được cá Huyền thoại, hội nhận dòng chúc mừng trong chat hội.

### 4.9. Nhận diện trong game (khớp nameplate đang có)

Tên nhân vật hiện hai dòng: **tên** và **biệt hiệu danh hiệu**. Đề xuất thêm **thẻ hội** nhỏ **bên trái tên**, ví dụ `[HTây] Bùi Tín`, màu theo cấp hội. Không thêm dòng thứ ba để tránh rối hình.

## 5. Phần thưởng và kinh tế

Mục tiêu: **tăng sink Gold, hạn chế nguồn Gold mới.**

**Nguồn (source) mới, có giới hạn:**
- Nhiệm vụ nhóm: 100 Gold/nhiệm vụ, tối đa 3 lần/ngày/người.
- Thưởng nhiệm vụ tuần của hội: chủ yếu vào quỹ hội, phần cá nhân nhỏ.
- Cá khổng lồ sự kiện: do Admin điều chỉnh theo tuần.

**Sink (tiêu Gold) mới:**
- Phí lập hội, phí nâng cấp cấp hội, mua trang trí hội, vé giải hội.
- Quyên góp quỹ hội (Gold ra khỏi ví cá nhân).
- Mua khung avatar, emoji hiếm bằng Điểm Nghĩa Tình (không tốn Gold) giúp người ít Gold vẫn có mục tiêu.

**Nguyên tắc cân bằng:**
1. Tổng Gold phát từ tính năng xã hội/ngày/người **không quá 20% thu nhập câu bình thường** (số tạm để GD chỉnh).
2. Giá vé giảm tối đa 5% từ buff hội, **không bao giờ về 0**.
3. Mọi phần thưởng Gold đi qua **ledger** hiện có, có lý do giao dịch riêng (`group_quest`, `guild_weekly`, `giant_fish`).

## 6. Giao diện và trải nghiệm (mô tả, không thiết kế chi tiết)

- **Menu chính:** thêm icon **Hội** cạnh icon Bạn bè trong menu Home. Chấm đỏ khi có đơn mới, lời mời, nhiệm vụ tuần xong.
- **Màn Hội:** tab **Thông tin**, **Thành viên**, **Nhiệm vụ tuần**, **Quỹ**, **Bảng xếp hạng hội**, **Chat hội**. Ngôn ngữ giao diện giống popup hiện có (khung gỗ, nút hộp, phông Courier đậm).
- **Khung nhóm** nhỏ ở góc trên trái dưới thẻ người chơi, thu gọn khi không dùng. Nút **Mời / Rời / Giải tán**.
- **Nút nổi trên đầu người khác:** `Cổ vũ`, `Kéo giúp`, `Vớt cứu` xuất hiện **chỉ khi hợp lệ** (đúng trạng thái, đúng tầm nhìn), tránh nhiễu.
- **Thông báo dạng thanh:** dùng lại thanh khoe cá cho sự kiện hội/nhóm quan trọng (cá khổng lồ bị hạ, hội lên cấp). Hệ thống thông báo chặn tương tác phía dưới như đã sửa 2026-11-18.
- **Phản hồi âm thanh/hiệu ứng:** tiếng "ting" nhẹ khi cổ vũ, pháo giấy khi hoàn thành nhiệm vụ, hiệu ứng vệt sáng cho danh hiệu hội mùa (giống vệt sáng biệt hiệu).
- Mọi popup tuân quy tắc **fade/ease in-out** của UI.

## 7. Chống lạm dụng và an toàn

| Rủi ro | Biện pháp |
| --- | --- |
| Tạo nhiều tài khoản để tự cổ vũ cho mình | Điểm Nghĩa Tình giới hạn theo cặp người/ngày; không có Gold; không cộng khi hai tài khoản cùng IP/thiết bị (cảnh báo cho Admin, không tự khóa) |
| Treo máy Idle để cày điểm giúp đỡ | Idle không giúp được người khác (2.6) |
| Hội lập tên xúc phạm | Chặn từ cấm khi tạo, cho phép báo cáo, Admin có công cụ buộc đổi tên |
| Hội trưởng bỏ hoang, quỹ kẹt | Tự chuyển quyền sau 14 ngày; giải tán hội trống sau 30 ngày, hoàn quỹ về người đã quyên góp theo tỷ lệ (cần GD duyệt) |
| Nhảy hội lấy thưởng tuần | Khóa 24 giờ sau khi rời hội, thưởng cá nhân chỉ tính theo đóng góp trong hội đó |
| Thông đồng thắng giả minigame để nhận thưởng nhóm | Giữ nguyên luật hiện tại: Server cấp tối đa 1 cá/attempt, chấp nhận rủi ro thắng giả; thưởng nhóm có trần nên lợi ích thông đồng nhỏ |
| Lộ thông tin riêng tư | Chỉ hiện tên hiển thị, cấp, danh hiệu, thẻ hội; không hiện email hay Gold |
| Quá nhiều sự kiện realtime | Cổ vũ gộp (batch) mỗi 500 ms; giới hạn 1 lượt cổ vũ/giây/người |

## 8. Lộ trình đề xuất (theo giai đoạn, không gắn ngày)

| Giai đoạn | Nội dung | Phụ thuộc chính | Ghi chú |
| --- | --- | --- | --- |
| **G1 — Tương tác nhẹ** | Cổ vũ (2.1), Điểm Nghĩa Tình (2.5), danh hiệu "Đàn anh" | Sự kiện realtime trong hồ, danh sách danh hiệu | Ít rủi ro, thử nhanh phản hồi người chơi |
| **G2 — Nhóm** | Lập nhóm (3.1), khung nhóm, Chuỗi (3.3), nhiệm vụ nhóm (3.4), Kéo giúp (2.2), Vớt cứu (2.3) | Danh sách bạn bè, minigame phụ | Cần thêm trạng thái nhóm ở Server |
| **G3 — Hội** | Lập hội, vai trò, quỹ, chat hội, nhiệm vụ tuần, bảng xếp hạng hội | Kinh tế/ledger, chat, bảng xếp hạng | Phần nặng nhất, nhiều bảng dữ liệu và công cụ Admin |
| **G4 — Sự kiện lớn** | Cá khổng lồ (3.5), đua nhóm/hội (3.6), mùa hội | Thả cá của Admin, giải đấu cần thủ | Cần cân bằng sau khi có số liệu thật |

Mỗi giai đoạn nên **đóng gói độc lập**: dừng sau G1 hoặc G2 vẫn là một bản chơi hoàn chỉnh.

## 9. Việc cần chốt (GD)

1. **Phạm vi:** làm đủ G1–G4 hay chỉ G1–G2 trước? Hội câu có cần trong bản gần không?
2. **Kéo giúp (2.2):** người phụ có cần vé không? Có nhận EXP không?
3. **Điểm Nghĩa Tình:** chỉ đổi cosmetic (như đề xuất) hay có đường đổi sang lợi ích khác?
4. **Quy mô nhóm:** tối đa 4 hay 6 người ở bản đầu?
5. **Buff hội (4.5):** có cho giảm giá vé không? Mức bao nhiêu? Hay chỉ EXP?
6. **Phí lập hội và nâng cấp:** mức Gold cụ thể.
7. **Chia thưởng cá khổng lồ:** theo đóng góp hay chia đều? Ngưỡng tối thiểu.
8. **Bot có tham gia nhóm/hội không?** Đề xuất: bot không vào nhóm/hội và không được cổ vũ/giúp tính điểm, để tránh làm méo thống kê.
9. **Luật quỹ hội khi giải tán:** hoàn tiền người quyên góp hay thu hồi.
10. **Kiểm duyệt:** ai duyệt tên hội/biểu ngữ (tự động chặn từ cấm hay Admin duyệt tay)?

## 10. Tác động tới tài liệu và hệ thống hiện có

Nếu GD duyệt, cần cập nhật (mỗi mục thuộc đúng vai trò):

- **GD:** thêm mục **Giúp đỡ câu**, **Câu theo nhóm**, **Hội câu** vào `GAMEPLAY_SCOPE.md`; mở rộng mục **Bảng xếp hạng** (Loại 3 — Hội); thêm danh hiệu và thành tựu mới (ví dụ "Người đồng hành", "Hội viên chăm chỉ").
- **Server (BE):** mô-đun mới Social/Guild/Party, bảng dữ liệu nhóm/hội/quỹ/điểm nghĩa tình, sự kiện realtime (cổ vũ, trạng thái nhóm, tiến độ cá khổng lồ), mở rộng ledger với lý do giao dịch mới, kiểm tra quyền hạn.
- **Admin Tool:** quản lý hội (tìm, đổi tên, giải tán, xem audit), thả cá khổng lồ, chỉnh số tạm (trần, giá, mốc), xem báo cáo lạm dụng.
- **Web Client:** màn Hội, khung nhóm, nút nổi hỗ trợ, thẻ hội trên nameplate, chat hội, hiệu ứng.
- **Hợp đồng (contract):** cần contract mới trước khi tích hợp; Client có thể dùng mock theo contract, ghi rõ chưa phải tích hợp thật.

## 11. Chỉ số để đánh giá sau khi triển khai

- Tỷ lệ người chơi **dùng cổ vũ/kéo giúp** trong tổng người câu.
- Tỷ lệ người **ở trong nhóm hoặc hội** sau 7 ngày.
- **Retention D7/D30** của người trong hội so với người không trong hội.
- **Thời gian ngồi ghế trung bình** tăng hay giảm (kỳ vọng tăng).
- Lượng Gold phát từ nguồn xã hội so với tổng (giữ dưới trần mục 5).
- Số **báo cáo lạm dụng** và thời gian Admin xử lý.

---

## 12. Kho ý tưởng tương tác người chơi (bổ sung 2026-11-18)

Phần này mở rộng ngoài ba tính năng ở trên: những cách để người chơi **nhận ra nhau, nói chuyện với nhau và làm điều gì đó cùng nhau** ngay trong hồ. Mỗi ý có: cách chơi, vì sao hay, độ nặng (Nhẹ / Vừa / Nặng) và lưu ý luật. Vẫn là đề xuất, số liệu là số tạm. Các ý bám theo thứ đang có trong game: ghế câu và ghế ngồi chơi, bong bóng chat và emoji, biệt hiệu dưới tên, popup thông tin người chơi, thanh khoe cá, nhạc nền, bot.

### 12.1. Chào hỏi và biểu cảm (nhẹ, làm nhanh, tạo cảm giác "có người")

| Ý tưởng | Cách chơi | Vì sao hay | Độ nặng |
| --- | --- | --- | --- |
| **Cử chỉ nhân vật** | Ngoài emoji trên đầu, thêm hoạt ảnh nhân vật: vẫy tay, cúi chào, nhảy mừng, vỗ tay, ngồi thở dài. Mở từ vòng chọn nhanh hoặc icon cảm xúc. | Emoji đã có nhưng đứng yên; hoạt ảnh làm nhân vật "sống" hơn | Vừa (cần frame hoạt ảnh) |
| **Cử chỉ đôi** | Hai người đứng gần nhau cùng bấm: cụng cần, đập tay, ôm. Người thứ hai thấy lời mời nhấp nháy trên đầu người kia, bấm đồng ý thì hai bên cùng diễn một hoạt ảnh. | Khoảnh khắc nhỏ nhưng nhớ lâu, thân thiện, dễ chụp ảnh | Vừa |
| **Chào tự động người mới** | Người mới vào hồ nhận bong bóng "Chào mừng đến Hồ Tây!" từ vài người hoặc bot ngồi gần, kèm gợi ý cách chơi. | Giảm cảm giác lạc lõng lúc đầu | Nhẹ |
| **Chat nhanh bằng câu dựng sẵn** | Vòng câu nhanh: "Cá cắn rồi!", "Chúc may mắn!", "Cho ngồi chung nhé", "Giỏi quá!", "Hồ nay đông ghê". Hiện thành bong bóng, không cần gõ. | Dễ cho điện thoại, ít cần kiểm duyệt, giữ vui | Nhẹ |
| **Nhắc tên (@)** | Gõ @tên hoặc chạm tên trong danh sách để gọi một người; người đó nhận thông báo và bong bóng nháy. | Giúp gọi bạn trong hồ đông | Nhẹ |

### 12.2. Tặng và chia sẻ (tạo mối quan hệ)

- **Tặng cá:** người chơi chọn một con cá trong túi, tặng cho bạn bè kèm lời nhắn ngắn. Người nhận thấy banner "A tặng bạn Cá Koi" và con cá vào túi họ.
  - *Vì sao hay:* biến cá thành quà, không chỉ là thứ để bán. Cá hiếm thành món quà có ý nghĩa.
  - *Lưu ý:* chỉ tặng bạn bè; giới hạn số lần mỗi ngày; cá tặng **không** tính vào Sổ tay cá hay thành tựu của người nhận (tránh đổi cá lấy thành tựu); ghi ledger.
- **Thiệp chúc và hoa:** vật phẩm trang trí miễn phí nhỏ để gửi nhau dịp sinh nhật, lễ. Chỉ là cosmetic.
- **Phóng sinh về hồ (thả cá lại):** sau khi câu được cá, nút **"Thả lại"** đưa con cá trở về hồ thay vì giữ. Người thả nhận **Điểm Nghĩa Tình** và con cá **cộng lại vào pool của hồ** (khớp luật "quần thể hữu hạn"). Phù hợp bối cảnh Hồ Tây.
  - *Vì sao hay:* tạo vòng sinh thái, người chơi thấy mình có đóng góp cho hồ; giữ cá hiếm cho cả cộng đồng.
  - *Lưu ý:* cần GD chốt có cho thả lại không (giảm Gold bán cá), giới hạn mỗi ngày, và Server là bên cộng lại pool.

### 12.3. Thi đấu vui và mini-game xã hội

- **So cá (đấu chiều dài):** hai người đồng ý "so cá" trong 5 phút, ai câu được cá **dài hơn so với mức trung bình của loài** theo tỷ lệ thì thắng. Không cược Gold; thắng nhận huy hiệu và dòng thông báo.
  - *Lưu ý:* dùng tỷ lệ theo loài để người câu cá nhỏ không bị thiệt; chỉ tính cá đã chốt bởi Server.
- **Bàn trò chơi ở ghế ngồi chơi:** ghế quanh bàn (đang có) có thể thành bàn **oẳn tù xì**, **đoán loài cá**, **đố vui câu cá** cho 2–4 người. Thắng nhận Điểm Nghĩa Tình nhỏ, không có tiền cược.
  - *Vì sao hay:* ghế ngồi chơi đang chỉ để ngồi; thêm hoạt động giúp người chưa có vé vẫn có việc làm.
- **Đoán cá kế tiếp:** khán giả (không có vé hoặc đang rảnh) bấm đoán **loài cá** người khác sắp kéo lên. Đoán đúng nhận Điểm Nghĩa Tình. Server đã chốt loài lúc cá cắn nên đối chiếu được.
  - *Lưu ý:* không có Gold, không tiết lộ đáp án trước; giới hạn số lượt đoán mỗi ngày.
- **Thử thách ngày:** mỗi ngày một nhiệm vụ tương tác: "Cổ vũ 3 người", "Chào 5 người", "Tặng 1 con cá", "Ngồi chung bàn với bạn 10 phút".

### 12.4. Danh tiếng và hồ sơ (cho người khác biết mình là ai)

- **Bảng vinh danh Hồ Tây:** một tấm bảng trên bến, ghi **kỷ lục chiều dài của từng loài** kèm tên người và ngày. Ai phá kỷ lục thì tên đổi lên bảng và nhận banner chúc mừng.
  - *Vì sao hay:* mục tiêu rõ ràng, có thứ để khoe và thứ để đuổi theo; người chơi mới cũng tới đọc và thấy cộng đồng.
  - *Lưu ý:* dùng dữ liệu "Kỷ lục" đã có; đồng kỷ lục thì ai đạt trước giữ tên.
- **Trạng thái và tâm trạng:** chọn một dòng ngắn dưới biệt hiệu, ví dụ "Đang tìm bạn câu", "Đang thư giãn", "Cần giúp". Bật/tắt được.
- **Thẻ người chơi:** mở rộng popup thông tin hiện có: cá khoe (đã có), danh hiệu, hội, "Số lần giúp người khác", "Bạn câu lâu năm". Có nút Nhắn tin, Mời nhóm, Cổ vũ.
- **Mức thân thiết:** hai người ngồi gần nhau lâu thì tăng **điểm thân** (hiện trái tim nhỏ ở danh sách bạn). Mốc thân mở khóa **cử chỉ đôi** và **khung ảnh chung**. Không có lợi thế câu cá.

### 12.5. Hồ Tây có sự kiện, có nhân vật, có không khí (làm hồ "sống")

- **Sự kiện ngẫu nhiên trong hồ:** vài phút một lần có hiện tượng: đàn cá nhảy lên mặt nước, đèn hoa đăng thả trôi, sương sớm. Người chơi **bấm vào** để nhận quà nhỏ (khung ảnh, emoji, Điểm Nghĩa Tình). Không đổi tỷ lệ cá để khỏi phá cân bằng độ hiếm.
- **Lễ hội theo mùa:** Tết, Trung Thu, Giáng Sinh (đã có skin Ông già Noel): trang trí hồ, nhiệm vụ lễ hội, danh hiệu giới hạn. Admin bật/tắt.
- **NPC có việc để làm:** dùng thân thú có sẵn trong asset (mèo, cáo, shiba, gấu) làm **NPC cố định ở bến**:
  - *Bác chủ hồ:* phát nhiệm vụ ngày, kể chuyện hồ.
  - *Bà bán trà:* bán đồ uống trang trí, là gold sink nhẹ.
  - *Thợ ảnh:* chụp **ảnh kỷ niệm nhóm hoặc hội** có khung riêng.
  - *Người đọc sổ:* đọc bảng vinh danh, thông báo sự kiện.
  - Lưu ý: NPC không bán lợi thế câu cá; chỉ nhiệm vụ, cosmetic, thông tin.
- **Chiếc thuyền ở bến** (đã có trong map): chỗ cho nhóm nhỏ ngồi chung ngắm hồ, không câu, thành điểm hẹn.
- **Máy nhạc (jukebox):** có sẵn 10 bài trong `new resources/music`. Người chơi bỏ phiếu bài kế tiếp cho cả hồ (một phiếu mỗi người, đổi bài khi đa số chọn). Hiển thị bài đang phát trên bảng nhỏ.
  - *Vì sao hay:* chạm tới cảm xúc chung của cả hồ và dùng tài nguyên có sẵn.
  - *Lưu ý:* kiểm tra bản quyền các bài nhạc trước khi phát cho người dùng thật.

### 12.6. Giao tiếp bất đồng bộ (cho người không online cùng lúc)

- **Chai thư (thư trong chai):** người chơi viết một lời nhắn ngắn (≤ 80 ký tự) rồi **thả chai** xuống hồ. Một người khác khi **câu được chai** (một kết quả hiếm) sẽ đọc lời nhắn và có thể **trả lời** bằng chai khác hoặc thả tim.
  - *Vì sao hay:* tạo khoảnh khắc bất ngờ, hợp bối cảnh câu cá, kết nối cả người chơi khác giờ.
  - *Lưu ý:* kiểm duyệt từ cấm trước khi vào hồ; giới hạn số chai mỗi ngày; Admin có công cụ gỡ chai vi phạm; chai chỉ là kết quả đặc biệt, **không chiếm pool cá**.
- **Sổ lưu bút ở bến:** mỗi người để một dòng; hội và nhóm có trang riêng. Xem được khi vào hồ.
- **Thả tim thông báo khoe cá:** người khác phản ứng nhanh (tim, vỗ tay) vào dòng khoe cá; người câu thấy số tim và nhận mục "Được yêu thích" trong hồ sơ.

### 12.7. Vật nuôi và đồ cá nhân hóa (để người chơi khác nhìn vào)

- **Thú cưng nhỏ đi theo:** mèo, shiba, vịt... từ thân thú trong asset thu nhỏ, đi theo nhân vật và ngồi cạnh ghế khi câu. Chỉ trang trí, không tăng chỉ số. Mở khóa bằng **Điểm Nghĩa Tình**, thành tựu hoặc sự kiện.
- **Khung tên và biệt hiệu:** nâng cấp nameplate: khung màu, vệt sáng đặc biệt theo hội hoặc mùa, đã có nền tảng vệt sáng.
- **Ghế yêu thích:** đặt một ghế làm "ghế quen" có chấm nhỏ của mình khi bạn ngồi; nhưng **vẫn theo luật mỗi ghế một người, ai tới trước ngồi trước**, không giữ chỗ khi vắng.

### 12.8. Bot làm hồ đông và thân thiện hơn

Hiện bot đã vào hồ và câu cá. Đề xuất cho bot **xã giao nhẹ**, để người chơi ít cảm thấy lẻ loi nhưng **không tính vào điểm hay nhiệm vụ xã hội**:

- Chào người mới bằng câu dựng sẵn.
- Chúc mừng khi ai đó câu được cá hiếm bằng emoji.
- Thỉnh thoảng vẫy tay khi người chơi đi ngang.
- Tuyệt đối **không** cổ vũ hay giúp để lấy thưởng, và không vào nhóm hay hội (mục 9, câu 8).
- Giữ nguyên nguyên tắc **bot không có cờ nhận diện trong gói gửi Client**; hành vi xã giao phải trông như người chơi bình thường.

### 12.9. Gợi ý ưu tiên

Chọn theo công sức và tác động, từ cao xuống thấp:

| Hạng | Ý tưởng | Vì sao ưu tiên | Độ nặng |
| --- | --- | --- | --- |
| 1 | **Chat nhanh bằng câu dựng sẵn** và **thả tim khoe cá** | Dễ, tác động lớn, dùng hạ tầng chat đã có | Nhẹ |
| 2 | **Bảng vinh danh Hồ Tây** | Dữ liệu "Kỷ lục" đã có, tạo mục tiêu mới tức thì | Nhẹ–Vừa |
| 3 | **Cử chỉ nhân vật** và **cử chỉ đôi** | Biến nhân vật thành "diễn" được, cần frame hoạt ảnh | Vừa |
| 4 | **Tặng cá** | Cá có thêm ý nghĩa, củng cố bạn bè | Vừa |
| 5 | **Phóng sinh về hồ** | Khớp quần thể hữu hạn, đặc trưng của game | Vừa (cần chốt luật) |
| 6 | **Máy nhạc** | Có sẵn tài nguyên nhạc, cảm xúc chung | Vừa (cần xác minh bản quyền) |
| 7 | **Chai thư** | Độc đáo, hợp chủ đề, nhưng cần kiểm duyệt | Vừa–Nặng |
| 8 | **NPC ở bến** và **thú cưng** | Tăng độ sống động, dùng asset thân thú đã có | Nặng (cần art ghép và hoạt ảnh) |
| 9 | **Bàn trò chơi** và **So cá** | Thêm chơi chung, cần cân bằng và chống lạm dụng | Nặng |

**Gói thử nhanh đề xuất (ít rủi ro, thấy được ngay):** chat nhanh, thả tim, bảng vinh danh, cử chỉ nhân vật. Bốn thứ này không đụng kinh tế, không đụng cân bằng cá.

### 12.10. Câu hỏi thêm cần GD chốt

1. Cho phép **thả cá lại về hồ** không? Con cá được cộng vào pool hay chỉ đổi lấy điểm?
2. **Tặng cá** có giới hạn gì (chỉ bạn bè, số lượt mỗi ngày, loài nào không tặng được)?
3. Có làm **máy nhạc** không, và nguồn nhạc có đủ quyền sử dụng không?
4. Có cần **kiểm duyệt trước** với chai thư và lưu bút không (tự động chặn từ cấm hay Admin duyệt)?
5. NPC dùng thân thú nào, tên và tính cách ra sao (Web Client kiêm Art sẽ ghép)?
6. Muốn đẩy mạnh hướng **thân thiện thư giãn** (cử chỉ, nhạc, thú cưng) hay hướng **thi đấu** (so cá, đua nhóm) trước?

---

## 13. Hai NPC ở bến: nội dung và ý tưởng (bổ sung 2026-11-18)

Chỉ là ý tưởng nội dung, **không phải đặc tả triển khai**. Hai NPC: một người **bán cá** và một người **giới thiệu lượng cá trong hồ** (cho người chơi xem hồ còn bao nhiêu cá mỗi loài). Gợi ý ngoại hình đã gửi riêng (Shiba đội nón lá bán cá; cáo đỏ thuyền trưởng hoặc gấu trúc nhà nghiên cứu giới thiệu cá). Tên và lời thoại dưới đây là bản nháp để GD sửa.

### 13.1. Nguyên tắc để hai NPC "hay"

1. **Mỗi người một giọng, một tính cách rõ.** Bác bán cá thì xởi lởi, hay mặc cả, giọng chợ quê. Người giới thiệu thì điềm đạm, hay kể chuyện, như người giữ hồ lâu năm.
2. **Lời thoại đổi theo hoàn cảnh**, không lặp một câu: theo giờ, theo loài cá vừa bán, theo tiến độ người chơi. Lần nào nói chuyện cũng có thể nghe câu khác.
3. **Cho người chơi một lý do quay lại**: khách quen, đơn hàng, sổ cá, truyền thuyết cần mở khóa.
4. **Không phá kinh tế và cân bằng**: mọi thưởng liên quan Gold hoặc độ hiếm phải GD duyệt; phần còn lại là cảm xúc, thông tin, trang trí.
5. **Hai NPC có quan hệ với nhau** (đùa nhau, nhắc tên nhau), để bến trông như một cộng đồng nhỏ.

### 13.2. NPC bán cá — "Bác Tư, sạp cá Hồ Tây"

**Tính cách:** vui tính, mồm mép, thích khoe cá "tươi roi rói", thương người chơi như con cháu. Hay thốt "Ối giời ơi!" khi gặp cá lạ. Giọng pha chút Hà Nội: "chị ơi", "cậu ơi", "bác bảo thật".

**Lời thoại theo hoàn cảnh (bản nháp):**

| Hoàn cảnh | Ví dụ lời thoại |
| --- | --- |
| Chào lần đầu trong ngày | "Cậu đến rồi à? Hôm nay hồ ngoan lắm, chắc nhiều cá lắm đây!" |
| Chào buổi sáng, tối khác nhau | Sáng: "Dậy sớm thế, bác đang pha trà." Tối: "Muộn rồi, bán nốt rồi về nghỉ nhé." |
| Túi không có cá | "Túi rỗng thì bác bán cái gì cho cậu hả? Ra hồ đi đã." |
| Bán cá thường | "Cá tươi đấy, bác lấy tất. Cảm ơn nhé!" |
| Bán cá hiếm (Hiếm, Sử thi) | "Ối giời, con này đẹp thế! Bác phải khoe với hàng xóm mới được." |
| Bán cá huyền thoại (Mực) | "Trời đất ơi... bác bán cá bao nhiêu năm chưa thấy con nào thế này. Cho bác chụp ảnh nhé?" |
| Bán loài mới lần đầu | "Loài này bác chưa mua của ai bao giờ. Cậu giỏi thật." |
| Bán kỷ lục cá nhân | "To thế này thì phải ghi vào sổ chứ! Kỷ lục của cậu rồi nhé." |
| Bán một lúc rất nhiều | "Ôi nhiều thế, để bác gọi thằng cháu ra bê." |
| Người chơi mới | "Lần đầu hả cháu? Cứ ra hồ ngồi câu, bán ở đây bác không ép giá đâu." |

**Chi tiết dễ thương (không ảnh hưởng kinh tế):**

- **Mèo hàng xóm ăn vụng cá** ở sạp, bác quát "Kìa! Cái con mèo này!". Là hoạt ảnh nền ngẫu nhiên.
- **Cái cân đòn và thùng đá**, cá vẩy nước khi có người ghé.
- **Bảng giá phấn** ghi "Hôm nay: Cá chép ngon" bằng chữ nghiêng, đổi theo ngày cho vui.
- **Cảm xúc theo loài:** bác hay khen cá chép ("cá của người Hà Nội"), kêu ca cá thu "tanh quá nhưng giá tốt", mê cá koi "để dành cho nhà giàu".

**Ý tưởng có thể thêm (cần GD duyệt vì động đến Gold):**

| Ý tưởng | Mô tả | Cân nhắc |
| --- | --- | --- |
| **Giá chợ hôm nay** | Mỗi ngày một vài loài "được giá" hơn một chút (số tạm ±10%), bác thông báo "Hôm nay cá chép được giá đấy". Giúp người chơi cân nhắc bán ngay hay giữ. | Phải Server tính giá, hiển thị rõ, có trần, không làm giá bán vượt giá niêm yết quá nhiều |
| **Đơn đặt hàng của bác** | Mỗi ngày một đơn: "Bác cần 3 con cá chép cho nhà hàng", giao đủ nhận thêm một chút Gold hoặc điểm khách quen. Có đường tiêu cho cá thường. | Trần theo ngày; phần thưởng Gold cần GD chốt |
| **Khách quen** | Cấp khách quen tích theo số cá đã bán cho bác (cấp 1–5). Mỗi cấp mở lời thoại riêng, huy hiệu "Khách quen của Bác Tư", trang trí sạp, danh hiệu. **Không giảm giá hay tăng giá bán.** | An toàn, chỉ cosmetic và cảm xúc |
| **Mặc cả vui** | Mini tương tác nhỏ trước khi bán: bác trả giá, bạn đồng ý hoặc "ép" thêm, kết quả chỉ ra lời thoại khác nhau, **giá cuối không đổi**. | Chỉ là cảm giác, tránh biến thành cơ chế kiếm Gold thêm |
| **Chụp ảnh với cá hiếm** | Khi bán cá huyền thoại, bác xin chụp ảnh, người chơi nhận một thẻ ảnh kỷ niệm (khung có tên cá, ngày, kích thước). | Không có Gold, chỉ lưu ảnh |
| **Quà theo mùa** | Tết bác phát lì xì (trang trí), Trung Thu bác tặng bánh (emoji), mùa mưa bác phát áo mưa tạm. | Cosmetic, Admin bật tắt |

### 13.3. NPC giới thiệu lượng cá — "Thuyền trưởng Hồng, người giữ sổ cá Hồ Tây"

(Nếu dùng gấu trúc thì đổi thành "Tiến sĩ Trúc", giữ nguyên nội dung.)

**Tính cách:** điềm tĩnh, thông thái, hơi bí ẩn, thích kể chuyện. Quý hồ như quý người. Nói chậm, câu có ví von. Hay mở đầu bằng "Nghe này..." rồi kể.

**Việc chính:** mở **Sổ cá Hồ Tây**, nơi người chơi xem hồ đang có gì.

**Nội dung Sổ cá:**

- **Mức cá từng loài:** Dồi dào, Vừa phải, Thưa dần, Gần cạn, Hết. (Chốt hiện số chính xác hay mức chữ ở mục 13.5.)
- **Lần thả cá kế tiếp:** đếm ngược, kèm lời hype "Hồ sắp được thả thêm cá chép".
- **Gợi ý theo ngày:** "Hôm nay cá thu đang nhiều, hợp câu", "Mực vắng bóng ba ngày rồi, ai kiên nhẫn có thể gặp may".
- **Truyền thuyết từng loài:** mỗi loài một mẩu chuyện dân gian ngắn (xem 13.4), **mở khóa khi người chơi câu được loài đó lần đầu**, gắn với Sổ tay cá đang có.
- **Số liệu cộng đồng hôm nay:** "Cả hồ đã câu 1.284 con, con lớn nhất là cá chép 41,3cm của Bùi Tín". Liên kết với Bảng vinh danh (mục 12.4).
- **Tiến độ cá nhân:** "Bạn đã gặp 6 trong 9 loài. Còn cá chuối, cá koi và mực." Giúp người chơi có mục tiêu sưu tập.

**Lời thoại theo hoàn cảnh (bản nháp):**

| Hoàn cảnh | Ví dụ lời thoại |
| --- | --- |
| Chào | "Nghe này... hồ hôm nay thở khác lắm. Cậu muốn xem sổ cá không?" |
| Hồ đầy | "Hồ đang đầy ắp, câu hôm nay là phúc." |
| Hồ sắp cạn một loài | "Cá chuối sắp thưa rồi. Nếu thương hồ thì câu từ từ thôi." |
| Chưa câu loài nào | "Cậu chưa ghi tên con cá nào vào sổ. Ra đó ngồi một lát đi." |
| Gần đủ bộ | "Còn đúng một loài nữa là cậu đủ bộ, tôi thấy phấn khích thay cậu." |
| Đủ cả 9 loài | "Cậu là người thứ ba tôi trao danh hiệu Nhà nghiên cứu Hồ Tây." (xem thêm ở dưới) |
| Gần giờ thả cá | "Nghe tiếng thuyền chưa? Sắp thả cá rồi đấy." |
| Hỏi về loài hiếm | Kể một mẩu truyền thuyết, giữ bí ẩn về nơi cá xuất hiện |

**Ý tưởng thêm:**

- **Danh hiệu "Nhà nghiên cứu Hồ Tây"** cho người sưu tập đủ loài; có thể chia nhiều bậc theo số loài đã gặp.
- **Nhiệm vụ khảo sát:** "Ghi vào sổ giúp tôi loài nào chưa có dữ liệu", câu loài chưa từng câu để nhận Điểm Nghĩa Tình hoặc cosmetic. Không có Gold.
- **Buổi thả cá có chứng kiến:** khi Admin thả cá, thuyền trưởng có hoạt ảnh thả cá ở mép bến, vài giây hiệu ứng nước, thanh thông báo "Hồ vừa được thả thêm 50 cá chép". Người chơi gần đó nhận emoji hoặc điểm nhỏ.
- **Nhật ký hồ:** một trang ngắn mỗi ngày do thuyền trưởng "viết", gộp vài sự kiện: kỷ lục mới, loài hiếm đầu tiên trong ngày, lượng cá thả.

### 13.4. Truyền thuyết từng loài (bản nháp, mở khóa khi câu lần đầu)

Dùng đúng 9 loài đang có trong game (tên theo bảng đã đổi). Mỗi mẩu 1–2 câu, giọng kể.

| Loài | Truyền thuyết nháp |
| --- | --- |
| **Cá Cơm** | "Nhỏ bé nhưng bơi thành đàn như dải bạc. Người xưa bảo thấy đàn cơm là hồ đang khỏe." |
| **Cá Mòi** | "Lấp lánh dưới nắng sớm. Dân chài bảo mòi báo hiệu trời sắp đẹp." |
| **Cá Rô Phi** | "Hiền lành, sống ở đâu cũng được. Hồ nào thiếu rô phi là hồ ấy thiếu tiếng cười." |
| **Cá Trắm** | "Thân dài, ăn cỏ ven bờ. Người ta bảo trắm là người giữ cho bờ hồ luôn sạch." |
| **Cá Chép** | "Chép vượt vũ môn hóa rồng, ai cũng biết. Nhưng ít ai biết nó vẫn nhớ hồ cũ." |
| **Cá Chuối** | "Vằn đen như áo giáp, săn mồi giữa đêm. Tay cần nào gặp chuối là gặp một đối thủ." |
| **Cá Thu** | "Tím bạc, bơi nhanh như mũi tên. Có lời đồn thu chỉ vào hồ khi có người nhớ biển." |
| **Cá Koi** | "Đỏ trắng như tấm áo lễ. Ai nhìn thấy koi lúc bình minh thì suốt ngày gặp may." |
| **Mực** | "Chẳng ai biết nó từ biển lạc vào Hồ Tây bằng đường nào. Nhiều người câu cả đời không gặp một lần." |

### 13.5. Việc cần GD chốt cho hai NPC

1. **Sổ cá hiện số chính xác hay mức chữ?** Số chính xác thú vị nhưng dễ thành chỗ tính toán, mức chữ thân thiện và giữ bí ẩn hơn. Đề xuất: mức chữ cho cá thường, và **mập mờ có chủ ý** với loài huyền thoại.
2. **Có làm "giá chợ hôm nay", "đơn đặt hàng"** không? Cả hai đụng đến Gold nên cần duyệt.
3. **Khách quen:** chỉ cosmetic (như đề xuất) hay có lợi ích khác?
4. **Tên và giọng:** "Bác Tư" và "Thuyền trưởng Hồng" dùng được không, hay muốn tên khác hợp phong cách game?
5. **Truyền thuyết:** giữ văn phong dân gian Việt như trên, hay thêm yếu tố hài?
6. **Hai NPC đùa nhau** (ví dụ bác bán cá hay chọc thuyền trưởng "đo đếm gì mà lắm thế") có phù hợp giọng game không?

---

*Tài liệu đề xuất. Chưa cập nhật `HANDOFF.md` vì chưa có việc nào được giao. Khi GD chọn giai đoạn để làm, tạo file `docs/work/<ID>-<ten-viec>.md` theo mẫu chung.*
