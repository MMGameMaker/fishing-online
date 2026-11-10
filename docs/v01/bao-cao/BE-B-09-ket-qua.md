# BE-B-09 — Kết quả mô phỏng balance

- **Config:** `v0-test-2026-11-09-monitoring-05`
- **Tham số chạy:** 500 phiên mỗi dòng, 2000 ván mỗi ô tỷ lệ thắng, seed 20261109.
- **Lệnh tạo lại:** `dotnet run --project server/FishingOnline.Sim`

> Mọi con số là **mô phỏng với người chơi giả định**, không phải số đo từ người chơi thật, và không bảo đảm Client thật không gian lận. Config hiện vẫn là giá trị test, chưa khóa balance.

## Mô hình người chơi (giả định)

- Hook sau khi cá cắn: ngẫu nhiên đều 400-1200 ms.
- Minigame: luôn nhắm giữa vùng vàng; thời điểm bấm lệch theo phân phối chuẩn với độ lệch chuẩn của từng mức kỹ năng: Mới chơi 100 ms, Trung bình 60 ms, Giỏi 30 ms.
- Sau mỗi lần bấm cần ít nhất 250 ms để nhắm lại vùng mới.
- Client tự quăng cần lại sau kết quả (SPEC 0.8): thắng sau 1000 ms (người chơi chạm đóng popup), thua sau 2000 ms.
- Các bảng dưới dùng mức **Trung bình**, trừ bảng so sánh kỹ năng.

**Chưa mô phỏng:** tồn cá trong hồ (SPEC chưa chốt tồn đầu/khi cạn), độ trễ mạng, cooldown ghế và thời gian chờ giữa hai phiên.

## Tỷ lệ thắng theo rarity × level × cần

Mức kỹ năng Trung bình.

### Common

| Level | Old Fishing Rod | Steel Awl | High Performer | Bliss | Giant Caster |
| --- | --- | --- | --- | --- | --- |
| Lv1 | 95.4% | 96.1% | 96.3% | 99.2% | 99.3% |
| Lv2 | 95.5% | 98.6% | 98.8% | 99.1% | 99.3% |
| Lv3 | 98.1% | 98.9% | 98.3% | 98.8% | 99.9% |
| Lv4 | 97.8% | 99.8% | 99.1% | 99.8% | 99.9% |
| Lv5 | 99.5% | 99.4% | 99.4% | 99.8% | 99.9% |
| Lv6 | 99.6% | 99.5% | 99.6% | 99.8% | 100.0% |
| Lv7 | 99.0% | 99.5% | 99.7% | 99.8% | 99.8% |
| Lv8 | 99.7% | 99.9% | 99.9% | 100.0% | 100.0% |
| Lv9 | 99.6% | 99.8% | 100.0% | 99.9% | 100.0% |
| Lv10 | 100.0% | 99.9% | 99.9% | 100.0% | 100.0% |

### Uncommon

| Level | Old Fishing Rod | Steel Awl | High Performer | Bliss | Giant Caster |
| --- | --- | --- | --- | --- | --- |
| Lv1 | 71.6% | 85.4% | 83.7% | 94.4% | 95.0% |
| Lv2 | 83.6% | 92.6% | 89.1% | 93.9% | 95.3% |
| Lv3 | 88.4% | 91.1% | 89.5% | 96.6% | 97.7% |
| Lv4 | 90.5% | 96.6% | 95.2% | 97.5% | 97.9% |
| Lv5 | 95.5% | 96.4% | 96.1% | 97.7% | 98.3% |
| Lv6 | 95.3% | 95.8% | 95.4% | 99.2% | 99.4% |
| Lv7 | 95.3% | 98.9% | 97.6% | 99.1% | 99.4% |
| Lv8 | 98.5% | 98.9% | 98.5% | 99.4% | 99.1% |
| Lv9 | 98.3% | 99.0% | 97.9% | 99.1% | 99.3% |
| Lv10 | 98.4% | 98.9% | 98.7% | 99.3% | 99.7% |

### Rare

| Level | Old Fishing Rod | Steel Awl | High Performer | Bliss | Giant Caster |
| --- | --- | --- | --- | --- | --- |
| Lv1 | 43.3% | 61.6% | 55.9% | 66.9% | 79.1% |
| Lv2 | 53.9% | 72.8% | 68.4% | 77.1% | 88.0% |
| Lv3 | 66.5% | 80.6% | 78.4% | 85.0% | 88.2% |
| Lv4 | 78.7% | 84.3% | 77.9% | 85.2% | 87.6% |
| Lv5 | 78.4% | 83.0% | 80.1% | 92.8% | 93.3% |
| Lv6 | 79.0% | 91.3% | 87.9% | 94.3% | 93.4% |
| Lv7 | 88.3% | 91.1% | 89.4% | 93.5% | 94.0% |
| Lv8 | 89.7% | 92.2% | 89.8% | 93.3% | 97.9% |
| Lv9 | 90.1% | 96.9% | 95.7% | 97.1% | 97.7% |
| Lv10 | 95.8% | 96.3% | 95.3% | 97.5% | 97.4% |

