// Effect pixel quanh phao và lúc câu được (feedback 2026-11-17, mục "Gợi ý effect và FX" của review):
// gợn nước khi chờ, tõm nước khi phao rơi, bắn nước khi cá cắn, khựng hình khi móc trúng, cá bay lên đầu.
// Hạt là hình vuông 1–2px, không làm mờ, để giữ đúng kiểu pixel art.
import Phaser from 'phaser';
import { fishTextureKey, loadFishTexture } from '../entities/fishTexture';

const WATER_LIGHT = 0xdff6ff;
const WATER_MID = 0x9fdcf5;

/** Vòng gợn hình elip (dẹt theo phối cảnh) loang ra rồi mờ đi. */
export function ripple(
  scene: Phaser.Scene,
  x: number,
  y: number,
  options: { size?: number; ms?: number; alpha?: number; delay?: number } = {},
): void {
  const { size = 14, ms = 900, alpha = 0.8, delay = 0 } = options;
  const ring = scene.add
    .ellipse(x, y, size, size / 2.4)
    .setStrokeStyle(1, WATER_LIGHT, alpha)
    .setFillStyle()
    .setDepth(y - 0.5)
    .setScale(0.2)
    .setAlpha(delay > 0 ? 0 : 1);
  scene.tweens.add({
    targets: ring,
    scale: 1,
    alpha: { from: 1, to: 0 },
    duration: ms,
    delay,
    ease: 'Sine.easeOut',
    onComplete: () => ring.destroy(),
  });
}

/** Giọt nước bắn lên theo đường cong rồi rơi xuống mặt nước, kèm vòng gợn. */
export function splash(
  scene: Phaser.Scene,
  x: number,
  y: number,
  strength: 'small' | 'big' = 'small',
): void {
  const big = strength === 'big';
  const drops = big ? 12 : 6;
  const height = big ? 16 : 8;
  for (let i = 0; i < drops; i++) {
    const dx = Phaser.Math.FloatBetween(-1, 1) * (big ? 12 : 7);
    const up = height * Phaser.Math.FloatBetween(0.6, 1);
    const sizePx = i % 3 === 0 ? 2 : 1;
    const drop = scene.add
      .rectangle(x, y, sizePx, sizePx, i % 2 ? WATER_LIGHT : WATER_MID)
      .setDepth(y + 1);
    const ms = Phaser.Math.Between(big ? 380 : 280, big ? 560 : 400);
    // x đi thẳng, y lên rồi xuống (yoyo) để thành đường cong.
    scene.tweens.add({ targets: drop, x: x + dx, duration: ms, ease: 'Linear' });
    scene.tweens.add({
      targets: drop,
      y: y - up,
      duration: ms / 2,
      yoyo: true,
      ease: 'Quad.easeOut',
      onComplete: () => drop.destroy(),
    });
  }
  ripple(scene, x, y, { size: big ? 26 : 16, ms: big ? 900 : 700 });
  if (big) ripple(scene, x, y, { size: 38, ms: 1100, alpha: 0.6, delay: 140 });
}

/**
 * Khựng hình (hit-stop) khi móc trúng: đứng hình vài chục ms rồi rung màn nhẹ, tạo cảm giác "trúng".
 * Dừng tween, animation nhân vật và đồng hồ của scene; lớp UI DOM vẫn chạy.
 */
export function hitStop(scene: Phaser.Scene, ms = 70): void {
  if (!scene.scene.isActive()) return;
  // Không dùng scene.pause(): lệnh đó chỉ có hiệu lực ở khung hình sau nên có thể dừng hẳn mà không chạy lại.
  scene.tweens.pauseAll();
  scene.anims.pauseAll();
  scene.time.paused = true;
  window.setTimeout(() => {
    scene.tweens.resumeAll();
    scene.anims.resumeAll();
    scene.time.paused = false;
    if (scene.scene.isActive()) scene.cameras.main.shake(110, 0.004);
  }, ms);
}

/**
 * Cá vừa câu bay từ phao lên đỉnh đầu nhân vật theo đường cong, lắc mình, giữ một nhịp rồi mờ đi.
 * Ảnh cá nạp lần đầu khi cần; chưa nạp kịp thì bỏ qua (thẻ cá vẫn hiện).
 */
export function flyFish(
  scene: Phaser.Scene,
  speciesId: string,
  from: { x: number; y: number },
  to: { x: number; y: number },
  flyMs = 480,
  holdMs = 650,
): void {
  loadFishTexture(scene, speciesId, () => {
    if (!scene.scene.isActive()) return;
    const fish = scene.add.image(from.x, from.y, fishTextureKey(speciesId)).setOrigin(0.5);
    // Thu vào khung tối đa 28×16 px map, giữ tỉ lệ ảnh.
    fish.setScale(Math.min(28 / fish.width, 16 / fish.height));
    const scale = fish.scale;
    fish.setDepth(to.y + 100).setScale(scale * 0.5);
    const peak = Math.min(from.y, to.y) - 26;
    scene.tweens.add({ targets: fish, x: to.x, duration: flyMs, ease: 'Sine.easeInOut' });
    scene.tweens.add({
      targets: fish,
      y: peak,
      duration: flyMs * 0.55,
      ease: 'Quad.easeOut',
      onComplete: () =>
        scene.tweens.add({ targets: fish, y: to.y, duration: flyMs * 0.45, ease: 'Quad.easeIn' }),
    });
    scene.tweens.add({ targets: fish, scale, duration: flyMs, ease: 'Back.easeOut' });
    // Lắc mình như cá đang giãy trong lúc bay.
    scene.tweens.add({
      targets: fish,
      angle: { from: -18, to: 18 },
      duration: 90,
      yoyo: true,
      repeat: Math.ceil(flyMs / 180),
      onComplete: () => fish.setAngle(0),
    });
    splash(scene, from.x, from.y, 'small');
    scene.time.delayedCall(flyMs + holdMs, () =>
      scene.tweens.add({
        targets: fish,
        alpha: 0,
        y: fish.y - 6,
        duration: 220,
        onComplete: () => fish.destroy(),
      }),
    );
  });
}
