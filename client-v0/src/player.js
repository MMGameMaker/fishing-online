import Phaser from 'phaser';
import {
  BOTTOMS_TINTABLE, CLOTH_COLORS, HAIR_COLORS, HAIR_TINTABLE, REEL, ROD_PRICES, TOPS_TINTABLE,
} from '../shared/config.js';
import { drawFishIcon } from './art.js';
import { hairTextureKey } from './referenceArt.js';

const REMOTE_SPEED = 220;
const FONT = 'Trebuchet MS, Verdana, sans-serif';
// Fishing pose (sheets in public/assets/characters/fishing/): while fishing, the body, top and
// bottom switch to the fishing sheets and one more layer shows the rod. Each rod frame already
// has its line, float, splash and ripples drawn in, so nothing is drawn by code any more.
// FISH_HAND: where the hands hold the rod, in pixels of the 48x55 body frame.
// ROD_GRIP: where the rod is held inside each rod frame (from the handle pixels of the rod sheet;
// the same for every rod level). The rod frame is placed so ROD_GRIP lands on FISH_HAND.
const FISH_HAND = { down: [24, 34], left: [16, 34], right: [31, 34], up: [24, 18] };
// Fishing from a stool (the only way to fish now): the body stays in the sit pose and the rod is
// held at the lap. Facing up, the rod pokes out above the head.
const SIT_HAND = { down: [24, 37], left: [16, 37], right: [31, 37], up: [24, 14] };
const ROD_GRIP = {
  cast: { down: [17, 40], left: [49, 37], right: [41, 37], up: [22, 51] },
  bob: { down: [7, 0], left: [31, 3], right: [0, 3], up: [7, 15] },
  reel: { down: [12, 0], left: [34, 2], right: [1, 2], up: [9, 13] },
};
const ROD_CAST_FRAMES = 16; // spread over REEL.castMs
const FRAME_W = 48;
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
    this.rodLevel = info.fishing?.rodLevel ?? 1;
    this.fishPhaseAt = scene.time.now;
    this.sitting = Boolean(info.sitting != null);
    this.dancing = Boolean(info.dancing);
    this.danceTime = 0;
    this.shadow = scene.add.ellipse(this.x, this.y - 1, 24, 8, 0x000000, 0.25);
    this.container = scene.add.container(this.x, this.y);
    this.layerBody = scene.add.image(0, 0, `ref_body_${this.look.skin}`, 'player-down-0').setOrigin(0.5, FOOT_ORIGIN_Y);
    this.layerBottom = scene.add.image(0, 0, 'ref_bottoms', `player-down-0-bottom-${this.look.bottom + 1}`).setOrigin(0.5, FOOT_ORIGIN_Y);
    this.layerTop = scene.add.image(0, 0, 'ref_tops', `player-down-0-top-${this.look.top + 1}`).setOrigin(0.5, FOOT_ORIGIN_Y);
    this.layerHair = scene.add.image(0, 0, hairTextureKey(this.look.hairStyle), `player-down-0-hair-${this.look.hairStyle + 1}`).setOrigin(0.5, FOOT_ORIGIN_Y);
    this.layerRod = scene.add.image(0, 0, 'ref_rods', 'fishing-rod-level-1-bob-down-0').setOrigin(0, 0).setVisible(false);
    this.container.add([this.layerBody, this.layerBottom, this.layerTop, this.layerHair, this.layerRod]);
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

  setFishing(phase, dir, rodLevel) {
    if (dir) this.dir = dir;
    if (rodLevel) this.rodLevel = rodLevel;
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

  // The rod, line and float are sprite frames (see updateRealFrames); only the "!" and the
  // shrinking hook timer above the hands are drawn here.
  drawFishing(time) {
    const { line, fishPhase: phase } = this;
    line.clear();
    this.alert.setVisible(phase === 'hooked');
    if (phase !== 'hooked') return;
    const [hx, hy] = (this.sitting ? SIT_HAND : FISH_HAND)[this.dir];
    const handX = this.x + hx - FRAME_W / 2, handY = this.y + hy - FRAME_H * FOOT_ORIGIN_Y;
    const left = Math.max(0, 1 - (time - this.fishPhaseAt) / REEL.hookedMs);
    this.alert.setPosition(handX + (this.dir === 'left' ? -22 : 22), handY - 8);
    line.fillStyle(0xffffff).fillRect(this.alert.x - 16, this.alert.y + 3, 32, 6);
    line.fillStyle(0xe74c3c).fillRect(this.alert.x - 15, this.alert.y + 4, 30 * left, 4);
  }

  // Frame names for the fishing pose. Cast plays the throw once (body 3 frames, rod 16 frames over
  // REEL.castMs); while waiting the float bobs; once a fish bites (hooked) and while reeling, body,
  // clothes and rod play the 12-frame reel loop together. The clothes sheets have no separate
  // "hooked" pose, so hooked uses the reel pose too.
  fishingFrames(time) {
    const dir = this.dir;
    const t = time - this.fishPhaseAt;
    const level = Phaser.Math.Clamp(this.rodLevel ?? 1, 1, ROD_PRICES.length);
    let body, clothes, rod, rodN;
    if (this.fishPhase === 'cast' || this.fishPhase === 'bob') {
      const k = this.fishPhase === 'cast' ? Math.min(2, Math.floor(t / 150)) : 2;
      body = `player-fishing-cast-${dir}-${k}`;
      clothes = `cast-${dir}-${k}`;
      rod = this.fishPhase;
      rodN = this.fishPhase === 'cast'
        ? Math.min(ROD_CAST_FRAMES - 1, Math.floor((t / REEL.castMs) * ROD_CAST_FRAMES))
        : Math.floor(time / 160) % 6;
    } else {
      const k = Math.floor(time / 90) % 12;
      body = `player-fishing-reeling-${dir}-${k}`;
      clothes = `reel-${dir}-${k}`;
      rod = 'reel';
      rodN = k;
    }
    return { body, clothes, rod: `fishing-rod-level-${level}-${rod}-${dir}-${rodN}`, grip: ROD_GRIP[rod][dir] };
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
  // convention. While fishing, fishingFrames() picks the fishing-sheet frames instead (there is
  // no fishing pose for hair, so it uses the idle frame).
  updateRealFrames(time) {
    const dir = this.dir;
    const walkN = Math.floor(this.walkTime / 130) % 4;
    let pose = 'walk', n = this.moving ? walkN : 0;
    if (this.sitting) pose = 'sit';
    else if (this.dancing && !this.fishPhase) n = Math.floor(this.danceTime / 160) % 4;
    const fishing = this.fishPhase ? this.fishingFrames(time) : null;
    if (fishing && !this.sitting) {
      // The fishing sheets keep the head where the idle frame has it, so the idle hair fits.
      this.layerBody.setTexture(`ref_fishbody_${this.look.skin}`, fishing.body);
      this.layerTop.setTexture('ref_fishtops', `fishing-top-${this.look.top + 1}-${fishing.clothes}`);
      this.layerBottom.setTexture('ref_fishbottoms', `fishing-bottom-${this.look.bottom + 1}-${fishing.clothes}`);
      this.layerHair.setTexture(hairTextureKey(this.look.hairStyle), `player-${dir}-0-hair-${this.look.hairStyle + 1}`);
    } else {
      const bodyFrame = pose === 'sit' ? `player-sit-${dir}-0` : `player-${dir}-${n}`;
      this.layerBody.setTexture(`ref_body_${this.look.skin}`, bodyFrame);
      this.layerTop.setTexture('ref_tops', `${bodyFrame}-top-${this.look.top + 1}`);
      this.layerBottom.setTexture('ref_bottoms', `${bodyFrame}-bottom-${this.look.bottom + 1}`);
      this.layerHair.setTexture(hairTextureKey(this.look.hairStyle), `${bodyFrame}-hair-${this.look.hairStyle + 1}`);
    }
    if (fishing) {
      const [hx, hy] = (this.sitting ? SIT_HAND : FISH_HAND)[dir];
      const [gx, gy] = fishing.grip;
      this.layerRod.setFrame(fishing.rod).setPosition(hx - gx - FRAME_W / 2, hy - gy - FRAME_H * FOOT_ORIGIN_Y).setVisible(true);
      // Facing away, the hands (and the rod's handle) are hidden behind the body.
      if (dir === 'up') this.container.sendToBack(this.layerRod);
      else this.container.bringToTop(this.layerRod);
    } else {
      this.layerRod.setVisible(false);
    }
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
