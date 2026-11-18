# BOT-02 — Bot theo số user thật, icon cá, chat world/DM, kết bạn

Người yêu cầu: Zen (người dùng), 2026-11-18. Trạng thái: **Đã duyệt** (Zen trả lời các câu hỏi; câu nào không trả lời thì dùng mặc định Claude đề xuất, Zen chấp nhận).

## 1. Bot theo số user thật (Server C#, `server/FishingOnline.Api/Modules/Bots`)

- Có sẵn **50 tài khoản bot** với đúng 50 tên ở mục 5. Bot cũ trong DB (38 tên cũ, đã có điểm xếp hạng) được **đổi tên** sang tên mới, rồi tạo thêm cho đủ 50. Nếu một tên đã bị user thật dùng (DisplayNameKey trùng) thì bỏ qua tên đó, lấy tên khác còn trống trong danh sách (không thêm số).
- Kiểm tra theo chu kỳ **3 phút** như hiện tại (CheckIntervalSeconds giữ, mặc định 180). Mỗi lần kiểm tra đếm **user thật** trong hồ (không tính bot) và lấy mục tiêu theo bảng:

| User thật trong hồ | Tổng bot | Bot được câu |
| --- | --- | --- |
| 0–9 | 30 | 20 |
| 10–19 | 30 | 20 |
| 20–30 | 20 | 8 |
| 31–40 | 10 | 0 |
| trên 40 | 3 | 0 |

- Mỗi lần kiểm tra đưa số bot về đúng mục tiêu (thêm hoặc bớt), nhưng **vào/ra dần**: cách nhau vài giây một con (ví dụ 2–5 giây ngẫu nhiên), không hiện/biến mất cùng lúc.
- Hồ giới hạn `Lake:MaxPlayers` = 50: tổng user thật + bot không vượt 50; thiếu chỗ thì bớt bot. User thật luôn vào được.
- "Bot được câu": chỉ đúng số bot đó được ngồi ghế câu; bot còn lại **chỉ đi dạo và chat, không ngồi ghế**. Khi mục tiêu bot câu giảm, bot đang câu thừa đứng dậy và chuyển sang chỉ đi dạo.
- Hồ có 30 ghế. Khi user thật cần ghế mà hết ghế trống, **một bot đang câu đứng dậy nhường** (ghế phải trống kịp cho user ngồi; cách đơn giản: luôn giữ số ghế trống ≥ 1 khi có user thật đứng, hoặc khi user thật bấm ngồi vào ghế bot đang ngồi thì bot đứng dậy — chọn cách gọn và test được).
- Bảng mốc lưu trong bot settings (DB, Admin sửa được qua `/api/v1/admin/bots/settings`), thay `MinTotalPlayers`/`MaxBots`. Giữ `Enabled`, `CheckIntervalSeconds`, `SuccessRatePct`. Cần migration EF mới. Admin Tool (React, `admin/`) cập nhật form bot settings theo bảng mới nếu có trang đó.
- Bot vẫn không lộ cờ IsBot cho Client.

## 2. Thả icon cá

- Khi một người chơi câu được **loài cá lần đầu của chính họ** (theo Sổ tay cá / species records), icon loài cá đó được thêm vào bảng "Biểu cảm", sau 16 emoji. Bấm vào thì thả icon cá lên đầu như emoji (dùng ảnh cá hiện có ở `ui/fishArt.ts`).
- Server: `SendEmoji` chấp nhận thêm id dạng `fish:<speciesId>` nếu người gửi đã câu được loài đó; Client lấy danh sách loài đã câu (codex) để dựng ô. Khi vừa câu được loài mới thì ô xuất hiện ngay không cần tải lại.
- Bot cũng thả icon (emoji thường và icon cá loài nó đã câu) thỉnh thoảng.

## 3. Chat

- **Chat chung (world)**: bot tự chat. Cả hồ khoảng **20–40 giây có 1 câu của bot** (không phải mỗi bot), để không lấn chat người thật.
  - Câu chọn theo trạng thái bot: câu 36–55 khi bot đang ngồi chờ cá; 56–75 khi cá đang cắn/đang kéo; các câu còn lại (1–35, 76–100) lúc bất kỳ.
  - Khi bot câu thành công: nói một câu trong danh sách "Chat khi câu thành công" (xác suất cao, vd. 60%, vẫn tính vào giới hạn tần suất chung một cách mềm).
  - Bot chat đi qua đúng `SocialService` (lưu DB, bong bóng trên đầu như người thật).
