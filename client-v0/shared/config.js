// Shared by server (validation) and client (rendering). Pure data + pure functions only.

export const TILE = 30;
export const START_ROOM = 'safeArea';
export const ROOM_KEYS = ['safeArea', 'store', 'cafe', 'nightclub', 'pvpArea', 'apartmentLobby', 'coralCove', 'hugglehenFarms'];
export const FEET = { halfW: 7, h: 6 };

const feetOverlap = (x, y, r, margin = 0) => x - FEET.halfW <= r.x + r.w + margin && x + FEET.halfW >= r.x - margin
  && y - FEET.h <= r.y + r.h + margin && y >= r.y - margin;

function isBlockedTile(room, tx, ty) {
  if (tx < 0 || ty < 0 || tx >= room.width || ty >= room.height) return true;
  return room.blocked[ty * room.width + tx] === '1';
}

// A feet-sized rectangle at (x, y) must not touch a blocked tile or a collider.
export function canStand(room, x, y) {
  for (const [px, py] of [[x - FEET.halfW, y - FEET.h], [x + FEET.halfW, y - FEET.h], [x - FEET.halfW, y], [x + FEET.halfW, y]]) {
    if (isBlockedTile(room, Math.floor(px / TILE), Math.floor(py / TILE))) return false;
  }
  return !room.colliders.some((c) => feetOverlap(x, y, c));
}

export const fishingZoneAt = (room, x, y) => room.fishing.find((z) => feetOverlap(x, y, z)) ?? null;

// Index of the exit under the player, or -1.
export const teleportAt = (room, x, y) => room.teleports.findIndex((t) => feetOverlap(x, y, t));

// The margin absorbs movement updates still in flight.
export const isAtExit = (exit, x, y, margin) => feetOverlap(x, y, exit, margin);

// Teleport targets can sit on a tile edge, so arrivals move to the closest standable point.
export function nearestStandable(room, x, y) {
  for (let radius = 0; radius <= 90; radius += 6) {
    for (let a = 0; a < 16; a++) {
      const px = x + Math.cos((a / 16) * Math.PI * 2) * radius;
      const py = y + Math.sin((a / 16) * Math.PI * 2) * radius;
      if (canStand(room, px, py) && teleportAt(room, px, py) < 0) return { x: Math.round(px), y: Math.round(py) };
    }
  }
  return { x, y };
}

// Where the bobber lands for a player at (x, y) casting in a direction.
export function castPoint(x, y, dir) {
  if (dir === 'down') return { x, y: y + 44 };
  if (dir === 'up') return { x, y: y - 76 };
  return { x: x + (dir === 'left' ? -58 : 58), y: y - 14 };
}

// ---------- Character customization ----------
// skin/hairStyle/top/bottom pick a real sprite (see public/assets/characters/, ASSETS.md §1) —
// the index here is the real style number minus 1.
export const SKIN_COLORS = ['#f8d5b8', '#e8b48a', '#c68a5c'];
export const HAIR_COLORS = ['#2b1d14', '#6b4226', '#c9a227', '#d94f4f', '#e87fb5', '#5aa9e6', '#7bd389', '#e8e8e8'];
export const CLOTH_COLORS = ['#e74c3c', '#e67e22', '#f1c40f', '#2ecc71', '#1abc9c', '#3498db', '#9b59b6', '#e84393', '#ecf0f1', '#34495e'];
// Every style in the real sheets (ASSETS.md §1): hair 1..84 live in hair-spritesheet, 85..148 in
// hair-2-spritesheet (see hairTextureKey in src/referenceArt.js); 22 tops; 2 bottoms.
const styleNames = (count) => Array.from({ length: count }, (_, i) => `Style ${i + 1}`);
export const HAIR_STYLES = styleNames(148);
export const TOPS = styleNames(22);
export const BOTTOMS = styleNames(2);

// Whether each style's art is a flat/near-grayscale shape (safe to tint with hairColor /
// topColor / bottomColor) or already carries its own baked-in color (tinting it would just
// muddy it). Measured from the real sheets: average HSV saturation of the opaque pixels
// (alpha > 128) in each style's 'player-down-0-<layer>-N' frame; a style counts as tintable
// below 0.06 (the flat styles measured 0-0.05, colored ones 0.07 and up). Listed by real style
// number. Re-measure if you repaint a style and its color changes.
const TINTABLE_HAIR = [1, 2, 3, 4, 5, 6, 7, 14, 26, 27, 34, 35, 36, 37, 38, 39, 46, 66, 73, 87, 88, 95, 117, 126, 136, 140, 143, 144, 145, 146, 147, 148];
const TINTABLE_TOPS = [1, 2, 3, 4, 11];
const tintable = (names, numbers) => names.map((_, i) => numbers.includes(i + 1));
export const HAIR_TINTABLE = tintable(HAIR_STYLES, TINTABLE_HAIR);
export const TOPS_TINTABLE = tintable(TOPS, TINTABLE_TOPS);
export const BOTTOMS_TINTABLE = [true, true];

