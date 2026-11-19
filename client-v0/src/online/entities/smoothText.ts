// Chữ trong canvas mịn như chữ DOM của thanh thông báo (pier.html, feedback 2026-11-19).
// Game bật pixelArt nên mọi texture, kể cả texture chữ, mặc định lọc NEAREST: chữ bị phóng thành khối, vỡ nét.
// Chữ vẽ sẵn ở độ phân giải cao (resolution 4) nên chuyển sang lọc tuyến tính để nét mịn. Chỉ trang có bong bóng
// đầu nhân vật (pier) bật; trang khác giữ nguyên.
import Phaser from 'phaser';
import { hasHeadBubble } from './HeadBubble';

type SmoothText = Phaser.GameObjects.Text & { smooth?: boolean };
let patched = false;

/**
 * Mỗi lần vẽ lại chữ (đổi chữ, đổi độ phân giải) Phaser tải lại texture với bộ lọc NEAREST (do pixelArt), xoá bộ lọc
 * đã đặt. Bọc `updateText` để chữ đã đánh dấu `smooth` đặt lại bộ lọc tuyến tính sau mỗi lần vẽ.
 */
function patchTextUpdate(): void {
  if (patched) return;
  patched = true;
  const proto = Phaser.GameObjects.Text.prototype as unknown as { updateText: () => unknown };
  const original = proto.updateText;
  proto.updateText = function (this: SmoothText) {
    const result = original.call(this);
    if (this.smooth) this.texture.setFilter(Phaser.Textures.FilterMode.LINEAR);
    return result;
  };
}

export function smoothText<T extends Phaser.GameObjects.Text>(scene: Phaser.Scene, text: T): T {
  if (!hasHeadBubble(scene)) return text;
  patchTextUpdate();
  (text as SmoothText).smooth = true;
  text.texture.setFilter(Phaser.Textures.FilterMode.LINEAR);
  return text;
}

/**
 * Độ phân giải vẽ chữ theo zoom camera (làm tròn lên): chữ được vẽ gần đúng cỡ hiển thị nên không bị thu nhỏ nhiều
 * lần. Thu 3–4 lần mà không có mipmap làm viền chữ nhỏ (biệt hiệu 6px) không đều (feedback 2026-11-19).
 */
export function textResolution(scene: Phaser.Scene): number {
  return Phaser.Math.Clamp(Math.ceil(scene.cameras.main.zoom), 1, 8);
}