- **Tin riêng (DM)**: hệ thống DM dùng chung cho mọi người chơi (user thật nhắn nhau được). Khung chat có 2 tab "Thế giới" / "Tin riêng"; tab Tin riêng có danh sách hội thoại theo người, số tin chưa xem.
  - Server: lệnh hub `SendDirectMessage(requestId, toPlayerId, text)`, event `DirectMessageReceived` gửi cho cả người gửi và người nhận (mọi kết nối của họ); lưu DB (bảng mới, cùng hạn giữ 7 ngày), API lấy lịch sử hội thoại. Cùng luật độ dài 160 / tần suất như chat chung. Chỉ nhắn được cho người trong danh sách bạn (mặc định — tránh spam).
  - Bot: thỉnh thoảng nhắn riêng cho user thật là bạn của nó và đang online (thưa, vd. mỗi bot tối đa 1 tin / 10 phút cho mỗi người); khi user nhắn cho bot thì bot trả lời sau 2–6 giây bằng 1 câu ngẫu nhiên trong danh sách "Chat bình thường".

## 4. Kết bạn

- Lưu DB: bảng lời mời và bảng bạn bè (migration). API/hub: gửi lời mời, chấp nhận, từ chối, danh sách bạn (kèm online/offline = đang trong hồ), danh sách lời mời đến. Event realtime khi có lời mời mới / được chấp nhận.
- **Bot**: khi bot đi tới gần một user thật (vd. trong ~80 px) mà chưa là bạn và chưa từng mời, bot **gửi lời mời** (mỗi cặp chỉ 1 lần; giới hạn mỗi bot không mời quá dày). User bấm đồng ý/từ chối. Khi user mời bot thì bot tự đồng ý sau vài giây.
- User thật với nhau: mời → người kia đồng ý.
- **Viền trắng**: chỉ khi rê chuột lên người/bot khác thì nhân vật đó có viền trắng giống hiệu ứng tương tác với ghế (người dùng đổi 2026-11-18: đứng gần không còn hiện viền). Bấm vào nhân vật thì mở popup thông tin.
- **Popup thông tin người chơi** (người khác): avatar (skin), tên, level, kinh nghiệm (thanh EXP), danh hiệu, lời nhắn, 3 ô khoe cá, nút **Kết bạn** (đổi trạng thái: "Đã gửi lời mời", "Bạn bè" + nút "Nhắn tin"). Dùng lại style của ProfilePopup. Server cần API `GET /api/v1/players/{id}/profile` trả các trường công khai này (không có IsBot).
  - Bot: danh hiệu ngẫu nhiên (cố định theo bot), lời nhắn là một câu trong danh sách "Chat bình thường" (cố định theo bot, lưu vào bio của bot khi tạo/đổi tên), cá khoe = cá to nhất bot đã câu (tự cập nhật).
- **Popup danh sách bạn**: thêm 1 ô "Bạn bè" vào menu ở HUD (HomeHud). Hiện danh sách bạn (avatar, tên, level, online/offline), nút Nhắn tin và Xem thông tin; phần lời mời đang chờ với nút Đồng ý/Từ chối. Icon tạm nếu chưa có art (ghi rõ placeholder).

## 5. Dữ liệu

### Tên bot (50)

Võ Ngân, Hà My, Hoàng Nam, Quốc Huy, Ngọc Anh, Gia Bảo, Thu Trang, Đức Anh, Hải Yến, Thành Đạt, Minh Châu, Tuấn Kiệt, Mỹ Linh, Quang Minh, Gia Hân, Quốc Bảo, Khánh Linh, Hải Đăng, Thảo Vy, Anh Tuấn, Bảo Vy, Minh Đức, Hoàng Phúc, Thanh Trúc, Gia Hưng, Minh Khang, Bùi Đức, Khánh Vy, Phan Anh, Thanh Tùng, Lê Phúc, Bảo Ngọc, Nhật Minh, Quỳnh Anh, Đặng Huy, Kim Ngân, Hoàng Sơn, Phương Thảo, Trần Dũng, Minh Thư, Võ Thành, Thanh Hà, Phạm Huy, Ngọc Mai, Quang Huy, Tú Anh, Lê Nam, Hà Linh, Quốc Thái, Ngọc Hân

