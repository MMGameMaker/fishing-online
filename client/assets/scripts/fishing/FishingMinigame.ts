// Minigame REEL: con trỏ cá chạy qua lại trên thanh nước, bấm REEL khi con trỏ nằm trong vùng xanh.
// Đủ FISHING.hitsNeeded lần là thắng. Bấm trượt MỘT lần là thua ngay. Hết giờ cũng thua.
// Dùng sprite sheet fishing-interface (bảng nền, bong bóng, vùng xanh, con trỏ, bộ đếm, nút REEL, thanh giờ).

import { Node, Sprite, Graphics, Color, EventTouch, UITransform, view } from 'cc';
import { FISHING } from '../GameConfig';
import { Sheets, Sheet } from '../core/Sheets';
import { makeNode, makeSprite, FrameAnim } from '../core/NodeKit';

export type ReelResult = 'win' | 'miss' | 'timeout';

// Toạ độ trong frame fishing-interface-base (302x289, gốc trên trái, y hướng xuống).
const BASE_W = 302, BASE_H = 289;
const BAR = { x: 12, y: 48, w: 278, h: 43 };
const COUNTER = { x: 11, y: 118 };
const BUTTON = { x: 130, y: 118, w: 161, h: 58 };
const TIMER = { x: 18, y: 261, w: 265, h: 9 };
const P = 'fishing-interface-';

interface Confetto { g: Node; vx: number; vy: number; vr: number; }

export class FishingMinigame {
    readonly node: Node;
    active = false;

    private sheet: Sheet;
    private panel: Node;
    private bubbles: Sprite;
    private zone: Sprite;
    private cursor: Sprite;
    private counter: Sprite;
    private button: Sprite;
    private timer: Sprite;
    private confettiRoot: Node;
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
    private onDone: ((r: ReelResult) => void) | null = null;
    /** Gọi mỗi khi có thao tác trên bảng (để RoomScene bỏ qua lần chạm toàn cục). */
    onUiTouch: (() => void) | null = null;

    constructor(parent: Node) {
        this.sheet = Sheets.get('fishing-interface');
        this.node = makeNode('ReelMinigame', parent);
        // Lớp chặn toàn màn hình: nuốt mọi lần chạm ngoài bảng để không ai đi lung tung khi đang thu dây.
        const blocker = this.node.getComponent(UITransform)!;
        blocker.setContentSize(4000, 4000);
        this.node.on(Node.EventType.TOUCH_START, (e: EventTouch) => { this.touched(); e.propagationStopped = true; });
        this.node.on(Node.EventType.TOUCH_END, (e: EventTouch) => { this.touched(); e.propagationStopped = true; });

        this.panel = makeNode('Panel', this.node);
        const base = makeSprite('Base', this.panel, this.sheet.frame(P + 'base'), 0.5, 0.5);
        base.node.name = 'Base';
        this.bubbles = this.place('Bubbles', P + 'bubbles-0', BAR.x, BAR.y);
        this.zone = this.place('Zone', zoneFrame(), BAR.x, BAR.y - 1);
        this.counter = this.place('Counter', P + 'reel-counter-0', COUNTER.x, COUNTER.y);
        this.button = this.place('ReelButton', P + 'reel-button', BUTTON.x, BUTTON.y);
        this.timer = this.place('Timer', P + 'timer-green', TIMER.x, TIMER.y);
        this.timer.type = Sprite.Type.FILLED;
        this.timer.fillType = Sprite.FillType.HORIZONTAL;
        this.timer.fillStart = 0;
        this.timer.fillRange = 1;
        this.timer.sizeMode = Sprite.SizeMode.CUSTOM;
        this.timer.node.getComponent(UITransform)!.setContentSize(TIMER.w, TIMER.h);
        // Con trỏ: frame 35x97, tâm dọc trùng tâm thanh nước.
        this.cursor = makeSprite('Cursor', this.panel, this.sheet.frame(P + 'slider-tick-0'), 0.5, 0.5);
        this.cursor.node.addComponent(FrameAnim);

        const bn = this.button.node;
        bn.on(Node.EventType.MOUSE_ENTER, () => { this.hover = true; this.refreshButton(); });
        bn.on(Node.EventType.MOUSE_LEAVE, () => { this.hover = false; this.pressed = false; this.refreshButton(); });
        bn.on(Node.EventType.TOUCH_START, (e: EventTouch) => {
            this.touched(); e.propagationStopped = true;
            this.pressed = true; this.refreshButton();
        });
        bn.on(Node.EventType.TOUCH_END, (e: EventTouch) => {
            this.touched(); e.propagationStopped = true;
            this.pressed = false; this.refreshButton();
            this.reel();
        });
        bn.on(Node.EventType.TOUCH_CANCEL, () => { this.pressed = false; this.refreshButton(); });

        this.confettiRoot = makeNode('Confetti', this.node);
        this.node.active = false;
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
        this.clearConfetti();
        this.zone.spriteFrame = this.sheet.frame(zoneFrame());
        this.zoneW = this.zone.spriteFrame ? this.zone.spriteFrame.rect.width : 66;
        this.moveZone();
        this.counter.spriteFrame = this.sheet.frame(P + 'reel-counter-0');
        this.cursor.getComponent(FrameAnim)!.playing = false;
        this.cursor.spriteFrame = this.sheet.frame(P + 'slider-tick-0');
        this.refreshButton();
        this.layout();
        this.node.active = true;
        this.active = true;
        this.update(0);
    }

