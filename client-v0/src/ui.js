import {
  BOTTOMS, BOTTOMS_TINTABLE, CLOTH_COLORS, DEFAULT_LOOK, FISH_BY_ID, HAIR_COLORS, HAIR_STYLES, HAIR_TINTABLE, LOOK_LIMITS,
  RARITY_COLORS, SKIN_COLORS, TOPS, TOPS_TINTABLE,
} from '../shared/config.js';
import { drawFishIcon } from './art.js';
import { isTyping, request, socket } from './net.js';
import { drawCharacterPreview, drawStyleIcon } from './referenceArt.js';

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

// While the character creator is up on entry, no other panel may open or close it.
const creatingCharacter = () => document.body.classList.contains('creating-character');

export function togglePanel(id) {
  if (creatingCharacter()) return;
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
    if (creatingCharacter()) return;
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
  // One tab per clothing layer: a grid of style tiles, then that layer's color swatches.
  const TABS = [
    { id: 'hair', label: 'Hair', key: 'hairStyle', names: HAIR_STYLES, tintable: HAIR_TINTABLE, colorKey: 'hairColor', colors: HAIR_COLORS },
    { id: 'top', label: 'Tops', key: 'top', names: TOPS, tintable: TOPS_TINTABLE, colorKey: 'topColor', colors: CLOTH_COLORS },
    { id: 'bottom', label: 'Pants', key: 'bottom', names: BOTTOMS, tintable: BOTTOMS_TINTABLE, colorKey: 'bottomColor', colors: CLOTH_COLORS },
  ];
  let draft = { ...session.me.look };
  let dirIndex = 0;
  let tab = TABS[0];

  const renderPreview = () => {
    $('look-canvas').replaceChildren(drawCharacterPreview(session.world, draft, REAL_DIR[DIRS[dirIndex]]));
  };

  function swatches(label, colors, key, onPick) {
    const choices = el('div', 'look-choices');
    colors.forEach((value, index) => {
      const button = el('button', 'swatch');
      button.type = 'button';
      button.style.background = value;
      button.setAttribute('aria-label', `${label} ${index + 1}`);
      if (draft[key] === index) button.classList.add('selected');
      button.addEventListener('click', () => { draft[key] = index; onPick(); });
      choices.append(button);
    });
    return choices;
  }

  function renderSkin() {
    $('look-skin').replaceChildren(swatches('Skin', SKIN_COLORS, 'skin', () => { renderPreview(); renderSkin(); }));
  }

  function renderTabs() {
    $('look-tabs').replaceChildren(...TABS.map((t) => {
      const button = el('button', t === tab ? 'selected' : '', t.label);
      button.type = 'button';
      button.setAttribute('role', 'tab');
      button.setAttribute('aria-selected', String(t === tab));
      button.addEventListener('click', () => { tab = t; renderTabs(); renderGrid(); renderColors(); });
      return button;
    }));
  }

  // Each tile shows the style itself, tinted with the current color when that style can be tinted.
  function renderGrid() {
    const grid = $('look-grid');
    const tint = tab.colors[draft[tab.colorKey]];
    grid.replaceChildren(...tab.names.map((name, index) => {
      const tile = el('button', 'look-tile');
      tile.type = 'button';
      tile.title = `${tab.label} ${index + 1}`;
      tile.setAttribute('aria-label', `${tab.label} ${index + 1}`);
      tile.append(drawStyleIcon(session.world, tab.id, index, tab.tintable[index] ? tint : null));
      if (draft[tab.key] === index) tile.classList.add('selected');
      tile.addEventListener('click', () => {
        draft[tab.key] = index;
        grid.querySelector('.look-tile.selected')?.classList.remove('selected');
        tile.classList.add('selected');
        renderPreview();
        renderColors();
      });
      return tile;
    }));
    grid.querySelector('.look-tile.selected')?.scrollIntoView({ block: 'nearest' });
  }

  function renderColors() {
    const wrap = $('look-colors');
    const choices = swatches(`${tab.label} color`, tab.colors, tab.colorKey, () => { renderPreview(); renderGrid(); renderColors(); });
    // A style drawn with its own colors ignores the color pick (see HAIR_TINTABLE etc.), so say so.
    const fixedColors = !tab.tintable[draft[tab.key]];
    if (fixedColors) choices.classList.add('fixed-colors');
    wrap.replaceChildren(el('label', '', `${tab.label} color`), choices);
    if (fixedColors) wrap.append(el('div', 'look-note', 'This style has its own colors'));
  }

  function renderAll() {
    renderPreview();
    renderSkin();
    renderTabs();
    renderGrid();
    renderColors();
  }

  openHandlers['look-panel'] = () => {
    draft = { ...session.me.look };
    renderAll();
  };
  $('look-rotate').addEventListener('click', () => {
    dirIndex = (dirIndex + 1) % DIRS.length;
    renderPreview();
  });
  $('look-random').addEventListener('click', () => {
    for (const [key, limit] of Object.entries(LOOK_LIMITS)) draft[key] = Math.floor(Math.random() * limit);
    renderAll();
  });
  $('look-save').addEventListener('click', async () => {
    const res = await request('changeLook', { look: draft });
    if (!res.ok) return toast(res.error);
    session.me.look = res.look;
    $('look-panel').hidden = true;
    if (creatingCharacter()) {
      setEntryMode(false);
      toast(`Welcome, ${session.me.display}!`);
    } else {
      toast('Look saved');
    }
  });

  // Entry mode: shown right after login, covering the game, with "Play" instead of "Save" and no
  // way to close it except by saving. Keys are swallowed so the player can't walk around behind it.
  function setEntryMode(on) {
    document.body.classList.toggle('creating-character', on);
    $('look-backdrop').hidden = !on;
    $('look-title').textContent = on ? 'Create your character' : 'Change look';
    $('look-save').textContent = on ? 'Play' : 'Save';
  }
  window.addEventListener('keydown', (e) => {
    if (creatingCharacter() && !isTyping()) e.stopImmediatePropagation();
  }, true);

  return {
    openForEntry() {
      PANELS.forEach((panel) => { $(panel).hidden = true; });
      setEntryMode(true);
      $('look-panel').hidden = false;
      openHandlers['look-panel']();
      // Creation always starts from the starter outfit, not the look saved last time.
      draft = { ...DEFAULT_LOOK };
      tab = TABS[0];
      renderAll();
    },
  };
}

