// Hand-placed additions on top of the generated room data (public/rooms/*.json is rebuilt by
// tools/build-rooms.mjs, so anything added straight into those files would be lost on the next
// rebuild). applyRoomExtras() is called by both the server and the client right after a room
// JSON is loaded, so both sides agree on the extra decor, seats and colliders.

// Tree-stump stools: the 30x30 stool tile from the shared tileset (reference/tilemaps/tiles.png,
// x 120, y 720), saved as public/assets/rooms/decor/coral-cove-stool.png.
const STOOL_IMAGE = 'rooms/decor/coral-cove-stool.png';

// One stool whose seat (where a seated player's feet go) is (x, y), facing `direction`. The
// image is placed so a seated character sits on the stool top, drawn just under that character;
// the collider covers the legs so nobody walks through it; standing up steps back onto the dock,
// away from the water.
const STEP_BACK = { down: [0, -26], up: [0, 26], left: [26, 0], right: [-26, 0] };
function stool(x, y, direction, index) {
  const [bx, by] = STEP_BACK[direction];
  return {
    decor: { name: `stool${index + 1}`, x: x - 15, y: y - 18, w: 30, h: 30, depth: y - 2, image: STOOL_IMAGE, anim: null },
    seat: { x, y, direction, exitX: x + bx, exitY: y + by, exitDirection: direction, stool: true },
    collider: { x: x - 11, y: y - 4, w: 22, h: 12 },
  };
}

// Coral Cove: 20 stools along the dock's edges, facing the water. Every seat sits inside one of
// the room's fishing edges (room.fishing) and faces the same way, so a later "sit to fish" rule
// can use the seat directly. Spacing is even along each edge (about 55-65 px); on the two
// 2-tile-wide posts the stools on opposite sides are staggered so the walkway stays open.
const CORAL_COVE_SEATS = [
  // left arm, bottom edge
  ...[1760, 1825, 1890, 1945].map((x) => [x, 1799, 'down']),
  // left post: outer (left) side, then inner (right) side over the coral
  ...[1600, 1650].map((y) => [1928, y, 'left']),
  ...[1700, 1760].map((y) => [1972, y, 'right']),
  // top bar, inner edge over the coral
  ...[2020, 2080, 2140, 2200].map((x) => [x, 1619, 'down']),
  // right post: inner (left) side over the coral, then outer (right) side
  ...[1700, 1760].map((y) => [2257, y, 'left']),
  ...[1600, 1650].map((y) => [2302, y, 'right']),
  // right arm: top edge, then the short bottom edge left of the bridge
  ...[2345, 2405, 2465].map((x) => [x, 1748, 'up']),
  [2300, 1799, 'down'],
];
const CORAL_COVE_STOOLS = CORAL_COVE_SEATS.map(([x, y, direction], i) => stool(x, y, direction, i));

const EXTRAS = {
  coralCove: {
    decor: CORAL_COVE_STOOLS.map((s) => s.decor),
    seats: CORAL_COVE_STOOLS.map((s) => s.seat),
    colliders: CORAL_COVE_STOOLS.map((s) => s.collider),
  },
};

export function applyRoomExtras(room) {
  const extra = EXTRAS[room.key];
  if (!extra || room.extrasApplied) return room;
  room.decor = [...room.decor, ...(extra.decor ?? [])];
  room.seats = [...room.seats, ...(extra.seats ?? [])];
  room.colliders = [...room.colliders, ...(extra.colliders ?? [])];
  room.extrasApplied = true;
  return room;
}
