import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { io } from 'socket.io-client';
import { createGameServer } from '../server/app.js';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  DEFAULT_LOOK, REEL, ROD_PRICES, ROOM_KEYS, SEED_ACCOUNTS,
  canStand, fishingZoneAt, isAtExit, levelForPixels, nearestStandable, rollZone, validateLook,
} from '../shared/config.js';
import { applyRoomExtras } from '../shared/roomExtras.js';
import { NPCS, SEAT_REACH } from '../shared/npcs.js';

const rooms = Object.fromEntries(ROOM_KEYS.map((key) => [key, applyRoomExtras(JSON.parse(fs.readFileSync(new URL(`../public/rooms/${key}.json`, import.meta.url))))]));
const SPAWN = { x: 1715, y: 1785 };

let server;
let url;
const clients = [];

before(async () => {
  server = createGameServer({
    port: 0,
    startRoom: 'coralCove',
    startAt: SPAWN,
    rng: () => 0.5,
    timing: { cast: 10, biteMin: 30, biteMax: 40, hooked: 150, reelTotal: 400, botReply: 10, minReelGap: 0 },
  });
  url = `http://localhost:${await server.start()}`;
});

after(async () => {
  clients.forEach((c) => c.disconnect());
  await server.stop();
});

const once = (socket, event) => new Promise((resolve) => socket.once(event, resolve));
const call = (socket, event, payload) => new Promise((resolve) => socket.emit(event, payload, resolve));

async function login(username) {
  const socket = io(url, { transports: ['websocket'], forceNew: true });
  clients.push(socket);
  await once(socket, 'connect');
  const res = await call(socket, 'login', { username });
  assert.equal(res.ok, true);
  return { socket, res };
}

const dockEdge = { x: 1800, y: 1799 };

// Fishing is only allowed from a stool by the water: walk up to the stool next to the dock edge
// and sit down (a no-op when already seated there).
const fishingStool = () => {
  const seats = rooms.coralCove.seats;
  const index = seats.reduce((best, s, i) => (s.stool && (best < 0
    || Math.hypot(s.x - dockEdge.x, s.y - dockEdge.y) < Math.hypot(seats[best].x - dockEdge.x, seats[best].y - dockEdge.y)) ? i : best), -1);
  return { index, seat: seats[index] };
};
async function sitOnStool(socket) {
  const { index, seat } = fishingStool();
  socket.emit('playerMovement', { x: seat.exitX, y: seat.exitY, dir: 'down', moving: false });
  await call(socket, 'sitDown', { index });
}

async function hookFish(socket) {
  await sitOnStool(socket);
  const bite = once(socket, 'fishBite');
  assert.equal((await call(socket, 'startFishing')).ok, true);
  await bite;
  const pull = await call(socket, 'pullLine');
  assert.equal(pull.ok, true);
  return pull.zone;
}

const inside = (zone) => zone.startPosition + zone.zoneWidth / 2;

// Walks the room on a coarse grid from a start point, the way a player's feet can.
function reachable(room, start) {
  const step = 6;
  const seen = new Set();
  const queue = [[Math.round(start.x), Math.round(start.y)]];
  while (queue.length) {
    const [x, y] = queue.pop();
    const key = `${x},${y}`;
    if (seen.has(key) || !canStand(room, x, y)) continue;
    seen.add(key);
    queue.push([x + step, y], [x - step, y], [x, y + step], [x, y - step]);
  }
  return [...seen].map((k) => k.split(',').map(Number));
}

test('the room data is consistent', () => {
  const cove = rooms.coralCove;
  assert.equal(canStand(cove, SPAWN.x, SPAWN.y), true);
  assert.equal(fishingZoneAt(cove, SPAWN.x, SPAWN.y), null);
  assert.equal(fishingZoneAt(cove, dockEdge.x, dockEdge.y).direction, 'down');
  assert.equal(cove.fishing.length, 11);
  assert.equal(canStand(rooms.safeArea, rooms.safeArea.spawn.x, rooms.safeArea.spawn.y), true);
});

