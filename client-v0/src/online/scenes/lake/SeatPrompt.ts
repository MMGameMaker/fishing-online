// Phím gợi ý "F" hiện ở góc trên bên phải vật đang được chọn (ghế, người/bot, NPC) khi đứng gần (feedback 2026-11-12;
// 2026-11-21: đặt theo vật được chọn thay vì cạnh đầu mình, và là con của vật đó).
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

/** Chỗ sinh phím F: `parent` là container của vật thể (người/NPC) nên phím đi theo vật thể; null thì đặt ở toạ độ thế giới. */
export interface PromptPlacement {
  parent: Phaser.GameObjects.Container | null;
  x: number;
  y: number;
}

/**
 * Phím F là con của vật thể đang được chọn (2026-11-21): người/bot/NPC di chuyển thì phím đi theo cùng container, không
 * phải cập nhật vị trí mỗi khung nên không giật. Đổi sang vật thể khác thì phím cũ mờ đi và phím mới sinh ra ở vật thể mới.
 */
export class SeatPrompt {
  private key: Phaser.GameObjects.Image | null = null;
  /** Mục tiêu hiện giữ phím (so sánh theo tham chiếu); null = không có. */
  private token: unknown = null;
  private readonly baseScale: number;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly onPress: () => void,
  ) {
    this.baseScale = scene.textures.exists(SIT_PROMPT_ART) ? ART_SCALE : 1;
  }

  /**
   * Gọi mỗi khung. `token` là mục tiêu (null = ẩn phím); `place` chỉ được gọi khi mục tiêu đổi, để sinh phím mới.
   */
  update(token: unknown | null, place: () => PromptPlacement): void {
    if (token === this.token) return;
    this.retire();
    this.token = token;
    if (token !== null) this.spawn(place());
  }

  private spawn({ parent, x, y }: PromptPlacement): void {
    const art = this.scene.textures.exists(SIT_PROMPT_ART);
    if (!art) ensureTexture(this.scene);
    const key = this.scene.add
      .image(x, y, art ? SIT_PROMPT_ART : TEXTURE)
      .setOrigin(0.5, 1)
      .setAlpha(0)
      .setScale(HIDDEN_SCALE * this.baseScale);
    if (parent) parent.add(key);
    else key.setDepth(y + DEPTH_BIAS);
    // Chạm vào phím (điện thoại) cũng ngồi như bấm F.
    key.setInteractive({ useHandCursor: true }).on('pointerdown', () => {
      if (this.key === key) this.onPress();
    });
    // Vật thể bị huỷ (người rời hồ) thì phím đi cùng: dọn tween và bỏ tham chiếu.
    key.once('destroy', () => {
      this.scene.tweens.killTweensOf(key);
      if (this.key === key) {
        this.key = null;
        this.token = null;
      }
    });
    this.key = key;
    this.scene.tweens.add({
      targets: key,
      alpha: 1,
      scale: this.baseScale,
      duration: IN_MS,
      ease: 'Back.easeOut',
    });
  }

  /** Phím đang có mờ đi, thu nhỏ rồi bị huỷ (không bật tắt tức thì). */
  private retire(): void {
    const key = this.key;
    this.key = null;
    if (!key) return;
    key.disableInteractive();
    this.scene.tweens.killTweensOf(key);
    this.scene.tweens.add({
      targets: key,
      alpha: 0,
      scale: HIDDEN_SCALE * this.baseScale,
      duration: MOTION_OUT_MS,
      ease: 'Sine.easeIn',
      onComplete: () => {
        if (key.active) key.destroy();
      },
    });
  }

  get isShown(): boolean {
    return this.key !== null;
  }

  destroy(): void {
    this.token = null;
    this.retire();
  }
}
