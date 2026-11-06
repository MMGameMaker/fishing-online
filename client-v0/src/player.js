import Phaser from 'phaser';
import {
  BOTTOMS_TINTABLE, CLOTH_COLORS, HAIR_COLORS, HAIR_TINTABLE, REEL, TOPS_TINTABLE, castPoint,
} from '../shared/config.js';
import { drawFishIcon } from './art.js';

const REMOTE_SPEED = 220;
const FONT = 'Trebuchet MS, Verdana, sans-serif';
// Where the rod/line should visually start, relative to the character's feet (this.x/this.y).
// Measured by diffing each direction's idle frame against its "swipe" (casting) frame in the
// redrawn body art to find where the arm moves to — see the hand-position note in ASSETS.md.
// Re-measure if the body art changes again.
const HAND = { down: [-9, -18], up: [8, -19], left: [2, -12], right: [-3, -12] };
const hexToInt = (hex) => parseInt(hex.slice(1), 16);
const HAIR_COLOR_INTS = HAIR_COLORS.map(hexToInt);
const CLOTH_COLOR_INTS = CLOTH_COLORS.map(hexToInt);

// The 4 character layers share one 48x55 canvas, but the redrawn art's feet don't reach the very
// bottom of it — there are 7 empty px below them (measured from public/assets/characters/
// player-spritesheet-skin-1.png; re-measure and adjust if that art changes again). Anchoring
// every layer at origin.y=1 (the canvas bottom) instead of the feet made the character hover
// above the ground. All 4 layers use the same canvas, so one shared origin keeps them aligned to
// each other while moving the "feet" reference point to where the feet actually are.
const FRAME_H = 55;
const FOOT_GAP_PX = 7;
const FOOT_ORIGIN_Y = (FRAME_H - FOOT_GAP_PX) / FRAME_H;

const smoothText = (text) => {
  text.texture.setFilter(Phaser.Textures.FilterMode.LINEAR);
  return text;
};

export class PlayerEntity {
  constructor(scene, info, isMe) {
    this.scene = scene;
    this.id = info.id;
    this.isMe = isMe;
    this.look = info.look;
    this.x = info.x;
    this.y = info.y;
    this.targetX = info.x;
    this.targetY = info.y;
    this.dir = info.dir ?? 'down';
    this.moving = false;
    this.walkTime = 0;
    this.fishPhase = info.fishing?.phase ?? null;
    this.fishPhaseAt = scene.time.now;
    this.sitting = Boolean(info.sitting != null);
    this.dancing = Boolean(info.dancing);
    this.danceTime = 0;
    this.shadow = scene.add.ellipse(this.x, this.y - 1, 24, 8, 0x000000, 0.25);
    this.container = scene.add.container(this.x, this.y);
    this.layerBody = scene.add.image(0, 0, `ref_body_${this.look.skin}`, 'player-down-0').setOrigin(0.5, FOOT_ORIGIN_Y);
    this.layerBottom = scene.add.image(0, 0, 'ref_bottoms', `player-down-0-bottom-${this.look.bottom + 1}`).setOrigin(0.5, FOOT_ORIGIN_Y);
    this.layerTop = scene.add.image(0, 0, 'ref_tops', `player-down-0-top-${this.look.top + 1}`).setOrigin(0.5, FOOT_ORIGIN_Y);
    this.layerHair = scene.add.image(0, 0, 'ref_hair', `player-down-0-hair-${this.look.hairStyle + 1}`).setOrigin(0.5, FOOT_ORIGIN_Y);
    this.container.add([this.layerBody, this.layerBottom, this.layerTop, this.layerHair]);
    this.label = smoothText(scene.add.text(this.x, this.y - 50, info.display, {
      fontFamily: FONT, fontSize: '12px', color: isMe ? '#ffe680' : '#ffffff', stroke: '#000000', strokeThickness: 3,
    }).setOrigin(0.5, 1).setResolution(2).setDepth(3000));
    this.line = scene.add.graphics().setDepth(2900);
    this.alert = smoothText(scene.add.text(0, 0, '!', {
      fontFamily: FONT, fontSize: '24px', fontStyle: 'bold', color: '#e8352e', stroke: '#ffffff', strokeThickness: 5,
    }).setOrigin(0.5, 1).setResolution(2).setDepth(3100).setVisible(false));
    this.bubble = null;
    this.bubbleTimer = null;
    this.catchObjects = [];
  }

  setLook(look) {
    this.look = look;
  }

  // What the camera should follow.
  get followTarget() {
    return this.container;
  }

  setRemoteState({ x, y, dir, moving }) {
    this.targetX = x;
    this.targetY = y;
    this.dir = dir;
    this.remoteMoving = moving;
  }

  snapTo(x, y) {
    this.x = this.targetX = x;
    this.y = this.targetY = y;
  }

