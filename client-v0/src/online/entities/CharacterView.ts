import Phaser from 'phaser';
import type { Rarity } from '../core/gameplayConfig';
import type { Direction } from '../net/contract';
import { EMOTE_TEXTURE, emojiById, emoteAnimKey } from '../social/emojis';
import { fishSpeciesOf } from '../social/fishEmoji';
import { fishArtUrl } from '../ui/fishArt';
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
  | { type: 'fish'; speciesId: string; rarity: Rarity }
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
/** Hình cá trên đầu thu vào khung tối đa này (px map), giữ tỉ lệ ảnh. */
const FISH_ICON_MAX_W = 32;
const FISH_ICON_MAX_H = 18;

/** Kéo cần mỗi lần tap trúng trong minigame: nhấc lớp cần lên vài px rồi hạ lại. */
const TUG_PX = 2;
const TUG_STRONG_PX = 3;
const TUG_MS = 70;
/** Emoji động trên đầu (frame 39px) thu về cỡ đầu thỏ. */
const EMOTE_SCALE = 0.6;
/** Emoji trong bong bóng trên đầu to lên 50% (feedback 2026-11-16); bong bóng ôm theo icon. */
const HEAD_EMOTE_SCALE = EMOTE_SCALE * 1.5;
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
/** Dấu ! khi cá cắn màu đỏ (feedback 2026-11-16, trước là vàng). */
const BITE_COLOR = '#ff3b30';
/**
 * Khi cá cắn/kéo cá chỉ tay và cần rung, thân ngồi yên (feedback 2026-11-16). Tay thỏ vẽ chung lớp cần
 * trong art, nên thân diễn tư thế ngồi đứng yên, lớp cần vẫn diễn animation rung.
 */
const BODY_STILL_ANIMS: ReadonlySet<CharacterAnim> = new Set(['bite', 'reel']);
/**
 * Mặt buồn khi câu thất bại (feedback 2026-11-16): atlas không có biểu cảm buồn nên vẽ thêm vài điểm ảnh
 * (lông mày xếch lên ở giữa, miệng mếu, giọt nước mắt) lên mặt thỏ ở tư thế ngồi. Toạ độ tính từ chân (pivot),
 * đo trên frame ngồi của tools/bake_characters.py; hướng trái là ảnh lật của hướng phải; quay lưng không thấy mặt.
 */
