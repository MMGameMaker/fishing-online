#!/usr/bin/env node
// Chuyển một map Tiled (.json) trong thư mục reference sang dữ liệu cho Cocos Creator 3.8.
//
//   node tools/build-room.mjs <thư-mục-reference> [room]
//   ví dụ: node tools/build-room.mjs "D:/Fishing-Online/client/assets/my project" coralCove
//
// <thư-mục-reference> là thư mục chứa maps/, assets/, images/ (thư mục giải nén từ new-reference.rar).
// Kết quả ghi vào assets/resources/ của project này:
//   maps/<room>/<room>-below.tmx   các tile layer nằm dưới nhân vật (nước, đất, objects background)
//   maps/<room>/<room>-above.tmx   các tile layer nằm trên nhân vật (objects foreground, mây)
//   maps/<room>/*.png              ảnh tileset
//   rooms/<room>.json              decor, ô chặn, vùng câu cá, cổng dịch chuyển, điểm xuất hiện
//   sheets/<tên>.png + <tên>-frames.json   sprite sheet (decor, nhân vật, NPC, UI)
// Chạy lại an toàn: file cũ bị ghi đè.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const PROJECT = path.resolve(HERE, '..');
const OUT = path.join(PROJECT, 'assets', 'resources');

const REF = process.argv[2];
const ROOM = process.argv[3] || 'coralCove';
if (!REF || !fs.existsSync(path.join(REF, 'maps'))) {
    console.error('Cách dùng: node tools/build-room.mjs <thư-mục-reference có maps/ và assets/> [room]');
    process.exit(1);
}
const MAPS = path.join(REF, 'maps');
const A = path.join(REF, 'assets');

const mkdirp = d => fs.mkdirSync(d, { recursive: true });
const readJson = p => JSON.parse(fs.readFileSync(p, 'utf8'));
const kebab = s => s.replace(/([a-z0-9])([A-Z])/g, '$1-$2').replace(/([A-Z])([A-Z][a-z])/g, '$1-$2').toLowerCase();
const props = o => Object.fromEntries((o.properties || []).map(p => [p.name, p.value]));

// ---------------------------------------------------------------------------
// Sprite sheet: chép PNG + viết JSON gọn { frames: { tên: [x,y,w,h] }, order: [...] }
// ---------------------------------------------------------------------------
const writtenSheets = new Map(); // tên sheet -> nguồn
function writeSheet(name, pngPath, jsonPath) {
    if (writtenSheets.has(name)) return name;
    mkdirp(path.join(OUT, 'sheets'));
    fs.copyFileSync(pngPath, path.join(OUT, 'sheets', name + '.png'));
    const frames = {}; const order = [];
    if (jsonPath) {
        const d = readJson(jsonPath);
        const list = Array.isArray(d.frames)
            ? d.frames
            : Object.entries(d.frames).map(([filename, v]) => ({ filename, ...v }));
        for (const f of list) {
            frames[f.filename] = [f.frame.x, f.frame.y, f.frame.w, f.frame.h];
            order.push(f.filename);
        }
    } else {
        const { w, h } = pngSize(pngPath);
        frames['0'] = [0, 0, w, h]; order.push('0');
    }
    fs.writeFileSync(path.join(OUT, 'sheets', name + '-frames.json'), JSON.stringify({ frames, order }));
    writtenSheets.set(name, pngPath);
    return name;
}
function pngSize(p) {
    const b = fs.readFileSync(p);
    return { w: b.readUInt32BE(16), h: b.readUInt32BE(20) };
}

// ---------------------------------------------------------------------------
// Map
// ---------------------------------------------------------------------------
const mapPath = path.join(MAPS, ROOM + '.json');
const map = readJson(mapPath);
const TW = map.tilewidth, TH = map.tileheight, W = map.width, H = map.height;

function* walk(layers, group = '') {
    for (const l of layers) {
        if (l.type === 'group') yield* walk(l.layers, l.name);
        else yield { group, layer: l };
    }
}
const flat = [...walk(map.layers)];
const byName = n => flat.find(e => e.layer.name === n)?.layer;

// --- TMX ---------------------------------------------------------------------
const mapOut = path.join(OUT, 'maps', ROOM);
mkdirp(mapOut);
const esc = s => String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');

