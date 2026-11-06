// Builds public/rooms/*.{json,png} from saved Tiled maps. Usage: node tools/build-rooms.mjs <reference-folder>
//
// For each room: composites every visible tile layer's real tile images into one background
// PNG at native resolution (public/rooms/<key>.png), and copies each decor image layer's real
// source PNG into public/assets/rooms/decor/ (deduplicated), referenced by the room JSON's
// decor[].image. A decor item whose plain "-still.png" wasn't downloaded but has a same-subject
// animated spritesheet elsewhere in the reference folder is published as that full sheet instead
// (public/assets/rooms/decor-anim/, decor[].anim: {sheet, atlas, prefix, frames, w, h}), so the
// client plays it animated rather than showing one static frame. A decor item with neither keeps
// only its averaged `color` as a fallback (see decor[].sourceImage).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PNG } from 'pngjs';

const reference = path.resolve(process.argv[2]);
const rootDir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const outDir = path.join(rootDir, 'public', 'rooms');
const decorDir = path.join(rootDir, 'public', 'assets', 'rooms', 'decor');
const FLIP_MASK = 0x1fffffff;
const HFLIP = 0x80000000, VFLIP = 0x40000000, DFLIP = 0x20000000;
const SKIP_LAYERS = /^(blocked|spawnable|botPath|puffle|fishing|clouds\d?)$/;
const SEASONAL = /christmas|pumpkin|prezzie|easter|halloween|candyCane/i;
const BIG_DECOR = 200000;

const ROOMS = {
  safeArea: { file: 'safeArea', title: 'Main Town', background: '#3a9bdc' },
  store: { file: 'tinkerbean', title: 'Tinkerbean', background: '#1d1a24' },
  cafe: { file: 'cafe', title: 'Cafe', background: '#1d1a24' },
  nightclub: { file: 'nightclub', title: 'Nightclub', background: '#14101f' },
  pvpArea: { file: 'pvpArea', title: 'Battlezone', background: '#2a2a33' },
  apartmentLobby: { file: 'apartmentLobby', title: 'Sunrise Apartments', background: '#1d1a24' },
  coralCove: { file: 'coralCove', title: 'Coral Cove', background: '#35d4f3' },
  hugglehenFarms: { file: 'hugglehenFarms', title: 'Hugglehen Farms', background: '#3a9bdc' },
};

const readPng = (file) => (fs.existsSync(file) ? PNG.sync.read(fs.readFileSync(file)) : null);
const toHex = ([r, g, b]) => `#${[r, g, b].map((v) => Math.round(v).toString(16).padStart(2, '0')).join('')}`;
const cleanPath = (p) => p.replace(/^(\.\.\/)+/, '');

function averageColor(png, x0 = 0, y0 = 0, w = png.width, h = png.height) {
  let r = 0, g = 0, b = 0, a = 0, n = 0;
  const step = Math.max(1, Math.floor(Math.sqrt((w * h) / 4000)));
  for (let y = y0; y < y0 + h; y += step) {
    for (let x = x0; x < x0 + w; x += step) {
      const i = (png.width * y + x) * 4;
      const alpha = png.data[i + 3] / 255;
      r += png.data[i] * alpha;
      g += png.data[i + 1] * alpha;
      b += png.data[i + 2] * alpha;
      a += alpha;
      n += 1;
    }
  }
  return a ? { rgb: [r / a, g / a, b / a], coverage: a / n } : { rgb: [0, 0, 0], coverage: 0 };
}

// Blits one tile's real pixels (with Tiled's flip/rotate bits applied) onto the room canvas,
// alpha-blending over whatever is already there (src-over).
function blitTile(target, targetW, destX, destY, size, src, sx, sy, flipX, flipY, flipD) {
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let rx = x, ry = y;
      if (flipD) { const t = rx; rx = ry; ry = t; }
      if (flipX) rx = size - 1 - rx;
      if (flipY) ry = size - 1 - ry;
      const si = ((sy + ry) * src.width + (sx + rx)) * 4;
      const a = src.data[si + 3];
      if (a === 0) continue;
      const di = ((destY + y) * targetW + (destX + x)) * 4;
      if (a === 255) {
        target[di] = src.data[si]; target[di + 1] = src.data[si + 1]; target[di + 2] = src.data[si + 2]; target[di + 3] = 255;
        continue;
      }
      const sa = a / 255, da = target[di + 3] / 255, oa = sa + da * (1 - sa);
      if (oa <= 0) continue;
      target[di] = Math.round((src.data[si] * sa + target[di] * da * (1 - sa)) / oa);
      target[di + 1] = Math.round((src.data[si + 1] * sa + target[di + 1] * da * (1 - sa)) / oa);
      target[di + 2] = Math.round((src.data[si + 2] * sa + target[di + 2] * da * (1 - sa)) / oa);
      target[di + 3] = Math.round(oa * 255);
    }
  }
}