    /** Bấm REEL (nút, hoặc phím Space / F / Enter). */
    reel(): void {
        if (!this.active || this.finishing > 0) return;
        const px = BAR.x + this.cursorX * BAR.w;
        const inZone = px >= this.zoneX && px <= this.zoneX + this.zoneW;
        const anim = this.cursor.getComponent(FrameAnim)!;
        if (inZone) {
            this.hits++;
            this.counter.spriteFrame = this.sheet.frame(P + 'reel-counter-' + Math.min(3, this.hits));
            anim.play(this.sheet.sequence(P + 'slider-tick-'), 24, false);
            if (this.hits >= FISHING.hitsNeeded) {
                this.finish('win', FISHING.winDelay);
                this.spawnConfetti();
            } else {
                // Vùng xanh nhảy chỗ khác sau khi trúng.
                this.scheduleZoneMove = FISHING.zoneMoveDelay;
            }
        } else {
            // Trượt một lần là thua ngay.
            anim.play(this.sheet.sequence(P + 'slider-cross-'), 24, false);
            this.finish('miss', FISHING.failDelay);
        }
    }

    private scheduleZoneMove = 0;

    update(dt: number): void {
        if (!this.active) return;
        this.layout();
        this.updateConfetti(dt);

        this.bubbleT += dt;
        const bf = this.sheet.frame(P + 'bubbles-' + (Math.floor(this.bubbleT * 8) % 10));
        if (bf && this.bubbles.spriteFrame !== bf) this.bubbles.spriteFrame = bf;

        if (this.finishing > 0) {
            this.finishing -= dt;
            if (this.finishing <= 0) this.close();
            return;
        }

        if (this.scheduleZoneMove > 0) {
            this.scheduleZoneMove -= dt;
            if (this.scheduleZoneMove <= 0) {
                this.moveZone();
                const anim = this.cursor.getComponent(FrameAnim)!;
                anim.playing = false;
                this.cursor.spriteFrame = this.sheet.frame(P + 'slider-tick-0');
            }
        }

        // Con trỏ chạy qua lại (ping-pong), FISHING.cursorSweep giây cho một lượt.
        this.cursorX += this.cursorDir * dt / FISHING.cursorSweep;
        if (this.cursorX >= 1) { this.cursorX = 2 - this.cursorX; this.cursorDir = -1; }
        if (this.cursorX <= 0) { this.cursorX = -this.cursorX; this.cursorDir = 1; }
        this.cursor.node.setPosition(BAR.x + this.cursorX * BAR.w - BASE_W / 2, BASE_H / 2 - (BAR.y + BAR.h / 2), 0);

        this.timeLeft -= dt;
        const k = Math.max(0, this.timeLeft / FISHING.reelTime);
        this.timer.fillRange = k;
        const tf = this.sheet.frame(P + (k > 0.5 ? 'timer-green' : k > 0.2 ? 'timer-orange' : 'timer-red'));
        if (tf && this.timer.spriteFrame !== tf) this.timer.spriteFrame = tf;
        if (this.timeLeft <= 0) this.finish('timeout', FISHING.failDelay);
    }

    // -----------------------------------------------------------------------

    private touched(): void { if (this.onUiTouch) this.onUiTouch(); }

    private place(name: string, frame: string, x: number, y: number): Sprite {
        const s = makeSprite(name, this.panel, this.sheet.frame(frame), 0, 1);
        s.node.setPosition(x - BASE_W / 2, BASE_H / 2 - y, 0);
        return s;
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
        this.zone.node.setPosition(this.zoneX - BASE_W / 2, BASE_H / 2 - (BAR.y - 1), 0);
    }

    private refreshButton(): void {
        const suffix = this.pressed ? '-pressed' : this.hover ? '-hover' : '';
        const f = this.sheet.frame(P + 'reel-button' + suffix);
        if (f) this.button.spriteFrame = f;
    }

    private finish(r: ReelResult, delay: number): void {
        this.result = r;
        this.finishing = Math.max(0.01, delay);
    }

    private close(): void {
        this.active = false;
        this.node.active = false;
        this.clearConfetti();
        const cb = this.onDone;
        this.onDone = null;
        if (cb && this.result) cb(this.result);
    }

    private layout(): void {
        const vs = view.getVisibleSize();
        const s = Math.max(1, Math.min(2, (vs.height - 40) / BASE_H, (vs.width - 40) / BASE_W));
        this.panel.setScale(s, s, 1);
        this.panel.setPosition(0, 0, 0);
    }

    // Pháo giấy khi thắng -------------------------------------------------

    private spawnConfetti(): void {
        const colors = [
            new Color(255, 82, 82), new Color(255, 196, 0), new Color(64, 196, 255),
            new Color(124, 77, 255), new Color(0, 230, 118), new Color(255, 128, 171),
        ];
        const s = this.panel.scale.x;
        for (let i = 0; i < 70; i++) {
            const n = makeNode('c', this.confettiRoot);
            const g = n.addComponent(Graphics);
            g.fillColor = colors[i % colors.length];
            const w = 4 + Math.random() * 5, h = 8 + Math.random() * 8;
            g.rect(-w / 2, -h / 2, w, h);
            g.fill();
            n.setPosition((Math.random() - 0.5) * BASE_W * s * 0.6, (BAR.y - BASE_H / 2) * -s, 0);
            const a = Math.random() * Math.PI * 2, sp = 250 + Math.random() * 450;
            this.confetti.push({ g: n, vx: Math.cos(a) * sp, vy: Math.abs(Math.sin(a)) * sp + 150, vr: (Math.random() - 0.5) * 900 });
        }
    }

    private updateConfetti(dt: number): void {
        for (const c of this.confetti) {
            c.vy -= 900 * dt;
            const p = c.g.position;
            c.g.setPosition(p.x + c.vx * dt, p.y + c.vy * dt, 0);
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
