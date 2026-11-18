// Ảnh từng loài cá (public/assets/fish) dưới dạng texture Phaser, nạp lần đầu khi cần.
// Dùng cho hình cá trên đầu nhân vật và cá bay lên khi câu được.
import type Phaser from 'phaser';
import { fishArtUrl } from '../ui/fishArt';

export const fishTextureKey = (speciesId: string): string => `fish-icon-${speciesId}`;

/** Nạp ảnh cá làm texture; `done` chạy khi xong (lỗi tải thì không gọi). Đã có thì gọi ngay. */
export function loadFishTexture(scene: Phaser.Scene, speciesId: string, done: () => void): void {
  const key = fishTextureKey(speciesId);
  if (scene.textures.exists(key)) {
    done();
    return;
  }
  scene.load.once(`filecomplete-image-${key}`, done);
  scene.load.image(key, fishArtUrl(speciesId));
  if (!scene.load.isLoading()) scene.load.start();
}
