// Nạp sprite sheet từ assets/resources/sheets/<tên>.png + <tên>-frames.json
// (định dạng do tools/build-room.mjs ghi ra) và cắt thành SpriteFrame khi cần.

import { resources, ImageAsset, JsonAsset, Texture2D, SpriteFrame, Rect, Size, Vec2 } from 'cc';

interface SheetJson { frames: Record<string, number[]>; order: string[]; }

export class Sheet {
    private cache = new Map<string, SpriteFrame>();

    constructor(public readonly name: string, public readonly texture: Texture2D, private data: SheetJson) {}

    get order(): string[] { return this.data.order; }

    has(frame: string): boolean { return !!this.data.frames[frame]; }

    frame(frame: string): SpriteFrame | null {
        let sf = this.cache.get(frame);
        if (sf) return sf;
        const r = this.data.frames[frame];
        if (!r) return null;
        sf = new SpriteFrame();
        sf.reset({
            texture: this.texture,
            rect: new Rect(r[0], r[1], r[2], r[3]),
            originalSize: new Size(r[2], r[3]),
            offset: new Vec2(0, 0),
            isRotate: false,
        });
        this.cache.set(frame, sf);
        return sf;
    }

    /** Frame đầu tiên (dùng cho ảnh tĩnh một frame). */
    first(): SpriteFrame { return this.frame(this.data.order[0])!; }

    frames(names: string[]): SpriteFrame[] {
        return names.map(n => this.frame(n)).filter((f): f is SpriteFrame => !!f);
    }

    /** Các frame tên dạng `${prefix}0`, `${prefix}1`... theo thứ tự số. */
    sequence(prefix: string, count?: number): SpriteFrame[] {
        const out: SpriteFrame[] = [];
        for (let i = 0; count === undefined || i < count; i++) {
            const f = this.frame(prefix + i);
            if (!f) break;
            out.push(f);
        }
        return out;
    }
}

export class Sheets {
    private static loaded = new Map<string, Sheet>();
    private static pending = new Map<string, Promise<Sheet>>();

    static get(name: string): Sheet {
        const s = this.loaded.get(name);
        if (!s) throw new Error(`Sheet chưa nạp: ${name}`);
        return s;
    }

    static tryGet(name: string): Sheet | undefined { return this.loaded.get(name); }

    static load(name: string): Promise<Sheet> {
        const done = this.loaded.get(name);
        if (done) return Promise.resolve(done);
        let p = this.pending.get(name);
        if (p) return p;
        p = Promise.all([
            loadRes(`sheets/${name}`, ImageAsset),
            loadRes(`sheets/${name}-frames`, JsonAsset),
        ]).then(([img, json]) => {
            const tex = new Texture2D();
            tex.image = img;
            tex.setFilters(Texture2D.Filter.NEAREST, Texture2D.Filter.NEAREST);
            tex.setMipFilter(Texture2D.Filter.NONE);
            tex.setWrapMode(Texture2D.WrapMode.CLAMP_TO_EDGE, Texture2D.WrapMode.CLAMP_TO_EDGE);
            const sheet = new Sheet(name, tex, json.json as SheetJson);
            this.loaded.set(name, sheet);
            return sheet;
        });
        this.pending.set(name, p);
        return p;
    }

    static loadAll(names: string[]): Promise<Sheet[]> {
        return Promise.all([...new Set(names)].map(n => this.load(n)));
    }
}

export function loadRes<T>(path: string, type: new (...a: any[]) => T): Promise<T> {
    return new Promise((resolve, reject) => {
        resources.load(path, type as any, (err: Error | null, asset: any) => {
            if (err) reject(new Error(`Không nạp được resources/${path}: ${err.message}`));
            else resolve(asset as T);
        });
    });
}