function tilesetXml(ts) {
    const src = path.normalize(path.join(MAPS, ts.image));
    const img = path.basename(src);
    fs.copyFileSync(src, path.join(mapOut, img));
    let x = `  <tileset firstgid="${ts.firstgid}" name="${esc(ts.name)}" tilewidth="${ts.tilewidth}" tileheight="${ts.tileheight}" tilecount="${ts.tilecount}" columns="${ts.columns}">\n`;
    x += `    <image source="${esc(img)}" width="${ts.imagewidth}" height="${ts.imageheight}"/>\n`;
    for (const t of ts.tiles || []) {
        if (!t.animation) continue;
        x += `    <tile id="${t.id}">\n      <animation>\n`;
        for (const f of t.animation) x += `        <frame tileid="${f.tileid}" duration="${f.duration}"/>\n`;
        x += `      </animation>\n    </tile>\n`;
    }
    return x + '  </tileset>\n';
}

function layerXml(l, id) {
    const buf = Buffer.alloc(l.data.length * 4);
    l.data.forEach((g, i) => buf.writeUInt32LE(g >>> 0, i * 4));
    const op = l.opacity !== undefined && l.opacity !== 1 ? ` opacity="${l.opacity}"` : '';
    return `  <layer id="${id}" name="${esc(l.name)}" width="${l.width}" height="${l.height}"${op}>\n` +
        `    <data encoding="base64">${buf.toString('base64')}</data>\n  </layer>\n`;
}

function writeTmx(file, layers) {
    let x = `<?xml version="1.0" encoding="UTF-8"?>\n`;
    x += `<map version="1.10" tiledversion="1.11.2" orientation="orthogonal" renderorder="right-down" width="${W}" height="${H}" tilewidth="${TW}" tileheight="${TH}" infinite="0" nextlayerid="${layers.length + 1}" nextobjectid="1">\n`;
    for (const ts of map.tilesets) x += tilesetXml(ts);
    layers.forEach((l, i) => { x += layerXml(l, i + 1); });
    x += `</map>\n`;
    fs.writeFileSync(path.join(mapOut, file), x);
}

// Tile layer nhìn thấy được: những layer đứng trước group objectsBelow nằm dưới nhân vật, còn lại nằm trên.
const below = [], above = [];
{
    let seenGroup = false;
    for (const l of map.layers) {
        if (l.type === 'group') { seenGroup = true; continue; }
        if (l.type !== 'tilelayer' || !l.visible) continue;
        if (!l.data.some(Boolean)) continue;
        (seenGroup ? above : below).push(l);
    }
}
writeTmx(`${ROOM}-below.tmx`, below);
if (above.length) writeTmx(`${ROOM}-above.tmx`, above);

// --- Decor (image layer) ---------------------------------------------------
const SHEET_DIRS = [
    path.join(A, 'rooms', ROOM, 'spritesheets'),
    path.join(A, 'spritesheets'),
    ...fs.readdirSync(path.join(A, 'rooms')).map(r => path.join(A, 'rooms', r, 'spritesheets')),
];
const ALIAS = {
    safeAreaChristmasTree: 'safearea-christmas-tree',
    bzSign: 'bz-sign',
    apartmentFountain: 'apartment-fountain',
    nightclubFan: 'nightclub-fan',
    accordionPineRL: 'accordion-pine-tree-rl',
    accordionPineLR: 'accordion-pine-tree-lr',
    hugglehenFarmEntrance: 'hugglehen-farms-entrance',
};
function findSheet(layerName, imageBase) {
    const cands = [ALIAS[layerName], kebab(layerName), imageBase].filter(Boolean);
    for (const c of cands) for (const d of SHEET_DIRS) {
        const j = path.join(d, c + '-spritesheet.json'), p = path.join(d, c + '-spritesheet.png');
        if (fs.existsSync(j) && fs.existsSync(p)) return { name: c, json: j, png: p };
    }
    return null;
}

