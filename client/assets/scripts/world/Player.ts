// Nhân vật ghép từ nhiều lớp sprite: thân (màu da) + quần + áo + tóc + cần câu.
// Quần/áo/tóc trong ảnh là màu xám, được nhuộm bằng Sprite.color.

import { Node, Sprite, SpriteFrame, UITransform } from 'cc';
import { Dir, Look, GAME, PLAYER_FEET, HAND, ROD_GRIP, FISHING } from '../GameConfig';
import { Sheets, Sheet } from '../core/Sheets';
import { makeNode, makeSprite, hexColor } from '../core/NodeKit';
import { Collision } from './RoomData';

export type PlayerMode = 'walk' | 'cast' | 'wait' | 'hooked' | 'reel';

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
    readonly node: Node;
    x: number;
    y: number;
    dir: Dir;
    mode: PlayerMode = 'walk';
    moving = false;
    /** Gọi khi animation quăng cần chạy xong. */
    onCastDone: (() => void) | null = null;

    private body: Sprite;
    private bottom: Sprite;
    private top: Sprite;
    private hair: Sprite;
    private rod: Sprite;
    private sheets: Record<string, Sheet>;
    private t = 0;
    private castDoneFired = false;

    constructor(parent: Node, private look: Look, x: number, y: number, dir: Dir, private collision: Collision) {
        this.x = x; this.y = y; this.dir = dir;
        this.node = makeNode('Player', parent);
        const ax = PLAYER_FEET.x / 48, ay = 1 - PLAYER_FEET.y / 55;
        this.rod = makeSprite('Rod', this.node, null, 0, 1);
        this.body = makeSprite('Body', this.node, null, ax, ay);
        this.bottom = makeSprite('Bottom', this.node, null, ax, ay);
        this.top = makeSprite('Top', this.node, null, ax, ay);
        this.hair = makeSprite('Hair', this.node, null, ax, ay);
        this.bottom.color = hexColor(look.bottomColor);
        this.top.color = hexColor(look.topColor);
        this.hair.color = hexColor(look.hairColor);
        const [body, fish, hair, tops, bottoms, ftop, fbottom, rods] = playerSheetNames(look).map(n => Sheets.get(n));
        this.sheets = { body, fish, hair, tops, bottoms, ftop, fbottom, rods };
        this.rod.node.active = false;
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
        this.node.setPosition(Math.round(this.x), -Math.round(this.y), 0);
    }

    // -----------------------------------------------------------------------

    private set(s: Sprite, sheet: Sheet, name: string): void {
        const f: SpriteFrame | null = sheet.frame(name);
        if (f && s.spriteFrame !== f) s.spriteFrame = f;
        s.node.active = !!f;
    }

    private apply(): void {
        const { body, fish, hair, tops, bottoms, ftop, fbottom, rods } = this.sheets;
        const L = this.look, d = this.dir;
        this.set(this.hair, hair, `player-${d}-0-hair-${L.hair}`);

        if (this.mode === 'walk') {
            const f = this.moving ? Math.floor(this.t * GAME.walkFps) % 4 : 0;
            this.set(this.body, body, `player-${d}-${f}`);
            this.set(this.bottom, bottoms, `player-${d}-${f}-bottom-${L.bottom}`);
            this.set(this.top, tops, `player-${d}-${f}-top-${L.top}`);
            this.set(this.hair, hair, `player-${d}-${f}-hair-${L.hair}`);
            this.rod.node.active = false;
            return;
        }

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
                const cb = this.onCastDone;
                if (cb) setTimeout(cb, 0);
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
        this.rod.node.setPosition(hx - gx - PLAYER_FEET.x, -(hy - gy - PLAYER_FEET.y), 0);
        const idx = d === 'up' ? 0 : this.node.children.length - 1;
        if (this.rod.node.getSiblingIndex() !== idx) this.rod.node.setSiblingIndex(idx);
    }

    /** Chiều cao đầu tính từ chân, để đặt nút / tên phía trên. */
    static readonly HEAD = 44;

    get uiTransform(): UITransform { return this.node.getComponent(UITransform)!; }
}
