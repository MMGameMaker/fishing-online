// Nạp art nhân vật thật (thỏ ghép từ atlas cosmetics bằng tools/bake_characters.py).
// Texture mang đúng tên skinId/rodId nên CharacterView và placeholderArt dùng thẳng,
// id nào chưa có art thì vẫn rơi về sprite vẽ tạm.
import type Phaser from 'phaser';

/** Skin đã có art thỏ (tạm map 5 skin của Server sang 5 màu thỏ). */
export const BAKED_SKINS = ['skin_01', 'skin_02', 'skin_03', 'skin_04', 'skin_05'] as const;
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
}

/** Gọi trong preload của scene khởi động. */
export function preloadCharacterArt(scene: Phaser.Scene): void {
  for (const id of BAKED_SKINS) {
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
