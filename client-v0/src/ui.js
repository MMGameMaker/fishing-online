import {
  BOTTOMS, CLOTH_COLORS, FISH_BY_ID, HAIR_COLORS, HAIR_STYLES, LOOK_LIMITS, RARITY_COLORS, SKIN_COLORS, TOPS,
} from '../shared/config.js';
import { drawFishIcon } from './art.js';
import { isTyping, request, socket } from './net.js';
import { drawCharacterPreview } from './referenceArt.js';

const $ = (id) => document.getElementById(id);

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

export function toast(text, icon) {
  const node = el('div', 'toast');
  if (icon) node.append(icon);
  node.append(el('span', '', text));
  $('toasts').append(node);
  setTimeout(() => node.remove(), 3500);
}

export function fishIcon(fish) {
  return drawFishIcon(fish.color, fish.rarity === 'junk');
}

// ---------- Panels ----------
const PANELS = [
  'look-panel', 'bag-panel', 'dm-panel', 'menu-panel', 'quest-panel', 'npc-panel',
  'friends-panel', 'shop-panel', 'fishlog-panel',
];
const openHandlers = {};

export function togglePanel(id) {
  const opening = $(id).hidden;
  PANELS.forEach((panel) => { $(panel).hidden = true; });
  $(id).hidden = !opening;
  if (opening) openHandlers[id]?.();
}

export const isPanelOpen = (id) => !$(id).hidden;

export function initPanels() {
  document.querySelectorAll('[data-close]').forEach((button) => {
    button.addEventListener('click', () => { $(button.dataset.close).hidden = true; });
  });
  $('btn-look').addEventListener('click', () => togglePanel('look-panel'));
  $('btn-bag').addEventListener('click', () => togglePanel('bag-panel'));
  $('btn-dm').addEventListener('click', () => togglePanel('dm-panel'));
  $('btn-menu').addEventListener('click', () => togglePanel('menu-panel'));
  $('btn-quests').addEventListener('click', () => togglePanel('quest-panel'));
  window.addEventListener('keydown', (e) => {
    if (e.code === 'Escape') {
      PANELS.forEach((panel) => { $(panel).hidden = true; });
      return;
    }
    if (isTyping()) return;
    if (e.code === 'KeyC') togglePanel('look-panel');
    if (e.code === 'KeyB') togglePanel('bag-panel');
    if (e.code === 'KeyM') togglePanel('dm-panel');
    if (e.code === 'KeyQ') togglePanel('quest-panel');
  });
}

// ---------- Chat ----------
export function initChat(history) {
  const log = $('chat-log');
  const input = $('chat-input');
  const add = ({ display, text, system }) => {
    const line = el('div', system ? 'system' : '');
    if (!system) line.append(el('b', '', `${display}: `));
    line.append(document.createTextNode(text));
    log.append(line);
    while (log.children.length > 80) log.firstChild.remove();
    log.scrollTop = log.scrollHeight;
  };
  history.forEach(add);
  socket.on('chat', add);
  $('chat-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const text = input.value.trim();
    if (text) socket.emit('chat', { text });
    input.value = '';
    input.blur();
  });
  window.addEventListener('keydown', (e) => {
    if (e.code === 'Enter' && !isTyping()) {
      e.preventDefault();
      input.focus();
    }
    if (e.code === 'Escape' && document.activeElement === input) input.blur();
  });
  return { add };
}

// ---------- Character customization ----------
export function initLook(session) {
  const DIRS = ['down', 'side', 'up'];
  // The real sprite sheets have no generic 'side' pose, only distinct 'left'/'right' art.
  const REAL_DIR = { down: 'down', side: 'right', up: 'up' };
  const rows = [
    { key: 'skin', label: 'Skin', colors: SKIN_COLORS },
    { key: 'hairStyle', label: 'Hair', names: HAIR_STYLES },
    { key: 'hairColor', label: 'Hair color', colors: HAIR_COLORS },
    { key: 'top', label: 'Top', names: TOPS },
    { key: 'topColor', label: 'Top color', colors: CLOTH_COLORS },
    { key: 'bottom', label: 'Bottom', names: BOTTOMS },
    { key: 'bottomColor', label: 'Bottom color', colors: CLOTH_COLORS },
  ];
  let draft = { ...session.me.look };
  let dirIndex = 0;

  function render() {
    $('look-canvas').replaceChildren(drawCharacterPreview(session.world, draft, REAL_DIR[DIRS[dirIndex]]));
    const options = $('look-options');
    options.replaceChildren();
    for (const row of rows) {
      const wrap = el('div', 'look-row');
      wrap.append(el('label', '', row.label));
      const choices = el('div', 'look-choices');
      (row.colors ?? row.names).forEach((value, index) => {
        const button = el('button', row.colors ? 'swatch' : '', row.colors ? '' : value);
        button.type = 'button';
        if (row.colors) {
          button.style.background = value;
          button.setAttribute('aria-label', `${row.label} ${index + 1}`);
        }
        if (draft[row.key] === index) button.classList.add('selected');
        button.addEventListener('click', () => { draft[row.key] = index; render(); });
        choices.append(button);
      });
      wrap.append(choices);
      options.append(wrap);
    }
  }

  openHandlers['look-panel'] = () => {
    draft = { ...session.me.look };
    render();
  };
  $('look-rotate').addEventListener('click', () => {
    dirIndex = (dirIndex + 1) % DIRS.length;
    render();
  });
  $('look-random').addEventListener('click', () => {
    for (const [key, limit] of Object.entries(LOOK_LIMITS)) draft[key] = Math.floor(Math.random() * limit);
    render();
  });
  $('look-save').addEventListener('click', async () => {
    const res = await request('changeLook', { look: draft });
    if (!res.ok) return toast(res.error);
    session.me.look = res.look;
    $('look-panel').hidden = true;
    toast('Look saved');
  });
}

