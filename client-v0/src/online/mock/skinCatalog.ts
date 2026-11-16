// Danh sách skin của mock, khớp "Social.Skins" trong server/FishingOnline.Api/appsettings.json.
// Server thật trả danh sách này qua GET /skins; Client chỉ đọc từ API, không import file này.
import type { SkinView } from '../net/contract';

type SkinDef = Omit<SkinView, 'owned'>;

export const MOCK_SKINS: readonly SkinDef[] = [
  { skinId: 'skin_01', name: 'Skin 1', unlock: 'free' },
  { skinId: 'skin_02', name: 'Skin 2', unlock: 'free' },
  { skinId: 'skin_03', name: 'Skin 3', unlock: 'free' },
  { skinId: 'skin_04', name: 'Skin 4', unlock: 'free' },
  { skinId: 'skin_05', name: 'Skin 5', unlock: 'free' },
  { skinId: 'skin_06', name: 'Váy nữ hoàng', unlock: 'shop' },
  { skinId: 'skin_07', name: 'Onesie thỏ xanh', unlock: 'shop' },
  { skinId: 'skin_08', name: 'Áo mưa tím', unlock: 'shop' },
  { skinId: 'skin_09', name: 'Đồ bơi hồng', unlock: 'shop' },
  { skinId: 'skin_10', name: 'Ông già Noel', unlock: 'shop' },
];