### Chat bình thường (100)

1. Anh em hôm nay đông vui quá nhỉ!
2. Hồ hôm nay có vẻ nhiều cá đấy!
3. Nay phải làm một mẻ ra trò mới được!
4. Anh em câu được gì chưa?
5. Ngồi câu thế này mới đúng là tận hưởng!
6. Có ai vừa kéo được cá to không?
7. Hôm nay anh em mình làm nên chuyện nhé!
8. Vào hồ là phải có cá mang về!
9. Cùng nhau làm đầy giỏ nào anh em!
10. Hôm nay nhìn ai cũng có vẻ đỏ vận!
11. Đúng là gặp được anh em cùng đam mê!
12. Cứ câu đi, thành quả sẽ đến!
13. Hồ này hôm nay vui quá!
14. Anh em cứ thoải mái trổ tài nhé!
15. Câu cá mà có hội có nhóm vẫn vui hơn!
16. Hôm nay phải săn bằng được cá khủng!
17. Cá lớn đâu, ra đây nào!
18. Đã thả cần là phải có thành quả!
19. Hôm nay không về nếu chưa có cá to!
20. Để xem tay ai cứng nhất hồ!
21. Cá càng lớn, càng đáng để thử sức!
22. Vào đây là phải chiến hết mình!
23. Con nào cắn câu là không thoát đâu!
24. Hôm nay quyết phá kỷ lục!
25. Cá khủng cứ để tôi lo!
26. Anh em chuẩn bị tinh thần giật cần nhé!
27. Phải có một con thật chiến mới được!
28. Hôm nay chơi lớn một phen!
29. Mục tiêu hôm nay là cá huyền thoại!
30. Không ngại cá lớn, chỉ ngại thiếu mồi!
31. Đã vào cuộc thì không được bỏ cuộc!
32. Cá to mới đáng công ngồi đợi!
33. Hôm nay phải cho hồ này biết tay!
34. Cần đã sẵn sàng, chiến thôi!
35. Một khi đã dính câu thì đừng hòng thoát!
36. Cá đâu hết rồi, trốn kỹ thế!
37. Ngồi từ nãy giờ mà cá vẫn chưa hiểu lòng mình!
38. Chắc cá đang họp bàn xem có nên cắn câu không!
39. Hôm nay cá có vẻ hơi chảnh!
40. Mồi ngon thế này mà không ăn thì phí quá!
41. Chắc phải gọi cá đến tận nơi mất!
42. Ngồi câu mà tưởng đang thi kiên nhẫn!
43. Cá ơi, đừng để anh chờ lâu quá!
44. Hôm nay chắc cá nghỉ phép hết rồi!
45. Cần thì xịn mà cá chẳng chịu vào!
46. Không biết câu cá hay đang ngắm cảnh nữa!
47. Cá mà biết điều thì đã lên bờ rồi!
48. Chắc phải tăng lương cho con cá nào chịu cắn mồi!
49. Ngồi lâu thế này chắc thành cá luôn mất!
50. Hôm nay mà trắng tay thì hơi quê đấy!
51. Cá cứ thử thách lòng kiên nhẫn của tôi đi!
52. Có khi cá đang cười mình dưới nước!
53. Mồi hết rồi mà cá vẫn chưa tới!
54. Chắc cá đang đợi mình đổi mồi!
55. Thôi thì cứ câu, biết đâu trời thương!
56. Ôi, dính rồi! Dính rồi!
57. Có cá! Có cá anh em ơi!
58. Ui, con này có vẻ nặng đấy!
59. Kéo nào! Đừng để nó thoát!
60. Căng dây rồi, căng dây rồi!
61. Phen này có hàng ngon rồi!
62. Con này không nhỏ đâu nhé!
63. Giữ chắc cần, sắp lên rồi!
64. Được rồi, lên bờ nào!
65. Cảm giác này mới đã chứ!
66. Ui, lực kéo khỏe thật!
67. Bình tĩnh, không được để tuột!
68. Cá lớn rồi anh em ơi!
69. Hôm nay trúng mánh rồi!
70. Quá đã! Một con cá chất lượng!
71. Đừng hòng thoát khỏi tay tôi!
72. Nặng cần thế này chắc chắn hàng khủng!
73. Cố lên, sắp thành công rồi!
74. Pha này phải gọi là đỉnh!
75. Một cú kéo quá đẹp!
76. Cần thủ chân chính không ngại chờ đợi!
77. Đam mê đã lên thì khó mà xuống!
78. Cá lớn dành cho người kiên nhẫn!
79. Hồ còn nước, ta còn câu!
80. Cứ giữ vững tay cần, thành quả sẽ tới!
81. Một ngày không câu là thấy thiếu thiếu!
82. Đã mê câu cá thì chẳng ngại đường xa!
83. Cần thủ không sợ khó, chỉ sợ hết mồi!
84. Đời cần thủ, vui nhất là lúc cá cắn câu!
85. Có đam mê là có động lực!
86. Câu cá không chỉ cần may mắn mà còn cần bản lĩnh!
87. Hôm nay không được thì ngày mai câu tiếp!
88. Đã ra hồ thì phải có chuyện để kể!
89. Cá lớn không tự nhiên mà có!
90. Tay cần vững, tinh thần thép!
91. Mỗi cú thả cần là một cơ hội!
92. Anh em mình cứ chơi hết mình!
93. Câu được cá là vui, câu được cá khủng là quá vui!
94. Đã ngồi vào ghế là quyết tâm đến cùng!
95. Không có cá nhỏ, chỉ có niềm vui lớn!
96. Chiến thôi anh em!
97. Nay đỏ vận rồi!
98. Lên cá nào!
99. Có hàng rồi!
100. Hồ này vui thật!

