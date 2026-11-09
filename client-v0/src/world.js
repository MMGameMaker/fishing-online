import Phaser from 'phaser';
import { FISH_BY_ID, TILE, canStand, fishingZoneAt, teleportAt } from '../shared/config.js';
import { FarmController } from './farming.js';
import { CoralCoveOnline } from './online/bridge/CoralCoveOnline.ts';
import { isTyping, request, socket } from './net.js';
import { NpcController } from './npc.js';
import { PlayerEntity } from './player.js';
import { preloadReferenceArt, queueSheet, registerFrames, registerReferenceArt } from './referenceArt.js';
import { SeatController } from './seats.js';

const SPEED = 130;
const SEND_MS = 70;
// The view always shows a 1024x716 area of the world at zoom 1 (VIEW_W x VIEW_H "game pixels").
export const VIEW_W = 1024;
export const VIEW_H = 716;
// Camera zoom for rooms that look too small at 1:1 (e.g. the Tinkerbean shop). These rooms are
// snapped to a whole number of screen pixels per art pixel so the pixel art stays sharp.
const ROOM_ZOOM = { store: 1.5 };

// The canvas is sized in real screen pixels (see main.js), so the camera zoom carries both the
// fit-to-window scale and the room zoom.
function cameraZoom(scene, roomKey) {
  const fit = scene.scale.width / VIEW_W;
  const roomZoom = ROOM_ZOOM[roomKey];
  return roomZoom ? Math.max(1, Math.round(fit * roomZoom)) : fit;
}

const KEYS = {
  ArrowUp: 'up', KeyW: 'up', ArrowDown: 'down', KeyS: 'down', ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right',
};

export class WorldScene extends Phaser.Scene {
  constructor(session) {
    super('world');
    this.session = session;
    session.world = this;
    this.players = new Map();
    this.held = new Set();
    this.clickTarget = null;
    this.lastSend = 0;
    this.sentMoving = false;
    this.changingRoom = false;
    this.bound = false;
  }

  preload() {
    preloadReferenceArt(this);
    const room = this.session.room;
    const bgKey = `room_${room.key}`;
    if (!this.textures.exists(bgKey)) this.load.image(bgKey, `/rooms/${room.key}.png`);
    const animSheets = new Set();
    for (const item of room.decor) {
      if (item.image) {
        const key = `decor_${item.image}`;
        if (!this.textures.exists(key)) this.load.image(key, `/assets/${item.image}`);
      } else if (item.anim && !animSheets.has(item.anim.sheet)) {
        animSheets.add(item.anim.sheet);
        queueSheet(this, `decoranim_${item.anim.sheet}`, `/assets/${item.anim.sheet}`, `/assets/${item.anim.atlas}`);
      }
    }
  }

  create() {
    registerReferenceArt(this);
    const { room, me, players } = this.session;
    const animSheets = new Set(room.decor.filter((d) => d.anim).map((d) => d.anim.sheet));
    for (const sheet of animSheets) registerFrames(this, `decoranim_${sheet}`, `decoranim_${sheet}_json`);
    this.players = new Map();
    this.clickTarget = null;
    this.drawRoom(room);

    this.me = new PlayerEntity(this, me, true);
    this.players.set(me.id, this.me);
    players.forEach((p) => this.addPlayer(p));

    this.fishButton = this.add.image(0, 0, 'ref_buttons', 'fishButton').setScale(1.3)
      .setDepth(3400).setVisible(false).setInteractive({ useHandCursor: true });
    this.fishButton.on('pointerover', () => this.fishButton.setTint(0xffe2b0));
    this.fishButton.on('pointerout', () => this.fishButton.clearTint());
    this.fishButton.on('pointerdown', (_pointer, _x, _y, event) => {
      event.stopPropagation();
      this.session.fishing.start();
    });

    this.seats = new SeatController(this, this.session);
    this.npcController = new NpcController(this, this.session);
    this.farm = new FarmController(this, this.session);
    // Coral Cove dùng ghế thuê và câu cá của Fishing Online; các phòng khác giữ nguyên.
    this.online = room.key === 'coralCove'
      ? new CoralCoveOnline(this, this.session, { request, fishById: FISH_BY_ID })
      : null;
    this.events.once('shutdown', () => {
      this.online?.destroy();
      this.online = null;
    });

    const { tx, ty, w, h } = room.bounds;
    this.cameras.main.setBackgroundColor(room.background);
    this.cameras.main.setBounds(tx * TILE, ty * TILE, w * TILE, h * TILE);
    // Small interiors are shown closer up (camera zoom per room key; default 1).
    this.cameras.main.setZoom(cameraZoom(this, room.key));
    const onResize = () => this.cameras.main.setZoom(cameraZoom(this, room.key));
    this.scale.on('resize', onResize);
    this.events.once('shutdown', () => this.scale.off('resize', onResize));
    this.cameras.main.startFollow(this.me.followTarget, true);

    this.input.on('pointerdown', (pointer) => {
      document.activeElement?.blur();
      if (this.online?.blocksWorldClick()) return;
      if (this.session.fishing.onWorldPointer()) return;
      this.clickTarget = { x: pointer.worldX, y: pointer.worldY };
    });
    if (!this.bound) {
      this.bound = true;
      this.bindSocket();
      this.bindKeys();
    }
    this.changingRoom = false;
    this.session.onRoomReady();
  }

