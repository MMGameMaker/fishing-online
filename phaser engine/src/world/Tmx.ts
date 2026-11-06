// Phaser 3 không đọc được file .tmx (XML) của Tiled, chỉ đọc Tiled JSON.
// File này đổi TMX sang Tiled JSON ngay lúc chạy, để vẫn dùng chung file map với bản Cocos,
// và chạy hoạt ảnh tile (<animation> trong tileset) mà Phaser 3 không tự chạy.

import Phaser from 'phaser';

export interface TmxTileset {
    firstgid: number;
    name: string;
    tilewidth: number;
    tileheight: number;
    tilecount: number;
    columns: number;
    margin: number;
    spacing: number;
    image: string;        // đường dẫn ảnh, đã ghép với thư mục của file tmx
    imagewidth: number;
    imageheight: number;
    tiles: { id: number; animation: { tileid: number; duration: number }[] }[];
}

export interface TmxJson {
    width: number;
    height: number;
    tilewidth: number;
    tileheight: number;
    orientation: string;
    renderorder: string;
    infinite: boolean;
    layers: any[];
    tilesets: TmxTileset[];
}

export function tilesetImageKey(ts: TmxTileset): string { return 'tileset:' + ts.image; }

/** @param xml nội dung file tmx; @param dir thư mục chứa file tmx (để ghép đường dẫn ảnh tileset). */
export function tmxToJson(xml: string, dir: string): TmxJson {
    const doc = new DOMParser().parseFromString(xml, 'application/xml');
    const map = doc.documentElement;
    if (map.nodeName !== 'map') throw new Error('File TMX không hợp lệ');
    const num = (el: Element, a: string, def = 0) => {
        const v = el.getAttribute(a);
        return v === null ? def : Number(v);
    };
    const width = num(map, 'width'), height = num(map, 'height');

    const tilesets: TmxTileset[] = [];
    for (const ts of Array.from(map.getElementsByTagName('tileset'))) {
        if (ts.getAttribute('source')) throw new Error('Chưa hỗ trợ tileset ngoài (.tsx)');
        const img = ts.getElementsByTagName('image')[0];
        const tiles: TmxTileset['tiles'] = [];
        for (const t of Array.from(ts.getElementsByTagName('tile'))) {
            const frames = Array.from(t.getElementsByTagName('frame'))
                .map(f => ({ tileid: num(f, 'tileid'), duration: num(f, 'duration') }));
            if (frames.length) tiles.push({ id: num(t, 'id'), animation: frames });
        }
        tilesets.push({
            firstgid: num(ts, 'firstgid'),
            name: ts.getAttribute('name') || '',
            tilewidth: num(ts, 'tilewidth'),
            tileheight: num(ts, 'tileheight'),
            tilecount: num(ts, 'tilecount'),
            columns: num(ts, 'columns'),
            margin: num(ts, 'margin'),
            spacing: num(ts, 'spacing'),
            image: dir + '/' + (img.getAttribute('source') || ''),
            imagewidth: num(img, 'width'),
            imageheight: num(img, 'height'),
            tiles,
        });
    }

    const layers: any[] = [];
    let id = 1;
    for (const l of Array.from(map.getElementsByTagName('layer'))) {
        const dataEl = l.getElementsByTagName('data')[0];
        const enc = dataEl.getAttribute('encoding');
        if (dataEl.getAttribute('compression')) throw new Error('Chưa hỗ trợ layer nén (zlib/gzip/zstd)');
        let data: number[];
        if (enc === 'base64') {
            const bin = atob((dataEl.textContent || '').trim());
            data = new Array(bin.length / 4);
            for (let i = 0, j = 0; i < bin.length; i += 4, j++) {
                data[j] = (bin.charCodeAt(i) | (bin.charCodeAt(i + 1) << 8) |
                    (bin.charCodeAt(i + 2) << 16) | (bin.charCodeAt(i + 3) << 24)) >>> 0;
            }
        } else if (enc === 'csv') {
            data = (dataEl.textContent || '').split(',').map(s => Number(s.trim()) >>> 0);
        } else {
            data = Array.from(dataEl.getElementsByTagName('tile')).map(t => num(t, 'gid') >>> 0);
        }
        layers.push({
            id: id++,
            type: 'tilelayer',
            name: l.getAttribute('name') || 'layer' + id,
            width: num(l, 'width', width),
            height: num(l, 'height', height),
            x: 0, y: 0,
            offsetx: num(l, 'offsetx'),
            offsety: num(l, 'offsety'),
            opacity: num(l, 'opacity', 1),
            visible: num(l, 'visible', 1) !== 0,
            data,
        });
    }

    return {
        width, height,
        tilewidth: num(map, 'tilewidth'),
        tileheight: num(map, 'tileheight'),
        orientation: map.getAttribute('orientation') || 'orthogonal',
        renderorder: map.getAttribute('renderorder') || 'right-down',
        infinite: false,
        layers,
        tilesets,
    };
}

/**
 * Hoạt ảnh tile: thay vì đổi index của hàng nghìn ô mỗi khung hình, ta vá hàm
 * getTileTextureCoordinates của tileset để trả về toạ độ frame hiện tại.
 * Mọi ô cùng loại đều đổi theo, giống cách Tiled/Cocos chạy hoạt ảnh tile.
 */
export class TileAnimator {
    private anims: { current: Map<number, number>; list: { id: number; frames: { tileid: number; duration: number }[]; total: number }[] }[] = [];

    constructor(map: Phaser.Tilemaps.Tilemap, json: TmxJson) {
        for (const src of json.tilesets) {
            if (!src.tiles.length) continue;
            const ts = map.getTileset(src.name);
            if (!ts) continue;
            const current = new Map<number, number>();
            const list = src.tiles.map(t => ({ id: t.id, frames: t.animation, total: t.animation.reduce((s, f) => s + f.duration, 0) }))
                .filter(a => a.total > 0);
            const orig = ts.getTileTextureCoordinates.bind(ts);
            (ts as any).getTileTextureCoordinates = (gid: number) => {
                const c = current.get(gid - ts.firstgid);
                return orig(c === undefined ? gid : ts.firstgid + c);
            };
            this.anims.push({ current, list });
        }
    }

    update(timeMs: number): void {
        for (const a of this.anims) {
            for (const t of a.list) {
                let r = timeMs % t.total;
                let frame = t.frames[0].tileid;
                for (const f of t.frames) {
                    if (r < f.duration) { frame = f.tileid; break; }
                    r -= f.duration;
                }
                a.current.set(t.id, frame);
            }
        }
    }
}
