// Minigame REEL: con trỏ cá chạy qua lại trên thanh nước, bấm REEL khi con trỏ nằm trong vùng xanh.
// Đủ FISHING.hitsNeeded lần là thắng. Bấm trượt MỘT lần là thua ngay. Hết giờ cũng thua.
// Dùng sprite sheet fishing-interface (bảng nền, bong bóng, vùng xanh, con trỏ, bộ đếm, nút REEL, thanh giờ).

import Phaser from 'phaser';
import { FISHING } from '../GameConfig';
import { Sheets, Sheet } from '../core/Sheets';
import { FrameAnim } from '../core/Kit';

export type ReelResult = 'win' | 'miss' | 'timeout';

// Toạ độ trong frame fishing-interface-base (302x289, gốc trên trái, y hướng xuống).
const BASE_W = 302, BASE_H = 289;
const BAR = { x: 12, y: 48, w: 278, h: 43 };
const COUNTER = { x: 11, y: 118 };
const BUTTON = { x: 130, y: 118, w: 161, h: 58 };
const TIMER = { x: 18, y: 261, w: 265, h: 9 };
const P = 'fishing-interface-';
const CONFETTI_COLORS = [0xff5252, 0xffc400, 0x40c4ff, 0x7c4dff, 0x00e676, 0xff80ab];

interface Confetto { g: Phaser.GameObjects.Rectangle; vx: number; vy: number; vr: number; }

export class FishingMinigame {
    readonly root: Phaser.GameObjects.Container;
    active = false;

    private sheet: Sheet;
    private blocker: Phaser.GameObjects.Zone;
    private panel: Phaser.GameObjects.Container;
    private bubbles: Phaser.GameObjects.Image;
    private zone: Phaser.GameObjects.Image;
    private cursor: Phaser.GameObjects.Image;
    private cursorAnim: FrameAnim;
    private counter: Phaser.GameObjects.Image;
    private button: Phaser.GameObjects.Image;
    private timer: Phaser.GameObjects.Image;
    private confettiRoot: Phaser.GameObjects.Container;
    private confetti: Confetto[] = [];

    private hits = 0;
    private timeLeft = 0;
    private cursorX = 0;      // 0..1 dọc thanh
    private cursorDir = 1;
    private zoneX = 0;        // mép trái vùng xanh, toạ độ pixel trong thanh
    private zoneW = 0;
    private finishing = 0;    // > 0: đang đếm ngược để đóng bảng
    private result: ReelResult | null = null;
    private hover = false;
    private pressed = false;
    private bubbleT = 0;
    private scheduleZoneMove = 0;
    private onDone: ((r: ReelResult) => void) | null = null;

    constructor(private scene: Phaser.Scene, depth: number) {
        this.sheet = Sheets.get('fishing-interface');
        const key = this.sheet.key;
        this.root = scene.add.container(0, 0).setDepth(depth);
        // Lớp chặn toàn màn hình: nuốt mọi lần chạm ngoài bảng để không ai đi lung tung khi đang thu dây.
        this.blocker = scene.add.zone(0, 0, 10, 10).setOrigin(0, 0).setInteractive();
        this.root.add(this.blocker);

        this.panel = scene.add.container(0, 0);
        this.root.add(this.panel);
        this.panel.add(scene.add.image(0, 0, key, P + 'base'));
        this.bubbles = this.place(P + 'bubbles-0', BAR.x, BAR.y);
        this.zone = this.place(zoneFrame(), BAR.x, BAR.y - 1);
        this.counter = this.place(P + 'reel-counter-0', COUNTER.x, COUNTER.y);
        this.button = this.place(P + 'reel-button', BUTTON.x, BUTTON.y);
        this.timer = this.place(P + 'timer-green', TIMER.x, TIMER.y);
        // Con trỏ: frame 35x97, tâm dọc trùng tâm thanh nước.
        this.cursor = scene.add.image(0, 0, key, P + 'slider-tick-0');
        this.panel.add(this.cursor);
        this.cursorAnim = new FrameAnim(this.cursor);

        const b = this.button.setInteractive({ useHandCursor: true });
        b.on('pointerover', () => { this.hover = true; this.refreshButton(); });
        b.on('pointerout', () => { this.hover = false; this.pressed = false; this.refreshButton(); });
        b.on('pointerdown', () => { this.pressed = true; this.refreshButton(); });
        b.on('pointerup', () => {
            const was = this.pressed;
            this.pressed = false; this.refreshButton();
            if (was) this.reel();
        });

        this.confettiRoot = scene.add.container(0, 0);
        this.root.add(this.confettiRoot);
        this.root.setVisible(false);
    }

