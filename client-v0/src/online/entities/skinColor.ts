// Đổi màu skin lúc chạy (yêu cầu 2026-11-25): panel Chọn nhân vật chỉ liệt kê LOÀI ở bản trắng, màu chọn riêng.
// Skin có màu là `<skin trắng>~<màu>`, ví dụ `skin_02~brown`; không có hậu tố là bản trắng (hoặc skin cũ/shop/NPC).
// Sheet bản trắng chỉ có 3 màu lông (sáng f9f7e4, bóng e5d09d hoặc ccd5e7, bóng đậm b5976e); đổi đúng 3 màu đó
// sang bộ ba màu đích, giữ nguyên viền, mắt, mũi, tai trong. Bộ ba màu đích lấy từ các skin có sẵn trong game.

export const COLOR_SEPARATOR = '~';

export type RGB = readonly [number, number, number];

export interface SkinColor {
  id: string;
  name: string;
  /** Lông chính, bóng, bóng đậm. */
  ramp: readonly [RGB, RGB, RGB];
}

const hex = (value: string): RGB => [
  parseInt(value.slice(0, 2), 16),
  parseInt(value.slice(2, 4), 16),
  parseInt(value.slice(4, 6), 16),
];

/** Màu trắng gốc: không đổi gì. */
export const WHITE_COLOR_ID = 'white';

export const SKIN_COLORS: readonly SkinColor[] = [
  { id: WHITE_COLOR_ID, name: 'Trắng', ramp: [hex('f9f7e4'), hex('e5d09d'), hex('b5976e')] },
  { id: 'brown', name: 'Nâu', ramp: [hex('c8a87a'), hex('af7e50'), hex('986d44')] }, // Thỏ 1
  { id: 'beige', name: 'Be', ramp: [hex('bfaa8e'), hex('a6876a'), hex('8c7056')] }, // Thỏ 3
  { id: 'peach', name: 'Hồng đào', ramp: [hex('f8e1bf'), hex('ebac80'), hex('d38d6a')] }, // Thỏ 4
  { id: 'gray', name: 'Xám', ramp: [hex('a1978c'), hex('927d61'), hex('79674f')] }, // Thỏ 5
  { id: 'silver', name: 'Bạc', ramp: [hex('cdc7c8'), hex('9fa1ac'), hex('858893')] }, // Chuột xám
  { id: 'orange', name: 'Cam', ramp: [hex('f1a35d'), hex('ec8653'), hex('da775c')] }, // Mèo vằn cam
  { id: 'cream', name: 'Vàng kem', ramp: [hex('f0d299'), hex('cdaf7b'), hex('bda075')] }, // Shiba kem
  { id: 'purple', name: 'Tím', ramp: [hex('bc90b1'), hex('b07b84'), hex('8e6561')] }, // Mèo tím
  { id: 'green', name: 'Xanh lá', ramp: [hex('c2c65a'), hex('9da34c'), hex('7f8540')] }, // Rùa xanh
  { id: 'blue', name: 'Xanh dương', ramp: [hex('a3b8c6'), hex('8aa2b8'), hex('6f879c')] }, // Rùa luýt
];

const colorById = new Map(SKIN_COLORS.map((color) => [color.id, color]));

export function skinColorOf(id: string): SkinColor | undefined {
  return colorById.get(id);
}

/** Loài hiện trong panel Chọn nhân vật: mỗi loài một skin trắng làm gốc. */
export const SKIN_SPECIES: readonly { base: string; name: string }[] = [
  { base: 'skin_02', name: 'Thỏ' },
  { base: 'skin_bot_cat_white', name: 'Mèo' },
  { base: 'skin_bot_fox_arctic', name: 'Cáo' },
  { base: 'skin_bot_bear_polar', name: 'Gấu' },
  { base: 'skin_bot_duck_white', name: 'Vịt' },
  { base: 'skin_bot_beaver_white', name: 'Hải ly' },
  { base: 'skin_bot_rat_white', name: 'Chuột' },
  { base: 'skin_bot_shiba_white', name: 'Shiba' },
  { base: 'skin_bot_turtle_white', name: 'Rùa' },
  { base: 'skin_bot_harlequin_white', name: 'Harlequin' },
  { base: 'skin_bot_red_bunny_white', name: 'Thỏ đốm' },
];

