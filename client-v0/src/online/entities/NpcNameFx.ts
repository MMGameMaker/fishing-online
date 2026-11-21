// Hạt nhỏ quanh tên NPC trên pier (yêu cầu 2026-11-21): cá trong game lần lượt bơi ngang qua phía trên chữ (Bách Khoa Toàn Cá,
// hợp "bách khoa về cá"; thay bong bóng vì bong bóng nhìn như chấm lạc), đồng xu Coin Art.png lật bay lên (Tiệm Tạp Hóa
// Cần Thủ), sao nháy (Hội Quán Cao Thủ). Chữ tên đứng yên (feedback cùng ngày: bỏ sóng chữ, lơ lửng, nhún khi đứng gần và biển
// treo đung đưa); đứng gần NPC thì hạt sinh dày gấp đôi.
import type Phaser from 'phaser';
import { COIN_ART } from '../ui/coinArt';
import type { CharacterView } from './CharacterView';
import { fishTextureKey, loadFishTexture } from './fishTexture';

export type NameParticle = 'fish' | 'coin' | 'star';

export interface NpcNameFxOptions {
  particle: NameParticle;
}

/** Hạt: số tối đa cùng lúc, khoảng sinh (ms) lúc xa; đứng gần sinh dày gấp đôi. */
const MAX_PARTICLES = 6;
const SPAWN_MS: Record<NameParticle, number> = { fish: 2200, coin: 1300, star: 1000 };
/**
 * Các loài dáng cá bơi ngang (bỏ Mực, Tôm Hùm, Cá Đuối vì dáng không hợp khi lật hướng); mỗi lần bơi qua chọn ngẫu nhiên một
 * loài. Ảnh nạp dần theo lần chọn (không nạp cả bộ lúc vào game). Cá hiện rộng chừng `FISH_WIDTH_PX` px map, cao theo tỉ lệ ảnh.
 */
const FISH_SPECIES = [
  'minnow', 'perch', 'carp', 'trout', 'bass', 'goldcarp', 'puffer', 'koi', 'stonefish', 'cowfish',
  'pomfret', 'pangasius', 'flyingfish', 'goby', 'eel', 'sturgeon', 'shark',
] as const;
const FISH_WIDTH_PX = 18;
/** Cá bơi cách mép trên chữ chừng này px và chỉ cho 3 con cùng lúc. */
const FISH_ABOVE_PX = 10;
const FISH_MAX = 3;
const COIN_TEXTURE = 'npc-fx-coin';
/** Đồng xu hiển thị cỡ này (px map); ảnh gốc 64×64. */
const COIN_SIZE_PX = 9;
/** Xu trong chùm bắn khi mua/bán to hơn hạt nền cho dễ thấy. */
const BURST_COIN_PX = 13;

/**
 * Chùm xu bắn lên quanh tên NPC khi người chơi mua hoặc bán ở Cửa hàng (yêu cầu 2026-11-21, dùng lại đồng xu Coin Art của hạt
 * 'coin'): xu tung lên theo vòng cung, lật quanh trục dọc rồi mờ dần. Độc lập với NpcNameFx (hiệu ứng nền vẫn tắt).
 */
export function spawnCoinBurst(scene: Phaser.Scene, view: CharacterView, count = 12): void {
  const run = (): void => {
    if (!view.container.active) return;
    const label = view.nameLabel;
    const baseY = label.y - label.height * 0.5;
    for (let i = 0; i < count; i++) {
      const coin = scene.add
        .image(label.x + (Math.random() * 2 - 1) * label.width * 0.35, baseY, COIN_TEXTURE)
        .setDisplaySize(BURST_COIN_PX, BURST_COIN_PX)
        .setAlpha(0);
      view.container.add(coin);
      const dx = (Math.random() * 2 - 1) * 30;
      const rise = 26 + Math.random() * 20;
      const x0 = coin.x;
      const spin = 4 + Math.random() * 4;
      scene.tweens.addCounter({
        from: 0,
        to: 1,
        delay: i * 55,
        duration: 1300 + Math.random() * 400,
        ease: 'Sine.easeOut',
        onUpdate: (tween) => {
          if (!coin.active) return;
          const t = tween.getValue() ?? 0;
          coin.setAlpha(Math.min(1, t / 0.12, (1 - t) / 0.3));
          // Vòng cung: lên nhanh rồi chậm lại ở đỉnh, kèm trôi ngang; lật xu như đang xoay.
          coin.setPosition(x0 + dx * t, baseY - rise * Math.sin(t * Math.PI * 0.75) - 4 * t);
          coin.setDisplaySize(BURST_COIN_PX * Math.max(0.15, Math.abs(Math.cos(t * spin))), BURST_COIN_PX);
        },
        onComplete: () => coin.destroy(),
      });
    }
  };
  if (scene.textures.exists(COIN_TEXTURE)) {
    run();
    return;
  }
  scene.load.image(COIN_TEXTURE, COIN_ART);
  scene.load.once('complete', run);
  if (!scene.load.isLoading()) scene.load.start();
}

type ParticleObject =
  | Phaser.GameObjects.Shape
  | Phaser.GameObjects.Container
  | Phaser.GameObjects.Image;

interface Particle {
  obj: ParticleObject;
  born: number;
  life: number;
  x: number;
  y: number;
  kind: NameParticle;
  seed: number;
}

