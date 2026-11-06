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
  queueSheet(scene, 'ref_tops', '/assets/characters/tops-spritesheet.png', '/assets/characters/tops-spritesheet.json');
  queueSheet(scene, 'ref_bottoms', '/assets/characters/bottoms-spritesheet.png', '/assets/characters/bottoms-spritesheet.json');
  queueSheet(scene, 'ref_buttons', '/assets/ui/button-spritesheet.png', '/assets/ui/button-spritesheet.json');
  for (const npc of Object.values(NPC_SPRITES)) {
    queueSheet(scene, `ref_npc_${npc.sheet}`, `/assets/npcs/${npc.sheet}-spritesheet.png`, `/assets/npcs/${npc.sheet}-spritesheet.json`);
  }
}

// Call once near the top of a scene's create(), after preload()'s queue has completed.
export function registerReferenceArt(scene) {
  for (let skin = 0; skin < 3; skin++) registerFrames(scene, `ref_body_${skin}`, 'ref_body_json');
  for (const key of ['ref_hair', 'ref_tops', 'ref_bottoms', 'ref_buttons']) registerFrames(scene, key, `${key}_json`);
  for (const npc of Object.values(NPC_SPRITES)) registerFrames(scene, `ref_npc_${npc.sheet}`, `ref_npc_${npc.sheet}_json`);
}

export const npcSheetKey = (npcId) => `ref_npc_${NPC_SPRITES[npcId]?.sheet}`;
// The frame name prefix used inside that NPC's atlas, e.g. "gizmo" for frames "gizmo0", "gizmo1"...
export const npcFramePrefix = (npcId) => NPC_SPRITES[npcId]?.sheet;
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
  drawFrameLayer(ctx, scene.textures.getFrame('ref_hair', `${bodyFrameName}-hair-${look.hairStyle + 1}`), w, h,
    HAIR_TINTABLE[look.hairStyle] ? HAIR_COLORS[look.hairColor] : null);
  return canvas;
}