const SAD_FACE_PX: Partial<Record<Direction, { dark: number[][]; tear: number[][] }>> = {
  down: {
    dark: [
      [-4, -25],
      [-3, -26],
      [5, -26],
      [6, -25],
      [0, -20],
      [1, -21],
      [2, -20],
    ],
    tear: [
      [-4, -21],
      [-4, -20],
    ],
  },
  right: {
    dark: [
      [6, -27],
      [7, -28],
      [7, -21],
      [8, -22],
    ],
    tear: [
      [6, -22],
      [6, -21],
    ],
  },
};
/** Viền trắng quanh thân khi rê chuột/đứng gần (BOT-02, giống viền ghế): 4 bản sao trắng lệch 1px phía sau. */
const OUTLINE_OFFSETS: readonly [number, number][] = [
  [-1, 0],
  [1, 0],
  [0, -1],
  [0, 1],
];
const OUTLINE_FADE_MS = 140;
/** Icon cá trên đầu (emoji `fish:<loài>`): cạnh dài nhất bao nhiêu px. */
const FISH_EMOTE_PX = 22;
const fishTextureKey = (speciesId: string) => `fish-art:${speciesId}`;
const SAD_FACE_DARK = 0x5a3a22;
const SAD_FACE_TEAR = 0x7fd3ff;

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
  /** Lớp điểm ảnh mặt buồn, nằm giữa thân và cần. */
  private readonly sadFace: Phaser.GameObjects.Graphics;
  private sad = false;
  
  /** Emoji buồn hiện bằng bong bóng trên đầu (pier) thay vì icon nhỏ. */
  private sadBubble: Phaser.GameObjects.Container | null = null;
  /** Viền trắng (tạo khi cần lần đầu). */
  private outline: Phaser.GameObjects.Sprite[] | null = null;
  private outlined = false;


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
    this.sadFace = scene.add.graphics();
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
      this.sadFace,
      this.rod,
      this.label,
      this.bubble,
      this.iconSlot,
    ]);
    this.container.setDepth(options.y);
    this.body.on(Phaser.Animations.Events.ANIMATION_UPDATE, () => this.syncOutline());
    this.placeHeadItems();
    this.applyAnimation();
  }

  /** Bấm/rê chuột lên thân nhân vật (người khác trên pier.html): mở popup thông tin, hiện viền trắng. */
  enablePointer(handlers: { onClick: () => void; onHover: (hover: boolean) => void }): void {
    this.body.setInteractive({ pixelPerfect: true, useHandCursor: true });
    this.body.on(Phaser.Input.Events.POINTER_OVER, () => handlers.onHover(true));
    this.body.on(Phaser.Input.Events.POINTER_OUT, () => handlers.onHover(false));
    this.body.on(Phaser.Input.Events.POINTER_UP, () => handlers.onClick());
  }

  /** Viền trắng quanh thân, hiện/ẩn mờ dần như viền ghế ngồi được. */
  setOutlined(on: boolean): void {
    if (on === this.outlined) return;
    this.outlined = on;
    if (on && !this.outline) {
      this.outline = OUTLINE_OFFSETS.map(([dx, dy]) =>
        this.scene.add.sprite(dx, dy, this.body.texture.key).setTintFill(0xffffff).setAlpha(0),
      );
      this.container.addAt(this.outline, 0);
      this.syncOutline();
    }
    if (!this.outline) return;
    this.scene.tweens.killTweensOf(this.outline);
    this.scene.tweens.add({
      targets: this.outline,
      alpha: on ? 1 : 0,
      duration: OUTLINE_FADE_MS,
      ease: 'Sine.easeOut',
    });
  }

  /** Viền đi theo đúng frame của thân (cả khi đổi skin, hướng, animation). */
  private syncOutline(): void {
    if (!this.outline) return;
    for (const sprite of this.outline) {
      sprite.setTexture(this.body.texture.key, this.body.frame.name);
      sprite.setFlipX(this.body.flipX);
      if (!this.body.frame.customPivot) sprite.setOrigin(0.5, 1);
    }
  }

  /** Đổi tên hiển thị trên đầu (người chơi vừa đổi tên ở màn Tài khoản). */
  setName(name: string): void {
    if (this.label.text !== name) this.label.setText(name);
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

  /** Chỗ cá vừa câu bay tới: ngay trên đỉnh đầu (FishingActor.catchPoint). */
  catchPoint(): { x: number; y: number } {
    return { x: this.x, y: this.headY - 6 };
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
    this.drawSadFace();
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
    // Emoji buồn/cá đang nằm trong bong bóng (pier) thì gỡ cùng icon; bong bóng chat/emoji khác giữ nguyên.
    if (this.iconBubble && this.headBubble === this.iconBubble) this.hideHeadBubble();
    this.iconBubble = null;
    this.headIcon = icon;
    this.sad = icon?.type === 'sad';
    this.drawSadFace();
    if (!icon) return;
    if (icon.type === 'fish') {
      this.showFishIcon(icon);
      return;
    }
    if (icon.type === 'emoji') {
      this.showEmote(icon.emojiId);
      return;
    }
    if (icon.type === 'sad' && this.scene.anims.exists(emoteAnimKey(SAD_EMOTE_ART))) {
      // pier.html: emoji buồn trong bong bóng trên đầu, cùng cỡ emoji chat cho dễ thấy (feedback 2026-11-16).
      if (hasHeadBubble(this.scene)) {
        this.showEmoteBubble(SAD_EMOTE_ART);
        this.iconBubble = this.headBubble;
      } else {
        this.showEmoteArt(SAD_EMOTE_ART);
      }
      return;
    }
    const text = TEXT_ICONS[icon.type];
    const label = this.scene.add
      .text(0, 0, text, {
        fontFamily: 'monospace',
        fontSize: '14px',
        fontStyle: 'bold',
        color: icon.type === 'bite' ? BITE_COLOR : '#ffffff',
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

  /**
   * Hình loài cá vừa câu được trên đầu (feedback 2026-11-17, thay cho chấm màu độ hiếm). pier.html đặt trong
   * bong bóng như emoji. Ảnh cá nạp lần đầu khi cần; trong lúc chờ hiện chấm màu độ hiếm.
   */
  private showFishIcon(icon: Extract<HeadIcon, { type: 'fish' }>): void {
    const key = fishTextureKey(icon.speciesId);
    if (!this.scene.textures.exists(key)) {
      const color = Phaser.Display.Color.HexStringToColor(RARITY_COLORS[icon.rarity]).color;
      this.iconSlot.add(this.scene.add.ellipse(0, 0, 14, 8, color));
      loadFishTexture(this.scene, icon.speciesId, () => {
        if (this.container.scene && this.headIcon === icon) this.setHeadIcon(icon);
      });
      return;
    }
    const image = this.scene.add.image(0, 0, key).setOrigin(0.5);
    image.setScale(Math.min(FISH_ICON_MAX_W / image.width, FISH_ICON_MAX_H / image.height));
    if (hasHeadBubble(this.scene)) {
      this.showHeadBubble(image, image.displayWidth, image.displayHeight, 'emote');
      this.iconBubble = this.headBubble;
      return;
    }
    this.iconSlot.add(image);
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
    if (this.outline) this.scene.tweens.killTweensOf(this.outline);
    this.container.destroy(true);
  }

  /** Ẩn emoji trên đầu có hiệu ứng thu nhỏ; icon khác (cá, buồn, !) thì để nguyên. */
  clearEmote(): void {
    if (this.headBubbleKind === 'emote') this.hideHeadBubble();
    const sprites = this.iconSlot.list.filter(
      (child): child is Phaser.GameObjects.Sprite | Phaser.GameObjects.Image =>
        (child instanceof Phaser.GameObjects.Sprite || child instanceof Phaser.GameObjects.Image) &&
        (child.texture.key === EMOTE_TEXTURE || child.texture.key.startsWith('fish-art:')),
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
    const fish = fishSpeciesOf(emojiId);
    if (fish) {
      this.showFishEmote(fish);
      return;
    }
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
      this.showEmoteBubble(emoji.art);
      return;
    }
    this.showEmoteArt(emoji.art);
  }

  /** Icon cá (ảnh loài trong ui/fishArt) trên đầu như emoji; tải ảnh lần đầu rồi mới hiện. */
  private showFishEmote(speciesId: string): void {
    const key = fishTextureKey(speciesId);
    const show = () => {
      if (!this.container.active || !this.scene.textures.exists(key)) return;
      const image = this.scene.add.image(0, 0, key).setOrigin(0.5);
      const scale = FISH_EMOTE_PX / Math.max(image.width, image.height, 1);
      image.setScale(scale);
      if (hasHeadBubble(this.scene)) {
        this.showHeadBubble(image, image.width * scale, image.height * scale, 'emote');
        return;
      }
      this.iconSlot.add(image);
    };
    if (this.scene.textures.exists(key)) {
      show();
      return;
    }
    this.scene.load.image(key, fishArtUrl(speciesId));
    this.scene.load.once(`filecomplete-image-${key}`, show);
    this.scene.load.start();
  }

  /** Emoji động trong bong bóng Head Bubble trên đầu (pier.html). */
  private showEmoteBubble(art: string): void {
    const sprite = this.scene.add
      .sprite(0, 0, EMOTE_TEXTURE)
      .setOrigin(0.5)
      .setScale(HEAD_EMOTE_SCALE)
      .play(emoteAnimKey(art));
    const size = sprite.width * HEAD_EMOTE_SCALE;
    this.showHeadBubble(sprite, size, size, 'emote');
  }

  /**
   * Bong bóng trên đầu: thân vừa nội dung, đuôi chỉ xuống đỉnh đầu; ẩn tên trong lúc hiện
   * (người dùng chốt 2026-11-14). Nảy lên khi hiện, thu nhỏ và mờ dần khi ẩn.
   */
  private showHeadBubble(
    content: Phaser.GameObjects.Text | Phaser.GameObjects.Sprite | Phaser.GameObjects.Image,
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

  /** Vẽ/xoá mặt buồn theo trạng thái hiện tại (icon buồn, hướng, tư thế ngồi). */
  private drawSadFace(): void {
    this.sadFace.clear();
    const seatedPose = this.seated || (this.anim !== 'idle' && this.anim !== 'walk');
    // Chỉ art thỏ đã bake mới khớp toạ độ mặt; sprite vẽ tạm bỏ qua.
    if (!this.sad || !seatedPose || bakedData(this.scene, this.skinId).headTop === undefined)
      return;
    const mirror = this.dir === 'left';
    const px = SAD_FACE_PX[mirror ? 'right' : this.dir];
    if (!px) return;
    const dot = (color: number, [dx, dy]: number[]) => {
      this.sadFace.fillStyle(color);
      this.sadFace.fillRect(mirror ? -dx! - 1 : dx!, dy!, 1, 1);
    };
    for (const p of px.dark) dot(SAD_FACE_DARK, p);
    for (const p of px.tear) dot(SAD_FACE_TEAR, p);
  }

  private applyAnimation(): void {
    // Cá cắn/kéo cá: thân giữ tư thế ngồi yên, chỉ lớp cần (có tay) rung.
    const bodyAnim = BODY_STILL_ANIMS.has(this.anim) ? 'sit' : this.anim;
    this.body.play(animKey(this.skinId, bodyAnim, this.dir));
    this.drawSadFace();
    this.rod.play(animKey(this.rodId, this.anim, this.dir));
    this.syncOutline();
    // Art thật mang pivot chân trong frame (Phaser tự áp); sprite vẽ tạm neo đáy-giữa.
    for (const sprite of [this.body, this.rod]) {
      if (!sprite.frame.customPivot) sprite.setOrigin(0.5, 1);
    }
  }
}
