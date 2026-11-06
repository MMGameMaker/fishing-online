// Nhân vật ghép từ nhiều lớp sprite (mỗi frame 48x55): thân (màu da) + quần + áo + tóc, thêm cần câu khi câu.
// Quần/áo/tóc trong ảnh là màu xám, được nhuộm bằng tint (nhân màu, giống Sprite.color bên Cocos).

import Phaser from 'phaser';
import { Dir, Look, GAME, PLAYER_FEET, HAND, ROD_GRIP, FISHING } from '../GameConfig';
import { Sheets, Sheet } from '../core/Sheets';
import { hexColor } from '../core/Kit';
import { Collision } from './RoomData';

export type PlayerMode = 'walk' | 'cast' | 'wait' | 'hooked' | 'reel';

const FRAME_W = 48, FRAME_H = 55;

export function playerSheetNames(look: Look): string[] {
    return [
        `player-spritesheet-skin-${look.skin}`,
        `player-fishing-skin-${look.skin}`,
        look.hair > 84 ? 'hair-2-spritesheet' : 'hair-spritesheet',
        'tops-spritesheet',
        'bottoms-spritesheet',
        `fishing-top-${look.top}`,
        `fishing-bottom-${look.bottom}`,
        'fishing-rods',
    ];
}

export class Player {
    /** Container đặt tại điểm chân (PLAYER_FEET trong frame). */
    readonly node: Phaser.GameObjects.Container;
    x: number;
    y: number;
    dir: Dir;
    mode: PlayerMode = 'walk';
    moving = false;
    /** Gọi khi animation quăng cần chạy xong. */
    onCastDone: (() => void) | null = null;

    private body: Phaser.GameObjects.Image;
    private bottom: Phaser.GameObjects.Image;
    private top: Phaser.GameObjects.Image;
    private hair: Phaser.GameObjects.Image;
    private rod: Phaser.GameObjects.Image;
    private sheets: Record<'body' | 'fish' | 'hair' | 'tops' | 'bottoms' | 'ftop' | 'fbottom' | 'rods', Sheet>;
    private t = 0;
    private castDoneFired = false;
    private castDonePending = false;

    constructor(scene: Phaser.Scene, private look: Look, x: number, y: number, dir: Dir, private collision: Collision) {
        this.x = x; this.y = y; this.dir = dir;
        const [body, fish, hair, tops, bottoms, ftop, fbottom, rods] = playerSheetNames(look).map(n => Sheets.get(n));
        this.sheets = { body, fish, hair, tops, bottoms, ftop, fbottom, rods };

        const ox = PLAYER_FEET.x / FRAME_W, oy = PLAYER_FEET.y / FRAME_H;
        const layer = (sheet: Sheet) => scene.add.image(0, 0, sheet.key, sheet.first()).setOrigin(ox, oy);
        this.rod = scene.add.image(0, 0, rods.key, rods.first()).setOrigin(0, 0).setVisible(false);
        this.body = layer(body);
        this.bottom = layer(bottoms).setTint(hexColor(look.bottomColor));
        this.top = layer(tops).setTint(hexColor(look.topColor));
        this.hair = layer(hair).setTint(hexColor(look.hairColor));
        this.node = scene.add.container(x, y, [this.rod, this.body, this.bottom, this.top, this.hair]);
        this.apply();
    }

    get sortY(): number { return this.y; }

    setMode(mode: PlayerMode): void {
        if (this.mode === mode) return;
        this.mode = mode;
        this.t = 0;
        this.castDoneFired = false;
        this.apply();
    }

    face(dir: Dir): void { this.dir = dir; this.apply(); }

    /** Đi theo vector (dx, dy) đã chuẩn hoá, có trượt dọc tường. */
    walk(dx: number, dy: number, dt: number): void {
        this.moving = dx !== 0 || dy !== 0;
        if (!this.moving) return;
        if (Math.abs(dx) > Math.abs(dy) + 0.01) this.dir = dx < 0 ? 'left' : 'right';
        else this.dir = dy < 0 ? 'up' : 'down';
        const sp = GAME.walkSpeed * dt;
        const hw = GAME.feetHalfW, h = GAME.feetH;
        const nx = this.x + dx * sp, ny = this.y + dy * sp;
        if (this.collision.canStand(nx, this.y, hw, h)) this.x = nx;
        if (this.collision.canStand(this.x, ny, hw, h)) this.y = ny;
    }