### Chat khi câu thành công (50)

1. Haha! Lên cá rồi anh em ơi!
2. Quá đã! Một em nữa lên bờ!
3. Được rồi! Không uổng công chờ đợi!
4. Ngon! Hôm nay có lộc rồi!
5. Một pha kéo cá quá mượt!
6. Thấy chưa! Tôi biết là có cá mà!
7. Đúng là tay nghề không phải dạng vừa!
8. Haha! Cá này chất lượng đấy!
9. Thêm một chiến lợi phẩm!
10. Hôm nay đỏ thật sự rồi!
11. Cá đẹp đấy! Quá ưng luôn!
12. Một cú giật cần đáng đồng tiền!
13. Thành quả đây rồi anh em!
14. Lại thêm một em vào giỏ!
15. Cảm giác kéo được cá vẫn là nhất!
16. Quá ngon! Tiếp tục phát huy!
17. Cá đã lên, anh em ơi!
18. Đỉnh! Không để nó chạy mất!
19. Một pha xử lý quá đẹp!
20. Hôm nay đúng là ngày của mình!
21. Haha! Thêm một em dính thính!
22. Cá ngon thế này thì tuyệt!
23. Đã tay thật sự!
24. Không phụ công ngồi đợi!
25. Một con cá, một niềm vui!
26. Lại có hàng rồi!
27. Quá tuyệt! Đúng con mình mong đợi!
28. Tay cần hôm nay hoạt động tốt đấy!
29. Pha này phải ăn mừng thôi!
30. Cá lên đều thế này mới thích!
31. Được mùa rồi anh em ơi!
32. Chuyến này không về tay trắng rồi!
33. Quá chuẩn! Không lệch một nhịp!
34. Lại thêm một pha thắng lợi!
35. Cá đẹp, tâm trạng cũng đẹp!
36. Đúng là công sức bỏ ra không uổng!
37. Haha! Cá cũng phải chịu thua rồi!
38. Thế này mới gọi là đi câu chứ!
39. Một em nữa gia nhập bộ sưu tập!
40. Đúng ý luôn! Cá ngon quá!
41. Quá phê! Lại lên cá rồi!
42. Hôm nay tay mình có duyên với cá thật!
43. Thêm một chiến thắng cho cần thủ!
44. Cá đã vào giỏ, tiếp tục thôi!
45. Đúng là không làm anh em thất vọng!
46. Cú kéo này phải được điểm mười!
47. Quá may mắn! Lại trúng một em!
48. Đã quá! Hôm nay phải chơi lớn!
49. Thành quả xứng đáng cho một cần thủ!
50. Tuyệt vời! Tiếp tục săn cá lớn nào!