/** Skin trắng mới bake (tools/bake_white_skins.mjs), cần nạp trước khi dùng. */
export const WHITE_BASE_SKINS: readonly string[] = SKIN_SPECIES.map((species) => species.base);

export interface ParsedSkin {
  /** Skin có file sheet thật. */
  base: string;
  /** Id màu; bản trắng/không có hậu tố là `white`. */
  colorId: string;
}

export function parseSkinId(skinId: string): ParsedSkin {
  const at = skinId.indexOf(COLOR_SEPARATOR);
  if (at < 0) return { base: skinId, colorId: WHITE_COLOR_ID };
  const colorId = skinId.slice(at + 1);
  return { base: skinId.slice(0, at), colorId: colorById.has(colorId) ? colorId : WHITE_COLOR_ID };
}

/** Ghép id: màu trắng thì chính là id gốc (không hậu tố). */
export function composeSkinId(base: string, colorId: string): string {
  return colorId === WHITE_COLOR_ID || !colorById.has(colorId) ? base : `${base}${COLOR_SEPARATOR}${colorId}`;
}

/** Id có hậu tố màu hợp lệ (cần đổi màu) hay không. */
export const isColoredSkin = (skinId: string): boolean => parseSkinId(skinId).colorId !== WHITE_COLOR_ID;

const WHITE = SKIN_COLORS[0]!.ramp;
/** Ba slot của bản trắng; slot MID có hai biến thể (bóng ấm và bóng lạnh của mèo/cáo/gấu). */
const SLOT_OF = new Map<number, 0 | 1 | 2>([
  [(WHITE[0][0] << 16) | (WHITE[0][1] << 8) | WHITE[0][2], 0],
  [(WHITE[1][0] << 16) | (WHITE[1][1] << 8) | WHITE[1][2], 1],
  [(0xcc << 16) | (0xd5 << 8) | 0xe7, 1],
  [(WHITE[2][0] << 16) | (WHITE[2][1] << 8) | WHITE[2][2], 2],
]);

/** Đổi màu tại chỗ trên dữ liệu RGBA của sheet bản trắng. Trả số pixel đã đổi. */
export function recolorPixels(data: Uint8ClampedArray, colorId: string): number {
  const color = colorById.get(colorId);
  if (!color || colorId === WHITE_COLOR_ID) return 0;
  let changed = 0;
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] === 0) continue;
    const slot = SLOT_OF.get((data[i]! << 16) | (data[i + 1]! << 8) | data[i + 2]!);
    if (slot === undefined) continue;
    const [r, g, b] = color.ramp[slot];
    data[i] = r;
    data[i + 1] = g;
    data[i + 2] = b;
    changed += 1;
  }
  return changed;
}

/** Chuyển skin cũ (đã bake riêng từng màu) sang `loài trắng ~ màu` tương ứng; skin không có trong bảng giữ nguyên. */
export const LEGACY_SKIN_COLOR: Readonly<Record<string, string>> = {
  skin_01: 'skin_02~brown',
  skin_03: 'skin_02~beige',
  skin_04: 'skin_02~peach',
  skin_05: 'skin_02~gray',
  skin_bot_bear_brown: 'skin_bot_bear_polar~brown',
  skin_bot_beaver_brown: 'skin_bot_beaver_white~brown',
  skin_bot_cat_black: 'skin_bot_cat_white~gray',
  skin_bot_cat_orange_tabby: 'skin_bot_cat_white~orange',
  skin_bot_cat_purple: 'skin_bot_cat_white~purple',
  skin_bot_cat_tuxedo: 'skin_bot_cat_white~gray',
  skin_bot_fox_cascade_grey: 'skin_bot_fox_arctic~gray',
  skin_bot_fox_silver: 'skin_bot_fox_arctic~silver',
  skin_bot_harlequin: 'skin_bot_harlequin_white~orange',
  skin_bot_rat_grey: 'skin_bot_rat_white~silver',
  skin_bot_red_spotted_bunny: 'skin_bot_red_bunny_white~orange',
  skin_bot_shiba_cream: 'skin_bot_shiba_white~cream',
  skin_bot_shiba_dark: 'skin_bot_shiba_white~gray',
  skin_bot_turtle_green: 'skin_bot_turtle_white~green',
  skin_bot_turtle_hermann: 'skin_bot_turtle_white~brown',
  skin_bot_turtle_leatherback: 'skin_bot_turtle_white~blue',
};
