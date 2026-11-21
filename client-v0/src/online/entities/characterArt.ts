// Nạp art nhân vật thật (thỏ ghép từ atlas cosmetics bằng tools/bake_characters.py).
// Texture mang đúng tên skinId/rodId nên CharacterView và placeholderArt dùng thẳng,
// id nào chưa có art thì vẫn rơi về sprite vẽ tạm.
import type Phaser from 'phaser';

/**
 * Skin đã có art thỏ: skin_01–05 là 5 màu thân thỏ (tools/bake_characters.py), skin_06–10 là thỏ brown mặc
 * trang phục (tools/bake_outfit_skins.mjs), bán ở tab "Ngoại hình" của cửa hàng.
 */
export const BAKED_SKINS = [
  'skin_01',
  'skin_02',
  'skin_03',
  'skin_04',
  'skin_05',
  'skin_06',
  'skin_07',
  'skin_08',
  'skin_09',
  'skin_10',
] as const;
/**
 * Skin thú chỉ dành cho bot (tools/bake_outfit_skins.mjs, BOT_BODIES); khớp BotManager.Skins ở server.
 * Không nằm trong Social.Skins nên người chơi không chọn được, nhưng vẫn phải nạp để thấy bot trong hồ.
 */
export const BAKED_BOT_SKINS = [
  'skin_bot_bear_brown',
  'skin_bot_bear_polar',
  'skin_bot_beaver_brown',
  'skin_bot_cat_black',
  'skin_bot_cat_orange_tabby',
  'skin_bot_cat_purple',
  'skin_bot_cat_tuxedo',
  'skin_bot_cat_white',
  'skin_bot_duck_white',
  'skin_bot_fox_arctic',
  'skin_bot_fox_cascade_grey',
  'skin_bot_fox_silver',
  'skin_bot_harlequin',
  'skin_bot_rat_grey',
  'skin_bot_red_spotted_bunny',
  'skin_bot_shiba_cream',
  'skin_bot_shiba_dark',
  'skin_bot_turtle_green',
  'skin_bot_turtle_hermann',
  'skin_bot_turtle_leatherback',
] as const;
/** Skin NPC đứng trên map (tools/bake_outfit_skins.mjs, NPC_SKINS). */
export const BAKED_NPC_SKINS = ['npc_octopus', 'npc_fox', 'npc_board'] as const;
/** Cần câu đã có art, trùng rodId trong gameplay-config. */
export const BAKED_RODS = [
  'rod_old',
  'rod_steel_awl',
  'rod_high_performer',
  'rod_bliss',
  'rod_giant_caster',
] as const;

const SKIN_DIR = '/assets/characters/';
const ROD_DIR = '/assets/rods/';

/** Thông tin thêm trong JSON đã bake (Phaser chép vào texture.customData). */
export interface BakedAnimation {
  frames: number;
  rate: number;
  loop: boolean;
}
export interface BakedCharacterData {
  animations?: Record<string, BakedAnimation>;
  /** Khoảng cách từ chân tới đỉnh tai, pixel. */
  headTop?: number;
  /** Chỉ có ở sheet cần: vị trí phao so với chân khi chờ cá, theo hướng. */
  bobber?: Record<string, { x: number; y: number }>;
}

/** Gọi trong preload của scene khởi động. */
export function preloadCharacterArt(scene: Phaser.Scene): void {
  for (const id of [...BAKED_SKINS, ...BAKED_BOT_SKINS, ...BAKED_NPC_SKINS]) {
    if (!scene.textures.exists(id))
      scene.load.atlas(id, `${SKIN_DIR}${id}.png`, `${SKIN_DIR}${id}.json`);
  }
  for (const id of BAKED_RODS) {
    if (!scene.textures.exists(id))
      scene.load.atlas(id, `${ROD_DIR}${id}.png`, `${ROD_DIR}${id}.json`);
  }
}

export function bakedData(scene: Phaser.Scene, texture: string): BakedCharacterData {
  if (!scene.textures.exists(texture)) return {};
  return scene.textures.get(texture).customData as BakedCharacterData;
}
