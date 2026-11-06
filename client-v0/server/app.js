import express from 'express';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Server } from 'socket.io';
import {
  FISH, FISH_BY_ID, LIMITS, REEL, ROD_PRICES, ROOM_KEYS, SEED_ACCOUNTS, START_ROOM,
  canStand, fishingZoneAt, isAtExit, isInZone, isRareFish, levelForPixels, nearestStandable, rollZone, validateLook,
} from '../shared/config.js';
import { NPC_REACH, NPCS, QUESTS, SEAT_REACH, npcsInRoom, questLine } from '../shared/npcs.js';
import { CROP_BY_ID, FARM_REACH, PLOTS, SEED_COST, plotStage, plotsInRoom } from '../shared/farming.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const BOT_REPLIES = [
  'Hi! I am Mochi, the test bot. Your message arrived.',
  'The dock is the best place to fish!',
  'Try pressing C to change your look.',
  'Golden Carp are rare. Good luck!',
];

const TELEPORT_MARGIN = 24;

function loadRooms() {
  const entries = ROOM_KEYS.map((key) => [key, JSON.parse(fs.readFileSync(path.join(ROOT, 'public', 'rooms', `${key}.json`), 'utf8'))]);
  return Object.fromEntries(entries);
}

function loadDb(dbPath) {
  let db = { accounts: {}, messages: [] };
  if (dbPath && fs.existsSync(dbPath)) db = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
  db.accounts ??= {};
  db.messages ??= [];
  db.farm ??= { plots: {} };
  for (const seed of SEED_ACCOUNTS) {
    db.accounts[seed.username] ??= {
      username: seed.username,
      display: seed.display,
      bot: Boolean(seed.bot),
      look: validateLook(seed.look),
      coins: 50,
      inventory: {},
    };
    db.accounts[seed.username].rodLevel ??= 1;
    db.accounts[seed.username].quests ??= {};
    db.accounts[seed.username].pixels ??= 0;
    db.accounts[seed.username].fishLog ??= {};
    db.accounts[seed.username].friends ??= [];
    db.accounts[seed.username].crops ??= {};
    // A previous run may have saved a look with option counts that no longer fit (e.g. after
    // shared/config.js's style limits changed); fall back to the seed default rather than
    // leave a player with an index into a style that no longer exists.
    if (!validateLook(db.accounts[seed.username].look)) db.accounts[seed.username].look = validateLook(seed.look);
  }
  return db;
}

const dist = (ax, ay, bx, by) => Math.hypot(ax - bx, ay - by);

function questStatus(account, questId) {
  return account.quests[questId] ?? 'new';
}

function npcsPublic(room, account) {
  return npcsInRoom(room).map((npc) => ({
    id: npc.id, name: npc.name, color: npc.color, x: npc.x, y: npc.y, questId: npc.questId,
    questStatus: questStatus(account, npc.questId),
  }));
}

function pickFish(rng) {
  const total = FISH.reduce((sum, f) => sum + f.weight, 0);
  let roll = rng() * total;
  for (const fish of FISH) {
    roll -= fish.weight;
    if (roll <= 0) return fish;
  }
  return FISH[0];
}

function cleanText(value, maxLen) {
  if (typeof value !== 'string') return '';
  return value.replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, maxLen);
}

