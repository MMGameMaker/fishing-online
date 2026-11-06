// Real sprite art, copied into this project under public/assets/ (see ASSETS.md for where each
// file came from and its frame layout) after being edited in place. This loads like any other
// file under public/, in both `vite dev` and `vite build`.
import { BOTTOMS_TINTABLE, CLOTH_COLORS, HAIR_COLORS, HAIR_TINTABLE, TOPS_TINTABLE } from '../shared/config.js';

// NPC id -> real spritesheet/portrait under public/assets/npcs/. See ASSETS.md section 2.
export const NPC_SPRITES = {
  npc_gus: { sheet: 'gizmo', portrait: 'gizmo-portrait.png' },
  npc_mira: { sheet: 'marigold', portrait: 'marigold-portrait.png' },
  npc_reed: { sheet: 'marlin', portrait: 'marlin-portrait.png' },
  npc_theo: { sheet: 'daisy', portrait: null },
  // Drawn at 1x: the sheet is already a bust leaning on a counter, sized to the Tinkerbean counter.
  npc_barnaby: { sheet: 'barnaby', portrait: null, scale: 1 },
};

// Registers every named frame from a TexturePacker-hash atlas JSON onto texture `key`, keyed by
// each frame's own `filename` (not the file's numeric object keys) — see ASSETS.md for why.
// Exported: src/world.js reuses this for animated decor sheets (see build-rooms.mjs decor[].anim).
export function registerFrames(scene, key, jsonCacheKey) {
  const data = scene.cache.json.get(jsonCacheKey);
  const frames = data.frames || data.textures?.[0]?.frames;
  const texture = scene.textures.get(key);
  for (const f of Object.values(frames)) {
    if (!texture.has(f.filename)) texture.add(f.filename, 0, f.frame.x, f.frame.y, f.frame.w, f.frame.h);
  }
}

// Exported for the same reason as registerFrames.
export function queueSheet(scene, key, pngPath, jsonPath) {
  const jsonKey = `${key}_json`;
  if (!scene.textures.exists(key)) scene.load.image(key, pngPath);
  if (!scene.cache.json.has(jsonKey)) scene.load.json(jsonKey, jsonPath);
  return jsonKey;
}

// Call from a scene's preload(). Queues every sheet the game needs; registerReferenceArt()
// finishes the job once preload's load queue completes (early in create()).
export function preloadReferenceArt(scene) {
  // The 3 skin tones are separate whole sheets that all share one frame layout (one JSON load).
  if (!scene.cache.json.has('ref_body_json')) scene.load.json('ref_body_json', '/assets/characters/player-spritesheet.json');
  for (let skin = 0; skin < 3; skin++) {
    if (!scene.textures.exists(`ref_body_${skin}`)) scene.load.image(`ref_body_${skin}`, `/assets/characters/player-spritesheet-skin-${skin + 1}.png`);
  }
  queueSheet(scene, 'ref_hair', '/assets/characters/hair-spritesheet.png', '/assets/characters/hair-spritesheet.json');
  queueSheet(scene, 'ref_hair2', '/assets/characters/hair-2-spritesheet.png', '/assets/characters/hair-2-spritesheet.json');
  queueSheet(scene, 'ref_tops', '/assets/characters/tops-spritesheet.png', '/assets/characters/tops-spritesheet.json');
  queueSheet(scene, 'ref_bottoms', '/assets/characters/bottoms-spritesheet.png', '/assets/characters/bottoms-spritesheet.json');
  // Fishing pose: body (3 skins, one shared JSON), all tops/bottoms packed into one atlas each
  // (tools-gen/build_fishing_atlas.py), and the rods (5 levels).
  if (!scene.cache.json.has('ref_fishbody_json')) scene.load.json('ref_fishbody_json', '/assets/characters/fishing/player-fishing-spritesheet.json');
  for (let skin = 0; skin < 3; skin++) {
    if (!scene.textures.exists(`ref_fishbody_${skin}`)) scene.load.image(`ref_fishbody_${skin}`, `/assets/characters/fishing/player-fishing-spritesheet-skin-${skin + 1}.png`);
  }
  queueSheet(scene, 'ref_fishtops', '/assets/characters/fishing/fishing-tops-spritesheet.png', '/assets/characters/fishing/fishing-tops-spritesheet.json');
  queueSheet(scene, 'ref_fishbottoms', '/assets/characters/fishing/fishing-bottoms-spritesheet.png', '/assets/characters/fishing/fishing-bottoms-spritesheet.json');
  queueSheet(scene, 'ref_rods', '/assets/characters/fishing/fishing-rods-spritesheet.png', '/assets/characters/fishing/fishing-rods-spritesheet.json');
  queueSheet(scene, 'ref_buttons', '/assets/ui/button-spritesheet.png', '/assets/ui/button-spritesheet.json');
  for (const npc of Object.values(NPC_SPRITES)) {
    queueSheet(scene, `ref_npc_${npc.sheet}`, `/assets/npcs/${npc.sheet}-spritesheet.png`, `/assets/npcs/${npc.sheet}-spritesheet.json`);
  }
}