  drawRoom(room) {
    const bgKey = `room_${room.key}`;
    this.add.image(room.bounds.tx * TILE, room.bounds.ty * TILE, bgKey).setOrigin(0, 0).setDepth(-1000);
    for (const item of room.decor) {
      if (item.image) {
        const key = `decor_${item.image}`;
        this.add.image(item.x, item.y, key).setOrigin(0, 0).setDisplaySize(item.w, item.h).setDepth(item.depth);
      } else if (item.anim) {
        const texKey = `decoranim_${item.anim.sheet}`;
        const animKey = `anim_${item.anim.sheet}`;
        if (!this.anims.exists(animKey)) {
          this.anims.create({
            key: animKey,
            frames: this.anims.generateFrameNames(texKey, { prefix: item.anim.prefix, start: 0, end: item.anim.frames - 1 }),
            frameRate: 8,
            repeat: -1,
          });
        }
        this.add.sprite(item.x, item.y, texKey).setOrigin(0, 0).setDisplaySize(item.w, item.h).setDepth(item.depth).play(animKey);
      } else {
        const color = Phaser.Display.Color.HexStringToColor(item.color).color;
        this.add.rectangle(item.x, item.y, item.w, item.h, color, 0.85).setOrigin(0, 0).setDepth(item.depth).setStrokeStyle(1, 0x000000, 0.25);
      }
    }
  }

  addPlayer(info) {
    this.players.get(info.id)?.destroy();
    this.players.set(info.id, new PlayerEntity(this, info, false));
  }

  bindSocket() {
    socket.on('playerJoined', (p) => { if (!this.changingRoom) this.addPlayer(p); });
    socket.on('playerLeft', ({ id }) => {
      this.players.get(id)?.destroy();
      this.players.delete(id);
    });
    socket.on('playerMoved', (m) => this.players.get(m.id)?.setRemoteState(m));
    socket.on('lookChanged', ({ id, look }) => this.players.get(id)?.setLook(look));
    socket.on('chat', ({ from, text }) => this.players.get(from)?.showBubble(text));
    socket.on('positionCorrect', ({ x, y }) => this.me.snapTo(x, y));
    socket.on('playerFishing', ({ id, phase, dir, rodLevel }) => this.players.get(id)?.setFishing(phase, dir, rodLevel));
    socket.on('playerSat', ({ id, x, y, dir, index }) => {
      const p = this.players.get(id);
      p?.setSitting(true);
      p?.snapTo(x, y);
      if (p) p.dir = dir;
      if (id === this.session.me.id) { this.session.sitting = true; this.session.seatIndex = index; }
    });
    socket.on('playerStood', ({ id, x, y, dir }) => {
      const p = this.players.get(id);
      p?.setSitting(false);
      p?.snapTo(x, y);
      if (p) p.dir = dir;
      if (id === this.session.me.id) this.session.sitting = false;
    });
    socket.on('playerDanced', ({ id, dancing }) => this.players.get(id)?.setDancing(dancing));
    NpcController.bindSocket(() => this.npcController);
    FarmController.bindSocket(() => this.farm);
  }