### Epic

| Level | Old Fishing Rod | Steel Awl | High Performer | Bliss | Giant Caster |
| --- | --- | --- | --- | --- | --- |
| Lv1 | 14.7% | 35.9% | 31.9% | 39.8% | 54.6% |
| Lv2 | 30.8% | 47.8% | 40.8% | 50.2% | 67.1% |
| Lv3 | 40.2% | 57.3% | 51.3% | 62.8% | 64.6% |
| Lv4 | 53.6% | 57.2% | 52.7% | 71.5% | 75.8% |
| Lv5 | 55.3% | 70.0% | 66.7% | 74.2% | 77.3% |
| Lv6 | 67.9% | 70.5% | 67.7% | 74.6% | 84.9% |
| Lv7 | 65.3% | 81.1% | 79.0% | 84.4% | 87.0% |
| Lv8 | 79.5% | 82.1% | 80.1% | 85.7% | 87.3% |
| Lv9 | 77.1% | 82.1% | 81.7% | 86.8% | 86.9% |
| Lv10 | 79.7% | 83.1% | 79.8% | 85.6% | 88.5% |

### Legendary

| Level | Old Fishing Rod | Steel Awl | High Performer | Bliss | Giant Caster |
| --- | --- | --- | --- | --- | --- |
| Lv1 | 1.2% | 4.1% | 3.9% | 8.7% | 15.8% |
| Lv2 | 4.0% | 10.4% | 9.2% | 19.1% | 20.6% |
| Lv3 | 8.3% | 16.8% | 13.5% | 24.1% | 28.3% |
| Lv4 | 13.1% | 21.8% | 20.1% | 32.7% | 38.5% |
| Lv5 | 19.0% | 29.3% | 25.0% | 34.3% | 46.9% |
| Lv6 | 24.6% | 40.2% | 38.6% | 46.4% | 47.8% |
| Lv7 | 34.8% | 40.6% | 39.3% | 44.9% | 59.5% |
| Lv8 | 35.9% | 51.5% | 51.0% | 58.7% | 62.0% |
| Lv9 | 46.4% | 52.7% | 50.4% | 59.6% | 60.7% |
| Lv10 | 49.2% | 55.2% | 52.4% | 70.9% | 72.9% |

## So sánh theo kỹ năng

Cho thấy tỷ lệ thắng phụ thuộc mạnh vào sai số giả định, nên cần hiệu chỉnh bằng dữ liệu playtest.

| Người chơi | Rarity | Mới chơi | Trung bình | Giỏi |
| --- | --- | --- | --- | --- |
| Lv1 + Old Fishing Rod | Common | 71.3% | 95.8% | 99.9% |
| Lv1 + Old Fishing Rod | Uncommon | 32.3% | 71.7% | 98.8% |
| Lv1 + Old Fishing Rod | Rare | 13.1% | 44.1% | 94.0% |
| Lv1 + Old Fishing Rod | Epic | 3.1% | 15.5% | 69.7% |
| Lv1 + Old Fishing Rod | Legendary | 0.1% | 1.5% | 26.0% |
| Lv5 + Steel Awl | Common | 94.5% | 99.5% | 100.0% |
| Lv5 + Steel Awl | Uncommon | 79.7% | 95.6% | 100.0% |
| Lv5 + Steel Awl | Rare | 50.1% | 83.5% | 99.2% |
| Lv5 + Steel Awl | Epic | 35.9% | 69.8% | 97.7% |
| Lv5 + Steel Awl | Legendary | 7.8% | 28.6% | 83.0% |
| Lv10 + Giant Caster | Common | 99.3% | 100.0% | 100.0% |
| Lv10 + Giant Caster | Uncommon | 93.3% | 99.3% | 100.0% |
| Lv10 + Giant Caster | Rare | 86.5% | 98.0% | 100.0% |
| Lv10 + Giant Caster | Epic | 63.9% | 87.3% | 99.7% |
| Lv10 + Giant Caster | Legendary | 41.1% | 74.0% | 98.1% |

## Số lần câu và Gold mỗi phiên theo Tier

Chỉ số giữ nguyên trong phiên, bán hết cá theo giá loài. Lãi = Gold bán cá − tiền vé.