  setFishing(phase, dir) {
    if (dir) this.dir = dir;
    this.fishPhase = phase;
    this.fishPhaseAt = this.scene.time.now;
  }

  setSitting(sitting) {
    this.sitting = sitting;
    if (sitting) this.dancing = false;
  }

  setDancing(dancing) {
    this.dancing = dancing;
    this.danceTime = 0;
  }

  showBubble(text) {
    this.bubble?.destroy();
    clearTimeout(this.bubbleTimer);
    this.bubble = smoothText(this.scene.add.text(this.x, this.y - 66, text, {
      fontFamily: FONT, fontSize: '12px', color: '#2b2438', backgroundColor: '#ffffff',
      padding: { x: 6, y: 3 }, wordWrap: { width: 170 }, align: 'center',
    }).setOrigin(0.5, 1).setResolution(2).setDepth(3200));
    this.bubbleTimer = setTimeout(() => {
      this.bubble?.destroy();
      this.bubble = null;
    }, 5000);
  }

  // Water bursts up, then the fish pops out above the head with a splash.
  showCatch(fish, rare) {
    const { scene, x } = this;
    const headY = this.y - 62;
    const burst = scene.add.graphics().setDepth(3300);
    const color = rare ? 0xffc93c : 0x8fe9ff;
    this.catchObjects.push(burst);
    scene.tweens.addCounter({
      from: 0,
      to: 1,
      duration: 875,
      onUpdate: (tween) => {
        const p = tween.getValue();
        burst.clear();
        burst.fillStyle(color, 0.9 - p * 0.4);
        burst.fillEllipse(x, this.y - 44 - p * 18, 10 + p * 34, 14 + p * 30);
      },
      onComplete: () => {
        burst.destroy();
        const key = `fish_${fish.id}`;
        if (!scene.textures.exists(key)) {
          scene.textures.addCanvas(key, drawFishIcon(fish.color, fish.rarity === 'junk')).setFilter(Phaser.Textures.FilterMode.NEAREST);
        }
        const icon = scene.add.image(x, headY, key).setScale(3).setDepth(3300);
        this.catchObjects.push(icon);
        for (let i = 0; i < 8; i++) {
          const drop = scene.add.rectangle(x, headY, 4, 4, color).setDepth(3290);
          const angle = (i / 8) * Math.PI * 2;
          scene.tweens.add({
            targets: drop,
            x: x + Math.cos(angle) * 38,
            y: headY + Math.sin(angle) * 30 + 12,
            alpha: 0,
            duration: 750,
            onComplete: () => drop.destroy(),
          });
        }
        scene.time.delayedCall(2200, () => icon.destroy());
      },
    });
  }

  drawFishing(time) {
    const { line, fishPhase: phase } = this;
    line.clear();
    this.alert.setVisible(phase === 'hooked');
    if (!phase) return;

    const t = time - this.fishPhaseAt;
    const [hx, hy] = HAND[this.dir];
    const handX = this.x + hx, handY = this.y + hy;
    const target = castPoint(this.x, this.y, this.dir);
    const toward = Math.atan2(target.y - handY, target.x - handX);
    let swing = -0.5;
    let reach = 1;
    if (phase === 'cast') {
      swing = t < 500 ? -2.3 * (t / 500) : Math.min(-0.5, -2.3 + ((t - 500) / 200) * 1.8);
      reach = Phaser.Math.Clamp((t - 600) / 1000, 0, 1);
    }
    if (phase === 'hooked') swing = -0.35 + Math.sin(time / 40) * 0.1;
    if (phase === 'reel') swing = -0.75 + Math.sin(time / 90) * 0.12;

    const tipX = handX + Math.cos(toward + swing) * 28;
    const tipY = handY + Math.sin(toward + swing) * 28;
    line.lineStyle(3, 0x7a4a26, 1).lineBetween(handX, handY, tipX, tipY);

    let bobX = target.x, bobY = target.y;
    if (phase === 'bob') bobY += Math.sin(time / 260) * 1.5;
    if (phase === 'hooked') { bobX += Math.sin(time / 30) * 2; bobY += 3 + Math.sin(time / 45) * 3; }
    if (phase === 'reel') { bobX += Math.sin(time / 70) * 5; bobY += Math.cos(time / 90) * 3; }
    const lineX = tipX + (bobX - tipX) * reach;
    const lineY = tipY + (bobY - tipY) * reach - Math.sin(reach * Math.PI) * 34;
    const sag = phase === 'bob' ? 10 : 2;
    new Phaser.Curves.QuadraticBezier(
      new Phaser.Math.Vector2(tipX, tipY),
      new Phaser.Math.Vector2((tipX + lineX) / 2, (tipY + lineY) / 2 + sag),
      new Phaser.Math.Vector2(lineX, lineY),
    ).draw(line.lineStyle(1, 0xffffff, 0.9), 14);

    if (reach < 1) return;
    if (phase === 'cast' && t < 1950) {
      line.lineStyle(2, 0xffffff, 1 - (t - 1600) / 350).strokeCircle(bobX, bobY, (t - 1600) / 18);
    }
    if (phase === 'hooked' || phase === 'reel') {
      const ring = 8 + ((time / 12) % 14);
      line.lineStyle(2, 0xffffff, 0.8).strokeEllipse(bobX, bobY + 2, ring * 2, ring);
    }
    if (phase === 'reel') return;
    line.fillStyle(0xffffff).fillRect(bobX - 3, bobY - 4, 6, 4);
    line.fillStyle(0xe74c3c).fillRect(bobX - 3, bobY, 6, 4);

    if (phase === 'hooked') {
      const left = Math.max(0, 1 - t / REEL.hookedMs);
      this.alert.setPosition(handX + (this.dir === 'left' ? -22 : 22), handY - 8);
      line.fillStyle(0xffffff).fillRect(this.alert.x - 16, this.alert.y + 3, 32, 6);
      line.fillStyle(0xe74c3c).fillRect(this.alert.x - 15, this.alert.y + 4, 30 * left, 4);
    }
  }

