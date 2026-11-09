# Fishing Online — Web Client

Phaser 3.90.0 + TypeScript strict + Vite. Luật và contract: [SPEC_CHUNG](../docs/v01/SPEC_CHUNG.md).

## Chạy

```bash
npm ci
npm run dev
```

Mở http://localhost:5173. Không có file `.env` thì `npm run dev` chạy **mock** trong trình duyệt, góc màn hình hiện chữ MOCK. Mock không phải kết quả Server thật.

| Lệnh | Việc |
| --- | --- |
| `npm run build` | Kiểm tra type rồi đóng gói vào `dist/` |
| `npm test` | Vitest |
| `npm run lint` | ESLint và Prettier |

| Địa chỉ | Nội dung |
| --- | --- |
| `/` | Boot rồi vào scene hồ (WASD/mũi tên để thử va chạm) |
| `/?scene=ui-demo` | Trang demo UI kit |
| `/?mockError=SEAT_TAKEN` | Mock trả lỗi giả cho mọi lệnh thay đổi trạng thái (trừ đăng nhập, vào hồ, di chuyển) |

## Biến môi trường

Xem [.env.example](.env.example): `VITE_API_BASE`, `VITE_USE_MOCK`.

## Cấu trúc

| Thư mục | Nội dung |
| --- | --- |
| `src/core` | Boot, cấu hình môi trường, kiểu config gameplay |
| `src/net` | Contract, `ApiClient`, `GameHub` |
| `src/state` | Kho state và reducer theo event |
| `src/mock` | `MockBackend` chạy luật đơn giản theo SPEC |
| `src/scenes/lake` | Scene hồ, va chạm `canStand` |
| `src/fishing` | Lõi minigame TS thuần |
| `src/ui/kit` | UI kit DOM overlay |