    open(onDone: (r: ReelResult) => void): void {
        this.onDone = onDone;
        this.hits = 0;
        this.timeLeft = FISHING.reelTime;
        this.cursorX = 0;
        this.cursorDir = 1;
        this.finishing = 0;
        this.result = null;
        this.pressed = false;
        this.scheduleZoneMove = 0;
        this.clearConfetti();
        this.zone.setFrame(zoneFrame());
        this.zoneW = this.sheet.has(zoneFrame()) ? this.sheet.size(zoneFrame()).w : 66;
        this.moveZone();
        this.counter.setFrame(P + 'reel-counter-0');
        this.cursorAnim.playing = false;
        this.cursor.setFrame(P + 'slider-tick-0');
        this.refreshButton();
        this.layout();
        this.root.setVisible(true);
        this.active = true;
        this.update(0);
    }

    /** Bấm REEL (nút, hoặc phím Space / F / Enter). */
    reel(): void {
        if (!this.active || this.finishing > 0) return;
        const px = BAR.x + this.cursorX * BAR.w;
        const inZone = px >= this.zoneX && px <= this.zoneX + this.zoneW;
        if (inZone) {
            this.hits++;
            this.counter.setFrame(P + 'reel-counter-' + Math.min(3, this.hits));
            this.cursorAnim.play(this.sheet.key, this.sheet.sequence(P + 'slider-tick-'), 24, false);
            if (this.hits >= FISHING.hitsNeeded) {
                this.finish('win', FISHING.winDelay);
                this.spawnConfetti();
            } else {
                // Vùng xanh nhảy chỗ khác sau khi trúng.
                this.scheduleZoneMove = FISHING.zoneMoveDelay;
            }
        } else {
            // Trượt một lần là thua ngay.
            this.cursorAnim.play(this.sheet.key, this.sheet.sequence(P + 'slider-cross-'), 24, false);
            this.finish('miss', FISHING.failDelay);
        }
    }

    update(dt: number): void {
        if (!this.active) return;
        this.updateConfetti(dt);

        this.bubbleT += dt;
        const bf = P + 'bubbles-' + (Math.floor(this.bubbleT * 8) % 10);
        if (this.bubbles.frame.name !== bf && this.sheet.has(bf)) this.bubbles.setFrame(bf);

        if (this.finishing > 0) {
            this.finishing -= dt;
            if (this.finishing <= 0) this.close();
            return;
        }

        if (this.scheduleZoneMove > 0) {
            this.scheduleZoneMove -= dt;
            if (this.scheduleZoneMove <= 0) {
                this.moveZone();
                this.cursorAnim.playing = false;
                this.cursor.setFrame(P + 'slider-tick-0');
            }
        }

        // Con trỏ chạy qua lại (ping-pong), FISHING.cursorSweep giây cho một lượt.
        this.cursorX += this.cursorDir * dt / FISHING.cursorSweep;
        if (this.cursorX >= 1) { this.cursorX = 2 - this.cursorX; this.cursorDir = -1; }
        if (this.cursorX <= 0) { this.cursorX = -this.cursorX; this.cursorDir = 1; }
        this.cursor.setPosition(BAR.x + this.cursorX * BAR.w - BASE_W / 2, BAR.y + BAR.h / 2 - BASE_H / 2);

        this.timeLeft -= dt;
        const k = Math.max(0, this.timeLeft / FISHING.reelTime);
        const tf = P + (k > 0.5 ? 'timer-green' : k > 0.2 ? 'timer-orange' : 'timer-red');
        if (this.timer.frame.name !== tf) this.timer.setFrame(tf);
        // Thanh giờ ngắn dần từ phải sang trái (FILLED HORIZONTAL bên Cocos).
        this.timer.setCrop(0, 0, Math.round(TIMER.w * k), TIMER.h);
        if (this.timeLeft <= 0) this.finish('timeout', FISHING.failDelay);
    }

