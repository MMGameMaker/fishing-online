// Cắt vật trang trí lẻ từ atlas game ra public/assets/props/<tên>.png (cắt sát, cỡ gốc pixel art).
// Dùng cho đồ đặt kèm NPC trên map pier (lake.npcs[].prop) mà sheet map chưa nạp.
//
//     node tools/export_props.mjs
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PNG } from 'pngjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = join(ROOT, 'public', 'new resources', 'anim', 'atlases');
const OUT = join(ROOT, 'public', 'assets', 'props');

/** Tên file → [sheet, frame]. stone-slab: phiến đá cáo bán cá ngồi (người dùng duyệt 2026-11-20). */
const PROPS = {
  'stone-slab': ['sheet-cathedral-0.json', 'evernite-cathedral/Assets/Stone-Slab-1'],
};

mkdirSync(OUT, { recursive: true });
for (const [name, [sheet, frameName]] of Object.entries(PROPS)) {
  const json = JSON.parse(readFileSync(join(SRC, sheet), 'utf8'));
  const image = PNG.sync.read(readFileSync(join(SRC, json.meta.image)));
  const frame = json.frames[frameName];
  if (!frame) throw new Error(`Atlas ${sheet} không có frame ${frameName}`);
  const { x, y, w, h } = frame.frame;
  const cw = frame.rotated ? h : w;
  const ch = frame.rotated ? w : h;
  const out = new PNG({ width: cw, height: ch });
  for (let row = 0; row < ch; row++)
    for (let col = 0; col < cw; col++) {
      const si = frame.rotated
        ? ((y + col) * image.width + x + (h - 1 - row)) * 4
        : ((y + row) * image.width + x + col) * 4;
      out.data.set(image.data.subarray(si, si + 4), (row * cw + col) * 4);
    }
  writeFileSync(join(OUT, `${name}.png`), PNG.sync.write(out));
  console.log(`${name}.png ${cw}×${ch}`);
}
