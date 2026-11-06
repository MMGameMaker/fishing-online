import Phaser from 'phaser';
import { REEL } from '../shared/config.js';

const FONT = 'Trebuchet MS, Verdana, sans-serif';
const BAR_LEFT = -143; // container x of bar position 0
const TIMER_WIDTH = 265;
const ORANGE_AT = 90 / 132.5;
const RED_AT = 30 / 132.5;
const BADGE_MS = 400;

// The centered reel panel: the dimmed screen flashes three times, then the panel opens.
export class ReelInterface {
  constructor(scene, onReel) {
    this.scene = scene;
    this.onReel = onReel;
    this.moving = false;
    this.position = REEL.markerMin;
    this.direction = 1;
    this.timerRunning = false;
    this.bubbles = Array.from({ length: 14 }, () => ({ x: Math.random() * 276, y: Math.random() * 42, r: 1 + Math.random() * 2 }));
    this.closed = false;
  }

  open({ zone, zoneTimeMs }, onOpen) {
    const { scene } = this;
    const { width, height } = scene.scale;
    this.zone = zone;
    this.zoneTimeMs = zoneTimeMs;
    this.overlay = scene.add.rectangle(0, 0, width, height, 0x000000, 1).setOrigin(0, 0).setScrollFactor(0).setDepth(4000).setAlpha(0.65);
    scene.tweens.add({
      targets: this.overlay,
      alpha: { from: 0.65, to: 1 },
      duration: 200,
      yoyo: true,
      repeat: 2,
      onComplete: () => {
        if (this.closed) return;
        onOpen();
        scene.time.delayedCall(250, () => { if (!this.closed) this.build(); });
      },
    });
  }

  text(x, y, value, style) {
    const node = this.scene.add.text(x, y, value, { fontFamily: FONT, ...style }).setResolution(2);
    node.texture.setFilter(Phaser.Textures.FilterMode.LINEAR);
    this.panel.add(node);
    return node;
  }

  build() {
    const { scene, zone } = this;
    const { width, height } = scene.scale;
    this.panel = scene.add.container(width / 2, height / 2).setScrollFactor(0).setDepth(7000);

    const base = scene.add.graphics();
    base.fillStyle(0xfafafa).fillRoundedRect(-151, -144.5, 302, 289, 16);
    base.lineStyle(2, 0x2b2438).strokeRoundedRect(-151, -144.5, 302, 289, 16);
    base.fillStyle(0x25d6f2).fillRoundedRect(-140, -97.5, 280, 45, 6);
    base.fillStyle(0x5e5e5e).fillRoundedRect(-140, -27, 113, 58, 6);
    base.fillStyle(0xe6e6e6).fillRoundedRect(-140, 41, 280, 43, 6);
    base.fillStyle(0x5e5e5e).fillRoundedRect(-140, 94, 280, 40, 6);
    base.fillStyle(0xe8e8e8).fillRect(-133, 121, TIMER_WIDTH, 9);
    this.panel.add(base);

    this.bubbleGfx = scene.add.graphics();
    this.panel.add(this.bubbleGfx);

    this.zoneRect = scene.add.rectangle(BAR_LEFT + zone.startPosition, -97.5, zone.zoneWidth, 45, 0x45e5a0).setOrigin(0, 0);
    this.zoneRect.setStrokeStyle(2, 0x1b7a52);
    this.panel.add(this.zoneRect);

    this.marker = scene.add.graphics();
    this.marker.fillStyle(0xf7c531).fillRect(-3, -136, 6, 97);
    this.marker.fillStyle(0xf7a52b).fillTriangle(-11, -136, 11, -136, 0, -120);
    this.marker.fillStyle(0xf7a52b).fillTriangle(-11, -39, 11, -39, 0, -55);
    this.marker.x = BAR_LEFT + this.position;
    this.panel.add(this.marker);

    this.badge = this.text(0, -118, '', { fontSize: '26px', fontStyle: 'bold', stroke: '#ffffff', strokeThickness: 4 }).setOrigin(0.5, 0.5).setVisible(false);
    this.counter = this.text(-83.5, 2, `0/${REEL.hitsNeeded}`, { fontSize: '26px', fontStyle: 'bold', color: '#ffffff' }).setOrigin(0.5, 0.5);

    // The panel is fixed to the camera (setScrollFactor(0)), but an interactive child does not
    // inherit that for hit-testing — without this, pointer input is checked against the child's
    // world position (undoing camera scroll) while it renders at a fixed screen position, so
    // clicks land anywhere except the visible button once the camera has scrolled away from (0,0).
    this.button = scene.add.rectangle(59.5, 2, 161, 58, 0x1b7a52).setScrollFactor(0).setInteractive({ useHandCursor: true });
    this.button.on('pointerover', () => this.button.setFillStyle(0x229a68));
    this.button.on('pointerout', () => this.button.setFillStyle(0x1b7a52));
    this.button.on('pointerdown', (_pointer, _x, _y, event) => {
      event.stopPropagation();
      this.button.setFillStyle(0x145c3e);
      this.press();
    });
    this.panel.add(this.button);
    this.text(59.5, 2, 'REEL', { fontSize: '26px', fontStyle: 'bold italic', color: '#ffffff' }).setOrigin(0.5, 0.5);

    this.text(0, 62.5, `Press REEL when the marker is on the\ngreen zone, ${REEL.hitsNeeded} times. Watch the clock!`, {
      fontSize: '13px', fontStyle: 'bold italic', color: '#4a4a4a', align: 'center',
    }).setOrigin(0.5, 0.5);
    this.text(0, 107, 'Time left:', { fontSize: '13px', fontStyle: 'bold italic', color: '#ffffff' }).setOrigin(0.5, 0.5);

    this.timerGfx = scene.add.graphics();
    this.panel.add(this.timerGfx);

    this.openedAt = scene.time.now;
    this.timerRunning = true;
    this.moving = true;
    scene.events.on('update', this.step, this);
  }