function loadTilesets(map) {
  return map.tilesets.map((set) => {
    const image = set.image ? cleanPath(set.image) : null;
    return { ...set, image, png: image ? readPng(path.join(reference, image)) : null };
  }).sort((a, b) => b.firstgid - a.firstgid);
}

function tilesetFor(sets, gid) {
  return sets.find((s) => gid >= s.firstgid);
}

function flatten(layers, group = '', out = []) {
  for (const layer of layers) {
    if (layer.type === 'group') flatten(layer.layers, layer.name, out);
    else out.push({ ...layer, group });
  }
  return out;
}

const props = (item) => Object.fromEntries((item.properties ?? []).map((p) => [p.name, p.value]));

// A decor image that wasn't downloaded as a plain "-still.png" often still exists as frame 0 of
// a same-named "-spritesheet.png" *somewhere* in the reference folder (the download kept the
// animated sheet but not the static export, and the two aren't always in the same directory).
// Indexed once: "<basename-without -spritesheet.png>" -> its relative path.
let spritesheetIndex = null;
function indexSpritesheets() {
  spritesheetIndex = new Map();
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (/-spritesheet\.png$/i.test(entry.name)) {
        const base = entry.name.replace(/-spritesheet\.png$/i, '');
        spritesheetIndex.set(base, path.relative(reference, full).replace(/\\/g, '/'));
      }
    }
  };
  walk(reference);
}

// Converts "accordionPineRL" -> "accordion-pine-rl" to try matching a layer's own name too,
// since the still/spritesheet basenames don't always agree (e.g. "accordion-pine-tree-still"
// vs "accordion-pine-tree-lr-spritesheet").
const kebab = (s) => s.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();

// Finds a same-subject "-spritesheet.png" elsewhere in the reference folder for a decor layer
// whose plain "-still.png" wasn't downloaded, so it can be shown animated instead of static.
function findRecoverySheet(sourceImage, layerName) {
  if (!spritesheetIndex) indexSpritesheets();
  const stillBase = path.basename(sourceImage).replace(/-still\.png$/i, '');
  const layerKebab = kebab(layerName);
  const candidates = [stillBase, layerKebab, `${layerKebab}-tree`, layerKebab.replace(/-r-l$/, '-rl'), layerKebab.replace(/-l-r$/, '-lr')];
  for (const c of candidates) if (spritesheetIndex.has(c)) return spritesheetIndex.get(c);
  // Last resort: any indexed sheet whose name contains every hyphen-chunk of the still's own
  // basename (e.g. "accordion-pine-tree-still" vs "accordion-pine-tree-rl-spritesheet"). Not
  // directional — a mirrored (LR/RL) pair can't always be told apart this way.
  const chunks = stillBase.replace(/-still$/, '').split('-');
  return [...spritesheetIndex.entries()].find(([name]) => chunks.every((c) => name.includes(c)))?.[1] ?? null;
}

