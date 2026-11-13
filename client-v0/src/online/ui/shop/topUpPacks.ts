// Gói của tab "Nạp Gold" (ảnh mẫu 2026-11-13). Chưa có cổng thanh toán: bản dev gọi POST /dev/topup,
// Server (chỉ Development) và mock cộng đúng số Gold của gói. Giá VND chỉ để hiển thị.
export interface TopUpPack {
  packId: string;
  gold: number;
  priceLabel: string;
}

export const TOP_UP_PACKS: readonly TopUpPack[] = [
  { packId: 'gold_1000', gold: 1_000, priceLabel: '10.000 đ' },
  { packId: 'gold_5000', gold: 5_000, priceLabel: '40.000 đ' },
  { packId: 'gold_10000', gold: 10_000, priceLabel: '70.000 đ' },
];

export interface TopUpResponse {
  goldAdded: string;
  gold: string;
}
