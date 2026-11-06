// Dữ liệu phòng do tools/build-room.mjs (bên Cocos) ghi vào assets/rooms/<room>.json.
// Toạ độ đều theo pixel của Tiled: gốc ở góc trên trái map, trục y hướng xuống (trùng với Phaser).

import type { Dir } from '../GameConfig';

export interface RectData { x: number; y: number; w: number; h: number; }

export interface DecorData {
    name: string;
    layer: 'below' | 'above';
    sheet: string;
    frames: string[];
    fps: number;
    loop: boolean;
    x: number; y: number; w: number; h: number;
    sortY: number;
    opacity: number;
}

export interface TeleportData extends RectData {
    dest: string; destX: number; destY: number; dirIn: Dir; dirOut: Dir;
}

export interface RoomData {
    bounds?: RectData;
    name: string;
    tileW: number; tileH: number; cols: number; rows: number; pxW: number; pxH: number;
    maps: { below: string; above: string | null };
    blocked: string;
    colliders: RectData[];
    fishing: (RectData & { dir: Dir })[];
    botFishingSpots: { x: number; y: number; dir: Dir }[];
    seats: (RectData & Record<string, any>)[];
    signs: (RectData & Record<string, any>)[];
    teleports: TeleportData[];
    spawn: { x: number; y: number; dir: Dir; from: string | null };
    decor: DecorData[];
}

/** Va chạm: ô "blocked" của Tiled + hình chữ nhật collider + vật cản thêm lúc chạy (NPC). */
export class Collision {
    private extra: RectData[] = [];

    constructor(private room: RoomData) {}

    addBlocker(r: RectData): void { this.extra.push(r); }

    tileBlocked(tx: number, ty: number): boolean {
        const { cols, rows, blocked } = this.room;
        if (tx < 0 || ty < 0 || tx >= cols || ty >= rows) return true;
        return blocked.charCodeAt(ty * cols + tx) === 49; // '1'
    }

    /** Hộp chân [x-hw, x+hw] x [y-h, y] có đứng được không. */
    canStand(x: number, y: number, hw: number, h: number): boolean {
        const { tileW, tileH } = this.room;
        const x0 = Math.floor((x - hw) / tileW), x1 = Math.floor((x + hw) / tileW);
        const y0 = Math.floor((y - h) / tileH), y1 = Math.floor(y / tileH);
        for (let ty = y0; ty <= y1; ty++)
            for (let tx = x0; tx <= x1; tx++)
                if (this.tileBlocked(tx, ty)) return false;
        const hit = (r: RectData) => x + hw > r.x && x - hw < r.x + r.w && y > r.y && y - h < r.y + r.h;
        for (const r of this.room.colliders) if (hit(r)) return false;
        for (const r of this.extra) if (hit(r)) return false;
        return true;
    }
}

export function distToRect(px: number, py: number, r: RectData): number {
    const dx = Math.max(r.x - px, 0, px - (r.x + r.w));
    const dy = Math.max(r.y - py, 0, py - (r.y + r.h));
    return Math.sqrt(dx * dx + dy * dy);
}
