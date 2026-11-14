// Phím gợi ý "F" cạnh đầu nhân vật khi đứng gần ghế câu còn trống (feedback 2026-11-12).
// Hiện/ẩn có easing: nảy lên khi hiện, thu nhỏ + mờ khi ẩn, không bật tắt tức thì.
// Đây là vật thể trong thế giới game (đi theo nhân vật) nên dùng tween Phaser, cùng nhịp với ui/kit/motion.ts.
import Phaser from 'phaser';
import { MOTION_OUT_MS } from '../../ui/kit/motion';

const TEXTURE = 'seat-prompt-key-f';
/** Ảnh phím F của bộ UI (pier.html, feedback 2026-11-14), vẽ ở tỉ lệ 4 nên hiển thị ×0,25 (~12×15px). */
export const SIT_PROMPT_ART = 'seat-prompt-art-f';
const SIT_PROMPT_URL = encodeURI('/new resources/ui/Sit Prompt F.png');
const ART_SCALE = 0.25;
const KEY_W = 13;
const KEY_H = 15;
/** Đặt bên trái đầu nhân vật, ngang tai như ảnh mẫu, dưới nhãn tên để không đè chữ. */
const OFFSET_X = -20;
const OFFSET_Y = 14;
const IN_MS = 220;
const HIDDEN_SCALE = 0.4;
const DEPTH_BIAS = 2000;

/** Nạp ảnh phím F (chỉ trang muốn dùng ảnh này gọi); không nạp thì dùng keycap vẽ bằng code. */
export function preloadSitPrompt(scene: Phaser.Scene): void {
  if (!scene.textures.exists(SIT_PROMPT_ART)) scene.load.image(SIT_PROMPT_ART, SIT_PROMPT_URL);
}

/** Vẽ keycap một lần: nền trắng, viền xám, đáy dày hơn tạo khối, chữ F tối. */
function ensureTexture(scene: Phaser.Scene): void {
  if (scene.textures.exists(TEXTURE)) return;
  const g = scene.make.graphics({}, false);
  g.fillStyle(0x6f6a78).fillRoundedRect(0, 0, KEY_W, KEY_H, 3);
  g.fillStyle(0xf4f2ee).fillRoundedRect(1, 1, KEY_W - 2, KEY_H - 4, 2);
  g.fillStyle(0xd6d2cc).fillRect(2, KEY_H - 5, KEY_W - 4, 1);
  // Chữ F 1px, canh giữa mặt phím.
  g.fillStyle(0x3b3842);
  g.fillRect(4, 3, 1, 7);
  g.fillRect(5, 3, 4, 1);
  g.fillRect(5, 6, 3, 1);
  g.generateTexture(TEXTURE, KEY_W, KEY_H);
  g.destroy();
}

export class SeatPrompt {
  private readonly key: Phaser.GameObjects.Image;
  private readonly baseScale: number;
  private shown = false;

  constructor(
    private readonly scene: Phaser.Scene,
    onPress: () => void,
  ) {
    const art = scene.textures.exists(SIT_PROMPT_ART);
    if (!art) ensureTexture(scene);
    this.baseScale = art ? ART_SCALE : 1;
    this.key = scene.add
      .image(0, 0, art ? SIT_PROMPT_ART : TEXTURE)
      .setOrigin(0.5, 1)
      .setAlpha(0)
      .setScale(HIDDEN_SCALE * this.baseScale)
      .setVisible(false);
    // Chạm vào phím (điện thoại) cũng ngồi như bấm F.
    this.key.setInteractive({ useHandCursor: true }).on('pointerdown', () => {
      if (this.shown) onPress();
    });
  }

  /** Gọi mỗi khung: đặt phím theo đầu nhân vật và hiện/ẩn theo điều kiện. */
  update(x: number, headY: number, visible: boolean): void {
    this.key.setPosition(Math.round(x + OFFSET_X), Math.round(headY + OFFSET_Y));
    this.key.setDepth(headY + DEPTH_BIAS);
    if (visible === this.shown) return;
    this.shown = visible;
    this.scene.tweens.killTweensOf(this.key);
    if (visible) {
      this.key.setVisible(true);
      this.scene.tweens.add({
        targets: this.key,
        alpha: 1,
        scale: this.baseScale,
        duration: IN_MS,
        ease: 'Back.easeOut',
      });
    } else {
      this.scene.tweens.add({
        targets: this.key,
        alpha: 0,
        scale: HIDDEN_SCALE * this.baseScale,
        duration: MOTION_OUT_MS,
        ease: 'Sine.easeIn',
        onComplete: () => this.key.setVisible(false),
      });
    }
  }

  get isShown(): boolean {
    return this.shown;
  }

  destroy(): void {
    this.scene.tweens.killTweensOf(this.key);
    this.key.destroy();
  }
}
