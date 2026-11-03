'use strict';
// Composes a lake map image from the FG_Abandoned_Mines tileset.
const fs = require('fs');
const path = require('path');
const { readPNG, writePNG, crop } = require('./png.js');

const SRC = path.join(__dirname, '..', 'assets', 'arts', 'FG_Abandoned_Mines.png');
const OUT_DIR = path.join(__dirname, '..', 'assets', 'arts');
const OUT_PNG = path.join(OUT_DIR, 'map_lake.png');
const OUT_META = OUT_PNG + '.meta';

const MAP_UUID = 'd1e2f3a4-7b80-4c91-ad02-be1f2a3b4c5d';

const TILE = 16;
const COLS = 40;
const ROWS = 30;
const SCALE = 3;                 // baked nearest-neighbour upscale, keeps pixels crisp
const BORDER = 1;                // rock ring around the map edge, in tiles

// Tile picks, verified visually as fully opaque 16x16 cells.
const GROUND = [[192, 224], [208, 224], [224, 224], [240, 224]];
const ROCK   = [[160, 160], [176, 160], [192, 160], [208, 160]];
const WATER  = [[96, 320], [112, 320], [128, 320]];

// Lake ellipse, in tiles.
const LAKE_CX = COLS / 2;
const LAKE_CY = ROWS / 2;
const LAKE_RX = 13;
const LAKE_RY = 8;
const RIM = 1.25;                // rock rim thickness, in tiles

function ellipse(tx, ty, rx, ry) {
    const dx = (tx + 0.5 - LAKE_CX) / rx;
    const dy = (ty + 0.5 - LAKE_CY) / ry;
    return dx * dx + dy * dy <= 1;
}

// Deterministic per-cell pseudo random, so reruns produce the same map.
function pick(list, tx, ty) {
    const h = (tx * 73856093) ^ (ty * 19349663);
    return list[Math.abs(h) % list.length];
}

const src = readPNG(SRC);
console.log('tileset:', src.width + 'x' + src.height);

const W = COLS * TILE;
const H = ROWS * TILE;
const map = { width: W, height: H, data: Buffer.alloc(W * H * 4) };

let counts = { ground: 0, rock: 0, water: 0 };

for (let ty = 0; ty < ROWS; ty++) {
    for (let tx = 0; tx < COLS; tx++) {
        let kind;
        const onEdge = tx < BORDER || ty < BORDER || tx >= COLS - BORDER || ty >= ROWS - BORDER;
        if (onEdge) {
            kind = 'rock';
        } else if (ellipse(tx, ty, LAKE_RX, LAKE_RY)) {
            kind = 'water';
        } else if (ellipse(tx, ty, LAKE_RX + RIM, LAKE_RY + RIM)) {
            kind = 'rock';
        } else {
            kind = 'ground';
        }
        counts[kind]++;

        const list = kind === 'water' ? WATER : kind === 'rock' ? ROCK : GROUND;
        const [sx, sy] = pick(list, tx, ty);
        const t = crop(src, sx, sy, TILE, TILE);

        for (let y = 0; y < TILE; y++) {
            const di = ((ty * TILE + y) * W + tx * TILE) * 4;
            const si = y * TILE * 4;
            t.data.copy(map.data, di, si, si + TILE * 4);
        }
    }
}

console.log('tiles:', counts);

// --- decorative props, alpha-composited onto ground cells only --------------
const PEBBLES  = [[256, 144], [288, 144], [336, 144], [272, 160], [320, 160]];
const BOULDERS = [[256, 176], [272, 176], [288, 176], [304, 176]];

/** Source-over alpha blend of a 16x16 tile onto the map at tile coords. */
function blit(tile, tx, ty) {
    for (let y = 0; y < TILE; y++) {
        for (let x = 0; x < TILE; x++) {
            const si = (y * TILE + x) * 4;
            const sa = tile.data[si + 3];
            if (sa === 0) continue;
            const di = ((ty * TILE + y) * W + (tx * TILE + x)) * 4;
            const a = sa / 255;
            for (let c = 0; c < 3; c++) {
                map.data[di + c] = Math.round(tile.data[si + c] * a + map.data[di + c] * (1 - a));
            }
            map.data[di + 3] = 255;
        }
    }
}

// Simple deterministic generator so the map is identical on every run.
let seed = 20261103;
function rnd() {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
}

function isGround(tx, ty) {
    const onEdge = tx < BORDER || ty < BORDER || tx >= COLS - BORDER || ty >= ROWS - BORDER;
    if (onEdge) return false;
    if (ellipse(tx, ty, LAKE_RX + RIM, LAKE_RY + RIM)) return false;
    return true;
}