    /** Gọi khi đổi kích thước màn hình. */
    layout(): void {
        const w = this.scene.scale.width, h = this.scene.scale.height;
        this.blocker.setSize(w, h);
        if (this.blocker.input) (this.blocker.input.hitArea as Phaser.Geom.Rectangle).setSize(w, h);
        const s = Math.max(1, Math.min(2, (h - 40) / BASE_H, (w - 40) / BASE_W));
        this.panel.setScale(s);
        this.panel.setPosition(Math.round(w / 2), Math.round(h / 2));
    }

    // -----------------------------------------------------------------------

    private place(frame: string, x: number, y: number): Phaser.GameObjects.Image {
        const img = this.scene.add.image(x - BASE_W / 2, y - BASE_H / 2, this.sheet.key, frame).setOrigin(0, 0);
        this.panel.add(img);
        return img;
    }

    private moveZone(): void {
        const prev = this.zoneX;
        const maxX = BAR.x + BAR.w - this.zoneW;
        let x = BAR.x;
        // Chọn chỗ mới cách chỗ cũ ít nhất một bề rộng vùng để người chơi phải canh lại.
        for (let i = 0; i < 8; i++) {
            x = BAR.x + Math.random() * (maxX - BAR.x);
            if (Math.abs(x - prev) > this.zoneW) break;
        }
        this.zoneX = Math.round(x);
        this.zone.setPosition(this.zoneX - BASE_W / 2, BAR.y - 1 - BASE_H / 2);
    }

    private refreshButton(): void {
        const suffix = this.pressed ? '-pressed' : this.hover ? '-hover' : '';
        const f = P + 'reel-button' + suffix;
        if (this.sheet.has(f)) this.button.setFrame(f);
    }

    private finish(r: ReelResult, delay: number): void {
        this.result = r;
        this.finishing = Math.max(0.01, delay);
    }

    private close(): void {
        this.active = false;
        this.root.setVisible(false);
        this.clearConfetti();
        const cb = this.onDone;
        this.onDone = null;
        if (cb && this.result) cb(this.result);
    }

    // Pháo giấy khi thắng -------------------------------------------------

    private spawnConfetti(): void {
        const s = this.panel.scaleX;
        const cx = this.panel.x, cy = this.panel.y + (BAR.y - BASE_H / 2) * s;
        for (let i = 0; i < 70; i++) {
            const w = 4 + Math.random() * 5, h = 8 + Math.random() * 8;
            const g = this.scene.add.rectangle(cx + (Math.random() - 0.5) * BASE_W * s * 0.6, cy, w, h, CONFETTI_COLORS[i % CONFETTI_COLORS.length]);
            this.confettiRoot.add(g);
            const a = Math.random() * Math.PI * 2, sp = 250 + Math.random() * 450;
            this.confetti.push({ g, vx: Math.cos(a) * sp, vy: -(Math.abs(Math.sin(a)) * sp + 150), vr: (Math.random() - 0.5) * 900 });
        }
    }

    private updateConfetti(dt: number): void {
        for (const c of this.confetti) {
            c.vy += 900 * dt;
            c.g.setPosition(c.g.x + c.vx * dt, c.g.y + c.vy * dt);
            c.g.angle += c.vr * dt;
        }
    }

    private clearConfetti(): void {
        for (const c of this.confetti) c.g.destroy();
        this.confetti = [];
    }
}

function zoneFrame(): string {
    const lvl = Math.min(5, Math.max(1, Math.round(FISHING.zoneLevel)));
    return P + 'zone-' + lvl;
}
