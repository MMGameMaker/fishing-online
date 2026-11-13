// Hình nền cắm được cho LakeScene: trang nào muốn dùng map khác (vd. pier.html) thì đặt art trước
// khi game chạy. Không có art thì LakeScene vẽ hồ placeholder như cũ.
import type Phaser from 'phaser';

export interface LakeMapArt {
  /** Nạp texture cần cho map. */
  preload(scene: Phaser.Scene): void;
  /** Vẽ nền và vật thể (độ sâu theo đáy y, cùng quy ước với nhân vật). */
  create(scene: Phaser.Scene): void;
  /**
   * Map có vẽ ghế thật (vd. ghế đẩu của pier): LakeScene không vẽ ô màu đánh dấu ghế nữa
   * và gọi highlightSeat để viền trắng ghế đang ngồi được (null = bỏ viền).
   */
  readonly drawsSeats?: boolean;
  highlightSeat?(seatId: string | null): void;
}

const REGISTRY_KEY = 'lakeMapArt';

export function setLakeMapArt(game: Phaser.Game, art: LakeMapArt): void {
  game.registry.set(REGISTRY_KEY, art);
}

export function getLakeMapArt(scene: Phaser.Scene): LakeMapArt | undefined {
  return scene.registry.get(REGISTRY_KEY) as LakeMapArt | undefined;
}