test('every exit leads to a known room and can be walked to', () => {
  for (const room of Object.values(rooms)) {
    for (const exit of room.teleports) {
      const target = rooms[exit.room];
      assert.ok(target, `${room.key} exit to unknown room ${exit.room}`);
      const arrival = nearestStandable(target, exit.destX, exit.destY);
      assert.equal(canStand(target, arrival.x, arrival.y), true, `${room.key} -> ${exit.room} arrival`);
    }
    // Some areas are only entered from another room, so every arrival point is a starting point.
    const arrivals = Object.values(rooms).flatMap((from) => from.teleports.filter((t) => t.room === room.key))
      .map((t) => nearestStandable(room, t.destX, t.destY));
    const walked = [room.spawn, ...arrivals].filter(Boolean).flatMap((start) => reachable(room, start));
    room.teleports.forEach((exit, index) => {
      const hit = walked.some(([x, y]) => isAtExit(exit, x, y, 6)); // 6 is one step of the walk grid
      assert.ok(hit, `${room.key} exit ${index} to ${exit.room} is not reachable`);
    });
  }
});

test('walking through an exit changes room and scopes chat', async () => {
  const a = await login('alice');
  const b = await login('bob');
  const exit = rooms.coralCove.teleports[0];
  a.socket.emit('playerMovement', { x: exit.x + 12, y: exit.y + 15, dir: 'left', moving: true });
  const left = once(b.socket, 'playerLeft');
  const moved = await call(a.socket, 'useTeleport', { index: 0 });
  assert.equal(moved.ok, true);
  assert.equal(moved.room, 'safeArea');
  assert.equal((await left).id, 'alice');

  let leaked = false;
  b.socket.once('chat', () => { leaked = true; });
  a.socket.emit('chat', { text: 'only in town' });
  await once(a.socket, 'chat');
  assert.equal(leaked, false);
  a.socket.disconnect();
  b.socket.disconnect();
});

test('an exit cannot be used from far away', async () => {
  const a = await login('alice');
  a.socket.emit('playerMovement', { ...dockEdge, dir: 'down', moving: false });
  assert.equal((await call(a.socket, 'useTeleport', { index: 0 })).ok, false);
  assert.equal((await call(a.socket, 'useTeleport', { index: 99 })).ok, false);
  a.socket.disconnect();
});

test('unknown and bot accounts cannot log in', async () => {
  const socket = io(url, { transports: ['websocket'], forceNew: true });
  clients.push(socket);
  await once(socket, 'connect');
  assert.equal((await call(socket, 'login', { username: 'nobody' })).ok, false);
  assert.equal((await call(socket, 'login', { username: 'mochi' })).ok, false);
});

test('chat is broadcast and trimmed to the limit', async () => {
  const a = await login('alice');
  const b = await login('bob');
  const received = once(b.socket, 'chat');
  a.socket.emit('chat', { text: `  ${'x'.repeat(200)}  ` });
  const message = await received;
  assert.equal(message.from, 'alice');
  assert.equal(message.text.length, 120);
  a.socket.disconnect();
  b.socket.disconnect();
});

test('look changes are validated and broadcast', async () => {
  const a = await login('alice');
  const b = await login('bob');
  assert.equal((await call(a.socket, 'changeLook', { look: { ...DEFAULT_LOOK, skin: 99 } })).ok, false);
  const broadcast = once(b.socket, 'lookChanged');
  const look = { ...DEFAULT_LOOK, hairStyle: 2 };
  assert.deepEqual((await call(a.socket, 'changeLook', { look })).look, look);
  assert.deepEqual(await broadcast, { id: 'alice', look });
  a.socket.disconnect();
  b.socket.disconnect();
});

test('the character creator is only needed until the first saved look', async () => {
  const first = await login('cleo');
  assert.equal(first.res.me.characterCreated, false);
  assert.equal((await call(first.socket, 'changeLook', { look: DEFAULT_LOOK })).ok, true);
  first.socket.disconnect();
  const again = await login('cleo');
  assert.equal(again.res.me.characterCreated, true);
  again.socket.disconnect();
});