const used = new Set();
let placed = 0;
function scatter(list, count) {
    let tries = 0;
    while (count > 0 && tries < 4000) {
        tries++;
        const tx = 1 + Math.floor(rnd() * (COLS - 2));
        const ty = 1 + Math.floor(rnd() * (ROWS - 2));
        const key = tx + ',' + ty;
        if (used.has(key) || !isGround(tx, ty)) continue;
        // keep the player's spawn area clear
        if (Math.abs(tx - COLS / 2) < 3 && ty > ROWS - 7) continue;
        used.add(key);
        const [sx, sy] = list[Math.floor(rnd() * list.length)];
        blit(crop(src, sx, sy, TILE, TILE), tx, ty);
        placed++;
        count--;
    }
}

scatter(PEBBLES, 34);
scatter(BOULDERS, 14);
console.log('props placed:', placed);

// Bake the upscale so the map stays crisp regardless of texture filtering.
const BW = W * SCALE, BH = H * SCALE;
const big = { width: BW, height: BH, data: Buffer.alloc(BW * BH * 4) };
for (let y = 0; y < BH; y++) {
    const sy = (y / SCALE) | 0;
    for (let x = 0; x < BW; x++) {
        const sx = (x / SCALE) | 0;
        const si = (sy * W + sx) * 4;
        const di = (y * BW + x) * 4;
        map.data.copy(big.data, di, si, si + 4);
    }
}

writePNG(OUT_PNG, big);
const kb = (fs.statSync(OUT_PNG).size / 1024).toFixed(0);
console.log('wrote', OUT_PNG, BW + 'x' + BH, kb + ' KB');

// --- meta -------------------------------------------------------------------
// Modelled on the editor's own default_sprite_splash.png.meta (type: sprite-frame).
const w = BW, h = BH;
const meta = {
    ver: '1.0.27',
    importer: 'image',
    imported: true,
    uuid: MAP_UUID,
    files: ['.json', '.png'],
    subMetas: {
        '6c48a': {
            ver: '1.0.22',
            importer: 'texture',
            uuid: MAP_UUID + '@6c48a',
            imported: true,
            files: ['.json'],
            subMetas: {},
            userData: {
                wrapModeS: 'clamp-to-edge',
                wrapModeT: 'clamp-to-edge',
                minfilter: 'nearest',
                magfilter: 'nearest',
                mipfilter: 'none',
                premultiplyAlpha: false,
                anisotropy: 0,
                isUuid: true,
                imageUuidOrDatabaseUri: MAP_UUID,
                visible: false,
            },
            displayName: 'map_lake',
            id: '6c48a',
            name: 'texture',
        },
        f9941: {
            ver: '1.0.12',
            importer: 'sprite-frame',
            uuid: MAP_UUID + '@f9941',
            imported: true,
            files: ['.json'],
            subMetas: {},
            userData: {
                wrapModeS: 'clamp-to-edge',
                wrapModeT: 'clamp-to-edge',
                minfilter: 'nearest',
                magfilter: 'nearest',
                premultiplyAlpha: false,
                generateMipmap: false,
                anisotropy: 1,
                trimType: 'none',
                trimThreshold: 1,
                rotated: false,
                offsetX: 0,
                offsetY: 0,
                trimX: 0,
                trimY: 0,
                width: w,
                height: h,
                rawWidth: w,
                rawHeight: h,
                borderTop: 0,
                borderBottom: 0,
                borderLeft: 0,
                borderRight: 0,
                isUuid: true,
                imageUuidOrDatabaseUri: MAP_UUID + '@6c48a',
                atlasUuid: '',
                mipfilter: 'none',
                packable: false,
                vertices: {
                    rawPosition: [
                        -w / 2, -h / 2, 0,
                        w / 2, -h / 2, 0,
                        -w / 2, h / 2, 0,
                        w / 2, h / 2, 0,
                    ],
                    indexes: [0, 1, 2, 2, 1, 3],
                    uv: [0, h, w, h, 0, 0, w, 0],
                    nuv: [0, 0, 1, 0, 0, 1, 1, 1],
                    minPos: [-w / 2, -h / 2, 0],
                    maxPos: [w / 2, h / 2, 0],
                },
                pixelsToUnit: 100,
                pivotX: 0.5,
                pivotY: 0.5,
                meshType: 0,
            },
            displayName: 'map_lake',
            id: 'f9941',
            name: 'spriteFrame',
        },
    },
    userData: {
        type: 'sprite-frame',
        redirect: MAP_UUID + '@f9941',
        hasAlpha: false,
        fixAlphaTransparencyArtifacts: false,
    },
};

fs.writeFileSync(OUT_META, JSON.stringify(meta, null, 2) + '\n', 'utf8');
console.log('wrote', OUT_META);

// --- numbers the scene and the controller need ------------------------------
console.log('\n--- world units (scale ' + SCALE + ') ---');
console.log('map       :', BW + ' x ' + BH);
console.log('border    :', BORDER * TILE * SCALE);
console.log('lake rx/ry:', LAKE_RX * TILE * SCALE + ' / ' + LAKE_RY * TILE * SCALE);