| Tier | Phút | Người chơi | Lần câu TB | Bắt được TB | Gold bán cá TB | Tiền vé | Lãi TB | Lãi P10 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | 10 | Lv1 + Old Fishing Rod | 57.4 | 45.5 | 338.1 | 120 | 218.1 | 160 |
| 1 | 10 | Lv5 + Steel Awl | 71.4 | 67.1 | 700.1 | 120 | 580.1 | 465 |
| 1 | 10 | Lv10 + Giant Caster | 82.1 | 80.8 | 1058.4 | 120 | 938.4 | 760 |
| 1 | 20 | Lv1 + Old Fishing Rod | 115.3 | 91.9 | 684.3 | 240 | 444.3 | 365 |
| 1 | 20 | Lv5 + Steel Awl | 143.1 | 134.7 | 1410.7 | 240 | 1170.7 | 995 |
| 1 | 20 | Lv10 + Giant Caster | 164.8 | 161.8 | 2117.5 | 240 | 1877.5 | 1605 |
| 1 | 30 | Lv1 + Old Fishing Rod | 173.1 | 137.6 | 1028.5 | 360 | 668.5 | 575 |
| 1 | 30 | Lv5 + Steel Awl | 214.6 | 202.3 | 2130.7 | 360 | 1770.7 | 1530 |
| 1 | 30 | Lv10 + Giant Caster | 247.5 | 243.2 | 3196 | 360 | 2836 | 2515 |
| 2 | 10 | Lv1 + Old Fishing Rod | 55 | 44.3 | 322.5 | 70 | 252.5 | 200 |
| 2 | 10 | Lv5 + Steel Awl | 67.6 | 64 | 655.2 | 70 | 585.2 | 475 |
| 2 | 10 | Lv10 + Giant Caster | 77.2 | 75.9 | 959.3 | 70 | 889.3 | 715 |
| 2 | 20 | Lv1 + Old Fishing Rod | 110.5 | 89 | 649.2 | 140 | 509.2 | 430 |
| 2 | 20 | Lv5 + Steel Awl | 135.6 | 128.1 | 1294.7 | 140 | 1154.7 | 1000 |
| 2 | 20 | Lv10 + Giant Caster | 154.7 | 152.2 | 1916.4 | 140 | 1776.4 | 1545 |
| 2 | 30 | Lv1 + Old Fishing Rod | 166 | 133.5 | 966.1 | 210 | 756.1 | 660 |
| 2 | 30 | Lv5 + Steel Awl | 203.4 | 192.2 | 1953.4 | 210 | 1743.4 | 1555 |
| 2 | 30 | Lv10 + Giant Caster | 232.7 | 229 | 2890.8 | 210 | 2680.8 | 2385 |
| 3 | 10 | Lv1 + Old Fishing Rod | 52.6 | 42.4 | 309.1 | 40 | 269.1 | 220 |
| 3 | 10 | Lv5 + Steel Awl | 64 | 60.6 | 611.9 | 40 | 571.9 | 460 |
| 3 | 10 | Lv10 + Giant Caster | 72.5 | 71.3 | 907.2 | 40 | 867.2 | 705 |
| 3 | 20 | Lv1 + Old Fishing Rod | 105.6 | 85 | 620.5 | 80 | 540.5 | 465 |
| 3 | 20 | Lv5 + Steel Awl | 128.1 | 121 | 1248.9 | 80 | 1168.9 | 1010 |
| 3 | 20 | Lv10 + Giant Caster | 145.2 | 142.7 | 1795.2 | 80 | 1715.2 | 1490 |
| 3 | 30 | Lv1 + Old Fishing Rod | 158.5 | 127.4 | 927 | 120 | 807 | 715 |
| 3 | 30 | Lv5 + Steel Awl | 192.4 | 181.9 | 1854.1 | 120 | 1734.1 | 1560 |
| 3 | 30 | Lv10 + Giant Caster | 218.2 | 214.6 | 2719.1 | 120 | 2599.1 | 2305 |

## Thời gian lên level cao nhất

Người chơi mới (100 Gold), luôn ngồi một Tier, mua từng block 10 phút, bán cá ngay khi bắt được. Hết Gold mua vé thì dừng. Thời gian chỉ tính lúc giữ ghế.
Tỷ lệ đạt 0% ở Tier 1 vì Gold khởi đầu không đủ mua vé đầu tiên ở Tier đó.

| Tier | Chiến lược cần | Tỷ lệ đạt | Phút TB | Phút P90 | Lần câu TB | Số vé TB |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | Giữ cần mặc định | 0.0% | - | - | - | - |
| 1 | Mua cần tốt hơn khi đủ Gold | 0.0% | - | - | - | - |
| 2 | Giữ cần mặc định | 100.0% | 41.6 | 43.4 | 277.8 | 4.9 |
| 2 | Mua cần tốt hơn khi đủ Gold | 100.0% | 38.5 | 40.5 | 265.8 | 4.2 |
| 3 | Giữ cần mặc định | 100.0% | 43.9 | 46.1 | 277.4 | 5 |
| 3 | Mua cần tốt hơn khi đủ Gold | 100.0% | 40.6 | 42.6 | 265.3 | 4.7 |