  bindKeys() {
    window.addEventListener('keydown', (e) => {
      if (isTyping()) return;
      if (e.code === 'KeyX' && !this.session.fishing.isFishing()) {
        e.preventDefault();
        if (this.session.sitting && this.online) this.online.leave();
        else if (this.session.sitting) request('standUp');
        else request('toggleDancing');
        return;
      }
      if (!KEYS[e.code]) return;
      e.preventDefault();
      this.held.add(KEYS[e.code]);
      this.clickTarget = null;
    });
    window.addEventListener('keyup', (e) => this.held.delete(KEYS[e.code]));
    window.addEventListener('blur', () => this.held.clear());
  }

  movementVector() {
    if (this.session.fishing.isFishing() || this.session.sitting || this.online?.isLocked() || isTyping()) {
      this.clickTarget = null;
      return null;
    }
    const vx = (this.held.has('right') ? 1 : 0) - (this.held.has('left') ? 1 : 0);
    const vy = (this.held.has('down') ? 1 : 0) - (this.held.has('up') ? 1 : 0);
    if (vx || vy) return { vx, vy };
    if (!this.clickTarget) return null;
    const dx = this.clickTarget.x - this.me.x, dy = this.clickTarget.y - this.me.y;
    if (Math.hypot(dx, dy) < 4) {
      this.clickTarget = null;
      return null;
    }
    return { vx: dx, vy: dy };
  }

  moveMe(delta) {
    const { room } = this.session;
    const me = this.me;
    const vector = this.movementVector();
    let moved = false;
    if (vector) {
      const length = Math.hypot(vector.vx, vector.vy);
      const step = (SPEED * delta) / 1000;
      const nx = me.x + (vector.vx / length) * step;
      const ny = me.y + (vector.vy / length) * step;
      if (canStand(room, nx, me.y)) { me.x = nx; moved = true; }
      if (canStand(room, me.x, ny)) { me.y = ny; moved = true; }
      if (!moved) this.clickTarget = null;
      if (Math.abs(vector.vx) >= Math.abs(vector.vy)) me.dir = vector.vx > 0 ? 'right' : 'left';
      else me.dir = vector.vy > 0 ? 'down' : 'up';
    }
    me.moving = moved;
    const now = this.time.now;
    const exit = moved ? teleportAt(room, me.x, me.y) : -1;
    if ((moved && now - this.lastSend >= SEND_MS) || (!moved && this.sentMoving) || exit >= 0) {
      socket.emit('playerMovement', { x: me.x, y: me.y, dir: me.dir, moving: moved });
      this.lastSend = now;
      this.sentMoving = moved;
    }
    // Fishing needs a stool by the water: the zone is the fishing edge under the seat.
    const seat = this.session.sitting ? room.seats[this.session.seatIndex] : null;
    this.session.fishZone = seat?.stool && !this.online ? fishingZoneAt(room, seat.x, seat.y) : null;
    if (exit >= 0) this.changeRoom(exit);
  }

  async changeRoom(index) {
    const { session } = this;
    this.changingRoom = true;
    session.showLoading();
    const res = await request('useTeleport', { index });
    if (!res.ok) {
      session.hideLoading();
      this.changingRoom = false;
      return;
    }
    await session.enterRoom(res);
    for (const player of this.players.values()) player.destroy();
    this.players.clear();
    this.scene.restart();
  }

  update(time, delta) {
    if (!this.changingRoom) this.moveMe(delta);
    for (const player of this.players.values()) player.update(time, delta);
    const busy = this.changingRoom || this.session.sitting || this.session.fishing.isFishing();
    const showButton = this.session.fishing.canFish() && !this.me.moving && !this.changingRoom;
    this.fishButton.setVisible(showButton).setPosition(this.me.x, this.me.y - 84);
    this.seats.update(this.me, busy);
    this.npcController.update(this.me);
    this.farm.update(this.me, busy);
    this.online?.update();
  }
}
