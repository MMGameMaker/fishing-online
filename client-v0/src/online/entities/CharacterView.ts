import Phaser from 'phaser';
import type { Rarity } from '../core/gameplayConfig';
import type { Direction } from '../net/contract';
import { EMOTE_TEXTURE, emojiById, emoteAnimKey } from '../social/emojis';
import { RARITY_COLORS } from '../ui/kit/format';
import { bakedData } from './characterArt';
import {
  HEAD_BUBBLE_ART_SCALE,
  HEAD_BUBBLE_TAIL_PX,
  hasHeadBubble,
  headBubbleTexture,
} from './HeadBubble';
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
/** Khoảng từ mép trên tên tới tâm icon trên đầu (pier): đủ cho emoji cao ~23px không chạm tên. */
const ICON_ABOVE_LABEL = 13;
const TEXT_ICONS = { bite: '!', sad: ':(' } as const;
/** Icon buồn khi câu hụt dùng emoji động "sad" (feedback 2026-11-12); thiếu sheet thì hiện ":(". */
const SAD_EMOTE_ART = 'sad';
/** Kéo cần mỗi lần tap trúng trong minigame: nhấc lớp cần lên vài px rồi hạ lại. */
const TUG_PX = 2;
const TUG_STRONG_PX = 3;
const TUG_MS = 70;
/** Emoji động trên đầu (frame 39px) thu về cỡ đầu thỏ. */
const EMOTE_SCALE = 0.6;
/** Bong bóng lời nói khi chat: hiện bao lâu, rộng tối đa, khoảng cách trên nhãn tên. */
/** GD chốt 2026-11-13: bong bóng chat tồn tại 10 giây. */
const SAY_MS = 10_000;
const SAY_WRAP_PX = 110;
const SAY_GAP = 12;
const POP_IN_MS = 200;
const FADE_OUT_MS = 160;
/** Dấu ! khi cá cắn hiện rõ rồi mờ đi liên tục (feedback 2026-11-13, thay kiểu lắc trái phải). */
const BITE_FADE_MS = 280;
const BITE_MIN_ALPHA = 0.15;