export class NpcNameFx {
  private readonly particles: Particle[] = [];
  /** Điểm đầu và điểm cuối đường bơi của từng con cá đang sống. */
  private readonly fishSwim = new Map<ParticleObject, { from: number; to: number }>();
  private nextSpawn = 0;
  private destroyed = false;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly view: CharacterView,
    private readonly options: NpcNameFxOptions,
  ) {
    if (options.particle === 'coin' && !scene.textures.exists(COIN_TEXTURE)) {
      scene.load.image(COIN_TEXTURE, COIN_ART);
      if (!scene.load.isLoading()) scene.load.start();
    }

  }

  /**
   * Gọi mỗi khung. `near`: người chơi đứng gần NPC; `onScreen`: NPC nằm trong màn hình (ngoài màn hình không dựng hạt cho
   * đỡ tốn).
   */
  update(timeMs: number, near: boolean, onScreen: boolean): void {
    if (this.destroyed || !onScreen) return;
    const label = this.view.nameLabel;
    const cap = this.options.particle === 'fish' ? FISH_MAX : MAX_PARTICLES;
    if (timeMs >= this.nextSpawn && this.particles.length < cap) {
      // Chưa sinh được (ảnh chưa nạp xong) thì thử lại sau 0,4 giây.
      const spawned = this.spawn(timeMs, label);
      this.nextSpawn = spawned
        ? timeMs + (SPAWN_MS[this.options.particle] * (0.6 + Math.random() * 0.8)) / (near ? 2 : 1)
        : timeMs + 400;
    }
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i]!;
      const t = (timeMs - p.born) / p.life;
      if (t >= 1) {
        this.fishSwim.delete(p.obj);
        p.obj.destroy();
        this.particles.splice(i, 1);
        continue;
      }
      this.animate(p, t);
    }
  }

  private spawn(timeMs: number, label: Phaser.GameObjects.Text): boolean {
    const kind = this.options.particle;
    if (kind === 'coin' && !this.scene.textures.exists(COIN_TEXTURE)) return false;
    const half = label.width / 2;
    const x = label.x + (Math.random() * 2 - 1) * half;
    const top = label.y - label.height;
    let obj: ParticleObject;
    let y: number;
    let life: number;
    if (kind === 'fish') {
      const id = FISH_SPECIES[Math.floor(Math.random() * FISH_SPECIES.length)]!;
      if (!this.scene.textures.exists(fishTextureKey(id))) {
        // Chưa có ảnh loài này: nạp (lọc tuyến tính vì ảnh 512px thu về ~18px, mặc định pixelArt lọc NEAREST sẽ vỡ nét), thử lại sớm.
        loadFishTexture(this.scene, id, () => this.scene.textures.get(fishTextureKey(id)).setFilter(0));
        return false;
      }
      const frame = this.scene.textures.get(fishTextureKey(id)).getSourceImage();
      const height = (FISH_WIDTH_PX * frame.height) / frame.width;
      // Bơi ngang qua phía trên chữ, từ mép này sang mép kia (ảnh cá quay đầu sang trái).
      const rightward = Math.random() < 0.5;
      const reach = half + FISH_WIDTH_PX * 0.5;
      y = top - FISH_ABOVE_PX;
      obj = this.scene.add.image(label.x + (rightward ? -reach : reach), y, fishTextureKey(id)).setDisplaySize(FISH_WIDTH_PX, height).setFlipX(rightward).setAlpha(0);
      this.fishSwim.set(obj, { from: label.x + (rightward ? -reach : reach), to: label.x + (rightward ? reach : -reach) });
      life = 2800;
    } else if (kind === 'coin') {
      y = top;
      obj = this.scene.add.image(x, y, COIN_TEXTURE).setDisplaySize(COIN_SIZE_PX, COIN_SIZE_PX);
      life = 1400;
    } else {
      const star = this.scene.add.container(x, top - Math.random() * 6);
      star.add([
        this.scene.add.rectangle(0, 0, 1, 5, 0xfff3a0),
        this.scene.add.rectangle(0, 0, 5, 1, 0xfff3a0),
        this.scene.add.rectangle(0, 0, 1, 1, 0xffffff),
      ]);
      obj = star;
      y = star.y;
      life = 900;
    }
    this.view.container.add(obj);
    this.particles.push({ obj, born: timeMs, life, x, y, kind, seed: Math.random() * 6.28 });
    return true;
  }

  private animate(p: Particle, t: number): void {
    const ease = 1 - (1 - t) * (1 - t);
    if (p.kind === 'fish') {
      const swim = this.fishSwim.get(p.obj);
      if (!swim) return;
      // Bơi đều từ mép này sang mép kia, lượn nhẹ lên xuống, hiện dần rồi mờ dần ở hai đầu.
      p.obj.setPosition(swim.from + (swim.to - swim.from) * t, p.y + Math.sin(p.seed + t * Math.PI * 3) * 2.4);
      p.obj.setAlpha(Math.min(1, t / 0.15, (1 - t) / 0.15));
    } else if (p.kind === 'coin') {
      // Đồng xu lật quanh trục dọc khi bay lên rồi mờ dần.
      const flip = Math.max(0.15, Math.abs(Math.cos(t * 11 + p.seed)));
      const coin = p.obj as Phaser.GameObjects.Image;
      coin.setPosition(p.x, p.y - 12 * ease);
      coin.setDisplaySize(COIN_SIZE_PX * flip, COIN_SIZE_PX);
      coin.setAlpha(1 - Math.max(0, (t - 0.65) / 0.35));
    } else {
      // Sao nháy: phình lên rồi thu lại, trôi nhẹ lên.
      p.obj.setPosition(p.x, p.y - 4 * ease);
      p.obj.setScale(Math.sin(t * Math.PI));
    }
  }

  destroy(): void {
    this.destroyed = true;
    this.fishSwim.clear();
    for (const p of this.particles) p.obj.destroy();
    this.particles.length = 0;
  }
}