// Deduplicates decor source images across every room: copies each real PNG once into
// public/assets/rooms/decor/ and returns the published path to reference it by.
const decorCopies = new Map(); // sourceImage -> { image } | { anim } | null
function publishDecorImage(sourceImage, layerName) {
  if (decorCopies.has(sourceImage)) return decorCopies.get(sourceImage);
  const base = sourceImage.replace(/\//g, '-').replace(/\.png$/i, '');
  const src = path.join(reference, sourceImage);
  let result;
  if (fs.existsSync(src)) {
    const published = `rooms/decor/${base}.png`;
    fs.mkdirSync(decorDir, { recursive: true });
    fs.copyFileSync(src, path.join(rootDir, 'public', 'assets', published));
    result = { image: published };
  } else {
    const sheetRel = findRecoverySheet(sourceImage, layerName);
    const sheetPath = sheetRel && path.join(reference, sheetRel);
    const jsonPath = sheetPath && sheetPath.replace(/\.png$/i, '.json');
    const sheet = sheetPath && readPng(sheetPath);
    const atlas = sheet && fs.existsSync(jsonPath) ? JSON.parse(fs.readFileSync(jsonPath, 'utf8')) : null;
    const frames = atlas && Object.values(atlas.frames || atlas.textures?.[0]?.frames || {});
    if (frames?.length) {
      // Published as a full animated sheet, not a cropped static frame — see decor[].anim.
      const sheetBase = path.basename(sheetRel).replace(/\.png$/i, '');
      const publishedPng = `rooms/decor-anim/${sheetBase}.png`;
      const publishedJson = `rooms/decor-anim/${sheetBase}.json`;
      fs.mkdirSync(path.join(rootDir, 'public', 'assets', 'rooms', 'decor-anim'), { recursive: true });
      fs.copyFileSync(sheetPath, path.join(rootDir, 'public', 'assets', publishedPng));
      fs.copyFileSync(jsonPath, path.join(rootDir, 'public', 'assets', publishedJson));
      const prefix = frames[0].filename.replace(/\d+$/, '');
      result = {
        anim: { sheet: publishedPng, atlas: publishedJson, prefix, frames: frames.length, w: frames[0].frame.w, h: frames[0].frame.h },
      };
    } else {
      result = null;
    }
  }
  decorCopies.set(sourceImage, result);
  return result;
}

function buildRoom(key, spec) {
  const map = JSON.parse(fs.readFileSync(path.join(reference, 'maps', `${spec.file}.json`), 'utf8'));
  const { width, height, tilewidth: tile } = map;
  const layers = flatten(map.layers);
  const tilesets = loadTilesets(map);
  const tilesetImages = [...new Set(tilesets.filter((s) => s.image).map((s) => s.image))];

  const tileLayers = layers.filter((l) => l.type === 'tilelayer' && l.visible !== false && !SKIP_LAYERS.test(l.name));
  const blockedLayer = layers.find((l) => l.name === 'blocked');
  const blocked = blockedLayer.data.map((v) => (v ? '1' : '0')).join('');

  // A tile is "present" for bounds purposes if any kept layer draws something there.
  const present = new Array(width * height).fill(false);
  for (const layer of tileLayers) layer.data.forEach((raw, i) => { if (raw) present[i] = true; });

  let minX = width, minY = height, maxX = 0, maxY = 0;
  present.forEach((p, i) => {
    if (!p || blocked[i] === '1') return;
    minX = Math.min(minX, i % width);
    minY = Math.min(minY, Math.floor(i / width));
    maxX = Math.max(maxX, i % width);
    maxY = Math.max(maxY, Math.floor(i / width));
  });
  const pad = 12;
  const bounds = {
    tx: Math.max(0, minX - pad),
    ty: Math.max(0, minY - pad),
    w: Math.min(width - 1, maxX + pad) - Math.max(0, minX - pad) + 1,
    h: Math.min(height - 1, maxY + pad) - Math.max(0, minY - pad) + 1,
  };

  // Composite every kept tile layer, in Tiled's own order, into one background image at native
  // (tile * bounds) pixel resolution — real art, not an averaged color per tile.
  const pxW = bounds.w * tile, pxH = bounds.h * tile;
  const canvas = Buffer.alloc(pxW * pxH * 4);
  let blitCount = 0;
  for (const layer of tileLayers) {
    for (let ty = 0; ty < bounds.h; ty++) {
      const rowBase = (bounds.ty + ty) * width;
      for (let tx = 0; tx < bounds.w; tx++) {
        const raw = layer.data[rowBase + bounds.tx + tx];
        if (!raw) continue;
        const gid = raw & FLIP_MASK;
        const set = tilesetFor(tilesets, gid);
        if (!set?.png) continue;
        const index = gid - set.firstgid;
        const size = set.tilewidth;
        const sx = (index % set.columns) * size, sy = Math.floor(index / set.columns) * size;
        if (sx + size > set.png.width || sy + size > set.png.height) continue;
        blitTile(
          canvas, pxW, tx * tile, ty * tile, size, set.png, sx, sy,
          Boolean(raw & HFLIP), Boolean(raw & VFLIP), Boolean(raw & DFLIP),
        );
        blitCount += 1;
      }
    }
  }

  const objects = layers.filter((l) => l.objects).flatMap((l) => l.objects);
  const rect = (o) => ({ x: o.x, y: o.y, w: o.width, h: o.height });
  const decor = [];
  for (const layer of layers) {
    if (layer.type !== 'imagelayer' || SEASONAL.test(layer.name) || !layer.image) continue;
    const p = props(layer);
    const sourceImage = cleanPath(layer.image);
    const published = publishDecorImage(sourceImage, layer.name);
    // Prefer the real downloaded file for sizing/color; fall back to the published art (a full
    // animated sheet's frame 0, cropped in memory just for measurement) when it's missing.
    let png = readPng(path.join(reference, sourceImage));
    if (!png && published?.image) png = readPng(path.join(rootDir, 'public', 'assets', published.image));
    let sampleRect = null;
    if (!png && published?.anim) {
      png = readPng(path.join(rootDir, 'public', 'assets', published.anim.sheet));
      sampleRect = [0, 0, published.anim.w, published.anim.h];
    }
    const w = p.width ?? published?.anim?.w ?? png?.width ?? 30;
    const h = p.height ?? published?.anim?.h ?? png?.height ?? 30;
    const x = (layer.offsetx ?? 0) + (layer.x ?? 0), y = (layer.offsety ?? 0) + (layer.y ?? 0);
    const below = layer.group === 'objectsBelow' || w * h > BIG_DECOR;
    decor.push({
      name: layer.name, x, y, w, h,
      depth: w * h > BIG_DECOR ? -700 : below ? -600 : y + (p.z ?? h),
      color: png ? toHex(averageColor(png, ...(sampleRect ?? [])).rgb) : '#8a8a8a',
      image: published?.image ?? null,
      anim: published?.anim ?? null,
      // Where this item's art came from, relative to the reference folder passed on the command
      // line (not shipped in this repo). Lets an artist find and repaint the original.
      sourceImage,
    });
  }

  const spawnLayer = layers.find((l) => l.name === 'spawnable');
  const portal = decor.find((d) => d.name === 'entryPortal');
  let spawn = null;
  if (portal && spawnLayer) {
    let best = Infinity;
    spawnLayer.data.forEach((v, i) => {
      if (!v) return;
      const x = (i % width) * tile + 15, y = Math.floor(i / width) * tile + 24;
      const d = Math.hypot(x - portal.x - portal.w / 2, y - portal.y - portal.h);
      if (d < best) { best = d; spawn = { x, y }; }
    });
  }

  const png = new PNG({ width: pxW, height: pxH });
  canvas.copy(png.data);
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, `${key}.png`), PNG.sync.write(png));

  return {
    key,
    title: spec.title,
    background: spec.background,
    tile,
    width,
    height,
    bounds,
    blocked,
    tilesetImages,
    tileBlits: blitCount,
    colliders: objects.filter((o) => o.name === 'collider').map(rect),
    teleports: objects.filter((o) => o.name === 'teleport').map((o) => {
      const p = props(o);
      return { ...rect(o), room: p.destinationRoom, destX: p.destinationX, destY: p.destinationY, dir: p.directionOut ?? 'down' };
    }),
    fishing: objects.filter((o) => o.name === 'fishing').map((o) => ({ ...rect(o), direction: props(o).direction })),
    seats: objects.filter((o) => o.name === 'seat').map((o) => {
      const p = props(o);
      return { x: o.x, y: o.y, direction: p.direction, exitX: p.exitX, exitY: p.exitY, exitDirection: p.exitDirection };
    }),
    decor,
    spawn,
  };
}

fs.mkdirSync(outDir, { recursive: true });
for (const [key, spec] of Object.entries(ROOMS)) {
  const room = buildRoom(key, spec);
  const { tileBlits, ...toSave } = room;
  fs.writeFileSync(path.join(outDir, `${key}.json`), JSON.stringify(toSave));
  const withImage = room.decor.filter((d) => d.image).length;
  const withAnim = room.decor.filter((d) => d.anim).length;
  console.log(
    `${key}: ${room.bounds.w}x${room.bounds.h} tiles (${tileBlits} real tiles drawn), `
    + `${room.teleports.length} exits, ${room.seats.length} seats, ${room.fishing.length} fishing edges, `
    + `${room.decor.length} decor (${withImage} static + ${withAnim} animated = ${withImage + withAnim} with real art), `
    + `spawn ${JSON.stringify(room.spawn)}`,
  );
}
