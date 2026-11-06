import Phaser from 'phaser';
import { ROOM_KEYS } from '../shared/config.js';
import { applyRoomExtras } from '../shared/roomExtras.js';
import { initFishing } from './fishing.js';
import { request, socket, username } from './net.js';
import {
  initBag, initChat, initFishLog, initFriends, initLook, initMenu, initMessages, initPanels,
  initProgress, initQuestLog, initShop,
} from './ui.js';
import { VIEW_H, VIEW_W, WorldScene } from './world.js';

const $ = (id) => document.getElementById(id);
const roomCache = new Map();

function fatal(text) {
  $('loading').hidden = true;
  $('fatal').textContent = text;
  $('fatal').hidden = false;
}

async function loadRoom(key) {
  if (!roomCache.has(key)) roomCache.set(key, applyRoomExtras(await (await fetch(`/rooms/${key}.json`)).json()));
  return roomCache.get(key);
}

function setProgress(done, total) {
  const percent = Math.round((done / total) * 100);
  $('loading-fill').style.width = `${percent}%`;
  $('loading-percent').textContent = `${percent}%`;
}

async function preloadRooms() {
  let done = 0;
  await Promise.all(ROOM_KEYS.map(async (key) => {
    await loadRoom(key);
    done += 1;
    setProgress(done, ROOM_KEYS.length);
  }));
}

function startGame(res) {
  const session = {
    me: res.me,
    players: res.players,
    npcs: res.npcs,
    room: null,
    fishZone: null,
    sitting: false,
    showLoading() {
      setProgress(1, 1);
      $('loading').hidden = false;
    },
    hideLoading() {
      $('loading').hidden = true;
    },
    onRoomReady() {
      $('hud-room').textContent = session.room.title;
      session.hideLoading();
      // Only an account's first login starts in the character creator (the server remembers once
      // a look has been saved); after that the player goes straight into the game.
      if (!enteredGame) {
        enteredGame = true;
        if (!session.me.characterCreated) look.openForEntry();
      }
    },
    async enterRoom({ room, x, y, dir, players, npcs }) {
      session.room = await loadRoom(room);
      Object.assign(session.me, { x, y, dir, fishing: null });
      session.players = players;
      session.npcs = npcs;
      session.sitting = false;
    },
  };
  $('hud-name').textContent = res.me.display;

  let enteredGame = false;
  initPanels();
  session.chat = initChat(res.chat);
  const look = initLook(session);
  session.bag = initBag(session);
  initMessages(session);
  initMenu(session);
  initQuestLog();
  initProgress(session);
  initFriends(session);
  initShop(session);
  initFishLog();
  session.fishing = initFishing(session);

  loadRoom(res.room).then((room) => {
    session.room = room;
    window.__game = new Phaser.Game({
      type: Phaser.AUTO,
      parent: 'game',
      // Backing size = on-screen size in device pixels; the camera zoom does the scaling instead
      // of the browser stretching a small canvas (which made the pixel art look soft).
      ...nativeGameSize(),
      pixelArt: true,
      backgroundColor: room.background,
      scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
      input: { keyboard: false },
      scene: new WorldScene(session),
    });
  });
}

// The canvas keeps the 1024x716 view's shape and fills the window like Scale.FIT, but its pixel
// size matches the screen's real pixels (devicePixelRatio included).
function nativeGameSize() {
  const parent = document.getElementById('game');
  const dpr = window.devicePixelRatio || 1;
  const fit = Math.min(parent.clientWidth / VIEW_W, parent.clientHeight / VIEW_H);
  return { width: Math.round(VIEW_W * fit * dpr), height: Math.round(VIEW_H * fit * dpr) };
}

// Wait a frame so the window's new size has been laid out, then refit the canvas to it.
window.addEventListener('resize', () => requestAnimationFrame(() => {
  const size = nativeGameSize();
  window.__game?.scale.setGameSize(size.width, size.height);
  window.__game?.scale.refresh();
}));

socket.on('replaced', () => fatal('This account was opened in another tab.'));
socket.on('connect_error', () => fatal('Cannot reach the game server. Is it running on port 3001?'));

socket.once('connect', async () => {
  // The session lives on the socket, so a reconnect starts over with a fresh login.
  socket.io.on('reconnect', () => location.reload());
  await preloadRooms();
  // Accounts are fixed local test accounts (auth is bypassed): ?user=bob picks one, default alice.
  const res = await request('login', { username });
  if (!res.ok) return fatal(`Login failed: ${res.error}.`);
  startGame(res);
});

socket.connect();