Gợi ý: đặt tên và câu chat trong file dữ liệu (vd. `server/FishingOnline.Api/Modules/Bots/bot-content.json`, embedded resource) để GD đổi không cần sửa code; mock dùng bản sao/chung nguồn.

## 6. Mock `pier.html` (client-v0/src/online/mock)

MockBackend cùng contract: bot dùng 50 tên mới, bảng mốc (mock coi user thật = 1), bot chat world/DM, kết bạn, profile người khác, icon cá. Đủ để chạy thử giao diện không cần Server.

## 7. Kiểm tra

- Server: cập nhật `BotTests`, thêm test cho bảng mốc (mỗi mức), bot không câu thì không ngồi ghế, nhường ghế, giới hạn 50, DM, kết bạn, profile công khai không lộ IsBot, emoji cá chỉ khi đã câu loài đó. Chạy toàn bộ `dotnet test`.
- Client: typecheck + `vitest` + build sạch; test cho logic thuần (chọn câu chat theo trạng thái, mốc bot, danh sách ô icon).
- Ghi phần tham gia Server/Web Client/Admin và kết quả kiểm tra vào cuối file này; thêm dòng vào `docs/HANDOFF.md`.

---

## Kết quả triển khai (Claude, 2026-11-18)

- **Trạng thái chung:** Server + Web Client (mock pier.html) đã làm và test xong; **chưa** chạy pier.html với Server thật trên trình duyệt; Admin Tool không có trang bot (xem dưới). Chưa commit.
- **Người/agent sửa phần chung và contract:** Claude (phiên này). Contract ghi ở mục "Contract" dưới đây.

### Server (BE)