export const LOOK_LIMITS = {
  skin: SKIN_COLORS.length,
  hairStyle: HAIR_STYLES.length,
  hairColor: HAIR_COLORS.length,
  top: TOPS.length,
  topColor: CLOTH_COLORS.length,
  bottom: BOTTOMS.length,
  bottomColor: CLOTH_COLORS.length,
};
// The starter outfit the character creator opens with on every login: skin 1, hair 1 (white),
// top 1 (white), pants 2 (dark navy). Indexes are style/color number minus 1.
export const DEFAULT_LOOK = { skin: 0, hairStyle: 0, hairColor: 7, top: 0, topColor: 8, bottom: 1, bottomColor: 9 };

// Returns a normalized look, or null when any field is not an in-range integer.
export function validateLook(look) {
  if (!look || typeof look !== 'object') return null;
  const out = {};
  for (const [key, limit] of Object.entries(LOOK_LIMITS)) {
    const v = look[key];
    if (!Number.isInteger(v) || v < 0 || v >= limit) return null;
    out[key] = v;
  }
  return out;
}

// ---------- Fishing ----------
export const RARITY_COLORS = { junk: '#8a8a8a', common: '#d8d8d8', uncommon: '#6bd36b', rare: '#5aa9ff', epic: '#c77dff', legendary: '#ffb02e' };
// speed: marker speed in bar pixels per millisecond.
export const FISH = [
  { id: 'boot', name: 'Old Boot', rarity: 'junk', weight: 8, speed: 0.16, value: 1, color: '#6b4b32' },
  { id: 'minnow', name: 'Minnow', rarity: 'common', weight: 28, speed: 0.18, value: 5, color: '#9fb4c7' },
  { id: 'perch', name: 'Perch', rarity: 'common', weight: 24, speed: 0.2, value: 8, color: '#8fbf6a' },
  { id: 'carp', name: 'Carp', rarity: 'common', weight: 18, speed: 0.22, value: 12, color: '#c9a064' },
  { id: 'trout', name: 'Trout', rarity: 'uncommon', weight: 10, speed: 0.26, value: 24, color: '#e08a8a' },
  { id: 'bass', name: 'Bass', rarity: 'uncommon', weight: 8, speed: 0.28, value: 30, color: '#4f8f6f' },
  { id: 'goldcarp', name: 'Golden Carp', rarity: 'rare', weight: 4, speed: 0.32, value: 70, color: '#f2c14e' },
  { id: 'puffer', name: 'Pufferfish', rarity: 'rare', weight: 3, speed: 0.34, value: 90, color: '#e7d27c' },
  { id: 'koi', name: 'Koi', rarity: 'epic', weight: 1.5, speed: 0.38, value: 180, color: '#ff7a59' },
  { id: 'moonfin', name: 'Moonfin', rarity: 'legendary', weight: 0.5, speed: 0.42, value: 500, color: '#b9a8ff' },
];
export const FISH_BY_ID = Object.fromEntries(FISH.map((f) => [f.id, f]));
export const isRareFish = (fish) => ['rare', 'epic', 'legendary'].includes(fish.rarity);

// Reel layout and pacing. Bar coordinates are pixels along the 278px water band.
export const REEL = {
  hitsNeeded: 3,
  barWidth: 278,
  markerMin: 17,
  markerMax: 262,
  // One per rod level (index = level - 1). Level 1 is the free starting rod and keeps its
  // original tuning; each purchasable upgrade (see ROD_PRICES) widens the zone, so a better
  // rod makes reeling easier rather than harder.
  zoneWidths: [66, 86, 106, 126, 146],
  castMs: 2000, // 16 frames at 8 fps
  hookedMs: 1625, // 13 frames at 8 fps
  introMs: 1450, // three overlay flashes, then a short pause
  zoneTimeMs: 12000,
};

export function rollZone(fish, rodLevel, rng) {
  const zoneWidth = REEL.zoneWidths[rodLevel - 1];
  const span = REEL.markerMax - REEL.markerMin - zoneWidth;
  return { startPosition: Math.round(REEL.markerMin + rng() * span), zoneWidth, zoneSpeed: fish.speed };
}

export const isInZone = (position, zone) => position >= zone.startPosition && position <= zone.startPosition + zone.zoneWidth;

// Rod shop: level 1 is free (the starting rod); each entry after it is the coin price to buy
// that level, bought one level at a time. Index = level - 1.
export const ROD_PRICES = [0, 150, 350, 650, 1000];

// ---------- Progress ----------
export const XP_PER_LEVEL = 100;
export const levelForPixels = (pixels) => Math.floor(pixels / XP_PER_LEVEL) + 1;

// ---------- Accounts (auth is intentionally bypassed: fixed local test accounts) ----------
export const SEED_ACCOUNTS = [
  { username: 'alice', display: 'Alice', look: { skin: 0, hairStyle: 3, hairColor: 3, top: 2, topColor: 7, bottom: 1, bottomColor: 9 } },
  { username: 'bob', display: 'Bob', look: { skin: 2, hairStyle: 2, hairColor: 0, top: 0, topColor: 3, bottom: 1, bottomColor: 9 } },
  { username: 'cleo', display: 'Cleo', look: { skin: 2, hairStyle: 1, hairColor: 5, top: 1, topColor: 2, bottom: 0, bottomColor: 5 } },
  { username: 'mochi', display: 'Mochi (bot)', bot: true, look: { skin: 1, hairStyle: 4, hairColor: 4, top: 3, topColor: 4, bottom: 0, bottomColor: 0 } },
];

export const LIMITS = { chatLen: 120, dmLen: 300 };
