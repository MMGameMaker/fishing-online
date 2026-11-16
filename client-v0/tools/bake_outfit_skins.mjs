// Ghép skin thỏ mặc trang phục (skin_06–skin_10) từ atlas cosmetics thành sheet nhỏ, cùng khung, pivot,
// tên frame `<anim>_<dir>_<i>` và JSON Hash như tools/bake_characters.py (skin_01–05 chỉ là thân thỏ trần).
// Viết bằng Node vì máy dev không bắt buộc có Python; logic ghép bản sao từ bake_characters.py (khung 120×140,
// chân tại (23, 53) trong khung gốc, bóng dưới chân khi không ngồi, lật `side` cho hướng trái).
// Thêm/đổi skin: sửa bảng OUTFIT_SKINS rồi chạy:
//
//     node tools/bake_outfit_skins.mjs            # ghi public/assets/characters/skin_06..10
//     node tools/bake_outfit_skins.mjs --check    # kiểm port: ghép lại skin_01 và so từng điểm ảnh với file đã bake
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PNG } from 'pngjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = join(ROOT, 'public', 'new resources', 'anim', 'atlases');
const OUT_SKIN = join(ROOT, 'public', 'assets', 'characters');

/** Skin game → thân thỏ + trang phục trong atlas (5 bộ chọn ngẫu nhiên 2026-11-16; giá/mở khoá do Server quyết định). */
export const OUTFIT_SKINS = {
  skin_06: { body: 'brown', outfit: 'queen-dress' },
  skin_07: { body: 'brown', outfit: 'bunny-onesie-blue' },
  skin_08: { body: 'brown', outfit: 'yellow-raincoat-purple' },
  skin_09: { body: 'brown', outfit: 'swimsuit-pink' },
  skin_10: { body: 'brown', outfit: 'santa-outfit' },
};

const SHADOW = 'general/bunny_shadow';
const FEET = [23, 53];
const W = 120;
const H = 140;
const PIVOT = [W >> 1, 76];
const OFFSET = [PIVOT[0] - FEET[0], PIVOT[1] - FEET[1]];
const DIRS = { down: ['down', false], up: ['up', false], right: ['side', false], left: ['side', true] };
const SIT = 'sit';
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

const frames = {};
const sheets = {};
for (const i of [0, 1, 2]) {
  const json = JSON.parse(readFileSync(join(SRC, `sheet-cosmetics-${i}.json`), 'utf8'));
  sheets[i] = PNG.sync.read(readFileSync(join(SRC, json.meta.image)));
  for (const [name, frame] of Object.entries(json.frames)) frames[name] = { frame, image: sheets[i] };
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
      // Frame xoay: vùng lưu rộng h, cao w; np.rot90(k=1) → out[row][col] = stored[col][h - 1 - row].
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

/** Đặt lớp lên khung ghép theo OFFSET, lật quanh trục chân nếu cần; trộn alpha như bake_characters.place. */
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

const bodyFrame = (body, dir, index) =>
  index === SIT ? `traits/body/${body}/sit_${dir}` : `traits/body/${body}/${dir}${index}`;
const outfitFrame = (outfit, dir, index) =>
  index === SIT ? `traits/outfit/${outfit}/sit_${dir}` : `traits/outfit/${outfit}/${dir}${index}`;

function alphaTop(layer) {
  for (let y = 0; y < layer.h; y++)
    for (let x = 0; x < layer.w; x++) if (layer.data[(y * layer.w + x) * 4 + 3] > 0) return y;
  throw new Error('Frame rỗng');
}

function bakeSkin(body, outfit) {
  const out = {};
  const shadow = getFrame(SHADOW);
  for (const [dir, [bodyDir, flip]] of Object.entries(DIRS)) {
    for (const [anim, [seq]] of Object.entries(ANIMS)) {
      seq.forEach(([bi, dx, dy], i) => {
        const canvas = blank();
        if (bi !== SIT) place(canvas, shadow, dx, 0, flip);
        place(canvas, getFrame(bodyFrame(body, bodyDir, bi)), dx, dy, flip);
        if (outfit) place(canvas, getFrame(outfitFrame(outfit, bodyDir, bi)), dx, dy, flip);
        out[`${anim}_${dir}_${i}`] = canvas;
      });
    }
  }
  return out;
}

function writeSheet(base, skinFrames) {
  const unique = new Map();
  const tiles = [];
  const ref = {};
  for (const [name, img] of Object.entries(skinFrames)) {
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
      source: 'tools/bake_outfit_skins.mjs',
    },
    animations: Object.fromEntries(
      Object.entries(ANIMS).map(([name, [seq, rate, loop]]) => [name, { frames: seq.length, rate, loop }]),
    ),
    pivot: { x: PIVOT[0], y: PIVOT[1] },
    // Đỉnh đầu tính trên frame đã mặc đồ (mũ/mũ trùm cao hơn tai trần), để nhãn tên không đè lên.
    headTop: PIVOT[1] - alphaTop(skinFrames.idle_down_0),
  };
  mkdirSync(dirname(base), { recursive: true });
  writeFileSync(`${base}.png`, PNG.sync.write(sheet));
  writeFileSync(`${base}.json`, JSON.stringify(data, null, 1));
  console.log(`${base.replace(ROOT, '.')} ${Object.keys(ref).length} frame, ${tiles.length} ô riêng, ${sheet.width}×${sheet.height}`);
  return sheet;
}

if (process.argv.includes('--check')) {
  // Ghép lại skin_01 (thân brown, không trang phục) và so với file python đã bake.
  const sheet = writeSheet(join(process.env.TEMP ?? '.', 'bake-check', 'skin_01'), bakeSkin('brown', null));
  const real = PNG.sync.read(readFileSync(join(OUT_SKIN, 'skin_01.png')));
  let diff = 0;
  let maxDelta = 0;
  if (real.width !== sheet.width || real.height !== sheet.height) {
    console.log(`Khác kích thước: ${sheet.width}×${sheet.height} so với ${real.width}×${real.height}`);
    process.exit(1);
  }
  for (let i = 0; i < real.data.length; i++) {
    const d = Math.abs(real.data[i] - sheet.data[i]);
    if (d) diff++;
    maxDelta = Math.max(maxDelta, d);
  }
  console.log(`Số byte lệch: ${diff}/${real.data.length}, lệch lớn nhất ${maxDelta}`);
  process.exit(maxDelta > 1 ? 1 : 0);
}

for (const [id, { body, outfit }] of Object.entries(OUTFIT_SKINS)) {
  if (!existsSync(SRC)) throw new Error('Thiếu atlas cosmetics');
  writeSheet(join(OUT_SKIN, id), bakeSkin(body, outfit));
}
