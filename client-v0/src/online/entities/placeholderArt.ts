// Sprite tạm vẽ bằng canvas, đặt tên khung `<anim>_<dir>_<i>` theo ART-02 để thay được bằng atlas thật.
import type Phaser from 'phaser';
import type { Direction } from '../net/contract';
import { bakedData } from './characterArt';

export const DIRECTIONS: readonly Direction[] = ['down', 'up', 'left', 'right'];

export const CHARACTER_ANIMS = {
  idle: { frames: 4, rate: 4, loop: true },
  walk: { frames: 6, rate: 10, loop: true },
  /** Ngồi ghế khi chưa câu (ART-02: sit 2). */
  sit: { frames: 2, rate: 2, loop: true },
  cast: { frames: 6, rate: 12, loop: false },
  wait: { frames: 4, rate: 3, loop: true },
  bite: { frames: 4, rate: 12, loop: true },
  reel: { frames: 6, rate: 12, loop: true },
  success: { frames: 6, rate: 8, loop: false },
  fail: { frames: 4, rate: 6, loop: false },
} as const;

export type CharacterAnim = keyof typeof CHARACTER_ANIMS;

export const ANIM_NAMES = Object.keys(CHARACTER_ANIMS) as CharacterAnim[];

export const FRAME_SIZE = 32;
const MAX_FRAMES = 6;
const SKIN_COLORS = ['#c0483c', '#4f7fc0', '#5aa35a', '#b56bc9', '#d9913b', '#3fa7a0'];

export const frameName = (anim: CharacterAnim, dir: Direction, index: number): string =>
  `${anim}_${dir}_${index}`;

export const animKey = (texture: string, anim: CharacterAnim, dir: Direction): string =>
  `${texture}:${anim}_${dir}`;

type DrawFrame = (
  ctx: CanvasRenderingContext2D,
  anim: CharacterAnim,
  dir: Direction,
  index: number,
) => void;

function createSheet(scene: Phaser.Scene, key: string, draw: DrawFrame): void {
  if (scene.textures.exists(key)) return;
  const rows = ANIM_NAMES.length * DIRECTIONS.length;
  const texture = scene.textures.createCanvas(key, MAX_FRAMES * FRAME_SIZE, rows * FRAME_SIZE);
  if (!texture) throw new Error(`Không tạo được texture ${key}`);
  const ctx = texture.getContext();
  ANIM_NAMES.forEach((anim, animIndex) => {
    DIRECTIONS.forEach((dir, dirIndex) => {
      const y = (animIndex * DIRECTIONS.length + dirIndex) * FRAME_SIZE;
      for (let i = 0; i < CHARACTER_ANIMS[anim].frames; i += 1) {
        const x = i * FRAME_SIZE;
        ctx.save();
        ctx.translate(x, y);
        draw(ctx, anim, dir, i);
        ctx.restore();
        texture.add(frameName(anim, dir, i), 0, x, y, FRAME_SIZE, FRAME_SIZE);
      }
    });
  });
  texture.refresh();
}

function colorFor(id: string): string {
  const sum = [...id].reduce((total, char) => total + char.charCodeAt(0), 0);
  return SKIN_COLORS[sum % SKIN_COLORS.length] ?? '#c0483c';
}

function bobOf(anim: CharacterAnim, index: number): number {
  if (anim === 'walk' || anim === 'reel') return index % 2;
  if (anim === 'success') return index % 3 === 1 ? -3 : 0;
  if (anim === 'fail') return Math.min(index, 2);
  return 0;
}

function drawBody(skinId: string): DrawFrame {
  const color = colorFor(skinId);
  return (ctx, anim, dir, index) => {
    const bob = bobOf(anim, index);
    const shake = anim === 'bite' ? (index % 2) * 2 - 1 : 0;
    ctx.fillStyle = '#3a2f28';
    ctx.fillRect(11 + shake, 28, 4, 4);
    ctx.fillRect(17 + shake, 28, 4, 4);
    ctx.fillStyle = color;
    ctx.fillRect(10 + shake, 16 + bob, 12, 12);
    ctx.fillStyle = '#e8d8b0';
    ctx.fillRect(11 + shake, 7 + bob, 10, 9);
    ctx.fillStyle = '#1a1a1a';
    if (dir === 'down') {
      ctx.fillRect(13 + shake, 11 + bob, 2, 2);
      ctx.fillRect(17 + shake, 11 + bob, 2, 2);
    } else if (dir === 'left') {
      ctx.fillRect(12 + shake, 11 + bob, 2, 2);
    } else if (dir === 'right') {
      ctx.fillRect(18 + shake, 11 + bob, 2, 2);
    } else {
      ctx.fillStyle = '#6b4a2b';
      ctx.fillRect(11 + shake, 7 + bob, 10, 5);
    }
  };
}

function rodAngle(anim: CharacterAnim, index: number): number {
  switch (anim) {
    case 'cast':
      return -2.2 + index * 0.35;
    case 'wait':
      return -0.8;
    case 'bite':
      return -0.5 - (index % 2) * 0.3;
    case 'reel':
      return -1.1 + (index % 3) * 0.2;
    case 'success':
      return -1.5;
    case 'fail':
      return -0.2;
    default:
      return -1.4;
  }
}

function drawRod(rodId: string): DrawFrame {
  const color = colorFor(rodId);
  return (ctx, anim, dir, index) => {
    const side = dir === 'left' ? -1 : 1;
    const startX = dir === 'left' ? 10 : 22;
    const angle = rodAngle(anim, index);
    const length = 16;
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(startX, 21);
    ctx.lineTo(startX + side * Math.cos(angle) * length, 21 + Math.sin(angle) * length);
    ctx.stroke();
  };
}

function ensureAnimations(scene: Phaser.Scene, texture: string): void {
  // Art thật ghi số frame/tốc độ riêng trong JSON; sprite vẽ tạm dùng bảng mặc định.
  const baked = bakedData(scene, texture).animations ?? {};
  for (const anim of ANIM_NAMES) {
    const { frames, rate, loop } = baked[anim] ?? CHARACTER_ANIMS[anim];
    for (const dir of DIRECTIONS) {
      const key = animKey(texture, anim, dir);
      if (scene.anims.exists(key)) continue;
      scene.anims.create({
        key,
        frameRate: rate,
        repeat: loop ? -1 : 0,
        frames: Array.from({ length: frames }, (_, i) => ({
          key: texture,
          frame: frameName(anim, dir, i),
        })),
      });
    }
  }
}

/** Texture skin có sẵn (khi ART giao) thì giữ nguyên, chưa có thì vẽ tạm. */
export function ensureSkin(scene: Phaser.Scene, skinId: string): void {
  createSheet(scene, skinId, drawBody(skinId));
  ensureAnimations(scene, skinId);
}

export function ensureRod(scene: Phaser.Scene, rodId: string): void {
  createSheet(scene, rodId, drawRod(rodId));
  ensureAnimations(scene, rodId);
}