test('direct messages deliver live, track unread and reach offline accounts', async () => {
  const a = await login('alice');
  const b = await login('bob');
  const delivered = once(b.socket, 'dm');
  assert.equal((await call(a.socket, 'sendDM', { to: 'bob', text: 'hello' })).ok, true);
  assert.equal((await delivered).text, 'hello');

  const before = await call(b.socket, 'getContacts');
  assert.equal(before.contacts.find((c) => c.username === 'alice').unread, 1);
  const thread = await call(b.socket, 'getThread', { with: 'alice' });
  assert.equal(thread.messages.at(-1).text, 'hello');
  const afterRead = await call(b.socket, 'getContacts');
  assert.equal(afterRead.contacts.find((c) => c.username === 'alice').unread, 0);

  assert.equal((await call(a.socket, 'sendDM', { to: 'cleo', text: 'offline note' })).ok, true);
  const c = await login('cleo');
  const contacts = await call(c.socket, 'getContacts');
  assert.equal(contacts.contacts.find((x) => x.username === 'alice').unread, 1);
  assert.equal((await call(a.socket, 'sendDM', { to: 'alice', text: 'me' })).ok, false);
  [a, b, c].forEach((x) => x.socket.disconnect());
});

test('the bot replies to direct messages', async () => {
  const a = await login('alice');
  const replied = once(a.socket, 'dm');
  await call(a.socket, 'sendDM', { to: 'mochi', text: 'hi' });
  assert.equal((await replied).from, 'mochi');
  a.socket.disconnect();
});

test('fishing requires sitting on a stool by the water', async () => {
  const a = await login('alice');
  assert.equal((await call(a.socket, 'startFishing')).ok, false);
  // Standing right on the fishing edge is not enough any more.
  a.socket.emit('playerMovement', { ...dockEdge, dir: 'down', moving: false });
  assert.equal((await call(a.socket, 'startFishing')).ok, false);
  await sitOnStool(a.socket);
  assert.equal((await call(a.socket, 'startFishing')).ok, true);
  // No standing up mid-cast; once fishing is over the player can stand again.
  assert.equal((await call(a.socket, 'standUp')).ok, false);
  a.socket.emit('cancelFishing', {});
  await new Promise((resolve) => setTimeout(resolve, 20));
  assert.equal((await call(a.socket, 'standUp')).ok, true);
  a.socket.disconnect();
});

test('three reels in the zone catch the fish, and selling pays coins', async () => {
  const a = await login('alice');
  const b = await login('bob');
  let zone = await hookFish(a.socket);
  const announced = once(b.socket, 'catchSuccess');
  let reel;
  for (let hit = 1; hit <= 3; hit++) {
    reel = await call(a.socket, 'logReel', { position: inside(zone) });
    assert.equal(reel.hit, true);
    assert.equal(reel.hits, hit);
    zone = reel.zone;
  }
  assert.equal(reel.caught, true);
  const { id, fish } = await announced;
  assert.equal(id, 'alice');
  assert.equal(reel.inventory[fish.id], 1);

  const sold = await call(a.socket, 'sellFish', { id: 'all' });
  assert.equal(sold.earned, fish.value);
  assert.deepEqual(sold.inventory, {});
  a.socket.disconnect();
  b.socket.disconnect();
});

test('one reel outside the zone loses the fish', async () => {
  const a = await login('alice');
  const zone = await hookFish(a.socket);
  const reel = await call(a.socket, 'logReel', { position: zone.startPosition - 1 });
  assert.equal(reel.hit, false);
  assert.equal((await call(a.socket, 'logReel', { position: inside(zone) })).ok, false);
  a.socket.disconnect();
});

test('pulling before the bite fails the cast', async () => {
  const a = await login('alice');
  await sitOnStool(a.socket);
  await call(a.socket, 'startFishing');
  await new Promise((resolve) => setTimeout(resolve, 20));
  const failed = once(a.socket, 'fishingFailed');
  assert.equal((await call(a.socket, 'pullLine')).ok, false);
  assert.equal((await failed).reason, 'pulledEarly');
  a.socket.disconnect();
});

