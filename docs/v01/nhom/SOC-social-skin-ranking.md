# SOC — Skin, chat/emoji, khoe cá, bảng xếp hạng (Server + Client)

Mục tiêu: các tính năng xã hội bắt buộc trong v1. Nhóm làm trọn cả Server và Client cho từng tính năng.
Đọc trước: [SPEC_CHUNG](../SPEC_CHUNG.md) mục 1, 4, 6.
Phạm vi file: `server/FishingOnline.Api/Modules/{Social,Skin,Ranking}/`, `GameHub.Social.cs`, migration `SOC_*`, `client-web/src/ui/{social,skin,ranking}/`.
Độc lập: Server dùng interface của BE-A/BE-C; Client dùng mock của CL-A (nhóm tự bổ sung handler mock cho tính năng của mình trong `src/mock/social.ts`).

**Phần lớn luật chưa chốt.** Mỗi task ghi giả định [Đề xuất]; làm theo giả định, mọi giới hạn để trong config. Task có nhãn **CHỜ GD** chỉ làm phần khung tới khi GD trả lời.

---

### SOC-01 Skin: Server
- **Độ lớn:** S. **Phụ thuộc:** không.
- **Spec:** config `skins: [{skinId, name, unlock: "free"}]` [Đề xuất: mọi skin miễn phí]. Bảng `players.selectedSkinId` (BE-A đã có cột). `GET /skins` → `{skins, selectedSkinId}`; `PUT /me/skin {skinId}` → kiểm tra tồn tại; phát `SkinChanged {playerId, skinId}` cho phòng.
- **Nghiệm thu:** skin không tồn tại → 400; người khác nhận event.

### SOC-02 Skin: Client
- **Độ lớn:** S. **Phụ thuộc:** SOC-01 (hoặc mock), CL-B-03.
- **Spec:** panel chọn skin: lưới preview nhân vật quay 4 hướng, nút "Dùng". Chọn lần đầu sau khi đặt tên.
- **Nghiệm thu:** đổi skin → nhân vật mình và trên màn hình người khác đổi ngay.

### SOC-03 Chat phòng: Server
- **Độ lớn:** M. **Phụ thuộc:** không.
- **Spec:** [Đề xuất] chat trong phòng hồ; 1-100 ký tự sau trim; tối đa 1 tin/giây và 10 tin/30 giây (`RATE_LIMITED`); bộ lọc từ cấm cơ bản từ file config (thay bằng `***`). `ChatReceived {messageId, playerId, displayName, text, sentAt}`. Lưu 7 ngày trong bảng `chat_messages` để Admin tra cứu.
- **Nghiệm thu:** tin 101 ký tự → 400; gửi 3 tin trong 1 giây → tin 2, 3 bị chặn.

### SOC-04 Emoji: Server
- **Độ lớn:** S. **Phụ thuộc:** không.
- **Spec:** config `emojis: [emojiId]` (8 emoji [Đề xuất]); `SendEmoji` ngoài danh sách → 400; tối đa 1 emoji/2 giây. `EmojiReceived`.
- **Nghiệm thu:** emoji lạ bị chặn.

### SOC-05 Chat và emoji: Client
- **Độ lớn:** M. **Phụ thuộc:** SOC-03, SOC-04 (hoặc mock).
- **Spec:** khung chat thu gọn ở góc trái dưới, Enter để gõ (chặn phím di chuyển khi đang gõ), 50 tin gần nhất; bong bóng chat trên đầu 4 giây; bảng emoji, emoji nổi trên đầu 3 giây.
- **Nghiệm thu:** 2 tab chat qua lại; gõ chữ "w" không làm nhân vật đi.

### SOC-06 Khoe cá — CHỜ GD
- **Độ lớn:** M. **Phụ thuộc:** BE-D-02.
- **Spec khung:** `ShowcaseCatch {catchId}`: catch phải thuộc user [Đề xuất: kể cả đã bán]; tối đa 1 lần/30 giây; phát `CatchShowcased {playerId, displayName, speciesId, rarity, lengthTenthCm}` cho phòng; Client hiện thẻ cá nổi 5 giây và dòng trong khung chat. Nút "Khoe" trên popup kết quả và trong túi đồ. [Đề xuất] Server tự khoe khi bắt cá epic/legendary.
- **Chờ GD:** tự động hay user bấm; phạm vi phòng hay toàn server.
- **Nghiệm thu:** khoe catchId của người khác → `FISH_NOT_FOUND`.

### SOC-07 Bảng xếp hạng — CHỜ GD
- **Độ lớn:** M. **Phụ thuộc:** BE-E-04.
- **Spec khung:** [Đề xuất] 2 bảng: `longest-{speciesId}` (cá dài nhất từng loài, toàn thời gian) và `total-catch-weekly` (tổng số cá trong tuần, tuần bắt đầu thứ Hai 00:00 giờ Việt Nam). Projection cập nhật trong transaction trả thưởng hoặc qua outbox, không tính trùng `attemptId`. Đồng hạng: ai đạt trước xếp trên. `GET /rankings/{boardId}?cursor&limit` → `{boardId, updatedAt, items:[{rank, playerId, displayName, value}], me}`. Client: panel tab theo bảng, dòng của mình được tô.
- **Chờ GD:** chỉ số, chu kỳ, đồng hạng, tần suất cập nhật.
- **Nghiệm thu:** 3 người dữ liệu mẫu → thứ hạng đúng; gửi lặp kết quả lần câu không cộng điểm 2 lần.