- **Phạm vi:** `server/FishingOnline.Api/Modules/Bots` (BotModule.cs, BotAgent.cs, BotModels.cs, BotSettingsService.cs, BotContent.cs mới, bot-content.json mới — embedded resource), `Modules/Social` (Friends.cs, DirectMessages.cs mới; SocialModule.cs, GameHub.Social.cs), `Modules/Profile/ProfileModule.cs`, `Modules/Lake` (LakeRoom.cs, LakeCommands.cs), `Common/ErrorCatalog.cs`, migration `20261118035010_BOT02_TiersFriendsDirectMessages`.
- **Bot theo mốc:** `bot_settings.Tiers` (jsonb) thay `MinTotalPlayers`/`MaxBots`; mặc định đúng bảng mục 1 (migration điền bảng này cho dòng cài đặt cũ). Mỗi lần kiểm tra (CheckIntervalSeconds, mặc định 180) đếm user thật (`RoomPlayer.IsBot`, không gửi Client), lấy mốc, rồi thêm/bớt **từng con** cách nhau `Bots:StaggerMinMs..StaggerMaxMs` (2000–5000 ms). Mục tiêu = min(mốc, Lake:MaxPlayers − user thật), tính lại ở mỗi bước. Kiểm tra mốc chạy nền nên nhịp ngắn (ghế, chat) vẫn chạy trong lúc bot vào/ra.
- **User thật luôn vào được:** `JoinLake` chỉ chặn khi số **user thật** đủ MaxPlayers; hồ đầy vì bot thì bỏ ngay một bot (ưu tiên bot không ngồi ghế) rồi mới thêm người — tổng không bao giờ vượt 50.
- **Bot được câu / nhường ghế (cách đã chọn):** bot phải xin "suất ngồi" từ BotManager trước khi đi tới ghế. Số suất = min(mốc bot câu, số ghế − ghế user thật đang ngồi − 1 nếu có user thật đang đứng). Nghĩa là **luôn chừa ít nhất 1 ghế trống khi có user thật đứng**; thừa suất (mốc giảm, user mới vào) thì bot thừa đứng dậy ngay (ưu tiên bot đang đi tới ghế), kiểm tra mỗi nhịp 1 giây. Bot không có suất chỉ đi dạo và chat. Không sửa luồng SitDown của người chơi.
- **50 tên:** lần chạy đầu đổi tên bot cũ (tên ngoài danh sách) sang tên còn trống, bỏ tên user thật đã dùng (không thêm số); bot mới tạo dần khi cần, tối đa đúng số tên. Bot có lời nhắn (một câu "Chat bình thường") và danh hiệu cố định theo id.
- **Chat bot:** qua `SocialService.SendChatAsync` (lưu DB, bong bóng như người thật). Cả hồ 20–40 giây một câu; trạng thái chờ cá → 70% câu 36–55, cá cắn/kéo → 70% câu 56–75, còn lại câu 1–35/76–100. Câu được cá: 60% nói câu "câu thành công" nếu bot chat gần nhất ≥ 5 giây trước, và lùi câu world kế 20–40 giây; 30% thả icon cá loài vừa câu. Emoji bot 25–50 giây một lần (50% icon cá loài đã câu).
- **Kết bạn:** bảng `friend_requests` (pending/accepted/declined, giữ dòng để mỗi cặp bot chỉ mời một lần) và `friendships` (2 dòng/cặp). API: `GET /api/v1/friends`, `POST /api/v1/friends/requests {playerId}`, `POST /api/v1/friends/requests/{fromId}/accept|decline`. Event `FriendRequestReceived`, `FriendAdded` gửi tới mọi kết nối của người đó (`Clients.User`, thêm `PlayerUserIdProvider` theo claim playerId). Bot mời khi đứng ≤ 80 px cạnh user thật (mỗi bot cách nhau ≥ 60 giây, mỗi cặp một lần); user mời bot thì bot đồng ý sau 2–5 giây.
- **Tin riêng:** bảng `direct_messages` (xóa cùng hạn 7 ngày), hub `SendDirectMessage(requestId, toPlayerId, text)` (ack trả tin), event `DirectMessageReceived` cho cả hai người, `GET /api/v1/me/dm` (hội thoại) và `GET /api/v1/me/dm/{playerId}?limit` (≤ 100). Chỉ giữa bạn bè (`NOT_FRIENDS` 403), 160 ký tự, tần suất như chat chung nhưng đếm riêng. Bot trả lời 2–6 giây; bot nhắn trước cho bạn đang ở hồ 1–2 phút một lần, mỗi cặp ≤ 1 tin / 10 phút.
- **Hồ sơ công khai:** `GET /api/v1/players/{id}/profile` → playerId, displayName, skinId, level, exp, titleId, bio, showcase (3 ô), online (đang ở hồ), friendStatus (self/friends/pending_out/pending_in/none). Không có Gold/IsBot. Ô khoe của bot = 3 loài có con dài nhất bot đã câu (tính lúc đọc).
- **Emoji cá:** `SendEmoji` nhận `fish:<speciesId>` khi loài có trong config và người gửi có `species_records` loài đó.
- **Mã lỗi mới:** `PLAYER_NOT_FOUND` (404), `NOT_FRIENDS` (403).
- **Kiểm tra:** `dotnet test server` → Domain.Tests 156/156, Api.Tests 252/252 (Postgres portable cổng 55432). Test mới/cập nhật: `BotContentTests` (mỗi mức của bảng mốc, kiểm tra hợp lệ, 50 tên/100/50 câu, chọn câu theo trạng thái), `BotTests` (theo user thật, vào dần, giới hạn 50 + user luôn vào, tắt bot, đổi tên bot cũ, bot không suất không ngồi, nhường ghế + mốc giảm thì đứng dậy, không lộ IsBot kể cả profile/friends, chat qua SocialService, bot mời một lần/tự đồng ý/trả lời DM, cài đặt Admin mới), `FriendsTests` (mời/đồng ý/từ chối/mời chéo/404, DM chỉ bạn bè + nhiều tab + lịch sử, giới hạn độ dài/tần suất, profile công khai, emoji cá).

### Web Client (kiêm Art/asset 2D)