// ---------- Bag ----------
export function initBag(session) {
  function render() {
    $('hud-coins').textContent = `${session.me.coins} coins`;
    const list = $('bag-list');
    list.replaceChildren();
    let total = 0;
    for (const [id, count] of Object.entries(session.me.inventory)) {
      const fish = FISH_BY_ID[id];
      if (!fish) continue;
      total += fish.value * count;
      const row = el('div', 'bag-row');
      const name = el('span', 'name', `${fish.name} ×${count}`);
      name.style.color = fish.rarity === 'common' ? '' : RARITY_COLORS[fish.rarity];
      const sell = el('button', '', `Sell ${fish.value * count}`);
      sell.type = 'button';
      sell.addEventListener('click', () => sellFish(id));
      row.append(fishIcon(fish), name, sell);
      list.append(row);
    }
    if (!list.children.length) list.append(el('div', 'bag-empty', 'No fish yet. Walk to the edge of the dock and press the fish button.'));
    $('bag-total').textContent = `Total value: ${total}`;
    $('bag-sell-all').disabled = total === 0;
  }

  async function sellFish(id) {
    const res = await request('sellFish', { id });
    if (!res.ok) return toast(res.error);
    session.me.coins = res.coins;
    session.me.inventory = res.inventory;
    render();
    if (res.earned) toast(`Sold for ${res.earned} coins`);
  }

  openHandlers['bag-panel'] = render;
  $('bag-sell-all').addEventListener('click', () => sellFish('all'));
  render();
  return { render };
}

// ---------- Main menu ----------
export function initMenu(session) {
  openHandlers['menu-panel'] = () => {
    $('menu-profile').textContent = `${session.me.display} · Level ${session.me.level} · ${session.me.coins} coins · ${session.room.title}`;
  };
  $('menu-look').addEventListener('click', () => togglePanel('look-panel'));
  $('menu-bag').addEventListener('click', () => togglePanel('bag-panel'));
  $('menu-quests').addEventListener('click', () => togglePanel('quest-panel'));
  $('menu-dm').addEventListener('click', () => togglePanel('dm-panel'));
  $('menu-friends').addEventListener('click', () => togglePanel('friends-panel'));
  $('menu-shop').addEventListener('click', () => togglePanel('shop-panel'));
  $('menu-fishlog').addEventListener('click', () => togglePanel('fishlog-panel'));
  $('menu-dance').addEventListener('click', () => {
    togglePanel('menu-panel');
    request('toggleDancing');
  });
}

// ---------- Level / XP ----------
export function initProgress(session) {
  const render = () => { $('hud-level').textContent = `Lv ${session.me.level}`; };
  render();
  socket.on('levelUp', ({ level, pixels }) => {
    session.me.level = level;
    session.me.pixels = pixels;
    render();
    toast(`Level up! You're now level ${level}.`);
  });
}

// ---------- Friends ----------
export function initFriends(session) {
  async function render() {
    const res = await request('getFriends');
    if (res.ok) renderList(res.friends);
  }
  function renderList(friends) {
    const list = $('friends-list');
    list.replaceChildren();
    for (const friend of friends) {
      const row = el('div', 'bag-row');
      const dot = el('span', `dot${friend.online ? ' on' : ''}`);
      const name = el('span', 'name', friend.display);
      const remove = el('button', '', 'Remove');
      remove.type = 'button';
      remove.addEventListener('click', async () => {
        const r = await request('removeFriend', { username: friend.username });
        if (r.ok) renderList(r.friends);
      });
      row.append(dot, name, remove);
      list.append(row);
    }
    if (!friends.length) list.append(el('div', 'bag-empty', 'No friends added yet.'));
  }

  openHandlers['friends-panel'] = render;
  $('friends-add-btn').addEventListener('click', async () => {
    const input = $('friends-add-input');
    const username = input.value.trim().toLowerCase();
    if (!username) return;
    const res = await request('addFriend', { username });
    if (!res.ok) return toast(res.error);
    input.value = '';
    renderList(res.friends);
    toast('Friend added');
  });
  socket.on('presence', () => { if (isPanelOpen('friends-panel')) render(); });
}

