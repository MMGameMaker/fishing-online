import Phaser from 'phaser';
import { ROOM_KEYS } from '../shared/config.js';
import { applyRoomExtras } from '../shared/roomExtras.js';
import { googleIdToken } from './firebaseAuth.js';
import { initFishing } from './fishing.js';
import { request, socket } from './net.js';
import {
  initBag, initChat, initFishLog, initFriends, initLook, initMenu, initMessages, initPanels,
  initProgress, initQuestLog, initShop,
} from './ui.js';
import { WorldScene } from './world.js';

const $ = (id) => document.getElementById(id);
const roomCache = new Map();

const LOADING_TIPS = [
  'Mẹo: Bấm trúng vùng vàng để kéo cá gấp đôi.',
  'Bước vào cửa để đổi phòng.',
  'Câu cá ở mép bến Coral Cove.',
  'Bấm vào NPC có dấu ! trên đầu để nhận nhiệm vụ.',
  'Bấm vào đệm để ngồi, nhấn X để nhảy múa.',
];

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

function revealLoading() {
  $('loading-tip').textContent = LOADING_TIPS[Math.floor(Math.random() * LOADING_TIPS.length)];
  $('loading').hidden = false;
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
      revealLoading();
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

// Canvas lấp kín cửa sổ (không giữ tỉ lệ 1024x716 nên không còn viền đen hai bên); kích thước
// pixel bằng pixel thật của màn hình (tính cả devicePixelRatio). Camera zoom lo phần co giãn.
function nativeGameSize() {
  const parent = document.getElementById('game');
  const dpr = window.devicePixelRatio || 1;
  return { width: Math.round(parent.clientWidth * dpr), height: Math.round(parent.clientHeight * dpr) };
}

// Wait a frame so the window's new size has been laid out, then refit the canvas to it.
window.addEventListener('resize', () => requestAnimationFrame(() => {
  const size = nativeGameSize();
  window.__game?.scale.setGameSize(size.width, size.height);
  window.__game?.scale.refresh();
}));

socket.on('replaced', () => fatal('This account was opened in another tab.'));
socket.on('connect_error', () => fatal('Cannot reach the game server. Is it running on port 3001?'));

async function enterWithToken(idToken) {
  $('login').hidden = true;
  revealLoading();
  socket.once('connect', async () => {
    // The session lives on the socket, so a reconnect starts over with a fresh login.
    socket.io.on('reconnect', () => location.reload());
    await preloadRooms();
    const res = await request('login', { idToken });
    if (!res.ok) return fatal(`Login failed: ${res.error}.`);
    startGame(res);
  });
  socket.connect();
}

const loginButton = $('login-google');
const loginError = $('login-error');
loginButton.addEventListener('click', async () => {
  loginButton.disabled = true;
  loginError.hidden = true;
  try {
    await enterWithToken(await googleIdToken());
  } catch (error) {
    loginError.textContent = error?.message || 'Google sign-in failed.';
    loginError.hidden = false;
    loginButton.disabled = false;
  }
});
