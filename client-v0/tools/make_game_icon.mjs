// Icon game 512×512: nền và thỏ vẽ pixel art trên lưới 128×128 rồi phóng 4 lần (lọc gần nhất, giữ nét); thỏ lấy từ sprite thật,
// cá lấy từ art cá thật của game (public/assets/fish) ghép lên sau khi phóng.
//     node tools/make_game_icon.mjs        # ghi public/icon-512.png
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PNG } from 'pngjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const N = 128;
const SCALE = 4;
const px = new Uint8ClampedArray(N * N * 4); // RGBA

const hex = (v) => [(v >> 16) & 255, (v >> 8) & 255, v & 255];
function put(x, y, color, a = 255) {
  if (x < 0 || y < 0 || x >= N || y >= N) return;
  const i = (y * N + x) * 4;
  const [r, g, b] = typeof color === 'number' ? hex(color) : color;
  const k = a / 255;
  px[i] = r * k + px[i] * (1 - k);
  px[i + 1] = g * k + px[i + 1] * (1 - k);
  px[i + 2] = b * k + px[i + 2] * (1 - k);
  px[i + 3] = Math.max(px[i + 3], a);
}
const rect = (x, y, w, h, c) => {
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) put(x + i, y + j, c);
};
const disc = (cx, cy, r, c) => {
  for (let y = -r; y <= r; y++) for (let x = -r; x <= r; x++) if (x * x + y * y <= r * r + r * 0.6) put(cx + x, cy + y, c);
};

// Nền: trời chuyển màu, dải biển ở dưới.
const SKY = [0x7cc8f5, 0x9fdcf8, 0xc9eefc];
for (let y = 0; y < N; y++) {
  const t = y / 80;
  const c = t < 0.5 ? SKY[0] : t < 0.8 ? SKY[1] : SKY[2];
  for (let x = 0; x < N; x++) put(x, y, c);
}
// Mặt trời và mây.
disc(22, 20, 11, 0xffe27a);
disc(22, 20, 8, 0xfff3b0);
for (const [x, y, w] of [[62, 14, 22], [68, 9, 12], [84, 44, 16]]) {
  rect(x, y, w, 5, 0xffffff);
  rect(x + 3, y - 3, w - 8, 4, 0xffffff);
}
// Biển: hai tầng xanh và gợn sóng.
const WATER_TOP = 84;
for (let y = WATER_TOP; y < N; y++) for (let x = 0; x < N; x++) put(x, y, y < WATER_TOP + 14 ? 0x3d8fdc : 0x2c6fc0);
for (let y = WATER_TOP + 6; y < N; y += 9) for (let x = (y % 2) * 6; x < N; x += 14) rect(x, y, 6, 1, 0x7ab6f0);
rect(0, WATER_TOP, N, 2, 0xcfe9ff); // mép sóng sáng

// Thỏ từ sprite thật (khung idle nhìn xuống), phóng 2 lần ở giữa dưới.
const j = JSON.parse(readFileSync(join(ROOT, 'public/assets/characters/skin_02.json'), 'utf8'));
const png = PNG.sync.read(readFileSync(join(ROOT, 'public/assets/characters/skin_02.png')));
const f = j.frames.idle_down_0.frame;
const SX = 40, SY = 32, SW = 40, SH = 46; // vùng đầu + thân trong khung 120×140
const Z = 2;
const ox = 58 - Math.floor((SW * Z) / 2) + 6;
const oy = 112 - SH * Z;
for (let y = 0; y < SH; y++) for (let x = 0; x < SW; x++) {
  const i = ((f.y + SY + y) * png.width + f.x + SX + x) * 4;
  const a = png.data[i + 3];
  if (!a) continue;
  const c = [png.data[i], png.data[i + 1], png.data[i + 2]];
  for (let dy = 0; dy < Z; dy++) for (let dx = 0; dx < Z; dx++) put(ox + x * Z + dx, oy + y * Z + dy, c, a === 255 ? 255 : 120);
}
// Bo góc (bán kính 18 trên lưới 128) và viền tối mỏng.
const R = 18;
for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
  const cx = x < R ? R : x >= N - R ? N - 1 - R : x;
  const cy = y < R ? R : y >= N - R ? N - 1 - R : y;
  const d = Math.hypot(x - cx, y - cy);
  const i = (y * N + x) * 4;
  if (d > R) px[i + 3] = 0;
  else if (d > R - 2) {
    px[i] = 0x2a;
    px[i + 1] = 0x4a;
    px[i + 2] = 0x7a;
    px[i + 3] = 255;
  }
}

