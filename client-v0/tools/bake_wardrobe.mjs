// Bake trang phục lẻ (mũ, áo, quần) bán ở Cửa hàng thành sheet nhỏ, MỖI MÓN MỘT SHEET chỉ chứa lớp đồ (nền trong suốt), cùng khung
// 120×140, pivot, tên frame `<anim>_<dir>_<i>` và JSON Hash như skin (tools/bake_outfit_skins.mjs) để vẽ chồng lên thân bằng các sprite
// cùng nhịp animation (CharacterView). Danh sách món: tools/wardrobe-items.json (sinh bởi tools/make_wardrobe_items.py).
//
//     node tools/bake_wardrobe.mjs                  # ghi public/assets/wardrobe/<id>.png|json cho mọi món
//     node tools/bake_wardrobe.mjs --only=hat_cap   # chỉ bake món này
// Logic ghép bản sao từ bake_outfit_skins.mjs (khung 120×140, chân tại (23, 53) trong khung gốc, lật `side` cho hướng trái).
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PNG } from 'pngjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = join(ROOT, 'public', 'new resources', 'anim', 'atlases');
const OUT = join(ROOT, 'public', 'assets', 'wardrobe');
const ITEMS = JSON.parse(readFileSync(join(ROOT, 'tools', 'wardrobe-items.json'), 'utf8')).items;

/** Tên thư mục trong atlas theo loại (áo = torso, nguyên bộ = outfit). */
const ATLAS_SLOT = { hat: 'hat', top: 'torso', legs: 'legs', set: 'outfit' };

const FEET = [23, 53];
const W = 120;
const H = 140;
const PIVOT = [W >> 1, 76];
const OFFSET = [PIVOT[0] - FEET[0], PIVOT[1] - FEET[1]];
const DIRS = { down: ['down', false], up: ['up', false], right: ['side', false], left: ['side', true] };
const SIT = 'sit';
// Giống ANIMS trong bake_outfit_skins.mjs: [dãy [khung thân, dx, dy], tốc độ, lặp].
const ANIMS = {
  idle: [Array(4).fill([0, 0, 0]), 4, true],
  walk: [Array.from({ length: 10 }, (_, i) => [i, 0, 0]), 12, true],
  sit: [Array(2).fill([SIT, 0, 0]), 2, true],
  cast: [Array.from({ length: 10 }, () => [SIT, 0, 0]), 14, false],
  wait: [Array.from({ length: 10 }, () => [SIT, 0, 0]), 8, true],
  bite: [[[SIT, -1, 0], [SIT, 1, 0], [SIT, -1, 0], [SIT, 1, 0]], 12, true],
  reel: [[[SIT, 0, 0], [SIT, 0, 1], [SIT, 0, 0], [SIT, 0, 1], [SIT, 0, 0], [SIT, 0, 1]], 12, true],
  success: [[[SIT, 0, 0], [SIT, 0, -2], [SIT, 0, -3], [SIT, 0, -2], [SIT, 0, 0], [SIT, 0, 0]], 10, false],
  fail: [Array.from({ length: 6 }, () => [SIT, 0, 0]), 8, false],
};

if (!existsSync(SRC)) throw new Error('Thiếu atlas cosmetics');
const frames = {};
for (const i of [0, 1, 2]) {
  const json = JSON.parse(readFileSync(join(SRC, `sheet-cosmetics-${i}.json`), 'utf8'));
  const image = PNG.sync.read(readFileSync(join(SRC, json.meta.image)));
  for (const [name, frame] of Object.entries(json.frames)) frames[name] = { frame, image };
}

/** Một frame của atlas đặt vào khung sourceSize (gốc trên-trái), RGBA thẳng. */
function getFrame(name) {
  const entry = frames[name];
  if (!entry) throw new Error(`Atlas không có frame ${name}`);
  const { frame, image } = entry;
  const { x, y, w, h } = frame.frame;
  const src = frame.sourceSize;
  const out = { w: src.w, h: src.h, data: new Uint8Array(src.w * src.h * 4) };
  const { x: sx, y: sy } = frame.spriteSourceSize;
  const cw = frame.rotated ? h : w;
  const ch = frame.rotated ? w : h;
  for (let row = 0; row < ch; row++) {
    for (let col = 0; col < cw; col++) {
      const si = frame.rotated
        ? ((y + col) * image.width + x + (h - 1 - row)) * 4
        : ((y + row) * image.width + x + col) * 4;
      const di = ((sy + row) * src.w + sx + col) * 4;
      out.data.set(image.data.subarray(si, si + 4), di);
    }
  }
  return out;
}

const blank = () => ({ w: W, h: H, data: new Uint8Array(W * H * 4) });

/** Đặt lớp lên khung ghép theo OFFSET, lật quanh trục chân nếu cần (như bake_outfit_skins.place). */
function place(canvas, layer, dx, dy, flip) {
  const x = flip ? PIVOT[0] - (layer.w - 1 - FEET[0]) + dx : OFFSET[0] + dx;
  const y = OFFSET[1] + dy;
  for (let ly = 0; ly < layer.h; ly++) {
    const cy = y + ly;
    if (cy < 0 || cy >= H) continue;
    for (let lx = 0; lx < layer.w; lx++) {
      const cx = x + lx;
      if (cx < 0 || cx >= W) continue;
      const si = (ly * layer.w + (flip ? layer.w - 1 - lx : lx)) * 4;
      const sa = layer.data[si + 3] / 255;
      if (sa === 0) continue;
      const di = (cy * W + cx) * 4;
      const da = canvas.data[di + 3] / 255;
      const a = sa + da * (1 - sa);
      for (let c = 0; c < 3; c++) {
        const rgb = (layer.data[si + c] / 255 * sa + (canvas.data[di + c] / 255) * da * (1 - sa)) / a;
        canvas.data[di + c] = Math.round(rgb * 255);
      }
      canvas.data[di + 3] = Math.round(a * 255);
    }
  }
}