/** Nhân vật gồm thân, lớp cần câu, nhãn tên và chỗ gắn icon trên đầu. Gốc tọa độ ở chân. */
export class CharacterView {
  readonly container: Phaser.GameObjects.Container;
  private readonly body: Phaser.GameObjects.Sprite;
  private readonly rod: Phaser.GameObjects.Sprite;
  private readonly iconSlot: Phaser.GameObjects.Container;
  private readonly label: Phaser.GameObjects.Text;
  private readonly bubble: Phaser.GameObjects.Text;
  private bubbleTimer: Phaser.Time.TimerEvent | null = null;
  /** Bong bóng Head Bubble.png (chỉ trang đã nạp ảnh này, vd. pier.html): chat hoặc emoji. */
  private headBubble: Phaser.GameObjects.Container | null = null;
  private headBubbleKind: 'text' | 'emote' | null = null;
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
        // Pier: cùng phông đậm với tên ở khung người chơi (Courier New), vẽ độ phân giải cao cho nét rõ.
        // Vàng cho bản thân, trắng cho người khác và bot (feedback 2026-11-14).
        fontFamily: hasHeadBubble(scene) ? 'Courier New, monospace' : 'monospace',
        fontSize: '8px',
        ...(hasHeadBubble(scene) ? { fontStyle: 'bold', resolution: 4 } : {}),
        color: options.isMe ? MY_NAME_COLOR : NAME_COLOR,
        backgroundColor: '#00000066',
      })
      .setOrigin(0.5, 1);
    this.iconSlot = scene.add.container(0, 0);
    this.bubble = scene.add
      .text(0, 0, '', {
        fontFamily: 'monospace',
        fontSize: '8px',
        color: '#3a1d0e',
        backgroundColor: '#fffaf0',
        padding: { x: 4, y: 3 },
        align: 'center',
        wordWrap: { width: SAY_WRAP_PX, useAdvancedWrap: true },
      })
      .setOrigin(0.5, 1)
      .setAlpha(0)
      .setVisible(false);
    this.container = scene.add.container(options.x, options.y, [
      this.body,
      this.rod,
      this.label,
      this.bubble,
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
    if (icon.type === 'emoji') {
      this.showEmote(icon.emojiId);
      return;
    }
    if (icon.type === 'sad' && this.scene.anims.exists(emoteAnimKey(SAD_EMOTE_ART))) {
      this.showEmoteArt(SAD_EMOTE_ART);
      return;
    }
    const text = TEXT_ICONS[icon.type];
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
      label.setAlpha(BITE_MIN_ALPHA);
      this.scene.tweens.add({
        targets: label,
        alpha: 1,
        duration: BITE_FADE_MS,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    }
  }

  /** Vị trí phao vẽ trong art cần (thế giới); null nếu cần chưa có art bake. */
  bobberPoint(): { x: number; y: number } | null {
    const offset = bakedData(this.scene, this.rodId).bobber?.[this.dir];
    return offset ? { x: this.x + offset.x, y: this.y + offset.y } : null;
  }

  /** Giật cần lên một chút (tap trúng minigame); strong = điểm yếu, giật mạnh hơn. */
  tugRod(strong = false): void {
    this.scene.tweens.killTweensOf(this.rod);
    this.rod.y = 0;
    this.scene.tweens.add({
      targets: this.rod,
      y: -(strong ? TUG_STRONG_PX : TUG_PX),
      duration: TUG_MS,
      yoyo: true,
      ease: 'Quad.easeOut',
      onComplete: () => (this.rod.y = 0),
    });
  }

  /** Bong bóng lời nói trên đầu khi người này chat: nảy lên, giữ SAY_MS rồi mờ dần. */
  say(text: string): void {
    this.bubbleTimer?.remove();
    if (hasHeadBubble(this.scene)) {
      const content = this.scene.add
        .text(0, 0, text, {
          fontFamily: 'Courier New, monospace',
          fontSize: '8px',
          fontStyle: 'bold',
          color: '#3a1d0e',
          align: 'center',
          resolution: 4,
          wordWrap: { width: SAY_WRAP_PX, useAdvancedWrap: true },
        })
        .setOrigin(0.5);
      this.showHeadBubble(content, content.width, content.height, 'text');
      this.bubbleTimer = this.scene.time.delayedCall(SAY_MS, () => {
        if (this.headBubbleKind === 'text') this.hideHeadBubble();
      });
      return;
    }
    this.scene.tweens.killTweensOf(this.bubble);
    this.bubble.setText(text).setVisible(true).setAlpha(0).setScale(0.5);
    this.scene.tweens.add({
      targets: this.bubble,
      alpha: 1,
      scale: 1,
      duration: POP_IN_MS,
      ease: 'Back.easeOut',
    });
    this.bubbleTimer = this.scene.time.delayedCall(SAY_MS, () => {
      this.scene.tweens.add({
        targets: this.bubble,
        alpha: 0,
        scale: 0.8,
        duration: FADE_OUT_MS,
        ease: 'Sine.easeIn',
        onComplete: () => this.bubble.setVisible(false),
      });
    });
  }

  destroy(): void {
    this.bubbleTimer?.remove();
    if (this.headBubble) this.scene.tweens.killTweensOf(this.headBubble);
    this.scene.tweens.killTweensOf(this.iconSlot.list);
    this.scene.tweens.killTweensOf(this.bubble);
    this.scene.tweens.killTweensOf(this.rod);
    this.container.destroy(true);
  }

  /** Ẩn emoji trên đầu có hiệu ứng thu nhỏ; icon khác (cá, buồn, !) thì để nguyên. */
  clearEmote(): void {
    if (this.headBubbleKind === 'emote') this.hideHeadBubble();
    const sprites = this.iconSlot.list.filter(
      (child): child is Phaser.GameObjects.Sprite =>
        child instanceof Phaser.GameObjects.Sprite && child.texture.key === EMOTE_TEXTURE,
    );
    for (const sprite of sprites) {
      this.scene.tweens.add({
        targets: sprite,
        scale: 0,
        duration: FADE_OUT_MS,
        ease: 'Sine.easeIn',
        onComplete: () => sprite.destroy(),
      });
    }
  }

  /** Emoji động trên đầu; chưa nạp được sheet emoji thì hiện mã emoji bằng chữ. */
  private showEmote(emojiId: string): void {
    const emoji = emojiById(emojiId);
    if (!emoji || !this.scene.anims.exists(emoteAnimKey(emoji.art))) {
      this.iconSlot.add(
        this.scene.add
          .text(0, 0, emojiId, { fontFamily: 'monospace', fontSize: '8px', color: '#ffffff' })
          .setOrigin(0.5),
      );
      return;
    }
    if (hasHeadBubble(this.scene)) {
      const sprite = this.scene.add
        .sprite(0, 0, EMOTE_TEXTURE)
        .setOrigin(0.5)
        .setScale(EMOTE_SCALE)
        .play(emoteAnimKey(emoji.art));
      const size = sprite.width * EMOTE_SCALE;
      this.showHeadBubble(sprite, size, size, 'emote');
      return;
    }
    this.showEmoteArt(emoji.art);
  }

  /**
   * Bong bóng trên đầu: thân vừa nội dung, đuôi chỉ xuống đỉnh đầu; ẩn tên trong lúc hiện
   * (người dùng chốt 2026-11-14). Nảy lên khi hiện, thu nhỏ và mờ dần khi ẩn.
   */
  private showHeadBubble(
    content: Phaser.GameObjects.Text | Phaser.GameObjects.Sprite,
    contentW: number,
    contentH: number,
    kind: 'text' | 'emote',
  ): void {
    this.removeHeadBubble();
    const pad = 3;
    const w = Math.ceil(contentW) + pad * 2;
    const h = Math.ceil(contentH) + pad * 2;
    const art = this.scene.add
      .image(0, 0, headBubbleTexture(this.scene, w, h))
      .setOrigin(0.5, 1)
      .setScale(HEAD_BUBBLE_ART_SCALE);
    content.setPosition(0, -(HEAD_BUBBLE_TAIL_PX + h / 2));
    // Đuôi bong bóng chỉ xuống ngay trên tên; tên vẫn hiện (feedback 2026-11-14, thay cho ẩn tên).
    const bubble = this.scene.add.container(0, this.labelTop() - 1, [art, content]);
    bubble.setScale(0.4).setAlpha(0);
    this.container.add(bubble);
    this.headBubble = bubble;
    this.headBubbleKind = kind;
    this.scene.tweens.add({
      targets: bubble,
      scale: 1,
      alpha: 1,
      duration: POP_IN_MS,
      ease: 'Back.easeOut',
    });
  }

  private hideHeadBubble(): void {
    const bubble = this.headBubble;
    if (!bubble) return;
    this.headBubble = null;
    this.headBubbleKind = null;
    this.scene.tweens.add({
      targets: bubble,
      scale: 0.6,
      alpha: 0,
      duration: FADE_OUT_MS,
      ease: 'Sine.easeIn',
      onComplete: () => bubble.destroy(true),
    });
  }

  /** Thay bong bóng ngay (tin mới đè tin cũ), không chờ hiệu ứng ẩn. */
  private removeHeadBubble(): void {
    if (!this.headBubble) return;
    this.scene.tweens.killTweensOf(this.headBubble);
    this.headBubble.destroy(true);
    this.headBubble = null;
    this.headBubbleKind = null;
  }

  /** Emoji động (đã có animation) nảy lên trên đầu. */
  private showEmoteArt(art: string): void {
    const sprite = this.scene.add
      .sprite(0, 0, EMOTE_TEXTURE)
      .setOrigin(0.5)
      .setScale(0)
      .play(emoteAnimKey(art));
    this.iconSlot.add(sprite);
    this.scene.tweens.add({
      targets: sprite,
      scale: EMOTE_SCALE,
      duration: POP_IN_MS,
      ease: 'Back.easeOut',
    });
  }

  /** Mép trên của nhãn tên (toạ độ trong container nhân vật). */
  private labelTop(): number {
    return this.label.y - this.label.height;
  }

  /** Nhãn tên và icon đặt theo chiều cao skin (thỏ có tai cao hơn sprite vẽ tạm). */
  private placeHeadItems(): void {
    const headTop = bakedData(this.scene, this.skinId).headTop ?? PLACEHOLDER_HEAD_TOP;
    this.label.y = -(headTop + LABEL_GAP);
    this.iconSlot.y = -(headTop + ICON_GAP);
    this.bubble.y = -(headTop + LABEL_GAP + SAY_GAP);
    // pier.html (có ảnh Head Bubble): dấu !, emoji buồn, icon cá nằm hẳn trên tên, không đè chữ
    // (feedback 2026-11-14). Trang khác giữ chỗ cũ.
    if (hasHeadBubble(this.scene)) this.iconSlot.y = this.labelTop() - ICON_ABOVE_LABEL;
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