// Call once near the top of a scene's create(), after preload()'s queue has completed.
export function registerReferenceArt(scene) {
  for (let skin = 0; skin < 3; skin++) registerFrames(scene, `ref_body_${skin}`, 'ref_body_json');
  for (let skin = 0; skin < 3; skin++) registerFrames(scene, `ref_fishbody_${skin}`, 'ref_fishbody_json');
  for (const key of ['ref_fishtops', 'ref_fishbottoms', 'ref_rods']) registerFrames(scene, key, `${key}_json`);
  for (const key of ['ref_hair', 'ref_hair2', 'ref_tops', 'ref_bottoms', 'ref_buttons']) registerFrames(scene, key, `${key}_json`);
  for (const npc of Object.values(NPC_SPRITES)) registerFrames(scene, `ref_npc_${npc.sheet}`, `ref_npc_${npc.sheet}_json`);
}

// Hair is split over two sheets: styles 1..84 (index 0..83) in hair-spritesheet, 85..148 in
// hair-2-spritesheet. Frame names are the same in both ('<pose>-hair-<style number>').
const HAIR_SHEET_1_COUNT = 84;
export const hairTextureKey = (hairStyle) => (hairStyle < HAIR_SHEET_1_COUNT ? 'ref_hair' : 'ref_hair2');

// Icon for one hair/top/bottom style in the Change Look grid: that layer's idle front frame,
// cropped to its own opaque pixels and centered on a square canvas. Only the item itself is
// drawn (no body/head), so every tab reads like an inventory of items.
const STYLE_FRAME = {
  hair: (style) => [hairTextureKey(style), `player-down-0-hair-${style + 1}`],
  top: (style) => ['ref_tops', `player-down-0-top-${style + 1}`],
  bottom: (style) => ['ref_bottoms', `player-down-0-bottom-${style + 1}`],
};
const iconBounds = new Map();

function opaqueBounds(canvas) {
  const { width, height } = canvas;
  const data = canvas.getContext('2d').getImageData(0, 0, width, height).data;
  let x0 = width, y0 = height, x1 = -1, y1 = -1;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (data[(y * width + x) * 4 + 3] > 0) {
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
      }
    }
  }
  return x1 < 0 ? { x: 0, y: 0, w: width, h: height } : { x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 };
}

export function drawStyleIcon(scene, layer, style, tintColor) {
  const [key, name] = STYLE_FRAME[layer](style);
  const frame = scene.textures.getFrame(key, name);
  const icon = document.createElement('canvas');
  if (!frame) return icon;
  const { cutWidth: w, cutHeight: h } = frame;
  const full = document.createElement('canvas');
  full.width = w;
  full.height = h;
  const ctx = full.getContext('2d', { willReadFrequently: true });
  ctx.imageSmoothingEnabled = false;
  const cacheKey = `${key}/${name}`;
  if (!iconBounds.has(cacheKey)) {
    drawFrameLayer(ctx, frame, w, h, null);
    iconBounds.set(cacheKey, opaqueBounds(full));
    ctx.clearRect(0, 0, w, h);
  }
  drawFrameLayer(ctx, frame, w, h, tintColor);
  const b = iconBounds.get(cacheKey);
  const size = Math.max(b.w, b.h) + 2;
  icon.width = size;
  icon.height = size;
  const ictx = icon.getContext('2d');
  ictx.imageSmoothingEnabled = false;
  ictx.drawImage(full, b.x, b.y, b.w, b.h, Math.floor((size - b.w) / 2), Math.floor((size - b.h) / 2), b.w, b.h);
  return icon;
}