const itemFrame = (atlasSlot, atlas, dir, index) =>
  index === SIT ? `traits/${atlasSlot}/${atlas}/sit_${dir}` : `traits/${atlasSlot}/${atlas}/${dir}${index}`;

function bakeItem(item) {
  const out = {};
  const atlasSlot = ATLAS_SLOT[item.slot];
  for (const [dir, [bodyDir, flip]] of Object.entries(DIRS)) {
    for (const [anim, [seq]] of Object.entries(ANIMS)) {
      seq.forEach(([bi, dx, dy], i) => {
        const canvas = blank();
        place(canvas, getFrame(itemFrame(atlasSlot, item.atlas, bodyDir, bi)), dx, dy, flip);
        out[`${anim}_${dir}_${i}`] = canvas;
      });
    }
  }
  return out;
}

function writeSheet(base, itemFrames) {
  const unique = new Map();
  const tiles = [];
  const ref = {};
  for (const [name, img] of Object.entries(itemFrames)) {
    const key = createHash('md5').update(img.data).digest('hex');
    if (!unique.has(key)) {
      unique.set(key, tiles.length);
      tiles.push(img);
    }
    ref[name] = unique.get(key);
  }
  const cols = Math.min(16, tiles.length);
  const rows = Math.ceil(tiles.length / cols);
  const sheet = new PNG({ width: cols * W, height: rows * H });
  tiles.forEach((tile, i) => {
    const ox = (i % cols) * W;
    const oy = Math.floor(i / cols) * H;
    for (let y = 0; y < H; y++)
      sheet.data.set(tile.data.subarray(y * W * 4, (y + 1) * W * 4), ((oy + y) * sheet.width + ox) * 4);
  });
  const anchor = { x: PIVOT[0] / W, y: PIVOT[1] / H };
  const data = {
    frames: Object.fromEntries(
      Object.entries(ref).map(([name, i]) => [
        name,
        {
          frame: { x: (i % cols) * W, y: Math.floor(i / cols) * H, w: W, h: H },
          rotated: false,
          trimmed: false,
          spriteSourceSize: { x: 0, y: 0, w: W, h: H },
          sourceSize: { w: W, h: H },
          anchor,
        },
      ]),
    ),
    meta: {
      image: `${base.split(/[\\/]/).pop()}.png`,
      size: { w: sheet.width, h: sheet.height },
      format: 'RGBA8888',
      scale: '1',
      source: 'tools/bake_wardrobe.mjs',
    },
    animations: Object.fromEntries(
      Object.entries(ANIMS).map(([name, [seq, rate, loop]]) => [name, { frames: seq.length, rate, loop }]),
    ),
    pivot: { x: PIVOT[0], y: PIVOT[1] },
  };
  mkdirSync(dirname(base), { recursive: true });
  writeFileSync(`${base}.png`, PNG.sync.write(sheet));
  writeFileSync(`${base}.json`, JSON.stringify(data));
  return { cols, rows, tiles: tiles.length, bytes: PNG.sync.write(sheet).length };
}

/**
 * Ảnh xem thử cho Cửa hàng: một sheet chung chứa khung `idle_down_0` của mọi món, cắt vùng quanh nhân vật (THUMB_BOX) để tab Trang phục
 * chỉ tải 1 ảnh + 1 JSON thay vì hàng trăm sheet. Cửa hàng vẽ thân (cắt cùng vùng) rồi chồng ảnh món lên.
 */
const THUMB_BOX = { x: 36, y: 22, w: 48, h: 60 };
function writeThumbs(items) {
  const cols = 20;
  const rows = Math.ceil(items.length / cols);
  const sheet = new PNG({ width: cols * THUMB_BOX.w, height: rows * THUMB_BOX.h });
  const index = {};
  items.forEach(({ item, frame }, i) => {
    const ox = (i % cols) * THUMB_BOX.w;
    const oy = Math.floor(i / cols) * THUMB_BOX.h;
    for (let y = 0; y < THUMB_BOX.h; y++) {
      const from = ((THUMB_BOX.y + y) * W + THUMB_BOX.x) * 4;
      sheet.data.set(frame.data.subarray(from, from + THUMB_BOX.w * 4), ((oy + y) * sheet.width + ox) * 4);
    }
    index[item.id] = { x: ox, y: oy };
  });
  writeFileSync(join(OUT, '_thumbs.png'), PNG.sync.write(sheet));
  writeFileSync(join(OUT, '_thumbs.json'), JSON.stringify({ box: THUMB_BOX, items: index }));
}

const only = process.argv.find((arg) => arg.startsWith('--only='))?.slice(7).split(',');
let total = 0;
let count = 0;
const thumbs = [];
for (const item of ITEMS) {
  if (only && !only.includes(item.id)) continue;
  const frames = bakeItem(item);
  const result = writeSheet(join(OUT, item.id), frames);
  thumbs.push({ item, frame: frames.idle_down_0 });
  total += result.bytes;
  count += 1;
}
if (!only) writeThumbs(thumbs);
console.log(`Đã bake ${count} món vào ${OUT.replace(ROOT, '.')}, tổng PNG ${(total / 1024 / 1024).toFixed(1)} MB`);