    update(dt: number): void {
        this.t += dt;
        this.apply();
        this.node.setPosition(Math.round(this.x), Math.round(this.y));
        if (this.castDonePending) {
            this.castDonePending = false;
            if (this.onCastDone) this.onCastDone();
        }
    }

    // -----------------------------------------------------------------------

    private set(img: Phaser.GameObjects.Image, sheet: Sheet, name: string): void {
        if (!sheet.has(name)) { img.setVisible(false); return; }
        if (img.texture.key !== sheet.key || img.frame.name !== name) img.setTexture(sheet.key, name);
        img.setVisible(true);
    }

    private apply(): void {
        const { body, fish, hair, tops, bottoms, ftop, fbottom, rods } = this.sheets;
        const L = this.look, d = this.dir;

        if (this.mode === 'walk') {
            const f = this.moving ? Math.floor(this.t * GAME.walkFps) % 4 : 0;
            this.set(this.body, body, `player-${d}-${f}`);
            this.set(this.bottom, bottoms, `player-${d}-${f}-bottom-${L.bottom}`);
            this.set(this.top, tops, `player-${d}-${f}-top-${L.top}`);
            this.set(this.hair, hair, `player-${d}-${f}-hair-${L.hair}`);
            this.rod.setVisible(false);
            return;
        }

        // Khi câu, tóc giữ frame đứng yên của hướng hiện tại.
        this.set(this.hair, hair, `player-${d}-0-hair-${L.hair}`);

        const lvl = GAME.rodLevel;
        let rodKind: 'cast' | 'bob' | 'reel';
        let rodFrame: number;
        let pose: string; // 'cast-<dir>-<i>' hoặc 'reel-<dir>-<i>'
        let bodyName: string;

        if (this.mode === 'cast') {
            const j = Math.min(15, Math.floor(this.t * FISHING.castFps));
            rodKind = 'cast'; rodFrame = j;
            const i = Math.min(2, Math.floor(j / 2));
            pose = `cast-${d}-${i}`;
            bodyName = `player-fishing-cast-${d}-${i}`;
            if (j >= 15 && !this.castDoneFired) {
                this.castDoneFired = true;
                this.castDonePending = true;
            }
        } else if (this.mode === 'wait' || this.mode === 'hooked') {
            const fps = this.mode === 'hooked' ? 14 : 6;
            rodKind = 'bob'; rodFrame = Math.floor(this.t * fps) % 6;
            pose = `cast-${d}-2`;
            bodyName = `player-fishing-cast-${d}-2`;
        } else {
            const k = Math.floor(this.t * 12) % 12;
            rodKind = 'reel'; rodFrame = k;
            pose = `reel-${d}-${k}`;
            bodyName = `player-fishing-reeling-${d}-${k}`;
        }

        this.set(this.body, fish, bodyName);
        this.set(this.top, ftop, `fishing-top-${L.top}-${pose}`);
        this.set(this.bottom, fbottom, `fishing-bottom-${L.bottom}-${pose}`);
        this.set(this.rod, rods, `fishing-rod-level-${lvl}-${rodKind}-${d}-${rodFrame}`);

        // Đặt cán cần vào tay. Hướng lên: cần nằm sau lưng.
        const [hx, hy] = HAND[d];
        const [gx, gy] = ROD_GRIP[rodKind][d];
        this.rod.setPosition(hx - gx - PLAYER_FEET.x, hy - gy - PLAYER_FEET.y);
        if (d === 'up') this.node.sendToBack(this.rod);
        else this.node.bringToTop(this.rod);
    }

    /** Chiều cao đầu tính từ chân, để đặt nút / tên phía trên. */
    static readonly HEAD = 44;
}