const decor = [];
const missing = [];
for (const { group, layer: l } of flat) {
    if (l.type !== 'imagelayer' || l.visible === false) continue;
    const p = props(l);
    const imgPath = path.normalize(path.join(MAPS, l.image));
    const base = path.basename(l.image, '.png').replace(/-still$/, '');
    let sheet, frames;
    const animated = !!p.animated;
    if (animated || !fs.existsSync(imgPath)) {
        const s = findSheet(l.name, base);
        if (!s) { missing.push(`${l.name} (${l.image})`); continue; }
        sheet = writeSheet(s.name, s.png, s.json);
        frames = readJson(path.join(OUT, 'sheets', sheet + '-frames.json')).order;
        if (!animated) frames = frames.slice(0, 1);
    } else {
        sheet = writeSheet('img-' + base, imgPath, null);
        frames = ['0'];
    }
    decor.push({
        name: l.name,
        layer: group === 'objectsAbove' ? 'above' : 'below',
        sheet, frames,
        fps: p.frameRate || 0,
        loop: p.repeat === undefined ? true : p.repeat !== 0,
        x: Math.round(l.offsetx || 0), y: Math.round(l.offsety || 0),
        w: l.imagewidth, h: l.imageheight,
        sortY: Math.round((l.offsety || 0) + (p.z ?? l.imageheight)),
        opacity: l.opacity ?? 1,
    });
}

// --- Ô chặn, object --------------------------------------------------------
const blockedLayer = byName('blocked');
const blocked = blockedLayer ? blockedLayer.data.map(v => (v ? '1' : '0')).join('') : '0'.repeat(W * H);
const code = flat.filter(e => e.layer.type === 'objectgroup').flatMap(e => e.layer.objects);
const rect = o => ({ x: o.x, y: o.y, w: o.width, h: o.height });
const objs = n => code.filter(o => o.name === n && o.visible !== false);

const teleports = objs('teleport').map(o => {
    const p = props(o);
    return { ...rect(o), dest: p.destinationRoom, destX: p.destinationX, destY: p.destinationY, dirIn: p.directionIn, dirOut: p.directionOut };
});

// Điểm xuất hiện: nơi các phòng khác dịch chuyển tới phòng này.
let spawn = null;
for (const f of fs.readdirSync(MAPS).filter(f => f.endsWith('.json'))) {
    if (f === ROOM + '.json') continue;
    for (const { layer } of walk(readJson(path.join(MAPS, f)).layers)) {
        if (layer.type !== 'objectgroup') continue;
        for (const o of layer.objects) {
            const p = props(o);
            if (o.name === 'teleport' && p.destinationRoom === ROOM && !spawn)
                spawn = { x: p.destinationX, y: p.destinationY, dir: p.directionOut || 'down', from: f.replace('.json', '') };
        }
    }
}
if (!spawn) spawn = { x: W * TW / 2, y: H * TH / 2, dir: 'down', from: null };

// Vùng có tile (camera không đi ra ngoài vùng này).
let bx0 = W, by0 = H, bx1 = -1, by1 = -1;
for (const l of below.concat(above)) l.data.forEach((g, i) => {
    if (!g) return;
    const x = i % W, y = Math.floor(i / W);
    if (x < bx0) bx0 = x; if (x > bx1) bx1 = x; if (y < by0) by0 = y; if (y > by1) by1 = y;
});
const bounds = bx1 < 0 ? { x: 0, y: 0, w: W * TW, h: H * TH }
    : { x: bx0 * TW, y: by0 * TH, w: (bx1 - bx0 + 1) * TW, h: (by1 - by0 + 1) * TH };

const room = {
    name: ROOM,
    bounds,
    tileW: TW, tileH: TH, cols: W, rows: H, pxW: W * TW, pxH: H * TH,
    maps: { below: `maps/${ROOM}/${ROOM}-below`, above: above.length ? `maps/${ROOM}/${ROOM}-above` : null },
    blocked,
    colliders: objs('collider').map(rect),
    fishing: objs('fishing').map(o => ({ ...rect(o), dir: props(o).direction || 'down' })),
    botFishingSpots: objs('botFishingSpot').map(o => ({ x: o.x, y: o.y, dir: props(o).direction || 'down' })),
    seats: objs('seat').map(o => ({ ...rect(o), ...props(o) })),
    signs: objs('sign').map(o => ({ ...rect(o), ...props(o) })),
    teleports, spawn, decor,
};
mkdirp(path.join(OUT, 'rooms'));
fs.writeFileSync(path.join(OUT, 'rooms', ROOM + '.json'), JSON.stringify(room));