test('a missed bite escapes and an unfinished reel times out', async () => {
  const a = await login('alice');
  await sitOnStool(a.socket);
  const bite = once(a.socket, 'fishBite');
  await call(a.socket, 'startFishing');
  await bite;
  assert.equal((await once(a.socket, 'fishingFailed')).reason, 'fishEscaped');

  await hookFish(a.socket);
  assert.equal((await once(a.socket, 'fishingFailed')).reason, 'timeElapsed');
  a.socket.disconnect();
});

test('leaving the window cancels fishing with its own reason', async () => {
  const a = await login('alice');
  await sitOnStool(a.socket);
  await call(a.socket, 'startFishing');
  const failed = once(a.socket, 'fishingFailed');
  a.socket.emit('cancelFishing', { reason: 'unfocusedWindow' });
  assert.equal((await failed).reason, 'unfocusedWindow');
  a.socket.disconnect();
});

test('movement into blocked water is corrected', async () => {
  const a = await login('alice');
  const corrected = once(a.socket, 'positionCorrect');
  a.socket.emit('playerMovement', { x: 1800, y: 1830, dir: 'down', moving: true });
  assert.ok(Number.isFinite((await corrected).x));
  a.socket.disconnect();
});

async function toSafeArea(socket) {
  const exit = rooms.coralCove.teleports[0];
  socket.emit('playerMovement', { x: exit.x + 12, y: exit.y + 15, dir: 'left', moving: true });
  const res = await call(socket, 'useTeleport', { index: 0 });
  assert.equal(res.ok, true);
  assert.equal(res.room, 'safeArea');
}

test('a persisted look that no longer fits the current style limits falls back to the seed default', async () => {
  const dbPath = path.join(os.tmpdir(), `pixadom-look-migration-${Date.now()}.json`);
  fs.writeFileSync(dbPath, JSON.stringify({
    accounts: { alice: { username: 'alice', display: 'Alice', coins: 50, inventory: {}, look: { skin: 99, hairStyle: 0, hairColor: 0, top: 0, topColor: 0, bottom: 0, bottomColor: 0 } } },
    messages: [],
  }));
  const staleServer = createGameServer({ port: 0, dbPath });
  const staleUrl = `http://localhost:${await staleServer.start()}`;
  const socket = io(staleUrl, { transports: ['websocket'], forceNew: true });
  await once(socket, 'connect');
  const res = await call(socket, 'login', { username: 'alice' });
  assert.equal(res.ok, true);
  assert.deepEqual(res.me.look, validateLook(SEED_ACCOUNTS.find((a) => a.username === 'alice').look));
  socket.disconnect();
  await staleServer.stop();
  fs.unlinkSync(dbPath);
});

test('sitting locks movement and interactions until standing back up', async () => {
  const a = await login('alice');
  const b = await login('bob');
  await toSafeArea(a.socket);
  await toSafeArea(b.socket);
  const seatIndex = rooms.safeArea.seats.findIndex((s) => s.exitX !== undefined);
  const seat = rooms.safeArea.seats[seatIndex];
  a.socket.emit('playerMovement', { x: seat.exitX, y: seat.exitY, dir: 'down', moving: false });

  const sat = once(b.socket, 'playerSat');
  assert.equal((await call(a.socket, 'sitDown', { index: seatIndex })).ok, true);
  assert.equal((await sat).index, seatIndex);
  assert.equal((await call(a.socket, 'sitDown', { index: seatIndex })).ok, false);
  assert.equal((await call(a.socket, 'startFishing')).ok, false);
  assert.equal((await call(a.socket, 'useTeleport', { index: 0 })).ok, false);

  let sawMove = false;
  b.socket.once('playerMoved', () => { sawMove = true; });
  a.socket.emit('playerMovement', { x: seat.x + 60, y: seat.y, dir: 'right', moving: true });
  await new Promise((resolve) => setTimeout(resolve, 30));
  assert.equal(sawMove, false);

  const stood = once(b.socket, 'playerStood');
  assert.equal((await call(a.socket, 'standUp')).ok, true);
  await stood;
  a.socket.disconnect();
  b.socket.disconnect();
});

