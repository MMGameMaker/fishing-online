'use strict';
// Slices the 4x4 character sheets into individual sprite-frame assets.
//
// Both sheets are 128x128 = 4 columns x 4 rows of 32x32 frames.
// Row order is down, left, right, up; each row holds 4 animation frames.
const fs = require('fs');
const path = require('path');
const { readPNG, writePNG, crop } = require('./png.js');
const { writeSpriteFrameMeta } = require('./cocos-meta.js');

const SRC_DIR = path.join(__dirname, '..', 'assets', 'arts', 'character', 'character 1');
const OUT_DIR = path.join(__dirname, '..', 'assets', 'arts', 'character', 'frames');

const SHEETS = { idle: 'Character_020_Idle.png', walk: 'Character_020_Walk.png' };
const DIRS = ['down', 'left', 'right', 'up'];   // row order in the sheets
const FRAME = 32;
const COLS = 4;
const SCALE = 3;                                 // match the map's baked scale

// Deterministic uuids so the scene can reference the frames without guessing.
const UUID_PREFIX = 'e1d2c3b4-aaaa-4aaa-8aaa-0000000000';

function upscale(img, f) {
    const w = img.width * f, h = img.height * f;
    const out = Buffer.alloc(w * h * 4);
    for (let y = 0; y < h; y++) {
        const sy = (y / f) | 0;
        for (let x = 0; x < w; x++) {
            const sx = (x / f) | 0;
            const si = (sy * img.width + sx) * 4;
            img.data.copy(out, (y * w + x) * 4, si, si + 4);
        }
    }
    return { width: w, height: h, data: out };
}

fs.mkdirSync(OUT_DIR, { recursive: true });

const table = {};
let index = 0;

for (const [state, file] of Object.entries(SHEETS)) {
    const sheet = readPNG(path.join(SRC_DIR, file));
    if (sheet.width !== FRAME * COLS || sheet.height !== FRAME * DIRS.length) {
        throw new Error(`${file}: expected ${FRAME * COLS}x${FRAME * DIRS.length}, got ${sheet.width}x${sheet.height}`);
    }

    DIRS.forEach((dir, row) => {
        const key = `${state}_${dir}`;
        table[key] = [];
        for (let col = 0; col < COLS; col++) {
            const name = `${key}_${col}`;
            const hex = index.toString(16).padStart(2, '0');
            const uuid = UUID_PREFIX + hex;
            index++;

            const big = upscale(crop(sheet, col * FRAME, row * FRAME, FRAME, FRAME), SCALE);
            const png = path.join(OUT_DIR, name + '.png');
            writePNG(png, big);
            writeSpriteFrameMeta(png + '.meta', uuid, name, big.width, big.height, true);

            table[key].push(uuid + '@f9941');
        }
    });
}

const size = FRAME * SCALE;
console.log(`sliced ${index} frames at ${size}x${size}`);

// Emit the uuid table for gen-scene.js to consume.
const out = path.join(__dirname, 'character-frames.json');
fs.writeFileSync(out, JSON.stringify({ frameSize: size, frames: table }, null, 2) + '\n', 'utf8');
console.log('wrote', out);
for (const k of Object.keys(table)) console.log('  ' + k.padEnd(12), table[k].length + ' frames');
