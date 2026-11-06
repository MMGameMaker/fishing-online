import { fishingZoneAt } from '../shared/config.js';
import { isTyping, request, socket } from './net.js';
import { ReelInterface } from './reelInterface.js';
import { fishIcon, toast } from './ui.js';

const $ = (id) => document.getElementById(id);
const ACTIVE = new Set(['cast', 'bob', 'hooked', 'reel']);
const SEEN_POPUP_KEY = 'fish-caught-popup-dismissed';

const TIPS = {
  fishEscaped: ['Missed!', 'The fish got away. Click anywhere as soon as you see it bite.'],
  timeElapsed: ['Out of time!', 'The fish escaped. Keep an eye on the timer next time.'],
  failedHook: ['So close!', 'You missed the green zone. Hit it 3 times in a row to land the fish.'],
  pulledEarly: ['Too early!', 'Wait for a bite before you pull the line.'],
  unfocusedWindow: ['Cast canceled', 'You left the game window. Keep it open while fishing.'],
};

function tone(frequency, duration = 0.12, delay = 0) {
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtx) return;
  tone.ctx ??= new AudioCtx();
  const { ctx } = tone;
  const start = ctx.currentTime + delay;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'square';
  osc.frequency.value = frequency;
  gain.gain.value = 0.04;
  osc.connect(gain).connect(ctx.destination);
  osc.start(start);
  osc.stop(start + duration);
}

const sounds = {
  cast: () => { tone(300, 0.08); tone(420, 0.1, 0.08); },
  hooked: () => { tone(880, 0.1); tone(880, 0.1, 0.16); },
  open: () => tone(520, 0.1),
  reel: () => tone(760, 0.14),
  error: () => tone(160, 0.25),
  yay: () => { tone(660, 0.1); tone(880, 0.1, 0.1); tone(1040, 0.2, 0.2); },
};

function seenPopup() {
  try { return localStorage.getItem(SEEN_POPUP_KEY) === '1'; } catch { return true; }
}

function rememberPopup() {
  try { localStorage.setItem(SEEN_POPUP_KEY, '1'); } catch { /* the popup simply shows again */ }
}

export function initFishing(session) {
  // none, starting, cast, bob, hooked, reel, caught, or tip while a message waits for OK.
  let phase = 'none';
  let reel = null;
  let tipClosed = null;

  const setReeling = (on) => document.body.classList.toggle('reeling', on);

  function closeReel() {
    reel?.close();
    reel = null;
    setReeling(false);
  }

  function showTip(title, text, onClose) {
    phase = 'tip';
    tipClosed = onClose ?? null;
    $('fish-tip-title').textContent = title;
    $('fish-tip-text').textContent = text;
    $('fish-tip').hidden = false;
  }

  function failed(reason) {
    closeReel();
    sounds.error();
    showTip(...TIPS[reason]);
  }

  $('fish-tip-ok').addEventListener('click', () => {
    $('fish-tip').hidden = true;
    phase = 'none';
    tipClosed?.();
    tipClosed = null;
  });

  async function start() {
    if (phase !== 'none') return;
    if (!session.fishZone) {
      // Standing on the fishing edge is not enough: point the player to the stools.
      const me = session.world?.me;
      if (me && !session.sitting && fishingZoneAt(session.room, me.x, me.y)) toast('Sit on a stool by the water to fish');
      return;
    }
    phase = 'starting';
    const res = await request('startFishing');
    if (!res.ok) {
      phase = 'none';
      toast(res.error);
      return;
    }
    sounds.cast();
  }

  async function logReel(position) {
    const res = await request('logReel', { position });
    if (!reel) return;
    if (!res.ok) {
      reel.moving = true;
      return;
    }
    if (!res.hit) {
      sounds.error();
      reel.miss(() => failed('failedHook'));
      return;
    }
    sounds.reel();
    reel.success(res.hits, res.zone);
    if (!res.caught) return;
    phase = 'caught';
    session.me.inventory = res.inventory;
    session.me.coins = res.coins;
    session.bag.render();
    sounds.yay();
    setTimeout(closeReel, 1000);
  }

  async function pull() {
    const res = await request('pullLine');
    if (!res.ok) return;
    setReeling(true);
    reel = new ReelInterface(session.world, logReel);
    reel.open(res, sounds.open);
  }

  socket.on('playerFishing', ({ id, phase: next }) => {
    if (id === session.me.id && next) phase = next;
  });
  socket.on('fishBite', sounds.hooked);
  socket.on('fishingFailed', ({ reason }) => failed(reason));

  socket.on('catchSuccess', ({ id, display, fish, rare }) => {
    session.world.players.get(id)?.showCatch(fish, rare);
    const mine = id === session.me.id;
    setTimeout(() => {
      toast(`${display} caught a ${fish.name}`, fishIcon(fish));
      if (rare) session.chat.add({ system: true, text: `${display} just caught a ${fish.name}.` });
      if (!mine) return;
      if (seenPopup()) {
        phase = 'none';
        return;
      }
      showTip(`You caught a ${fish.name}!`, 'It went into your bag. Press B to see it.', rememberPopup);
    }, 1800);
  });

  document.addEventListener('visibilitychange', () => {
    if (document.hidden && ACTIVE.has(phase)) socket.emit('cancelFishing', { reason: 'unfocusedWindow' });
  });

  window.addEventListener('keydown', (e) => {
    if (isTyping() || e.repeat) return;
    if (e.code === 'KeyF' && phase === 'none') start();
    if (e.code !== 'KeyF' && e.code !== 'Space') return;
    e.preventDefault();
    if (phase === 'bob' || phase === 'hooked') pull();
    else if (phase === 'reel') reel?.press();
  });

  return {
    start,
    canFish: () => phase === 'none' && Boolean(session.fishZone),
    isFishing: () => phase !== 'none',
    // Any click on the world pulls the line while it is in the water.
    onWorldPointer() {
      if (phase === 'bob' || phase === 'hooked') pull();
      return phase !== 'none';
    },
  };
}
