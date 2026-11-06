// Nạp sprite sheet từ public/assets/sheets/<tên>.png + <tên>-frames.json
// (định dạng do tools/build-room.mjs bên Cocos ghi ra: { frames: { tên: [x, y, w, h] }, order: [...] })
// và đăng ký từng frame vào texture của Phaser.

import Phaser from 'phaser';

interface SheetJson { frames: Record<string, number[]>; order: string[]; }

export class Sheet {
    constructor(public readonly name: string, public readonly key: string, private data: SheetJson) {}

    get order(): string[] { return this.data.order; }

    has(frame: string): boolean { return !!this.data.frames[frame]; }

    size(frame: string): { w: number; h: number } {
        const r = this.data.frames[frame];
        return r ? { w: r[2], h: r[3] } : { w: 0, h: 0 };
    }

    /** Frame đầu tiên (dùng cho ảnh tĩnh một frame). */
    first(): string { return this.data.order[0]; }

    /** Các frame tên dạng `${prefix}0`, `${prefix}1`... theo thứ tự số. */
    sequence(prefix: string, count?: number): string[] {
        const out: string[] = [];
        for (let i = 0; count === undefined || i < count; i++) {
            if (!this.has(prefix + i)) break;
            out.push(prefix + i);
        }
        return out;
    }
}

const loaded = new Map<string, Sheet>();

export const Sheets = {
    /** Đưa ảnh + json của sheet vào hàng đợi loader. */
    queue(load: Phaser.Loader.LoaderPlugin, names: string[]): void {
        for (const name of new Set(names)) {
            if (loaded.has(name)) continue;
            load.image('sheet:' + name, `assets/sheets/${name}.png`);
            load.json('sheetjson:' + name, `assets/sheets/${name}-frames.json`);
        }
    },

    /** Sau khi loader xong: cắt frame theo json. */
    register(scene: Phaser.Scene, names: string[]): void {
        for (const name of new Set(names)) {
            if (loaded.has(name)) continue;
            const key = 'sheet:' + name;
            const data = scene.cache.json.get('sheetjson:' + name) as SheetJson | undefined;
            if (!data || !scene.textures.exists(key)) throw new Error(`Không nạp được sheet: ${name}`);
            const tex = scene.textures.get(key);
            for (const [frame, r] of Object.entries(data.frames)) {
                if (!tex.has(frame)) tex.add(frame, 0, r[0], r[1], r[2], r[3]);
            }
            loaded.set(name, new Sheet(name, key, data));
        }
    },

    get(name: string): Sheet {
        const s = loaded.get(name);
        if (!s) throw new Error(`Sheet chưa nạp: ${name}`);
        return s;
    },

    tryGet(name: string): Sheet | undefined { return loaded.get(name); },
};