- **Phạm vi:** `client-v0/src/online`: net/contract.ts, contractGuards.ts, state/store.ts (slice `social`), bindHub.ts, social/SocialUi.ts + social.css, social/fishEmoji.ts, skinFace.ts, directModel.ts (mới), entities/CharacterView.ts, scenes/lake/LakeScene.ts, scenes/pier/preview.ts, ui/home/HomeHud.ts, ui/friends/* (mới: PlayerInfoPopup, FriendsPopup, friendActions, friendStatus, friends.css), ui/profile/profileArt.ts, ui/kit/errorText.ts.
- **Chat:** khung có 2 tab "Thế giới" / "Tin riêng". Tab Tin riêng: danh sách hội thoại (bạn bè + người đã nhắn, chấm online, số chưa xem), bấm vào mở hội thoại có nút quay lại; bấm tên mở popup thông tin. Số chưa xem hiện trên tab và cộng vào số trên nút chat.
- **Biểu cảm:** ô icon cá (ảnh `ui/fishArt`) sau 16 emoji theo thứ tự Sổ tay; danh sách loài lấy từ `/me/codex`, câu được loài mới thì ô hiện ngay (store nghe `AttemptUpdate` success). Icon cá hiện trong khung chat và trên đầu nhân vật (bong bóng như emoji).
- **Nhân vật:** (chỉ pier.html) chỉ rê chuột lên người/bot khác thì có viền trắng (bỏ điều kiện đứng cách ≤ 40 px từ 2026-11-18) (4 bản sao trắng lệch 1 px, mờ dần như viền ghế); bấm vào mở popup thông tin.
- **Popup thông tin người chơi:** avatar (mặt thỏ theo skin), tên + chấm online, Lv, thanh kinh nghiệm, danh hiệu, lời nhắn, 3 ô cá khoe; nút Kết bạn → "Đã gửi lời mời"; người kia mời trước → Đồng ý/Từ chối; bạn bè → "Bạn bè" + "Nhắn tin". **Không dùng khung Infomation/Frame.png** vì ảnh đó vẽ sẵn chữ "TÀI KHOẢN", "Thành tựu" và icon bút sửa; dùng khung Secondary L, ô Slot, nút Small/Primary M của popup Tài khoản.
- **Popup Bạn bè:** ô "Bạn bè" mới trong menu HomeHud; lời mời đang chờ (Đồng ý/Từ chối) và danh sách bạn (avatar, tên, Lv, online/ngoại tuyến, Nhắn tin, Xem). Chấm đỏ (Claim Dot) trên nút menu và ô Bạn bè khi có lời mời.
- **Placeholder / cần duyệt:** icon ô "Bạn bè" là **icon tạm** vẽ bằng điểm ảnh (`profileArt('friends')`, hai mặt thỏ + trái tim). Menu thành 7 ô nên lưới đổi sang **3 cột ô nhỏ hơn** (104 px) để vừa khung Menu Panel — thay đổi bố cục menu đã duyệt, cần Zen xem lại.
- **Mock pier.html (`mock/MockSocial.ts`, `mock/botSocial.ts`, `mock/bot-content.json` là bản sao của Server, có test so khớp):** mốc với user thật = 1 → 30 bot, 20 được câu, vào dần 2–5 giây một con (bắt đầu sau 1 giây); bot không suất không ngồi ghế, luôn chừa ghế khi người chơi đứng; chat world/emoji/câu thành công theo luật Server; bot mời kết bạn khi đi gần, tự đồng ý, trả lời/nhắn trước DM; hồ sơ công khai; icon cá chỉ khi đã câu. fishing.html và test cũ vẫn dùng 3 bot cố định như trước. Mock chưa phải tích hợp thật.
- **Kiểm tra:** `npx tsc --noEmit` sạch; `npx vitest run` 35 file / 317 test đạt (mới: botSocial.test.ts, socialModel.test.ts, MockBackend.social.test.ts); `npx eslint src/online` sạch; `prettier --check` sạch; `npm run build` đạt. Chạy pier.html (mock) trong trình duyệt 1280×720: bot vào dần và chat, tab Tin riêng, bấm bot mở popup (viền trắng khi rê chuột), đồng ý lời mời bot, Nhắn tin → bot trả lời, popup Bạn bè, ô icon cá trong bảng Biểu cảm, icon cá trên đầu bot. Đăng nhập Google của pier mock được bỏ qua bằng lệnh dev trong console (chỉ để kiểm tra).

### Admin Tool

- **Không áp dụng lần này:** `admin/` chưa có trang cài đặt bot (chỉ Config, Players, Lake, Stocking, Audit). API `GET/PUT /api/v1/admin/bots/settings` đã đổi sang `{ enabled, checkIntervalSeconds, successRatePct, tiers: [{ minRealPlayers, totalBots, fishingBots }] }` (tối đa 10 mốc, mốc đầu 0, tăng dần, 0–50 bot, bot câu ≤ tổng). Khi làm trang bot cho Admin Tool thì dùng contract này.

### Contract (BOT-02, nguồn: mục Server ở trên; types ở `client-v0/src/online/net/contract.ts`)

- HTTP: `GET /players/{id}/profile` (PublicProfile), `GET /friends` (FriendsResponse), `POST /friends/requests` → `{status: sent|friends}`, `POST /friends/requests/{id}/accept|decline`, `GET /me/dm` (ConversationsResponse), `GET /me/dm/{id}` (DirectMessagesResponse).
- Hub: `SendDirectMessage {toPlayerId, text}` → ack DirectMessage; `SendEmoji` nhận thêm `fish:<speciesId>`.
- Event: `DirectMessageReceived`, `FriendRequestReceived`, `FriendAdded`.

### Việc còn lại / cần người dùng duyệt

- Art: icon ô "Bạn bè" (đang tạm), bố cục menu 7 ô (3 cột), có thể cần art riêng cho popup người chơi/bạn bè và tab chat.
- Chưa kiểm tra pier.html với Server thật (cần chạy `run-real.bat` hoặc `tools/run-local.ps1 -Mode real -DevLogin`, áp migration mới bằng `server/migrate-local.ps1`).
- Unread tin riêng chỉ đếm trong phiên (Client), Server chưa lưu "đã xem".

### Sửa sau merge (Claude, 2026-11-18)

- **Lỗi tìm thấy:** merge nhánh BOT-02 với nhánh W02 làm (1) `CharacterView.ts` mất trường `iconBubble`/`headIcon` và import `loadFishTexture`, nên mỗi lần có người câu được cá thì game báo `ReferenceError` và không hiện icon cá trên đầu; (2) `BotAgent.cs`/`BotModule.cs` bản BOT-02 đè mất hai luật bot ngày 2026-11-17: watchdog (bot đứng yên quá 150 giây thì khởi động lại) và chống đứng chồng (`BotSpots`, cách người/bot khác ≥ 24 px, bị đứng đè thì đi chỗ khác, rời vị trí ghế khi phiên ngồi kết thúc). Test Server không biên dịch.
- **Web Client:** `CharacterView` dùng một helper ảnh cá chung (`entities/fishTexture.ts`, key `fish-icon-<loài>`) cho cả icon cá vừa câu và emoji `fish:<loài>`; emoji cá đánh dấu bằng data `fishEmote` để `clearEmote` chỉ gỡ emoji.
- **Server:** `BotAgent` ghép lại: giữ đủ phần BOT-02 (`IBotCoordinator`, suất câu, `RequestStand`, `ChatState`, `OnCaughtAsync`, `IsBot`) và thêm lại `StalledFor`/`RestartAsync`, `BotSpots`, đi vòng/chọn lại điểm khi bị chặn, `LeaveSeatSpotAsync`. `BotManager.RestartStalledAsync` + `StallLimit` (150 s), `BotDirector` gọi mỗi nhịp; không giữ khóa kiểm tra mốc, bot đã dừng thì bỏ qua. 5 test cũ trong `BotTests` chuyển sang bảng mốc (`Tiers((0, n, n))`). Bỏ chú thích trùng ở `BotCheckResult`.
- **Kiểm tra:** Client tsc/eslint sạch, vitest 321 qua; trong pier.html mock 22 lượt câu, 0 lỗi console, ảnh 8 loài cá nạp đúng. Server build sạch; `dotnet test` Domain 156/156, Api 260/261 (38 test bot qua); test còn fail là `SeatTests.Disconnect125s_LosesSeat_SeatFreeAtOnce` (flaky từ trước, chạy riêng thì qua). Chưa chạy với Server thật.