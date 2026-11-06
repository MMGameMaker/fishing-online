// Tiện ích dùng chung: chạy dãy frame, tạo chữ, vẽ bảng. Tương đương core/NodeKit.ts bên Cocos.

import Phaser from 'phaser';

export const FONT = '"Segoe UI", Tahoma, Arial, sans-serif';

/** Thứ tự vẽ trong WorldScene (depth). Thực thể sắp theo y: ENTITIES + y. */
export const DEPTH = {
    tilesBelow: 0,
    decorBelow: 100,
    entities: 1000,
    tilesAbove: 20000,
    worldUi: 21000,
    debug: 30000,
};

/** Chạy một dãy frame trên một Image (thay cho Phaser anims vì frame lấy theo tên trong sheet). */
export class FrameAnim {
    frames: string[] = [];
    fps = 8;
    loop = true;
    playing = false;
    private t = 0;
    private i = 0;
    private onDone: (() => void) | null = null;

    constructor(public readonly sprite: Phaser.GameObjects.Image) {
        const scene = sprite.scene;
        scene.events.on(Phaser.Scenes.Events.UPDATE, this.tick, this);
        sprite.once(Phaser.GameObjects.Events.DESTROY, () => scene.events.off(Phaser.Scenes.Events.UPDATE, this.tick, this));
    }

    play(key: string, frames: string[], fps: number, loop = true, onDone: (() => void) | null = null): void {
        this.frames = frames;
        this.fps = fps;
        this.loop = loop;
        this.onDone = onDone;
        this.t = 0;
        this.i = 0;
        this.playing = frames.length > 1 && fps > 0;
        if (frames.length) this.sprite.setTexture(key, frames[0]);
        // Một frame mà không lặp: coi như xong ngay.
        if (!this.playing && !loop && onDone) { this.onDone = null; onDone(); }
    }

    /** Bắt đầu ở một frame ngẫu nhiên để các decor giống nhau không chạy đồng loạt. */
    randomizePhase(): void {
        if (this.frames.length > 1) {
            this.i = Math.floor(Math.random() * this.frames.length);
            this.sprite.setFrame(this.frames[this.i]);
        }
    }

    private tick(_time: number, deltaMs: number): void {
        if (!this.playing || !this.sprite.active) return;
        this.t += Math.min(deltaMs, 100) / 1000;
        const step = 1 / this.fps;
        let changed = false;
        while (this.t >= step) {
            this.t -= step;
            this.i++;
            changed = true;
            if (this.i >= this.frames.length) {
                if (this.loop) this.i = 0;
                else {
                    this.i = this.frames.length - 1;
                    this.playing = false;
                    const cb = this.onDone;
                    this.onDone = null;
                    this.sprite.setFrame(this.frames[this.i]);
                    if (cb) cb();
                    return;
                }
            }
        }
        if (changed) this.sprite.setFrame(this.frames[this.i]);
    }
}

export function makeText(scene: Phaser.Scene, x: number, y: number, text: string, size = 16,
    color = '#ffffff', outline = true, style: Phaser.Types.GameObjects.Text.TextStyle = {}): Phaser.GameObjects.Text {
    const t = scene.add.text(x, y, text, {
        fontFamily: FONT,
        fontSize: size + 'px',
        color,
        align: 'center',
        stroke: outline ? '#1e1e28' : undefined,
        strokeThickness: outline ? 4 : 0,
        ...style,
    });
    t.setOrigin(0.5, 0.5);
    t.setResolution(2);
    // Game bật pixelArt (lọc NEAREST), riêng chữ thì cho mịn.
    t.texture.setFilter(Phaser.Textures.FilterMode.LINEAR);
    return t;
}

/** Bảng nền kem viền nâu bo góc (dialog, bảng thông tin). Tâm ở (0, 0). */
export function drawPanel(g: Phaser.GameObjects.Graphics, w: number, h: number,
    fill = 0xfff8e6, fillAlpha = 245 / 255, stroke = 0x5c4028): void {
    g.clear();
    g.fillStyle(fill, fillAlpha);
    g.fillRoundedRect(-w / 2, -h / 2, w, h, 10);
    g.lineStyle(4, stroke, 1);
    g.strokeRoundedRect(-w / 2, -h / 2, w, h, 10);
}

export function hexColor(hex: string): number {
    return parseInt(hex.replace('#', ''), 16);
}
