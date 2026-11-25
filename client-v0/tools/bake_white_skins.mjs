// Tạo bản MÀU TRẮNG cho các loài chưa có (panel Chọn nhân vật chỉ liệt kê loài ở bản trắng, màu khác đổi lúc chạy, yêu cầu 2026-11-25).
// Sheet bot đã bake chỉ dùng vài màu; đổi đúng các màu lông về bộ ba màu trắng chung với Thỏ 2 / Mèo trắng / Vịt trắng:
//   LIGHT f9f7e4 (lông chính), MID e5d09d (bóng), DARK b5976e (bóng đậm). Viền 7d593a, mắt, mũi, tai trong giữ nguyên.
//
//     node tools/bake_white_skins.mjs         # ghi public/assets/characters/skin_bot_<loài>_white.png|json
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PNG } from 'pngjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const DIR = join(ROOT, 'public', 'assets', 'characters');
const LIGHT = 'f9f7e4';
const MID = 'e5d09d';
const DARK = 'b5976e';

/** nguồn → bản trắng: ánh xạ màu (hex không '#'). */
const SPECIES = {
  skin_bot_beaver_white: {
    from: 'skin_bot_beaver_brown',
    map: { c0a172: LIGHT, aa866f: MID },
  },
  skin_bot_rat_white: {
    from: 'skin_bot_rat_grey',
    map: { cdc7c8: LIGHT, '9fa1ac': MID },
  },
  skin_bot_shiba_white: {
    from: 'skin_bot_shiba_cream',
    // f7f9e4 (đốm trắng) giữ nguyên để đốm vẫn trắng ở mọi màu.
    map: { f0d299: LIGHT, cdaf7b: MID, bda075: DARK, f6e3ba: LIGHT },
  },
  skin_bot_turtle_white: {
    from: 'skin_bot_turtle_green',
    map: { c2c65a: LIGHT, b3a885: MID, bda075: DARK },
  },
  skin_bot_harlequin_white: {
    from: 'skin_bot_harlequin',
    // Mảng xám/cam của Harlequin thành hai độ bóng khác nhau để còn thấy hoa văn.
    map: { f1b159: LIGHT, a1978c: MID, '927d61': DARK, ed985c: MID },
  },
  skin_bot_red_bunny_white: {
    from: 'skin_bot_red_spotted_bunny',
    // Đốm đỏ thành bóng (MID/DARK), thân trắng giữ LIGHT.
    map: { f69261: MID, da775c: DARK, e0dac6: MID, f9f7e4: LIGHT },
  },
};

const hex = (d, i) => [d[i], d[i + 1], d[i + 2]].map((v) => v.toString(16).padStart(2, '0')).join('');

for (const [id, { from, map }] of Object.entries(SPECIES)) {
  const png = PNG.sync.read(readFileSync(join(DIR, `${from}.png`)));
  let changed = 0;
  for (let i = 0; i < png.data.length; i += 4) {
    if (png.data[i + 3] === 0) continue;
    const target = map[hex(png.data, i)];
    if (!target) continue;
    png.data[i] = parseInt(target.slice(0, 2), 16);
    png.data[i + 1] = parseInt(target.slice(2, 4), 16);
    png.data[i + 2] = parseInt(target.slice(4, 6), 16);
    changed += 1;
  }
  const json = JSON.parse(readFileSync(join(DIR, `${from}.json`), 'utf8'));
  json.meta.image = `${id}.png`;
  json.meta.source = 'tools/bake_white_skins.mjs';
  writeFileSync(join(DIR, `${id}.png`), PNG.sync.write(png));
  writeFileSync(join(DIR, `${id}.json`), JSON.stringify(json));
  console.log(id, 'đổi', changed, 'pixel từ', from);
}
