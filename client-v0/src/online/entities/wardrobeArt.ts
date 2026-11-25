// Art trang phục lẻ (mũ, áo, quần): mỗi món một sheet đã bake (tools/bake_wardrobe.mjs) ở public/assets/wardrobe/<id>.png|json, khung
// 120×140 trùng khung thân nên vẽ chồng lên thân bằng sprite chạy cùng nhịp animation. Nạp lần đầu khi cần (có ~290 món, chỉ nạp món
// đang có người mặc trong hồ).
import type Phaser from 'phaser';
import { ensureAnimations } from './placeholderArt';

const WARDROBE_DIR = '/assets/wardrobe/';

/** Đường ảnh/JSON của món (dùng cho xem thử ngoài Phaser nếu cần). */
export const wardrobeSheetUrl = (id: string): { image: string; data: string } => ({
  image: `${WARDROBE_DIR}${id}.png`,
  data: `${WARDROBE_DIR}${id}.json`,
});

/** Nạp sheet của món và tạo animation; `done` chạy khi xong (lỗi tải thì không gọi). Đã có thì gọi ngay. */
export function loadWardrobeArt(scene: Phaser.Scene, id: string, done: () => void): void {
  const finish = (): void => {
    ensureAnimations(scene, id);
    done();
  };
  if (scene.textures.exists(id)) {
    finish();
    return;
  }
  const url = wardrobeSheetUrl(id);
  // Nhiều nhân vật cùng mặc một món: mỗi bên đăng ký lắng nghe, Phaser chỉ nạp một lần (key trùng thì bỏ qua). Nghe sự kiện hoàn tất
  // của cả đợt tải vì atlas (ảnh + JSON) không chắc phát sự kiện riêng theo key.
  scene.load.once('complete', () => {
    if (scene.textures.exists(id)) finish();
  });
  scene.load.atlas(id, url.image, url.data);
  if (!scene.load.isLoading()) scene.load.start();
}