  step(time, delta) {
    this.bubbleGfx.clear().fillStyle(0xffffff, 0.75);
    for (const b of this.bubbles) {
      b.y = (b.y + 42 - delta * 0.02) % 42;
      this.bubbleGfx.fillCircle(-139 + b.x, -96 + b.y, b.r);
    }

    if (this.moving) {
      this.position += this.direction * this.zone.zoneSpeed * delta;
      if (this.position >= REEL.markerMax) { this.position = REEL.markerMax; this.direction = -1; }
      if (this.position <= REEL.markerMin) { this.position = REEL.markerMin; this.direction = 1; }
      this.marker.x = BAR_LEFT + this.position;
    }

    if (this.timerRunning) this.timeLeft = Math.max(0, 1 - (time - this.openedAt) / this.zoneTimeMs);
    const left = this.timeLeft;
    const color = left <= RED_AT ? 0xe74c3c : left <= ORANGE_AT ? 0xf39c12 : 0x2ecc71;
    this.timerGfx.clear().fillStyle(color).fillRect(-133, 121, TIMER_WIDTH * left, 9);
  }

  press() {
    if (!this.moving) return;
    this.moving = false;
    this.onReel(this.position);
  }

  flashBadge(text, color) {
    this.badge.setText(text).setColor(color).setPosition(this.marker.x, -118).setVisible(true);
    this.scene.time.delayedCall(BADGE_MS, () => { if (!this.closed) this.badge.setVisible(false); });
  }

  success(hits, nextZone) {
    this.counter.setText(`${hits}/${REEL.hitsNeeded}`);
    this.flashBadge('✔', '#1b9a5e');
    if (!nextZone) {
      this.timerRunning = false;
      return;
    }
    const { scene } = this;
    scene.time.delayedCall(600, () => {
      if (this.closed) return;
      this.zoneRect.setSize(nextZone.zoneWidth, 45);
      scene.tweens.add({ targets: this.zoneRect, x: BAR_LEFT + nextZone.startPosition, ease: 'Cubic.easeOut', duration: 300 });
    });
    scene.time.delayedCall(BADGE_MS + 500, () => {
      if (this.closed) return;
      this.zone = nextZone;
      this.moving = true;
    });
  }

  miss(onDone) {
    this.timerRunning = false;
    this.flashBadge('✖', '#e8352e');
    this.scene.time.delayedCall(BADGE_MS + 500, onDone);
  }

  close() {
    if (this.closed) return;
    this.closed = true;
    this.scene.events.off('update', this.step, this);
    this.overlay.destroy();
    this.panel?.destroy();
  }
}