// ---------------------------------------------------------------------------
// Sheet dùng chung: nhân vật, câu cá, NPC, UI
// ---------------------------------------------------------------------------
const SS = path.join(A, 'spritesheets');
const shared = [
    ['player-spritesheet-skin-1', 'player-spritesheet-skin-1.png', 'player-spritesheet.json'],
    ['player-spritesheet-skin-2', 'player-spritesheet-skin-2.png', 'player-spritesheet.json'],
    ['player-spritesheet-skin-3', 'player-spritesheet-skin-3.png', 'player-spritesheet.json'],
    ['player-fishing-skin-1', 'player-fishing-spritesheet-skin-1.png', 'player-fishing-spritesheet.json'],
    ['player-fishing-skin-2', 'player-fishing-spritesheet-skin-2.png', 'player-fishing-spritesheet.json'],
    ['player-fishing-skin-3', 'player-fishing-spritesheet-skin-3.png', 'player-fishing-spritesheet.json'],
    ['hair-spritesheet', 'hair-spritesheet.png', 'hair-spritesheet.json'],
    ['hair-2-spritesheet', 'hair-2-spritesheet.png', 'hair-2-spritesheet.json'],
    ['tops-spritesheet', 'tops-spritesheet.png', 'tops-spritesheet.json'],
    ['bottoms-spritesheet', 'bottoms-spritesheet.png', 'bottoms-spritesheet.json'],
    ['fishing-rods', 'fishing-rods-spritesheet.png', 'fishing-rods-spritesheet.json'],
    ['fishing-caught', 'fishing-caught-spritesheet.png', 'fishing-caught-spritesheet.json'],
    ['fishing-hooked-alert', 'fishing-hooked-alert-spritesheet.png', 'fishing-hooked-alert-spritesheet.json'],
    ['fishing-interface', 'fishing-interface-spritesheet.png', 'fishing-interface-spritesheet.json'],
    ['speech-bubble', 'speech-bubble-spritesheet.png', 'speech-bubble-spritesheet.json'],
];
for (const [n, png, json] of shared) {
    const p = path.join(SS, png), j = path.join(SS, json);
    if (fs.existsSync(p) && fs.existsSync(j)) writeSheet(n, p, j); else missing.push(n);
}
// Quần áo lúc câu cá: mỗi kiểu một sheet riêng.
for (const kind of ['tops', 'bottoms']) {
    const d = path.join(SS, kind, 'fishing');
    if (!fs.existsSync(d)) continue;
    for (const f of fs.readdirSync(d).filter(f => f.endsWith('.png'))) {
        const j = path.join(d, f.replace('.png', '.json'));
        if (fs.existsSync(j)) writeSheet(f.replace('.png', '').replace('fishing-clothes-spritesheet-', 'fishing-'), path.join(d, f), j);
    }
}
// NPC + chân dung
const NPC_DIR = path.join(SS, 'npcs');
for (const f of fs.readdirSync(NPC_DIR).filter(f => f.endsWith('-spritesheet.png'))) {
    const j = path.join(NPC_DIR, f.replace('.png', '.json'));
    if (fs.existsSync(j)) writeSheet('npc-' + f.replace('-spritesheet.png', ''), path.join(NPC_DIR, f), j);
}
const PORT = path.join(NPC_DIR, 'portraits');
if (fs.existsSync(PORT)) for (const f of fs.readdirSync(PORT).filter(f => f.endsWith('.png')))
    writeSheet('portrait-' + f.replace('-portrait.png', ''), path.join(PORT, f), null);
// UI
const G = path.join(A, 'graphics');
writeSheet('ui-buttons', path.join(G, 'spritesheets', 'button-spritesheet.png'), path.join(G, 'spritesheets', 'button-spritesheet.json'));
writeSheet('ui-quest-markers', path.join(G, 'spritesheets', 'quest-markers-spritesheet.png'), path.join(G, 'spritesheets', 'quest-markers-spritesheet.json'));
writeSheet('ui-npc-name-tag', path.join(G, 'npc-name-tag.png'), null);
writeSheet('ui-name-tag', path.join(G, 'name-tag.png'), null);
const MENU = path.join(REF, 'images', 'menu');
if (fs.existsSync(MENU)) for (const f of fs.readdirSync(MENU).filter(f => f.endsWith('-icon.png')))
    writeSheet('menu-' + f.replace('.png', ''), path.join(MENU, f), null);

console.log(`Room ${ROOM}: ${below.length} layer dưới, ${above.length} layer trên, ${decor.length} decor, ` +
    `${room.fishing.length} vùng câu, ${teleports.length} cổng, spawn (${spawn.x}, ${spawn.y}) từ ${spawn.from}`);
console.log(`Đã ghi ${writtenSheets.size} sprite sheet vào assets/resources/sheets`);
if (missing.length) console.log('Không tìm thấy ảnh cho:', missing.join(', '));