// Phóng 4 lần.
const out = new PNG({ width: N * SCALE, height: N * SCALE });
for (let y = 0; y < out.height; y++) for (let x = 0; x < out.width; x++) {
  const s = (Math.floor(y / SCALE) * N + Math.floor(x / SCALE)) * 4;
  const d = (y * out.width + x) * 4;
  out.data[d] = px[s];
  out.data[d + 1] = px[s + 1];
  out.data[d + 2] = px[s + 2];
  out.data[d + 3] = px[s + 3];
}
// Ghép cá thật của game (thu nhỏ bằng trung bình vùng để nét mịn), chỉ vẽ lên chỗ chưa trong suốt.
function blitFish(file, x0, y0, width, flip = false) {
  const f = PNG.sync.read(readFileSync(join(ROOT, 'public/assets/fish', file)));
  const k = f.width / width;
  const w = Math.round(width);
  const h = Math.round(f.height / k);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    let r = 0, g = 0, b = 0, a = 0, n = 0;
    for (let sy = Math.floor(y * k); sy < Math.min(f.height, Math.ceil((y + 1) * k)); sy++) {
      for (let sx = Math.floor(x * k); sx < Math.min(f.width, Math.ceil((x + 1) * k)); sx++) {
        const i = (sy * f.width + (flip ? f.width - 1 - sx : sx)) * 4;
        const al = f.data[i + 3] / 255;
        r += f.data[i] * al; g += f.data[i + 1] * al; b += f.data[i + 2] * al; a += al; n += 1;
      }
    }
    if (!n || a / n < 0.05) continue;
    const alpha = a / n;
    const d = ((y0 + y) * out.width + x0 + x) * 4;
    if (d < 0 || x0 + x >= out.width || y0 + y >= out.height) continue;
    out.data[d] = (r / a) * alpha + out.data[d] * (1 - alpha);
    out.data[d + 1] = (g / a) * alpha + out.data[d + 1] * (1 - alpha);
    out.data[d + 2] = (b / a) * alpha + out.data[d + 2] * (1 - alpha);
    out.data[d + 3] = Math.max(out.data[d + 3], Math.round(alpha * 255));
  }
}
// Cá chép koi nhảy lên bên phải, cá vàng bên trái, cá xanh và cá mập nhỏ bơi dưới nước.
blitFish('CaKoi.png', 340, 100, 150);
blitFish('CaChep.png', 36, 150, 130, true);
blitFish('CaChim.png', 38, 392, 96, true);
blitFish('CaMap.png', 372, 386, 104);
// Bọt nước.
for (const [bx, by, br] of [[190, 360, 6], [206, 336, 4], [326, 372, 5], [150, 330, 4], [344, 348, 7]]) {
  for (let y = -br; y <= br; y++) for (let x = -br; x <= br; x++) {
    const d2 = x * x + y * y;
    if (d2 > br * br) continue;
    const edge = d2 > (br - 1.5) * (br - 1.5);
    const i = ((by + y) * out.width + bx + x) * 4;
    const c = edge ? 255 : 220;
    out.data[i] = c; out.data[i + 1] = 240; out.data[i + 2] = 255; out.data[i + 3] = edge ? 220 : 90;
  }
}
writeFileSync(join(ROOT, 'public', 'icon-512.png'), PNG.sync.write(out));
console.log('Đã ghi public/icon-512.png', out.width + 'x' + out.height);