export const npcSheetKey = (npcId) => `ref_npc_${NPC_SPRITES[npcId]?.sheet}`;
// The frame name prefix used inside that NPC's atlas, e.g. "gizmo" for frames "gizmo0", "gizmo1"...
export const npcFramePrefix = (npcId) => NPC_SPRITES[npcId]?.sheet;
export const npcScale = (npcId) => NPC_SPRITES[npcId]?.scale ?? 1.3;
// How many "<prefix><n>" frames that NPC's atlas has, read from the already-loaded JSON (see
// ASSETS.md section 2 for the per-character counts: 14-20 depending on the NPC).
export function npcFrameCount(scene, npcId) {
  const data = scene.cache.json.get(`${npcSheetKey(npcId)}_json`);
  const frames = data.frames || data.textures?.[0]?.frames;
  return Object.keys(frames).length;
}
export const npcPortraitUrl = (npcId) => {
  const npc = NPC_SPRITES[npcId];
  return npc?.portrait ? `/assets/npcs/portraits/${npc.portrait}` : null;
};

// Draws one real sprite frame onto a plain 2D canvas, tinting it the same way the in-world
// character does (see HAIR_TINTABLE etc. in shared/config.js): multiply the tint color over the
// frame, then mask back to the frame's own alpha, so flat/grayscale styles pick up the chosen
// color while already-colored styles are left alone.
function drawFrameLayer(ctx, frame, w, h, tintColor) {
  if (!frame) return;
  const { cutX, cutY, cutWidth, cutHeight, source } = frame;
  const image = source.image;
  if (!tintColor) {
    ctx.drawImage(image, cutX, cutY, cutWidth, cutHeight, 0, 0, w, h);
    return;
  }
  const tmp = document.createElement('canvas');
  tmp.width = w;
  tmp.height = h;
  const tctx = tmp.getContext('2d');
  tctx.imageSmoothingEnabled = false;
  tctx.drawImage(image, cutX, cutY, cutWidth, cutHeight, 0, 0, w, h);
  tctx.globalCompositeOperation = 'multiply';
  tctx.fillStyle = tintColor;
  tctx.fillRect(0, 0, w, h);
  tctx.globalCompositeOperation = 'destination-in';
  tctx.drawImage(image, cutX, cutY, cutWidth, cutHeight, 0, 0, w, h);
  ctx.drawImage(tmp, 0, 0, w, h, 0, 0, w, h);
}

// Composites the real character art (body/bottom/top/hair, same layering as src/player.js) onto
// a fresh canvas for the Change Look preview, instead of the old drawn-placeholder look. `dir` is
// 'down' | 'up' | 'left' | 'right' (the Look panel's 'side' maps to 'right' before calling this).
// Requires the world scene's reference art to already be loaded and registered.
export function drawCharacterPreview(scene, look, dir) {
  const bodyKey = `ref_body_${look.skin}`;
  const bodyFrameName = `player-${dir}-0`;
  const bodyFrame = scene.textures.getFrame(bodyKey, bodyFrameName);
  const canvas = document.createElement('canvas');
  if (!bodyFrame) return canvas;
  const { cutWidth: w, cutHeight: h } = bodyFrame;
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  drawFrameLayer(ctx, bodyFrame, w, h, null);
  drawFrameLayer(ctx, scene.textures.getFrame('ref_bottoms', `${bodyFrameName}-bottom-${look.bottom + 1}`), w, h,
    BOTTOMS_TINTABLE[look.bottom] ? CLOTH_COLORS[look.bottomColor] : null);
  drawFrameLayer(ctx, scene.textures.getFrame('ref_tops', `${bodyFrameName}-top-${look.top + 1}`), w, h,
    TOPS_TINTABLE[look.top] ? CLOTH_COLORS[look.topColor] : null);
  drawFrameLayer(ctx, scene.textures.getFrame(hairTextureKey(look.hairStyle), `${bodyFrameName}-hair-${look.hairStyle + 1}`), w, h,
    HAIR_TINTABLE[look.hairStyle] ? HAIR_COLORS[look.hairColor] : null);
  return canvas;
}
