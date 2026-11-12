import Phaser from 'phaser';
import type { Rarity } from '../core/gameplayConfig';
import type { Direction } from '../net/contract';
import { RARITY_COLORS } from '../ui/kit/format';
import { bakedData } from './characterArt';
import { animKey, ensureRod, ensureSkin, frameName, type CharacterAnim } from './placeholderArt';

export interface CharacterOptions {
  x: number;
  y: number;
  skinId: string;
  rodId: string;
  name: string;
  dir?: Direction;
  /** Nhân vật của người đang chơi: tên chữ vàng để dễ nhận ra giữa người khác. */
  isMe?: boolean;
}

export type HeadIcon =
  | { type: 'bite' }
  | { type: 'sad' }
  | { type: 'fish'; rarity: Rarity }
  | { type: 'emoji'; emojiId: string }
  | null;

/** Đỉnh đầu sprite vẽ tạm so với chân; art thật ghi `headTop` trong JSON. */
const PLACEHOLDER_HEAD_TOP = 25;
const LABEL_GAP = 9;
const NAME_COLOR = '#ffffff';
const MY_NAME_COLOR = '#ffd84a';
const ICON_GAP = 21;
const TEXT_ICONS = { bite: '!', sad: ':(' } as const;
/** Dấu ! khi cá cắn lắc trái phải (feedback 2026-11-11). */
const BITE_SHAKE_PX = 3;
const BITE_SHAKE_MS = 70;

/** Nhân vật gồm thân, lớp cần câu, nhãn tên và chỗ gắn icon trên đầu. Gốc tọa độ ở chân. */
export class CharacterView {
  readonly container: Phaser.GameObjects.Container;
  private readonly body: Phaser.GameObjects.Sprite;
  private readonly rod: Phaser.GameObjects.Sprite;
  private readonly iconSlot: Phaser.GameObjects.Container;
  private readonly label: Phaser.GameObjects.Text;
  private skinId: string;
  private rodId: string;
  private dir: Direction;
  private anim: CharacterAnim = 'idle';
  /** Đang ngồi ghế: 'idle' hiển thị thành tư thế ngồi. */
  private seated = false;

  constructor(
    private readonly scene: Phaser.Scene,
    options: CharacterOptions,
  ) {
    this.skinId = options.skinId;
    this.rodId = options.rodId;
    this.dir = options.dir ?? 'down';
    ensureSkin(scene, this.skinId);
    ensureRod(scene, this.rodId);

    const firstFrame = frameName('idle', this.dir, 0);
    this.body = scene.add.sprite(0, 0, this.skinId, firstFrame).setOrigin(0.5, 1);
    this.rod = scene.add.sprite(0, 0, this.rodId, firstFrame).setOrigin(0.5, 1);
    this.label = scene.add
      .text(0, 0, options.name, {
        fontFamily: 'monospace',
        fontSize: '8px',
        color: options.isMe ? MY_NAME_COLOR : NAME_COLOR,
        backgroundColor: '#00000066',
      })
      .setOrigin(0.5, 1);
    this.iconSlot = scene.add.container(0, 0);
    this.container = scene.add.container(options.x, options.y, [
      this.body,
      this.rod,
      this.label,
      this.iconSlot,
    ]);
    this.container.setDepth(options.y);
    this.placeHeadItems();
    this.applyAnimation();
  }

  get x(): number {
    return this.container.x;
  }

  get y(): number {
    return this.container.y;
  }

  /** Toạ độ y của đỉnh đầu (tai) trong thế giới, để đặt gợi ý cạnh đầu nhân vật. */
  get headY(): number {
    return this.container.y - (bakedData(this.scene, this.skinId).headTop ?? PLACEHOLDER_HEAD_TOP);
  }

  get direction(): Direction {
    return this.dir;
  }

  setPosition(x: number, y: number): void {
    this.container.setPosition(x, y).setDepth(y);
  }

  setDirection(dir: Direction): void {
    if (dir === this.dir) return;
    this.dir = dir;
    this.applyAnimation();
  }

  play(anim: CharacterAnim): void {
    const shown = this.seated && anim === 'idle' ? 'sit' : anim;
    if (shown === this.anim) return;
    this.anim = shown;
    this.applyAnimation();
  }

  /** Ngồi xuống/đứng dậy khỏi ghế; animation câu cá của art thật đã ở tư thế ngồi. */
  setSeated(seated: boolean): void {
    if (seated === this.seated) return;
    this.seated = seated;
    if (seated && this.anim === 'idle') this.play('idle');
    else if (!seated && this.anim === 'sit') {
      this.anim = 'idle';
      this.applyAnimation();
    }
  }

  setSkin(skinId: string): void {
    if (skinId === this.skinId) return;
    this.skinId = skinId;
    ensureSkin(this.scene, skinId);
    this.placeHeadItems();
    this.applyAnimation();
  }

  setRod(rodId: string): void {
    if (rodId === this.rodId) return;
    this.rodId = rodId;
    ensureRod(this.scene, rodId);
    this.applyAnimation();
  }

  setHeadIcon(icon: HeadIcon): void {
    this.scene.tweens.killTweensOf(this.iconSlot.list);
    this.iconSlot.removeAll(true);
    if (!icon) return;
    if (icon.type === 'fish') {
      const color = Phaser.Display.Color.HexStringToColor(RARITY_COLORS[icon.rarity]).color;
      this.iconSlot.add(this.scene.add.ellipse(0, 0, 14, 8, color));
      return;
    }
    const text = icon.type === 'emoji' ? icon.emojiId : TEXT_ICONS[icon.type];
    const label = this.scene.add
      .text(0, 0, text, {
        fontFamily: 'monospace',
        fontSize: '14px',
        fontStyle: 'bold',
        color: icon.type === 'bite' ? '#ffdd33' : '#ffffff',
        stroke: '#000000',
        strokeThickness: 2,
      })
      .setOrigin(0.5);
    this.iconSlot.add(label);
    if (icon.type === 'bite') {
      label.x = -BITE_SHAKE_PX;
      this.scene.tweens.add({
        targets: label,
        x: BITE_SHAKE_PX,
        duration: BITE_SHAKE_MS,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    }
  }

  destroy(): void {
    this.scene.tweens.killTweensOf(this.iconSlot.list);
    this.container.destroy(true);
  }

  /** Nhãn tên và icon đặt theo chiều cao skin (thỏ có tai cao hơn sprite vẽ tạm). */
  private placeHeadItems(): void {
    const headTop = bakedData(this.scene, this.skinId).headTop ?? PLACEHOLDER_HEAD_TOP;
    this.label.y = -(headTop + LABEL_GAP);
    this.iconSlot.y = -(headTop + ICON_GAP);
  }

  private applyAnimation(): void {
    this.body.play(animKey(this.skinId, this.anim, this.dir));
    this.rod.play(animKey(this.rodId, this.anim, this.dir));
    // Art thật mang pivot chân trong frame (Phaser tự áp); sprite vẽ tạm neo đáy-giữa.
    for (const sprite of [this.body, this.rod]) {
      if (!sprite.frame.customPivot) sprite.setOrigin(0.5, 1);
    }
  }
}
