// Danh sách skin của mock, khớp "Social.Skins" trong server/FishingOnline.Api/appsettings.json.
// Server thật trả danh sách này qua GET /skins; Client chỉ đọc từ API, không import file này.
import type { SkinView } from '../net/contract';

type SkinDef = Omit<SkinView, 'owned'>;

export const MOCK_SKINS: readonly SkinDef[] = [
  { skinId: 'skin_01', name: 'Thỏ 1', unlock: 'free' },
  { skinId: 'skin_02', name: 'Thỏ 2', unlock: 'free' },
  { skinId: 'skin_03', name: 'Thỏ 3', unlock: 'free' },
  { skinId: 'skin_04', name: 'Thỏ 4', unlock: 'free' },
  { skinId: 'skin_05', name: 'Thỏ 5', unlock: 'free' },
  { skinId: 'skin_06', name: 'Váy nữ hoàng', unlock: 'shop' },
  { skinId: 'skin_07', name: 'Onesie thỏ xanh', unlock: 'shop' },
  { skinId: 'skin_08', name: 'Áo mưa tím', unlock: 'shop' },
  { skinId: 'skin_09', name: 'Đồ bơi hồng', unlock: 'shop' },
  { skinId: 'skin_10', name: 'Ông già Noel', unlock: 'shop' },
  { skinId: 'skin_bot_bear_brown', name: 'Gấu nâu', unlock: 'free' },
  { skinId: 'skin_bot_bear_polar', name: 'Gấu Bắc Cực', unlock: 'free' },
  { skinId: 'skin_bot_beaver_brown', name: 'Hải ly nâu', unlock: 'free' },
  { skinId: 'skin_bot_cat_black', name: 'Mèo đen', unlock: 'free' },
  { skinId: 'skin_bot_cat_orange_tabby', name: 'Mèo vằn cam', unlock: 'free' },
  { skinId: 'skin_bot_cat_purple', name: 'Mèo tím', unlock: 'free' },
  { skinId: 'skin_bot_cat_tuxedo', name: 'Mèo tuxedo', unlock: 'free' },
  { skinId: 'skin_bot_cat_white', name: 'Mèo trắng', unlock: 'free' },
  { skinId: 'skin_bot_duck_white', name: 'Vịt trắng', unlock: 'free' },
  { skinId: 'skin_bot_fox_arctic', name: 'Cáo tuyết', unlock: 'free' },
  { skinId: 'skin_bot_fox_cascade_grey', name: 'Cáo xám', unlock: 'free' },
  { skinId: 'skin_bot_fox_silver', name: 'Cáo bạc', unlock: 'free' },
  { skinId: 'skin_bot_harlequin', name: 'Harlequin', unlock: 'free' },
  { skinId: 'skin_bot_rat_grey', name: 'Chuột xám', unlock: 'free' },
  { skinId: 'skin_bot_red_spotted_bunny', name: 'Thỏ đốm đỏ', unlock: 'free' },
  { skinId: 'skin_bot_shiba_cream', name: 'Shiba kem', unlock: 'free' },
  { skinId: 'skin_bot_shiba_dark', name: 'Shiba đen', unlock: 'free' },
  { skinId: 'skin_bot_turtle_green', name: 'Rùa xanh', unlock: 'free' },
  { skinId: 'skin_bot_turtle_hermann', name: 'Rùa Hermann', unlock: 'free' },
  { skinId: 'skin_bot_turtle_leatherback', name: 'Rùa luýt', unlock: 'free' },
];
