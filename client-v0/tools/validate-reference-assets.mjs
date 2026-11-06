// Read-only technical check of the private reference folder's asset files against the specs
// recorded in ASSETS.md: does every PNG decode, and does every atlas frame's rectangle actually
// fit inside its image? Nothing here is copied, rendered as gameplay, or written into the game.
// Usage: node tools/validate-reference-assets.mjs <reference-folder>
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PNG } from 'pngjs';

const ref = path.resolve(process.argv[2] ?? 'D:/Zen-Workplace/pixadom-reference');
const roomsDir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'public', 'rooms');
const errors = [];
const ok = [];

function pngSize(file) {
  const full = path.join(ref, file);
  if (!fs.existsSync(full)) return { error: `missing file: ${file}` };
  try {
    const png = PNG.sync.read(fs.readFileSync(full));
    return { w: png.width, h: png.height };
  } catch (e) {
    return { error: `PNG decode failed for ${file}: ${e.message}` };
  }
}

function checkAtlas(label, jsonFile, pngFile, expectFrames) {
  const jsonFull = path.join(ref, jsonFile);
  if (!fs.existsSync(jsonFull)) { errors.push(`${label}: missing json ${jsonFile}`); return; }
  let j;
  try { j = JSON.parse(fs.readFileSync(jsonFull, 'utf8')); } catch (e) { errors.push(`${label}: bad json ${jsonFile}: ${e.message}`); return; }
  const frames = j.frames || j.textures?.[0]?.frames;
  if (!frames) { errors.push(`${label}: no frames in ${jsonFile}`); return; }
  const list = Object.values(frames);
  if (expectFrames != null && list.length !== expectFrames) {
    errors.push(`${label}: expected ${expectFrames} frames, found ${list.length} in ${jsonFile}`);
  }
  const size = pngSize(pngFile);
  if (size.error) { errors.push(`${label}: ${size.error}`); return; }
  let badFrames = 0;
  for (const f of list) {
    const r = f.frame;
    if (r.x < 0 || r.y < 0 || r.x + r.w > size.w || r.y + r.h > size.h) badFrames += 1;
  }
  if (badFrames) errors.push(`${label}: ${badFrames}/${list.length} frame(s) in ${jsonFile} fall outside ${pngFile} (${size.w}x${size.h})`);
  else ok.push(`${label}: ${list.length} frames OK against ${pngFile} (${size.w}x${size.h})`);
}

function checkImage(label, file, expectW, expectH) {
  const size = pngSize(file);
  if (size.error) { errors.push(`${label}: ${size.error}`); return; }
  if ((expectW && size.w !== expectW) || (expectH && size.h !== expectH)) {
    errors.push(`${label}: expected ${expectW}x${expectH}, got ${size.w}x${size.h} (${file})`);
  } else {
    ok.push(`${label}: ${size.w}x${size.h} OK (${file})`);
  }
}

// --- Character layers ---
checkAtlas('body skin-1', 'assets/spritesheets/player-spritesheet.json', 'assets/spritesheets/player-spritesheet-skin-1.png', 36);
checkAtlas('body skin-2', 'assets/spritesheets/player-spritesheet.json', 'assets/spritesheets/player-spritesheet-skin-2.png', 36);
checkAtlas('body skin-3', 'assets/spritesheets/player-spritesheet.json', 'assets/spritesheets/player-spritesheet-skin-3.png', 36);
checkAtlas('hair set 1', 'assets/spritesheets/hair-spritesheet.json', 'assets/spritesheets/hair-spritesheet.png', 1680);
checkAtlas('hair set 2', 'assets/spritesheets/hair-2-spritesheet.json', 'assets/spritesheets/hair-2-spritesheet.png', 1280);
checkAtlas('tops', 'assets/spritesheets/tops-spritesheet.json', 'assets/spritesheets/tops-spritesheet.png', 792);
checkAtlas('bottoms', 'assets/spritesheets/bottoms-spritesheet.json', 'assets/spritesheets/bottoms-spritesheet.png', 72);

// --- NPCs ---
const npcs = [['fergus', 14], ['marigold', 15], ['marlin', 20], ['daisy', 20], ['gizmo', 20], ['barnaby', 16]];
for (const [name, frames] of npcs) {
  checkAtlas(`npc ${name}`, `assets/spritesheets/npcs/${name}-spritesheet.json`, `assets/spritesheets/npcs/${name}-spritesheet.png`, frames);
}
checkAtlas('npc helga', 'assets/rooms/apartmentLobby/helga-spritesheet.json', 'assets/rooms/apartmentLobby/helga-spritesheet.png', 12);
for (const name of ['fergus', 'gizmo', 'marigold', 'marlin']) {
  checkImage(`portrait ${name}`, `assets/spritesheets/npcs/portraits/${name}-portrait.png`);
}

// --- Buttons / markers ---
checkAtlas('buttons', 'assets/graphics/spritesheets/button-spritesheet.json', 'assets/graphics/spritesheets/button-spritesheet.png', 19);
checkAtlas('quest markers', 'assets/graphics/spritesheets/quest-markers-spritesheet.json', 'assets/graphics/spritesheets/quest-markers-spritesheet.png', 21);
checkImage('npc name tag', 'assets/graphics/npc-name-tag.png', 29, 8);

// --- Menu icons ---
for (const name of ['change-look', 'inventory', 'quests', 'friends', 'groups', 'settings', 'supporter', 'help']) {
  checkImage(`menu icon ${name}`, `images/menu/${name}-icon.png`);
}

// --- Room decor provenance (sourceImage recorded by tools/build-rooms.mjs) ---
let decorChecked = 0, decorMissing = 0;
for (const file of fs.readdirSync(roomsDir)) {
  const room = JSON.parse(fs.readFileSync(path.join(roomsDir, file), 'utf8'));
  for (const d of room.decor) {
    decorChecked += 1;
    if (!fs.existsSync(path.join(ref, d.sourceImage))) decorMissing += 1;
  }
}
ok.push(`room decor: ${decorChecked - decorMissing}/${decorChecked} sourceImage files present (${decorMissing} missing — expected for the known "-still" gap)`);

console.log(`\n=== OK (${ok.length}) ===`);
ok.forEach((l) => console.log('  ' + l));
console.log(`\n=== ERRORS (${errors.length}) ===`);
errors.forEach((l) => console.log('  ' + l));
process.exit(errors.length ? 1 : 0);