  update(time, delta) {
    if (!this.isMe) {
      const dx = this.targetX - this.x, dy = this.targetY - this.y;
      const dist = Math.hypot(dx, dy);
      const step = (REMOTE_SPEED * delta) / 1000;
      if (dist <= step) {
        this.x = this.targetX;
        this.y = this.targetY;
      } else {
        this.x += (dx / dist) * step;
        this.y += (dy / dist) * step;
      }
      this.moving = dist > 1 || Boolean(this.remoteMoving);
    }
    this.walkTime = this.moving ? this.walkTime + delta : 0;
    if (this.dancing && !this.moving && !this.fishPhase) this.danceTime += delta;
    this.updateRealFrames(time);
    this.shadow.setPosition(this.x, this.y - 1).setDepth(this.y - 1);
    this.label.setPosition(this.x, this.y - 50);
    this.bubble?.setPosition(this.x, this.y - 66);
    this.drawFishing(time);
  }

  // Picks real frame names across the 4 layered sprites. See ASSETS.md section 1 for the naming
  // convention (there is no "swipe" pose for hair, so it falls back to the matching walk/idle
  // frame).
  updateRealFrames(time) {
    const dir = this.dir;
    const walkN = Math.floor(this.walkTime / 130) % 4;
    let pose = 'walk', n = this.moving ? walkN : 0;
    if (this.sitting) pose = 'sit';
    else if (this.fishPhase) { pose = 'swipe'; n = Math.floor(time / 150) % 4; }
    else if (this.dancing) n = Math.floor(this.danceTime / 160) % 4;
    const bodyFrame = pose === 'sit' ? `player-sit-${dir}-0` : pose === 'swipe' ? `player-swipe-${dir}-${n}` : `player-${dir}-${n}`;
    const hairPoseFrame = pose === 'sit' ? `player-sit-${dir}-0` : `player-${dir}-${pose === 'swipe' ? 0 : n}`;
    this.layerBody.setTexture(`ref_body_${this.look.skin}`, bodyFrame);
    this.layerTop.setFrame(`${bodyFrame}-top-${this.look.top + 1}`);
    this.layerBottom.setFrame(`${bodyFrame}-bottom-${this.look.bottom + 1}`);
    this.layerHair.setFrame(`${hairPoseFrame}-hair-${this.look.hairStyle + 1}`);
    // Only tint the styles that are actually flat/near-grayscale art (see HAIR_TINTABLE etc. in
    // shared/config.js) — tinting an already-colored style would just muddy it.
    if (HAIR_TINTABLE[this.look.hairStyle]) this.layerHair.setTint(HAIR_COLOR_INTS[this.look.hairColor]);
    else this.layerHair.clearTint();
    if (TOPS_TINTABLE[this.look.top]) this.layerTop.setTint(CLOTH_COLOR_INTS[this.look.topColor]);
    else this.layerTop.clearTint();
    if (BOTTOMS_TINTABLE[this.look.bottom]) this.layerBottom.setTint(CLOTH_COLOR_INTS[this.look.bottomColor]);
    else this.layerBottom.clearTint();
    const bounce = this.dancing && !this.moving && !this.fishPhase ? Math.abs(Math.sin(this.danceTime / 160)) * 4 : 0;
    this.container.setPosition(this.x, this.y - bounce).setDepth(this.y);
  }

  destroy() {
    clearTimeout(this.bubbleTimer);
    for (const obj of [this.shadow, this.container, this.label, this.line, this.alert, this.bubble, ...this.catchObjects]) obj?.destroy();
  }
}