test('standing up from a seat without a recorded exit point still lands on walkable ground', async () => {
  const a = await login('alice');
  await toSafeArea(a.socket);
  const seatIndex = rooms.safeArea.seats.findIndex((s) => s.exitX === undefined);
  const seat = rooms.safeArea.seats[seatIndex];
  const near = nearestStandable(rooms.safeArea, seat.x, seat.y);
  a.socket.emit('playerMovement', { x: near.x, y: near.y, dir: 'down', moving: false });
  assert.equal((await call(a.socket, 'sitDown', { index: seatIndex })).ok, true);
  const stood = once(a.socket, 'playerStood');
  assert.equal((await call(a.socket, 'standUp')).ok, true);
  const { x, y } = await stood;
  assert.equal(canStand(rooms.safeArea, x, y), true);
  a.socket.disconnect();
});

test('dancing toggles and stops automatically when the player moves, for the dancer too', async () => {
  const a = await login('alice');
  const b = await login('bob');
  const danceOn = once(b.socket, 'playerDanced');
  assert.equal((await call(a.socket, 'toggleDancing')).dancing, true);
  assert.deepEqual(await danceOn, { id: 'alice', dancing: true });
  // The dancer's own client needs this too, to clear its local dancing animation.
  const danceOffSelf = once(a.socket, 'playerDanced');
  const danceOffOther = once(b.socket, 'playerDanced');
  a.socket.emit('playerMovement', { ...dockEdge, dir: 'down', moving: true });
  assert.deepEqual(await danceOffSelf, { id: 'alice', dancing: false });
  assert.deepEqual(await danceOffOther, { id: 'alice', dancing: false });
  a.socket.disconnect();
  b.socket.disconnect();
});

test('talking to an NPC out of reach fails', async () => {
  const a = await login('alice');
  const reed = NPCS.find((n) => n.id === 'npc_reed');
  // Walk well clear of the NPC first; the test only cares that distance is enforced, not where
  // exactly the NPC stands. Any of these candidates landing >70px away and actually standable
  // is enough.
  const room = rooms[reed.room];
  const far = [[500, 0], [-500, 0], [0, 500], [0, -500]]
    .map(([dx, dy]) => ({ x: reed.x + dx, y: reed.y + dy }))
    .find((p) => canStand(room, p.x, p.y));
  assert.ok(far, 'expected at least one far, standable point near the NPC');
  a.socket.emit('playerMovement', { ...far, dir: 'down', moving: false });
  await new Promise((resolve) => setTimeout(resolve, 20));
  assert.equal((await call(a.socket, 'npcTalk', { npcId: reed.id })).ok, false);
  a.socket.disconnect();
});

test('a quest requiring a catch becomes ready once a fish is landed, then pays out on claim', async () => {
  const a = await login('alice');
  const reed = NPCS.find((n) => n.id === 'npc_reed');
  // Reed stands in the shop hut's window, which sits on non-walkable decor; walk to the nearest
  // standable point in front of it instead (still well within NPC_REACH).
  const near = nearestStandable(rooms[reed.room], reed.x, reed.y);
  a.socket.emit('playerMovement', { ...near, dir: 'down', moving: false });

  const offer = await call(a.socket, 'npcTalk', { npcId: reed.id });
  assert.equal(offer.ok, true);
  assert.equal(offer.quest.status, 'new');
  assert.equal((await call(a.socket, 'acceptQuest', { npcId: reed.id })).status, 'in_progress');
  assert.equal((await call(a.socket, 'claimQuestRewards', { questId: reed.questId })).ok, false);

  const ready = once(a.socket, 'questStatus');
  let zone = await hookFish(a.socket);
  for (let hit = 1; hit <= 3; hit++) {
    const reel = await call(a.socket, 'logReel', { position: inside(zone) });
    zone = reel.zone;
  }
  assert.deepEqual(await ready, { npcId: reed.id, questId: reed.questId, status: 'ready' });

  const log = (await call(a.socket, 'getQuestLog')).quests.find((q) => q.questId === reed.questId);
  assert.equal(log.status, 'ready');
  const { coins: before } = await call(a.socket, 'sellFish', { id: 'nothing-to-sell' });
  const claim = await call(a.socket, 'claimQuestRewards', { questId: reed.questId });
  assert.equal(claim.ok, true);
  assert.equal(claim.coins, before + 25);
  a.socket.disconnect();
});

