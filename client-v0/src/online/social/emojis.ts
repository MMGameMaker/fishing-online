// 16 biểu cảm của bảng "Biểu cảm" (khớp Social:Emojis của Server emoji_01..16) và art trong
// public/assets/reference/spritesheets/emotes-spritesheet: <art>Static (icon), <art>Animated0..12 (động).
import type Phaser from 'phaser';

const SHEET = '/assets/reference/spritesheets/emotes-spritesheet';
export const EMOTE_TEXTURE = 'emotes';
const ANIMATED_FRAMES = 13;
const ANIM_FPS = 12;

const ART = [
  'smiley',
  'sad',
  'tongue',
  'wideSmile',
  'cryLaugh',
  'cry',
  'angry',
  'wink',
  'annoyed',
  'heart',
  'wave',
  'nails',
  'cuteFace',
  'uwu',
  'surprised',
  'claps',
] as const;

export interface EmojiDef {
  id: string;
  art: (typeof ART)[number];
}

export const EMOJIS: readonly EmojiDef[] = ART.map((art, i) => ({
  id: `emoji_${String(i + 1).padStart(2, '0')}`,
  art,
}));

export function emojiById(id: string): EmojiDef | undefined {
  return EMOJIS.find((emoji) => emoji.id === id);
}

export const emoteAnimKey = (art: string): string => `emote:${art}`;

/** Nạp sheet emoji cho Phaser (emoji động trên đầu nhân vật). */
export function preloadEmotes(scene: Phaser.Scene): void {
  if (!scene.textures.exists(EMOTE_TEXTURE)) {
    scene.load.atlas(EMOTE_TEXTURE, `${SHEET}.png`, `${SHEET}.json`);
  }
}

export function ensureEmoteAnims(scene: Phaser.Scene): void {
  if (!scene.textures.exists(EMOTE_TEXTURE)) return;
  for (const { art } of EMOJIS) {
    const key = emoteAnimKey(art);
    if (scene.anims.exists(key)) continue;
    scene.anims.create({
      key,
      frames: Array.from({ length: ANIMATED_FRAMES }, (_, i) => ({
        key: EMOTE_TEXTURE,
        frame: `${art}Animated${i}`,
      })),
      frameRate: ANIM_FPS,
      repeat: -1,
    });
  }
}

export interface FrameRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

let framesPromise: Promise<Record<string, FrameRect>> | null = null;

/** Toạ độ frame trong sheet để vẽ icon DOM bằng background-position. */
export function loadEmoteFrames(): Promise<Record<string, FrameRect>> {
  framesPromise ??= fetch(`${SHEET}.json`)
    .then(
      (response) =>
        response.json() as Promise<{ frames: { filename: string; frame: FrameRect }[] }>,
    )
    .then((data) => Object.fromEntries(data.frames.map((f) => [f.filename, f.frame])));
  return framesPromise;
}

export const EMOTE_SHEET_URL = `${SHEET}.png`;