// ---------- Bag ----------
export function initBag(session) {
  // Khi đang ở hồ Fishing Online, túi đọc kho cá của hệ thống câu mới thay vì kho cũ.
  let source = null;

  function render() {
    if (source) return renderOnline();
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

  async function renderOnline() {
    const current = source;
    let bag;
    try {
      bag = await current.load();
    } catch {
      toast('Không tải được túi cá.');
      return;
    }
    if (current !== source) return;
    $('hud-coins').textContent = `${bag.gold} Gold`;
    const list = $('bag-list');
    list.replaceChildren();
    let total = 0;
    for (const row of bag.rows) {
      total += row.unitGold * row.count;
      const line = el('div', 'bag-row');
      const name = el('span', 'name', `${row.name} ×${row.count}`);
      name.style.color = row.rarity === 'common' ? '' : RARITY_COLORS[row.rarity] ?? '';
      const sell = el('button', '', `Sell ${row.unitGold * row.count}`);
      sell.type = 'button';
      sell.addEventListener('click', () => sellOnline(row.speciesId));
      const fish = FISH_BY_ID[row.speciesId];
      line.append(...(fish ? [fishIcon(fish)] : []), name, sell);
      list.append(line);
    }
    if (!list.children.length) list.append(el('div', 'bag-empty', 'Chưa có cá. Ngồi ghế và câu để có cá.'));
    $('bag-total').textContent = `Total value: ${total}`;
    $('bag-sell-all').disabled = total === 0;
  }

  async function sellOnline(id) {
    try {
      const res = await source.sell(id);
      if (Number(res.goldEarned) > 0) toast(`Sold for ${res.goldEarned} Gold`);
    } catch {
      toast('Bán cá không thành công.');
    }
    await render();
  }

  async function sellFish(id) {
    if (source) return sellOnline(id);
    const res = await request('sellFish', { id });
    if (!res.ok) return toast(res.error);
    session.me.coins = res.coins;
    session.me.inventory = res.inventory;
    render();
    if (res.earned) toast(`Sold for ${res.earned} coins`);
  }

  /** Bridge Fishing Online gọi khi vào hồ (truyền nguồn) và khi rời hồ (truyền null). */
  function useSource(next) {
    source = next;
    render();
  }

  openHandlers['bag-panel'] = render;
  $('bag-sell-all').addEventListener('click', () => sellFish('all'));
  render();
  return { render, useSource };
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
