import Phaser from 'phaser';
import { SEED_ACCOUNTS, ROOM_KEYS } from '../shared/config.js';
import { initFishing } from './fishing.js';
import { request, socket, username } from './net.js';
import {
  initBag, initChat, initFishLog, initFriends, initLook, initMenu, initMessages, initPanels,
  initProgress, initQuestLog, initShop,
} from './ui.js';
import { WorldScene } from './world.js';

const $ = (id) => document.getElementById(id);
const roomCache = new Map();

function fatal(text) {
  $('loading').hidden = true;
  $('fatal').textContent = text;
  $('fatal').hidden = false;
}

async function loadRoom(key) {
  if (!roomCache.has(key)) roomCache.set(key, await (await fetch(`/rooms/${key}.json`)).json());
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

// Accounts are fixed local test accounts: choosing one replaces login and registration.
function chooseAccount() {
  if (new URLSearchParams(location.search).has('user')) return Promise.resolve(username);
  return new Promise((resolve) => {
    const list = $('welcome-accounts');
    for (const account of SEED_ACCOUNTS.filter((a) => !a.bot)) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'primary';
      button.textContent = `Play as ${account.display}`;
      button.addEventListener('click', () => resolve(account.username));
      list.append(button);
    }
    $('welcome').hidden = false;
  });
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

  initPanels();
  session.chat = initChat(res.chat);
  initLook(session);
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
      width: 1024,
      height: 716,
      pixelArt: true,
      backgroundColor: room.background,
      scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
      input: { keyboard: false },
      scene: new WorldScene(session),
    });
  });
}

socket.on('replaced', () => fatal('This account was opened in another tab.'));
socket.on('connect_error', () => fatal('Cannot reach the game server. Is it running on port 3001?'));

socket.once('connect', async () => {
  // The session lives on the socket, so a reconnect starts over with a fresh login.
  socket.io.on('reconnect', () => location.reload());
  await preloadRooms();
  $('loading').hidden = true;
  const account = await chooseAccount();
  $('welcome').hidden = true;
  $('loading').hidden = false;
  const res = await request('login', { username: account });
  if (!res.ok) return fatal(`Login failed: ${res.error}.`);
  startGame(res);
});

socket.connect();
