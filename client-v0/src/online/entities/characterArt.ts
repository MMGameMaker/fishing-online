// Nạp art nhân vật thật (thỏ ghép từ atlas cosmetics bằng tools/bake_characters.py).
// Texture mang đúng tên skinId/rodId nên CharacterView và placeholderArt dùng thẳng,
// id nào chưa có art thì vẫn rơi về sprite vẽ tạm.
import type Phaser from 'phaser';
import { WHITE_COLOR_ID, parseSkinId, recolorPixels } from './skinColor';

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
 * Từ 2026-11-25 cũng nằm trong Social.Skins (miễn phí): người chơi chọn ở panel Chọn nhân vật; bot vẫn dùng các skin này.
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
/**
 * Bản trắng mới cho loài chưa có (tools/bake_white_skins.mjs): gốc để đổi màu lúc chạy (skinColor.ts), panel Chọn nhân vật dùng.
 */
export const BAKED_WHITE_SKINS = [
  'skin_bot_beaver_white',
  'skin_bot_rat_white',
  'skin_bot_shiba_white',
  'skin_bot_turtle_white',
  'skin_bot_harlequin_white',
  'skin_bot_red_bunny_white',
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
  for (const id of [...BAKED_SKINS, ...BAKED_BOT_SKINS, ...BAKED_WHITE_SKINS, ...BAKED_NPC_SKINS]) {
    if (!scene.textures.exists(id))
      scene.load.atlas(id, `${SKIN_DIR}${id}.png`, `${SKIN_DIR}${id}.json`);
  }
  for (const id of BAKED_RODS) {
    if (!scene.textures.exists(id))
      scene.load.atlas(id, `${ROD_DIR}${id}.png`, `${ROD_DIR}${id}.json`);
  }
}

/**
 * Skin có hậu tố màu (`skin_02~brown`): tạo texture từ sheet bản trắng đã nạp bằng cách đổi 3 màu lông, chép khung và dữ liệu bake.
 * Chỉ tạo khi cần (mỗi texture ~4 MB), đồng bộ nên gọi trước khi dựng sprite. Không tạo được (chưa nạp gốc) thì để nguyên.
 */
export function ensureColoredSkin(scene: Phaser.Scene, skinId: string): void {
  if (scene.textures.exists(skinId)) return;
  const { base, colorId } = parseSkinId(skinId);
  if (colorId === WHITE_COLOR_ID || !scene.textures.exists(base)) return;
  const source = scene.textures.get(base);
  const image = source.getSourceImage() as CanvasImageSource & { width: number; height: number };
  const canvas = document.createElement('canvas');
  canvas.width = image.width;
  canvas.height = image.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  ctx.drawImage(image, 0, 0);
  const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height);
  recolorPixels(pixels.data, colorId);
  ctx.putImageData(pixels, 0, 0);
  const texture = scene.textures.addCanvas(skinId, canvas);
  if (!texture) return;
  for (const name of source.getFrameNames()) {
    const frame = source.get(name);
    const copy = texture.add(name, 0, frame.cutX, frame.cutY, frame.cutWidth, frame.cutHeight);
    // Điểm neo ở chân (anchor trong JSON bake): thiếu thì sprite bị vẽ cao hơn chân ~64px (origin lệch).
    if (copy && frame.customPivot) {
      copy.customPivot = true;
      copy.pivotX = frame.pivotX;
      copy.pivotY = frame.pivotY;
    }
  }
  texture.customData = source.customData;
}

export function bakedData(scene: Phaser.Scene, texture: string): BakedCharacterData {
  if (!scene.textures.exists(texture)) return {};
  return scene.textures.get(texture).customData as BakedCharacterData;
}