test('a "talk" quest is ready as soon as it is accepted', async () => {
  const a = await login('alice');
  await toSafeArea(a.socket);
  const gus = NPCS.find((n) => n.id === 'npc_gus');
  a.socket.emit('playerMovement', { x: gus.x, y: gus.y, dir: 'down', moving: false });
  assert.equal((await call(a.socket, 'npcTalk', { npcId: gus.id })).quest.status, 'new');
  assert.equal((await call(a.socket, 'acceptQuest', { npcId: gus.id })).status, 'ready');
  const { coins: before } = await call(a.socket, 'sellFish', { id: 'nothing-to-sell' });
  const claim = await call(a.socket, 'claimQuestRewards', { questId: gus.questId });
  assert.equal(claim.ok, true);
  assert.equal(claim.coins, before + 15);
  a.socket.disconnect();
});

test('a rod upgrade widens the reel zone instead of narrowing it', () => {
  const fish = { speed: 0.2 };
  const rng = () => 0;
  assert.equal(rollZone(fish, 1, rng).zoneWidth, REEL.zoneWidths[0]);
  assert.equal(rollZone(fish, 5, rng).zoneWidth, REEL.zoneWidths[4]);
  assert.ok(REEL.zoneWidths[4] > REEL.zoneWidths[0], 'level 5 should be easier (wider) than level 1');
  assert.deepEqual([...REEL.zoneWidths].sort((x, y) => x - y), REEL.zoneWidths, 'zone widths should increase with rod level');
});

test('catching fish logs the species and levels up once enough pixels are earned', async () => {
  const c = await login('cleo');
  // rng is fixed at 0.5 for the whole suite, so every catch lands the same species (perch).
  const before = (await call(c.socket, 'getFishLog')).species.find((s) => s.id === 'perch').caught;

  const catches = Math.ceil(100 / 8); // perch is worth 8 pixels; cross the level-2 threshold
  let sawLevelUp = 0;
  c.socket.on('levelUp', () => { sawLevelUp += 1; });
  for (let i = 0; i < catches; i++) {
    let zone = await hookFish(c.socket);
    for (let hit = 1; hit <= 3; hit++) {
      const reel = await call(c.socket, 'logReel', { position: inside(zone) });
      zone = reel.zone;
    }
  }
  await new Promise((resolve) => setTimeout(resolve, 20));

  const after = (await call(c.socket, 'getFishLog')).species.find((s) => s.id === 'perch').caught;
  assert.equal(after, before + catches);
  assert.equal(sawLevelUp, 1);
  c.socket.disconnect();
});

test('the shop sells rod levels in order and rejects what the account cannot afford', async () => {
  const c = await login('cleo');
  const sold = await call(c.socket, 'sellFish', { id: 'all' });
  const coins = sold.coins;

  const shop = await call(c.socket, 'getShopItems');
  assert.equal(shop.ok, true);
  assert.deepEqual(shop.rods.map((r) => r.level), [1, 2, 3, 4, 5]);
  assert.equal(shop.rods[0].owned, true);
  assert.equal(shop.rods[0].price, 0);
  assert.equal(shop.rods[1].owned, false);
  assert.equal(shop.rods[1].price, ROD_PRICES[1]);

  // Cannot skip ahead to a level that is not the next one.
  assert.equal((await call(c.socket, 'buyRodLevel', { level: 3 })).ok, false);

  // The previous test sold 13 caught fish worth 104 coins, so this account can afford level 2.
  assert.ok(coins >= ROD_PRICES[1], `expected at least ${ROD_PRICES[1]} coins, got ${coins}`);
  const bought = await call(c.socket, 'buyRodLevel', { level: 2 });
  assert.equal(bought.ok, true);
  assert.equal(bought.rodLevel, 2);
  assert.equal(bought.coins, coins - ROD_PRICES[1]);
  assert.equal((await call(c.socket, 'buyRodLevel', { level: 2 })).ok, false); // already owned
  c.socket.disconnect();
});

