// Scene hồ dùng map placeholder và hình khối màu cho tới khi có map thật và asset ART.
import Phaser from 'phaser';
import { getServices, type Services } from '../../core/services';
import { CharacterView } from '../../entities/CharacterView';
import { FishingFlow } from '../../fishing/FishingFlow';
import type { Direction, PlayerView } from '../../net/contract';
import { mountUiOverlay, showError } from '../../ui/kit/components';
import { Joystick } from './Joystick';
import { MoveSender, RemoteMotion, directionFromVector, vectorToTarget } from './movement';
import { isNearSeat } from './seatLogic';
import { SeatMarkers } from './SeatMarkers';
import { SeatUi } from './SeatUi';
import { stepMove, type LakeMap, type LakeSeat } from './walkable';

export const LAKE_SCENE = 'Lake';

const TILE_TEXTURE = 'placeholder-tiles';
const TREE_TEXTURE = 'placeholder-tree';
const GROUND_DEPTH = -1000;
const ROAM_DEPTH = -600;
const MAX_FRAME_MS = 50;
const WATER_TILE = 0;
const GRASS_TILE = 1;
const BOBBER_DISTANCE_PX = 48;
const FACING_VECTORS: Record<string, { x: number; y: number }> = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
};
/** Cây chỉ để kiểm tra sắp lớp theo y, chưa phải vật cản của map. */
const PLACEHOLDER_TREES: readonly [number, number][] = [
  [176, 900],
  [240, 980],
  [130, 760],
  [300, 180],
  [1300, 180],
  [1300, 930],
];

interface RemotePlayer {
  view: CharacterView;
  motion: RemoteMotion;
  iconUntilMs: number | null;
}

export class LakeScene extends Phaser.Scene {
  private services!: Services;
  private map!: LakeMap;
  private me!: CharacterView;
  private flow!: FishingFlow;
  private seatUi!: SeatUi;
  private seatMarkers!: SeatMarkers;
  private roamCircle!: Phaser.GameObjects.Arc;
  private joystick: Joystick | null = null;
  private moveSender!: MoveSender;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd!: Record<'W' | 'A' | 'S' | 'D', Phaser.Input.Keyboard.Key>;
  private root!: HTMLElement;
  private myId = '';
  private moveTarget: { x: number; y: number } | null = null;
  private pendingSeat: LakeSeat | null = null;
  private readonly remotes = new Map<string, RemotePlayer>();
  private readonly cleanups: (() => void)[] = [];

  constructor() {
    super(LAKE_SCENE);
  }