// ---------- Shop ----------
export function initShop(session) {
  async function render() {
    const list = $('shop-list');
    const res = await request('getShopItems');
    if (!res.ok) return;
    list.replaceChildren();
    for (const rod of res.rods) {
      const row = el('div', 'bag-row');
      const name = el('span', 'name', `Rod level ${rod.level}`);
      let action;
      if (rod.owned) action = el('span', '', 'Owned');
      else if (rod.level !== res.rodLevel + 1) action = el('span', '', `Needs level ${rod.level - 1} first`);
      else {
        action = el('button', '', `Buy for ${rod.price} coins`);
        action.type = 'button';
        action.addEventListener('click', async () => {
          const r = await request('buyRodLevel', { level: rod.level });
          if (!r.ok) return toast(r.error);
          session.me.coins = r.coins;
          session.me.rodLevel = r.rodLevel;
          session.bag.render();
          toast(`Rod upgraded to level ${r.rodLevel}!`);
          render();
        });
      }
      row.append(name, action);
      list.append(row);
    }
    $('shop-coins').textContent = `${res.coins} coins`;
  }
  openHandlers['shop-panel'] = render;
}

// ---------- Fish logbook ----------
export function initFishLog() {
  async function render() {
    const list = $('fishlog-list');
    const res = await request('getFishLog');
    if (!res.ok) return;
    list.replaceChildren();
    for (const fish of res.species) {
      const row = el('div', 'bag-row');
      const caught = fish.caught > 0;
      const name = el('span', 'name', caught ? `${fish.name} ×${fish.caught}` : '???');
      if (caught) name.style.color = fish.rarity === 'common' ? '' : RARITY_COLORS[fish.rarity];
      row.append(caught ? fishIcon(fish) : el('span', '', '🔒'), name);
      list.append(row);
    }
  }
  openHandlers['fishlog-panel'] = render;
}

// ---------- Quest log ----------
const STATUS_LABEL = { new: 'Not started', in_progress: 'In progress', ready: 'Ready to turn in!', completed: 'Completed' };

export function initQuestLog() {
  async function render() {
    const list = $('quest-list');
    const res = await request('getQuestLog');
    if (!res.ok) return;
    list.replaceChildren();
    for (const q of res.quests) {
      const row = el('div', 'bag-row');
      const name = el('span', 'name', `${q.name} (${q.npcName})`);
      const status = el('span', '', STATUS_LABEL[q.status]);
      if (q.status === 'ready') status.style.color = '#ffb02e';
      row.append(name, status);
      list.append(row);
    }
  }
  openHandlers['quest-panel'] = render;
}

// ---------- Direct messages ----------
export function initMessages(session) {
  let contacts = [];
  let activeWith = null;

  function renderBadge() {
    const unread = contacts.reduce((sum, c) => sum + c.unread, 0);
    $('dm-badge').hidden = unread === 0;
    $('dm-badge').textContent = String(unread);
  }

  function renderContacts() {
    const list = $('dm-contacts');
    list.replaceChildren();
    for (const contact of contacts) {
      const button = el('button', `dm-contact${contact.username === activeWith ? ' selected' : ''}`);
      button.type = 'button';
      const top = el('div', 'top');
      top.append(el('span', `dot${contact.online ? ' on' : ''}`), el('span', '', contact.display));
      if (contact.unread) top.append(el('span', 'unread', String(contact.unread)));
      button.append(top, el('div', 'preview', contact.lastMessage ?? 'No messages yet'));
      button.addEventListener('click', () => openThread(contact.username));
      list.append(button);
    }
    renderBadge();
  }

  async function refreshContacts() {
    const res = await request('getContacts');
    if (!res.ok) return;
    contacts = res.contacts;
    renderContacts();
  }

  function appendMessage(message) {
    const box = $('dm-messages');
    box.append(el('div', `dm-msg${message.from === session.me.id ? ' mine' : ''}`, message.text));
    box.scrollTop = box.scrollHeight;
  }

  async function openThread(other) {
    activeWith = other;
    const res = await request('getThread', { with: other });
    if (!res.ok) return toast(res.error);
    $('dm-title').textContent = contacts.find((c) => c.username === other)?.display ?? other;
    $('dm-messages').replaceChildren();
    res.messages.forEach(appendMessage);
    $('dm-input').disabled = false;
    $('dm-input').focus();
    refreshContacts();
  }

  openHandlers['dm-panel'] = refreshContacts;

  $('dm-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const input = $('dm-input');
    const text = input.value.trim();
    if (!text || !activeWith) return;
    input.value = '';
    const res = await request('sendDM', { to: activeWith, text });
    if (!res.ok) return toast(res.error);
    appendMessage(res.message);
    refreshContacts();
  });

  socket.on('dm', (message) => {
    if (isPanelOpen('dm-panel') && activeWith === message.from) {
      appendMessage(message);
      request('getThread', { with: message.from }).then(refreshContacts);
      return;
    }
    refreshContacts().then(() => {
      const sender = contacts.find((c) => c.username === message.from);
      toast(`New message from ${sender?.display ?? message.from}`);
    });
  });
  socket.on('presence', refreshContacts);
  refreshContacts();
}