test('friends can be added, listed with online status, and removed', async () => {
  const a = await login('alice');
  const b = await login('bob');
  assert.equal((await call(a.socket, 'addFriend', { username: 'alice' })).ok, false);
  assert.equal((await call(a.socket, 'addFriend', { username: 'nobody' })).ok, false);

  const added = await call(a.socket, 'addFriend', { username: 'bob' });
  assert.equal(added.ok, true);
  assert.deepEqual(added.friends.map((f) => f.username), ['bob']);
  assert.equal(added.friends[0].online, true);

  // Adding the same friend twice does not duplicate them.
  const addedAgain = await call(a.socket, 'addFriend', { username: 'bob' });
  assert.equal(addedAgain.friends.length, 1);

  const removed = await call(a.socket, 'removeFriend', { username: 'bob' });
  assert.equal(removed.ok, true);
  assert.deepEqual(removed.friends, []);
  a.socket.disconnect();
  b.socket.disconnect();
});

test('the Tinkerbean shopkeeper has no quest and talking to him offers the shop', async () => {
  const barnaby = NPCS.find((n) => n.id === 'npc_barnaby');
  const dbPath = path.join(os.tmpdir(), `pixadom-shopkeeper-${Date.now()}.json`);
  const shopServer = createGameServer({ port: 0, dbPath, startRoom: 'store', startAt: { x: barnaby.x, y: barnaby.y + 50 } });
  const socket = io(`http://localhost:${await shopServer.start()}`, { transports: ['websocket'], forceNew: true });
  await once(socket, 'connect');
  const res = await call(socket, 'login', { username: 'alice' });
  assert.ok(res.npcs.some((n) => n.id === barnaby.id && n.shop));
  const talk = await call(socket, 'npcTalk', { npcId: barnaby.id });
  assert.equal(talk.ok, true);
  assert.equal(talk.shop, true);
  assert.equal((await call(socket, 'acceptQuest', { npcId: barnaby.id })).ok, false);
  assert.ok((await call(socket, 'getQuestLog')).quests.every((q) => q.npcName !== 'Barnaby'));
  socket.disconnect();
  await shopServer.stop();
  fs.rmSync(dbPath, { force: true });
});

test('Coral Cove has 20 stools along the dock, each on a fishing edge facing the water', async () => {
  const cove = rooms.coralCove;
  const stools = cove.seats.filter((s) => s.stool);
  assert.equal(stools.length, 20);
  const walked = reachable(cove, SPAWN);
  for (const s of stools) {
    const zone = fishingZoneAt(cove, s.x, s.y);
    assert.ok(zone, `stool at ${s.x},${s.y} is on a fishing edge`);
    assert.equal(zone.direction, s.direction, 'stool faces the water');
    assert.equal(canStand(cove, s.x, s.y), false, 'a stool blocks walking');
    assert.equal(canStand(cove, s.exitX, s.exitY), true, 'standing up lands on the dock');
    assert.ok(walked.some(([x, y]) => Math.hypot(x - s.x, y - s.y) <= SEAT_REACH), 'stool can be walked up to');
  }
  // The stools must not cut the dock: every exit is still reachable from the spawn.
  cove.teleports.forEach((exit) => assert.ok(walked.some(([x, y]) => isAtExit(exit, x, y, 6))));
  assert.ok(walked.some(([x, y]) => Math.hypot(x - 2420, y - 1900) < 40), 'the bridge to the island is still reachable');
});
