import Phaser from 'phaser';
import type { Rarity } from '../core/gameplayConfig';
import type { Direction } from '../net/contract';
import { RARITY_COLORS } from '../ui/kit/format';
import { animKey, ensureRod, ensureSkin, frameName, type CharacterAnim } from './placeholderArt';

export interface CharacterOptions {
  x: number;
  y: number;
  skinId: string;
  rodId: string;
  name: string;
  dir?: Direction;
}

export type HeadIcon =
  | { type: 'bite' }
  | { type: 'sad' }
  | { type: 'fish'; rarity: Rarity }
  | { type: 'emoji'; emojiId: string }
  | null;

const LABEL_Y = -34;
const ICON_Y = -46;
const TEXT_ICONS = { bite: '!', sad: ':(' } as const;

/** Nhân vật gồm thân, lớp cần câu, nhãn tên và chỗ gắn icon trên đầu. Gốc tọa độ ở chân. */
export class CharacterView {
  readonly container: Phaser.GameObjects.Container;
  private readonly body: Phaser.GameObjects.Sprite;
  private readonly rod: Phaser.GameObjects.Sprite;
  private readonly iconSlot: Phaser.GameObjects.Container;
  private skinId: string;
  private rodId: string;
  private dir: Direction;
  private anim: CharacterAnim = 'idle';

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
    const label = scene.add
      .text(0, LABEL_Y, options.name, {
        fontFamily: 'monospace',
        fontSize: '8px',
        color: '#ffffff',
        backgroundColor: '#00000066',
      })
      .setOrigin(0.5, 1);
    this.iconSlot = scene.add.container(0, ICON_Y);
    this.container = scene.add.container(options.x, options.y, [
      this.body,
      this.rod,
      label,
      this.iconSlot,
    ]);
    this.container.setDepth(options.y);
    this.applyAnimation();
  }

  get x(): number {
    return this.container.x;
  }

  get y(): number {
    return this.container.y;
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
    if (anim === this.anim) return;
    this.anim = anim;
    this.applyAnimation();
  }

  setSkin(skinId: string): void {
    if (skinId === this.skinId) return;
    this.skinId = skinId;
    ensureSkin(this.scene, skinId);
    this.applyAnimation();
  }

  setRod(rodId: string): void {
    if (rodId === this.rodId) return;
    this.rodId = rodId;
    ensureRod(this.scene, rodId);
    this.applyAnimation();
  }

  setHeadIcon(icon: HeadIcon): void {
    this.iconSlot.removeAll(true);
    if (!icon) return;
    if (icon.type === 'fish') {
      const color = Phaser.Display.Color.HexStringToColor(RARITY_COLORS[icon.rarity]).color;
      this.iconSlot.add(this.scene.add.ellipse(0, 0, 14, 8, color));
      return;
    }
    const text = icon.type === 'emoji' ? icon.emojiId : TEXT_ICONS[icon.type];
    this.iconSlot.add(
      this.scene.add
        .text(0, 0, text, {
          fontFamily: 'monospace',
          fontSize: '14px',
          fontStyle: 'bold',
          color: icon.type === 'bite' ? '#ffdd33' : '#ffffff',
          stroke: '#000000',
          strokeThickness: 2,
        })
        .setOrigin(0.5),
    );
  }

  destroy(): void {
    this.container.destroy(true);
  }

  private applyAnimation(): void {
    this.body.play(animKey(this.skinId, this.anim, this.dir));
    this.rod.play(animKey(this.rodId, this.anim, this.dir));
  }
}