export function createGameServer({ port = 3001, dbPath = null, rng = Math.random, timing = {}, startRoom = START_ROOM, startAt = null } = {}) {
  const rooms = loadRooms();
  const spawn = startAt ?? rooms[startRoom].spawn;
  const timings = {
    cast: REEL.castMs,
    biteMin: 2000,
    biteMax: 6000,
    hooked: REEL.hookedMs,
    reelTotal: REEL.introMs + REEL.zoneTimeMs,
    minReelGap: 400,
    botReply: 1200,
    ...timing,
  };
  const db = loadDb(dbPath);
  const online = new Map();
  const chatHistory = Object.fromEntries(ROOM_KEYS.map((key) => [key, []]));
  const playersIn = (room, except) => [...online.values()].filter((p) => p.room === room && p !== except).map(publicPlayer);
  let saveTimer = null;
  let nextMessageId = db.messages.reduce((max, m) => Math.max(max, m.id), 0) + 1;

  const app = express();
  const distDir = path.join(ROOT, 'dist');
  if (fs.existsSync(distDir)) app.use(express.static(distDir));
  const httpServer = http.createServer(app);
  const io = new Server(httpServer);

  function flush() {
    clearTimeout(saveTimer);
    saveTimer = null;
    if (!dbPath) return;
    fs.mkdirSync(path.dirname(dbPath), { recursive: true });
    fs.writeFileSync(`${dbPath}.tmp`, JSON.stringify(db, null, 2));
    fs.renameSync(`${dbPath}.tmp`, dbPath);
  }
  function save() {
    if (dbPath && !saveTimer) saveTimer = setTimeout(flush, 250);
  }

  function publicPlayer(p) {
    const account = db.accounts[p.id];
    return {
      id: p.id, display: account.display, look: account.look, x: p.x, y: p.y, dir: p.dir,
      fishing: p.fishing ? { phase: p.fishing.phase } : null,
      sitting: p.sitting ?? null,
      dancing: Boolean(p.dancing),
    };
  }

  // Adds pixels (XP) and tells the player's own client when that crosses a level boundary.
  function awardXP(p, amount) {
    if (!amount) return;
    const account = db.accounts[p.id];
    const before = levelForPixels(account.pixels);
    account.pixels += amount;
    const after = levelForPixels(account.pixels);
    save();
    if (after > before) p.socket.emit('levelUp', { level: after, pixels: account.pixels });
  }

  function friendsFor(username) {
    return db.accounts[username].friends
      .map((f) => {
        const a = db.accounts[f];
        if (!a) return null;
        return { username: f, display: a.display, online: a.bot || online.has(f) };
      })
      .filter(Boolean)
      .sort((a, b) => a.display.localeCompare(b.display));
  }

  // Marks any quest with this requirement type "ready to turn in" for the given player.
  function advanceQuests(p, requirementType) {
    const account = db.accounts[p.id];
    let changed = false;
    for (const npc of NPCS) {
      const quest = QUESTS[npc.questId];
      if (quest.requirement.type === requirementType && questStatus(account, npc.questId) === 'in_progress') {
        account.quests[npc.questId] = 'ready';
        changed = true;
        p.socket.emit('questStatus', { npcId: npc.id, questId: npc.questId, status: 'ready' });
      }
    }
    if (changed) save();
  }

  function allowed(p, bucket, max, windowMs) {
    const now = Date.now();
    const recent = (p.rate[bucket] ?? []).filter((t) => now - t < windowMs);
    p.rate[bucket] = recent;
    if (recent.length >= max) return false;
    recent.push(now);
    return true;
  }

  function endFishing(p) {
    if (!p.fishing) return;
    clearTimeout(p.fishing.timer);
    p.fishing = null;
    io.to(p.room).emit('playerFishing', { id: p.id, phase: null, dir: p.dir });
  }

  function setPhase(p, phase) {
    p.fishing.phase = phase;
    io.to(p.room).emit('playerFishing', { id: p.id, phase, dir: p.dir });
  }

  // reason: fishEscaped | timeElapsed | failedHook | pulledEarly | unfocusedWindow
  function failFishing(p, reason) {
    endFishing(p);
    p.socket.emit('fishingFailed', { reason });
  }

  function storeMessage(from, to, text) {
    const message = { id: nextMessageId++, from, to, text, ts: Date.now(), read: false };
    db.messages.push(message);
    save();
    online.get(to)?.socket.emit('dm', message);
    return message;
  }

  function contactsFor(username) {
    return Object.values(db.accounts)
      .filter((a) => a.username !== username)
      .map((a) => {
        const thread = db.messages.filter((m) => (m.from === username && m.to === a.username) || (m.from === a.username && m.to === username));
        const last = thread.at(-1) ?? null;
        return {
          username: a.username,
          display: a.display,
          bot: a.bot,
          online: a.bot || online.has(a.username),
          lastMessage: last?.text ?? null,
          lastTs: last?.ts ?? 0,
          unread: thread.filter((m) => m.to === username && !m.read).length,
        };
      })
      .sort((a, b) => b.lastTs - a.lastTs || a.display.localeCompare(b.display));
  }

  io.on('connection', (socket) => {
    let player = null;
    const reply = (cb, value) => { if (typeof cb === 'function') cb(value); };

    socket.on('login', (payload, cb) => {
      const account = db.accounts[payload?.username];
      if (!account || account.bot) return reply(cb, { ok: false, error: 'Unknown account' });
      if (player) return reply(cb, { ok: false, error: 'Already logged in' });

      const previous = online.get(account.username);
      if (previous) {
        previous.socket.emit('replaced');
        previous.socket.disconnect(true);
      }
      player = { id: account.username, socket, room: startRoom, x: spawn.x, y: spawn.y, dir: 'down', fishing: null, sitting: null, dancing: false, rate: {} };
      online.set(player.id, player);
      socket.join(player.room);
      socket.to(player.room).emit('playerJoined', publicPlayer(player));
      socket.broadcast.emit('presence', { username: player.id, online: true });
      reply(cb, {
        ok: true,
        room: player.room,
        me: {
          ...publicPlayer(player), coins: account.coins, inventory: account.inventory,
          pixels: account.pixels, level: levelForPixels(account.pixels), rodLevel: account.rodLevel,
        },
        players: playersIn(player.room, player),
        chat: chatHistory[player.room],
        npcs: npcsPublic(player.room, account),
      });
    });

    socket.on('useTeleport', (payload, cb) => {
      if (!player) return reply(cb, { ok: false, error: 'Not logged in' });
      if (player.fishing) return reply(cb, { ok: false, error: 'Stop fishing first' });
      if (player.sitting != null) return reply(cb, { ok: false, error: 'Stand up first' });
      const exit = rooms[player.room].teleports[payload?.index];
      if (!exit || !rooms[exit.room] || !isAtExit(exit, player.x, player.y, TELEPORT_MARGIN)) {
        return reply(cb, { ok: false, error: 'No exit here' });
      }
      const arrival = nearestStandable(rooms[exit.room], exit.destX, exit.destY);
      socket.to(player.room).emit('playerLeft', { id: player.id });
      socket.leave(player.room);
      player.room = exit.room;
      player.x = arrival.x;
      player.y = arrival.y;
      player.dir = exit.dir;
      player.dancing = false;
      socket.join(player.room);
      socket.to(player.room).emit('playerJoined', publicPlayer(player));
      reply(cb, {
        ok: true, room: player.room, x: player.x, y: player.y, dir: player.dir,
        players: playersIn(player.room, player), chat: chatHistory[player.room],
        npcs: npcsPublic(player.room, db.accounts[player.id]),
      });
    });

    socket.on('playerMovement', (payload) => {
      if (!player || player.fishing || player.sitting != null) return;
      const { x, y, dir, moving } = payload ?? {};
      if (!Number.isFinite(x) || !Number.isFinite(y) || !canStand(rooms[player.room], x, y)) {
        socket.emit('positionCorrect', { x: player.x, y: player.y });
        return;
      }
      player.x = x;
      player.y = y;
      player.dir = ['up', 'down', 'left', 'right'].includes(dir) ? dir : player.dir;
      if (moving && player.dancing) {
        player.dancing = false;
        io.to(player.room).emit('playerDanced', { id: player.id, dancing: false });
      }
      socket.volatile.to(player.room).emit('playerMoved', { id: player.id, x, y, dir: player.dir, moving: Boolean(moving) });
    });

    socket.on('chat', (payload) => {
      if (!player) return;
      const text = cleanText(payload?.text, LIMITS.chatLen);
      if (!text || !allowed(player, 'chat', 6, 8000)) return;
      const message = { from: player.id, display: db.accounts[player.id].display, text, ts: Date.now() };
      const history = chatHistory[player.room];
      history.push(message);
      if (history.length > 50) history.shift();
      io.to(player.room).emit('chat', message);
      advanceQuests(player, 'sendChat');
    });

    socket.on('sitDown', (payload, cb) => {
      if (!player) return reply(cb, { ok: false, error: 'Not logged in' });
      if (player.fishing || player.sitting != null) return reply(cb, { ok: false, error: 'Cannot sit right now' });
      const seats = rooms[player.room].seats;
      const index = payload?.index;
      const seat = seats[index];
      if (!seat || dist(player.x, player.y, seat.x, seat.y) > SEAT_REACH) {
        return reply(cb, { ok: false, error: 'No seat here' });
      }
      player.sitting = index;
      player.dancing = false;
      player.x = seat.x;
      player.y = seat.y;
      player.dir = seat.direction;
      io.to(player.room).emit('playerSat', { id: player.id, x: player.x, y: player.y, dir: player.dir, index });
      reply(cb, { ok: true });
    });

    socket.on('standUp', (_payload, cb) => {
      if (!player) return reply(cb, { ok: false, error: 'Not logged in' });
      if (player.sitting == null) return reply(cb, { ok: false });
      const room = rooms[player.room];
      const seat = room.seats[player.sitting];
      // Not every seat in the source maps carries an exit point; fall back to the
      // nearest walkable tile so standing up never leaves the player stuck on the seat.
      const fallback = seat && seat.exitX === undefined ? nearestStandable(room, seat.x, seat.y) : null;
      player.sitting = null;
      player.x = seat?.exitX ?? fallback?.x ?? player.x;
      player.y = seat?.exitY ?? fallback?.y ?? player.y;
      player.dir = seat?.exitDirection ?? player.dir;
      io.to(player.room).emit('playerStood', { id: player.id, x: player.x, y: player.y, dir: player.dir });
      reply(cb, { ok: true });
    });

    socket.on('toggleDancing', (_payload, cb) => {
      if (!player) return reply(cb, { ok: false, error: 'Not logged in' });
      if (player.fishing || player.sitting != null) return reply(cb, { ok: false, error: 'Cannot dance right now' });
      player.dancing = !player.dancing;
      io.to(player.room).emit('playerDanced', { id: player.id, dancing: player.dancing });
      reply(cb, { ok: true, dancing: player.dancing });
    });

    socket.on('npcTalk', (payload, cb) => {
      if (!player) return reply(cb, { ok: false, error: 'Not logged in' });
      const npc = NPCS.find((n) => n.id === payload?.npcId);
      if (!npc || npc.room !== player.room) return reply(cb, { ok: false, error: 'NPC not here' });
      if (dist(player.x, player.y, npc.x, npc.y) > NPC_REACH) return reply(cb, { ok: false, error: 'Too far away' });
      const account = db.accounts[player.id];
      const quest = QUESTS[npc.questId];
      const status = questStatus(account, npc.questId);
      reply(cb, { ok: true, npc: { id: npc.id, name: npc.name }, quest: { id: npc.questId, name: quest.name, status, text: questLine(quest, status), coins: quest.reward.coins } });
    });

    socket.on('acceptQuest', (payload, cb) => {
      if (!player) return reply(cb, { ok: false, error: 'Not logged in' });
      const npc = NPCS.find((n) => n.id === payload?.npcId);
      const account = db.accounts[player.id];
      if (!npc || questStatus(account, npc.questId) !== 'new') return reply(cb, { ok: false, error: 'Nothing to accept' });
      const quest = QUESTS[npc.questId];
      const status = quest.requirement.type === 'talk' ? 'ready' : 'in_progress';
      account.quests[npc.questId] = status;
      save();
      reply(cb, { ok: true, status, text: questLine(quest, status) });
    });

    socket.on('claimQuestRewards', (payload, cb) => {
      if (!player) return reply(cb, { ok: false, error: 'Not logged in' });
      const account = db.accounts[player.id];
      const questId = payload?.questId;
      const quest = QUESTS[questId];
      if (!quest || questStatus(account, questId) !== 'ready') return reply(cb, { ok: false, error: 'Not ready yet' });
      account.quests[questId] = 'completed';
      account.coins += quest.reward.coins ?? 0;
      save();
      awardXP(player, quest.reward.coins ?? 0);
      reply(cb, { ok: true, coins: account.coins, text: questLine(quest, 'completed') });
    });

    socket.on('getQuestLog', (_payload, cb) => {
      if (!player) return reply(cb, { ok: false, error: 'Not logged in' });
      const account = db.accounts[player.id];
      const quests = NPCS.map((npc) => {
        const quest = QUESTS[npc.questId];
        return { questId: npc.questId, npcName: npc.name, name: quest.name, status: questStatus(account, npc.questId), coins: quest.reward.coins };
      });
      reply(cb, { ok: true, quests });
    });

    socket.on('changeLook', (payload, cb) => {
      if (!player) return reply(cb, { ok: false, error: 'Not logged in' });
      const look = validateLook(payload?.look);
      if (!look) return reply(cb, { ok: false, error: 'Invalid look' });
      db.accounts[player.id].look = look;
      save();
      io.to(player.room).emit('lookChanged', { id: player.id, look });
      advanceQuests(player, 'changeLook');
      reply(cb, { ok: true, look });
    });

    socket.on('getContacts', (_payload, cb) => {
      if (!player) return reply(cb, { ok: false, error: 'Not logged in' });
      reply(cb, { ok: true, contacts: contactsFor(player.id) });
    });

    socket.on('getThread', (payload, cb) => {
      if (!player) return reply(cb, { ok: false, error: 'Not logged in' });
      const other = payload?.with;
      if (!db.accounts[other]) return reply(cb, { ok: false, error: 'Unknown account' });
      const thread = db.messages.filter((m) => (m.from === player.id && m.to === other) || (m.from === other && m.to === player.id));
      let changed = false;
      for (const m of thread) {
        if (m.to === player.id && !m.read) { m.read = true; changed = true; }
      }
      if (changed) save();
      reply(cb, { ok: true, messages: thread.slice(-100) });
    });

    socket.on('sendDM', (payload, cb) => {
      if (!player) return reply(cb, { ok: false, error: 'Not logged in' });
      const to = payload?.to;
      const account = db.accounts[to];
      const text = cleanText(payload?.text, LIMITS.dmLen);
      if (!account || to === player.id) return reply(cb, { ok: false, error: 'Unknown recipient' });
      if (!text) return reply(cb, { ok: false, error: 'Empty message' });
      if (!allowed(player, 'dm', 10, 10000)) return reply(cb, { ok: false, error: 'Sending too fast' });
      const message = storeMessage(player.id, to, text);
      reply(cb, { ok: true, message });
      if (account.bot) {
        const sender = player.id;
        const line = BOT_REPLIES[message.id % BOT_REPLIES.length];
        setTimeout(() => storeMessage(to, sender, line), timings.botReply);
      }
    });

    socket.on('startFishing', (_payload, cb) => {
      if (!player) return reply(cb, { ok: false, error: 'Not logged in' });
      if (player.fishing) return reply(cb, { ok: false, error: 'Already fishing' });
      if (player.sitting != null) return reply(cb, { ok: false, error: 'Stand up first' });
      const zone = fishingZoneAt(rooms[player.room], player.x, player.y);
      if (!zone) return reply(cb, { ok: false, error: 'Stand at the edge of the dock to fish' });
      const p = player;
      p.dir = zone.direction;
      p.fishing = { phase: 'cast', fish: null, zone: null, hits: 0, lastReelAt: 0, timer: null };
      setPhase(p, 'cast');
      p.fishing.timer = setTimeout(() => {
        setPhase(p, 'bob');
        const delay = timings.biteMin + rng() * (timings.biteMax - timings.biteMin);
        p.fishing.timer = setTimeout(() => {
          setPhase(p, 'hooked');
          socket.emit('fishBite');
          p.fishing.timer = setTimeout(() => failFishing(p, 'fishEscaped'), timings.hooked);
        }, delay);
      }, timings.cast);
      reply(cb, { ok: true });
    });

    socket.on('cancelFishing', (payload) => {
      if (!player?.fishing) return;
      if (payload?.reason === 'unfocusedWindow') failFishing(player, 'unfocusedWindow');
      else endFishing(player);
    });

    // A pull before the bite loses the cast; a pull during the bite starts reeling.
    socket.on('pullLine', (_payload, cb) => {
      const fishing = player?.fishing;
      if (fishing?.phase === 'bob') {
        failFishing(player, 'pulledEarly');
        return reply(cb, { ok: false });
      }
      if (fishing?.phase !== 'hooked') return reply(cb, { ok: false });
      clearTimeout(fishing.timer);
      const p = player;
      fishing.fish = pickFish(rng);
      fishing.zone = rollZone(fishing.fish, db.accounts[p.id].rodLevel, rng);
      setPhase(p, 'reel');
      fishing.timer = setTimeout(() => failFishing(p, 'timeElapsed'), timings.reelTotal);
      reply(cb, { ok: true, zone: fishing.zone, zoneTimeMs: REEL.zoneTimeMs });
    });

    socket.on('logReel', (payload, cb) => {
      const fishing = player?.fishing;
      const position = payload?.position;
      const now = Date.now();
      if (fishing?.phase !== 'reel' || !Number.isFinite(position) || now - fishing.lastReelAt < timings.minReelGap) {
        return reply(cb, { ok: false });
      }
      fishing.lastReelAt = now;
      if (!isInZone(position, fishing.zone)) {
        endFishing(player);
        return reply(cb, { ok: true, hit: false });
      }
      fishing.hits += 1;
      const account = db.accounts[player.id];
      if (fishing.hits < REEL.hitsNeeded) {
        fishing.zone = rollZone(fishing.fish, account.rodLevel, rng);
        return reply(cb, { ok: true, hit: true, hits: fishing.hits, zone: fishing.zone });
      }
      const { fish, hits } = fishing;
      account.inventory[fish.id] = (account.inventory[fish.id] ?? 0) + 1;
      account.fishLog[fish.id] = (account.fishLog[fish.id] ?? 0) + 1;
      save();
      endFishing(player);
      awardXP(player, fish.value);
      reply(cb, { ok: true, hit: true, hits, caught: true, inventory: account.inventory, coins: account.coins });
      io.to(player.room).emit('catchSuccess', { id: player.id, display: account.display, fish, rare: isRareFish(fish) });
      advanceQuests(player, 'catchFish');
    });

    socket.on('sellFish', (payload, cb) => {
      if (!player) return reply(cb, { ok: false, error: 'Not logged in' });
      const account = db.accounts[player.id];
      const ids = payload?.id === 'all' ? Object.keys(account.inventory) : [payload?.id];
      let earned = 0;
      for (const id of ids) {
        const fish = FISH_BY_ID[id];
        const count = account.inventory[id] ?? 0;
        if (!fish || count <= 0) continue;
        earned += fish.value * count;
        delete account.inventory[id];
      }
      account.coins += earned;
      save();
      reply(cb, { ok: true, earned, coins: account.coins, inventory: account.inventory });
    });

    socket.on('getFishLog', (_payload, cb) => {
      if (!player) return reply(cb, { ok: false, error: 'Not logged in' });
      const account = db.accounts[player.id];
      const species = FISH.map((fish) => ({
        id: fish.id, name: fish.name, rarity: fish.rarity, caught: account.fishLog[fish.id] ?? 0,
      }));
      reply(cb, { ok: true, species });
    });

    socket.on('getShopItems', (_payload, cb) => {
      if (!player) return reply(cb, { ok: false, error: 'Not logged in' });
      const account = db.accounts[player.id];
      const rods = ROD_PRICES.map((price, i) => ({ level: i + 1, price, owned: account.rodLevel >= i + 1 }));
      reply(cb, { ok: true, rods, coins: account.coins, rodLevel: account.rodLevel });
    });

    socket.on('buyRodLevel', (payload, cb) => {
      if (!player) return reply(cb, { ok: false, error: 'Not logged in' });
      const account = db.accounts[player.id];
      const level = payload?.level;
      if (!Number.isInteger(level) || level !== account.rodLevel + 1 || level > ROD_PRICES.length) {
        return reply(cb, { ok: false, error: 'Invalid upgrade' });
      }
      const price = ROD_PRICES[level - 1];
      if (account.coins < price) return reply(cb, { ok: false, error: 'Not enough coins' });
      account.coins -= price;
      account.rodLevel = level;
      save();
      reply(cb, { ok: true, coins: account.coins, rodLevel: account.rodLevel });
    });

    socket.on('getFriends', (_payload, cb) => {
      if (!player) return reply(cb, { ok: false, error: 'Not logged in' });
      reply(cb, { ok: true, friends: friendsFor(player.id) });
    });

    socket.on('addFriend', (payload, cb) => {
      if (!player) return reply(cb, { ok: false, error: 'Not logged in' });
      const target = payload?.username;
      const account = db.accounts[player.id];
      if (!db.accounts[target] || target === player.id) return reply(cb, { ok: false, error: 'Unknown account' });
      if (!account.friends.includes(target)) account.friends.push(target);
      save();
      reply(cb, { ok: true, friends: friendsFor(player.id) });
    });

    socket.on('removeFriend', (payload, cb) => {
      if (!player) return reply(cb, { ok: false, error: 'Not logged in' });
      const account = db.accounts[player.id];
      account.friends = account.friends.filter((f) => f !== payload?.username);
      save();
      reply(cb, { ok: true, friends: friendsFor(player.id) });
    });

    socket.on('getFarmPlots', (_payload, cb) => {
      if (!player) return reply(cb, { ok: false, error: 'Not logged in' });
      const plots = plotsInRoom(player.room).map((p) => {
        const state = db.farm.plots[p.id] ?? null;
        return { id: p.id, x: p.x, y: p.y, cropId: state?.cropId ?? null, stage: plotStage(state) };
      });
      reply(cb, { ok: true, plots, seedCost: SEED_COST });
    });

    socket.on('plantCrop', (payload, cb) => {
      if (!player) return reply(cb, { ok: false, error: 'Not logged in' });
      const plot = PLOTS.find((p) => p.id === payload?.plotId && p.room === player.room);
      const crop = CROP_BY_ID[payload?.cropId];
      if (!plot || !crop) return reply(cb, { ok: false, error: 'Unknown plot or crop' });
      if (dist(player.x, player.y, plot.x, plot.y) > FARM_REACH) return reply(cb, { ok: false, error: 'Too far away' });
      if (plotStage(db.farm.plots[plot.id]) !== 'empty') return reply(cb, { ok: false, error: 'Already planted' });
      const account = db.accounts[player.id];
      if (account.coins < SEED_COST) return reply(cb, { ok: false, error: 'Not enough coins' });
      account.coins -= SEED_COST;
      db.farm.plots[plot.id] = { cropId: crop.id, plantedBy: player.id, wateredAt: null };
      save();
      const update = { id: plot.id, cropId: crop.id, stage: 'planted' };
      io.to(player.room).emit('farmUpdated', update);
      reply(cb, { ok: true, coins: account.coins, plot: update });
    });

    socket.on('waterPlot', (payload, cb) => {
      if (!player) return reply(cb, { ok: false, error: 'Not logged in' });
      const plot = PLOTS.find((p) => p.id === payload?.plotId && p.room === player.room);
      if (!plot) return reply(cb, { ok: false, error: 'Unknown plot' });
      if (dist(player.x, player.y, plot.x, plot.y) > FARM_REACH) return reply(cb, { ok: false, error: 'Too far away' });
      const state = db.farm.plots[plot.id];
      if (plotStage(state) !== 'planted') return reply(cb, { ok: false, error: 'Nothing to water' });
      state.wateredAt = Date.now();
      save();
      const update = { id: plot.id, cropId: state.cropId, stage: 'growing' };
      io.to(player.room).emit('farmUpdated', update);
      reply(cb, { ok: true, plot: update });
    });

    socket.on('harvestPlot', (payload, cb) => {
      if (!player) return reply(cb, { ok: false, error: 'Not logged in' });
      const plot = PLOTS.find((p) => p.id === payload?.plotId && p.room === player.room);
      if (!plot) return reply(cb, { ok: false, error: 'Unknown plot' });
      if (dist(player.x, player.y, plot.x, plot.y) > FARM_REACH) return reply(cb, { ok: false, error: 'Too far away' });
      const state = db.farm.plots[plot.id];
      if (plotStage(state) !== 'ready') return reply(cb, { ok: false, error: 'Not ready yet' });
      const crop = CROP_BY_ID[state.cropId];
      const account = db.accounts[player.id];
      account.crops[crop.id] = (account.crops[crop.id] ?? 0) + 1;
      account.coins += crop.value;
      delete db.farm.plots[plot.id];
      save();
      awardXP(player, crop.value);
      const update = { id: plot.id, cropId: null, stage: 'empty' };
      io.to(player.room).emit('farmUpdated', update);
      reply(cb, { ok: true, coins: account.coins, crops: account.crops, crop, plot: update });
    });

    socket.on('disconnect', () => {
      if (!player) return;
      clearTimeout(player.fishing?.timer);
      if (online.get(player.id) !== player) return;
      online.delete(player.id);
      io.to(player.room).emit('playerLeft', { id: player.id });
      io.emit('presence', { username: player.id, online: false });
    });
  });

  return {
    io,
    db,
    start: () => new Promise((resolve) => {
      httpServer.listen(port, () => resolve(httpServer.address().port));
    }),
    stop: () => new Promise((resolve) => {
      flush();
      io.close(() => resolve());
    }),
  };
}