  create(): void {
    this.services = getServices(this);
    this.map = this.services.map;
    this.createPlaceholderTextures();
    this.createGround();
    this.createTrees();
    this.createMe();

    const overlay = mountUiOverlay(this.game);
    this.root = overlay.root;
    this.cleanups.push(overlay.destroy);

    this.createFishing();
    this.createSeats();
    this.createInput();
    this.bindStore();
    this.syncRemotes();
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.shutdown());
  }

  private shutdown(): void {
    this.cleanups.forEach((cleanup) => cleanup());
    this.cleanups.length = 0;
    this.flow.destroy();
    this.seatUi.destroy();
  }

  private serverNow(): number {
    return Date.now() + this.services.store.getState().lake.serverTimeOffsetMs;
  }

  private createPlaceholderTextures(): void {
    if (this.textures.exists(TILE_TEXTURE)) return;
    const size = this.map.tileSize;
    const g = this.add.graphics();
    g.fillStyle(0x2f6f9f).fillRect(WATER_TILE * size, 0, size, size);
    g.fillStyle(0x3b82b5).fillRect(WATER_TILE * size + 6, 10, 10, 2);
    g.fillStyle(0x5a9a4a).fillRect(GRASS_TILE * size, 0, size, size);
    g.fillStyle(0x6bab58).fillRect(GRASS_TILE * size + 4, 6, 3, 3);
    g.fillStyle(0x4f8a41).fillRect(GRASS_TILE * size + 20, 22, 3, 3);
    g.generateTexture(TILE_TEXTURE, size * 2, size);
    g.clear();

    g.fillStyle(0x6b4a2b).fillRect(9, 28, 6, 12);
    g.fillStyle(0x2f6b3a).fillRect(0, 0, 24, 30);
    g.generateTexture(TREE_TEXTURE, 24, 40);
    g.destroy();
  }

  private createGround(): void {
    const { tileSize, walkableRows, widthTiles, heightTiles } = this.map;
    const data = walkableRows.map((row) =>
      [...row].map((cell) => (cell === '1' ? GRASS_TILE : WATER_TILE)),
    );
    const tilemap = this.make.tilemap({ data, tileWidth: tileSize, tileHeight: tileSize });
    const tileset = tilemap.addTilesetImage(TILE_TEXTURE, TILE_TEXTURE, tileSize, tileSize, 0, 0);
    if (!tileset) throw new Error('Không tạo được tileset placeholder');
    tilemap.createLayer(0, tileset, 0, 0)?.setDepth(GROUND_DEPTH);
    this.cameras.main.setBounds(0, 0, widthTiles * tileSize, heightTiles * tileSize);
  }

  private createTrees(): void {
    for (const [x, y] of PLACEHOLDER_TREES) {
      this.add.image(x, y, TREE_TEXTURE).setOrigin(0.5, 1).setDepth(y);
    }
  }

  private createMe(): void {
    const { profile } = this.services.store.getState().session;
    this.myId = profile?.playerId ?? '';
    const mine = this.services.store.getState().lake.players[this.myId];
    const start = mine ?? this.map.spawn;
    this.me = new CharacterView(this, {
      x: start.x,
      y: start.y,
      skinId: profile?.selectedSkinId ?? 'skin_01',
      rodId: profile?.equippedRodId ?? 'rod_old',
      name: profile?.displayName ?? '',
    });
    this.cameras.main.startFollow(this.me.container, true);
    this.roamCircle = this.add.circle(0, 0, 10, 0xffffff, 0.12).setVisible(false);
    this.roamCircle.setDepth(ROAM_DEPTH);
    this.moveSender = new MoveSender((message) => {
      this.services.hub
        .invoke('Move', message)
        .catch((error: unknown) => console.warn('Gửi Move thất bại', error));
    });
  }

  private createFishing(): void {
    this.flow = new FishingFlow(
      this,
      this.services,
      this.root,
      this.me,
      () => this.bobberPoint(),
      () => this.serverNow(),
    );
  }

  private createSeats(): void {
    this.seatMarkers = new SeatMarkers(this, this.map.seats, this.services.store, (seat) =>
      this.onSeatPressed(seat),
    );
    this.seatUi = new SeatUi(this.root, this.services, () => this.flow.canLeaveSeat());
  }

  private createInput(): void {
    const keyboard = this.input.keyboard;
    if (!keyboard) throw new Error('Trình duyệt không có bàn phím');
    this.cursors = keyboard.createCursorKeys();
    this.wasd = keyboard.addKeys('W,A,S,D') as typeof this.wasd;
    if (this.sys.game.device.input.touch) this.joystick = new Joystick(this.root);

    this.input.on(
      'pointerdown',
      (pointer: Phaser.Input.Pointer, over: Phaser.GameObjects.GameObject[]) => {
        if (over.length > 0 || this.flow.isLocked()) return;
        this.pendingSeat = null;
        this.moveTarget = { x: pointer.worldX, y: pointer.worldY };
      },
    );
  }

  private bindStore(): void {
    const { store } = this.services;
    this.cleanups.push(
      store.select(
        (s) => s.lake.correction,
        (correction) => {
          if (!correction) return;
          this.moveTarget = null;
          this.pendingSeat = null;
          this.me.setPosition(correction.x, correction.y);
        },
      ),
      store.select(
        (s) => s.lake.mySeat,
        (seat) => this.onSessionChanged(seat?.seatId ?? null),
      ),
      store.select(
        (s) => s.lake.players,
        () => this.syncRemotes(),
      ),
      store.select(
        (s) => s.lake.catches,
        () => this.syncCatches(),
      ),
    );
  }

  private seatById(seatId: string): LakeSeat | undefined {
    return this.map.seats.find((seat) => seat.seatId === seatId);
  }

  private onSessionChanged(seatId: string | null): void {
    const seat = seatId ? this.seatById(seatId) : undefined;
    this.roamCircle.setVisible(seat !== undefined);
    if (!seat) return;
    this.roamCircle.setPosition(seat.x, seat.y).setRadius(seat.roamRadius);
    this.me.setDirection(seat.facing as Direction);
  }

  private bobberPoint(): { x: number; y: number } | null {
    const mySeat = this.services.store.getState().lake.mySeat;
    const seat = mySeat ? this.seatById(mySeat.seatId) : undefined;
    if (!seat) return null;
    const facing = FACING_VECTORS[seat.facing] ?? { x: 0, y: 1 };
    return {
      x: seat.x + facing.x * BOBBER_DISTANCE_PX,
      y: seat.y + facing.y * BOBBER_DISTANCE_PX,
    };
  }

  private onSeatPressed(seat: LakeSeat): void {
    if (this.flow.isLocked()) return;
    const { lake } = this.services.store.getState();
    const view = lake.seats[seat.seatId];
    if (!view) return;
    if (view.state === 'occupied') {
      showError(this.root, { code: 'SEAT_TAKEN' });
    } else if (lake.mySeat) {
      showError(this.root, { code: 'ALREADY_HAS_SEAT' });
    } else if (isNearSeat(this.me.x, this.me.y, seat)) {
      void this.seatUi.openSeat(seat);
    } else {
      // Ở xa thì tự đi tới rồi mở hộp mua.
      this.pendingSeat = seat;
      this.moveTarget = { x: seat.x, y: seat.y };
    }
  }

  private syncRemotes(): void {
    const { players } = this.services.store.getState().lake;
    const now = performance.now();
    for (const player of Object.values(players)) {
      if (player.playerId !== this.myId) this.syncRemote(player, now);
    }
    for (const [id, remote] of this.remotes) {
      if (!players[id]) {
        remote.view.destroy();
        this.remotes.delete(id);
      }
    }
  }

  private syncRemote(player: PlayerView, now: number): void {
    let remote = this.remotes.get(player.playerId);
    if (!remote) {
      remote = {
        view: new CharacterView(this, {
          x: player.x,
          y: player.y,
          skinId: player.skinId,
          rodId: player.rodId,
          name: player.displayName,
          dir: player.dir,
        }),
        motion: new RemoteMotion(player.x, player.y),
        iconUntilMs: null,
      };
      this.remotes.set(player.playerId, remote);
    }
    remote.motion.setTarget(player.x, player.y, now);
    remote.view.setDirection(player.dir);
    remote.view.setSkin(player.skinId);
    remote.view.setRod(player.rodId);
  }

  private syncCatches(): void {
    const { catches } = this.services.store.getState().lake;
    for (const [playerId, shown] of Object.entries(catches)) {
      const remote = this.remotes.get(playerId);
      const untilMs = Date.parse(shown.shownUntil);
      if (!remote || remote.iconUntilMs === untilMs) continue;
      remote.iconUntilMs = untilMs;
      remote.view.setHeadIcon({ type: 'fish', rarity: shown.rarity });
    }
  }

  private updateRemotes(nowMs: number, serverNowMs: number): void {
    const { players } = this.services.store.getState().lake;
    for (const [id, remote] of this.remotes) {
      const sample = remote.motion.sample(nowMs);
      remote.view.setPosition(sample.x, sample.y);
      if (sample.moving) remote.view.play('walk');
      else remote.view.play(players[id]?.fishing ? 'wait' : 'idle');
      if (remote.iconUntilMs !== null && serverNowMs >= remote.iconUntilMs) {
        remote.iconUntilMs = null;
        remote.view.setHeadIcon(null);
      }
    }
  }

  private readAxis(): { x: number; y: number } {
    const right = this.cursors.right.isDown || this.wasd.D.isDown;
    const left = this.cursors.left.isDown || this.wasd.A.isDown;
    const down = this.cursors.down.isDown || this.wasd.S.isDown;
    const up = this.cursors.up.isDown || this.wasd.W.isDown;
    const x = Number(right) - Number(left) + (this.joystick?.value.x ?? 0);
    const y = Number(down) - Number(up) + (this.joystick?.value.y ?? 0);
    const length = Math.hypot(x, y);
    return length > 1 ? { x: x / length, y: y / length } : { x, y };
  }

  private axisFromInput(): { x: number; y: number } {
    const axis = this.readAxis();
    if (axis.x !== 0 || axis.y !== 0) {
      this.moveTarget = null;
      this.pendingSeat = null;
      return axis;
    }
    if (!this.moveTarget) return axis;

    if (this.pendingSeat && isNearSeat(this.me.x, this.me.y, this.pendingSeat)) {
      const seat = this.pendingSeat;
      this.moveTarget = null;
      this.pendingSeat = null;
      this.onSeatPressed(seat);
      return { x: 0, y: 0 };
    }
    const toward = vectorToTarget(this.me.x, this.me.y, this.moveTarget.x, this.moveTarget.y);
    if (toward.arrived) this.moveTarget = null;
    return toward;
  }

  private moveMe(deltaMs: number, nowMs: number): void {
    const locked = this.flow.isLocked();
    if (locked) {
      this.moveTarget = null;
      this.pendingSeat = null;
    }
    const axis = locked ? { x: 0, y: 0 } : this.axisFromInput();
    let moving = false;
    if (axis.x !== 0 || axis.y !== 0) {
      const distance =
        (this.map.moveRules.maxSpeedPxPerSec * Math.min(deltaMs, MAX_FRAME_MS)) / 1000;
      const next = stepMove(this.map, this.me.x, this.me.y, axis.x * distance, axis.y * distance);
      moving = next.x !== this.me.x || next.y !== this.me.y;
      if (moving) this.me.setPosition(next.x, next.y);
      else this.moveTarget = null;
      this.me.setDirection(directionFromVector(axis.x, axis.y, this.me.direction));
    }
    if (moving) this.me.play('walk');
    else if (!this.flow.isCharacterBusy(nowMs)) this.me.play('idle');
    this.moveSender.update(nowMs, this.me.x, this.me.y, this.me.direction, moving);
  }

  update(_time: number, delta: number): void {
    const nowMs = performance.now();
    const serverNowMs = this.serverNow();
    this.moveMe(delta, nowMs);
    this.flow.update();
    this.seatMarkers.update();
    this.seatUi.update(serverNowMs);
    this.updateRemotes(nowMs, serverNowMs);
  }
}
