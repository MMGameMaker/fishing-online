// Scene hồ dùng map placeholder và hình khối màu cho tới khi có map thật và asset ART.
import Phaser from 'phaser';
import { getServices, type Services } from '../../core/services';
import { stepMove, type LakeMap } from './walkable';

export const LAKE_SCENE = 'Lake';

const TILE_TEXTURE = 'placeholder-tiles';
const PLAYER_TEXTURE = 'placeholder-player';
const TREE_TEXTURE = 'placeholder-tree';
const GROUND_DEPTH = -1000;
const SEAT_DEPTH = -500;
const MAX_FRAME_MS = 50;
const WATER_TILE = 0;
const GRASS_TILE = 1;
const TIER_COLORS: Record<number, number> = { 1: 0xf2c14e, 2: 0x8fb8de, 3: 0xb0a890 };
/** Cây chỉ để kiểm tra sắp lớp theo y, chưa phải vật cản của map. */
const PLACEHOLDER_TREES: readonly [number, number][] = [
  [176, 900],
  [240, 980],
  [130, 760],
  [300, 180],
  [1300, 180],
  [1300, 930],
];

export class LakeScene extends Phaser.Scene {
  private services!: Services;
  private map!: LakeMap;
  private player!: Phaser.GameObjects.Image;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd!: Record<'W' | 'A' | 'S' | 'D', Phaser.Input.Keyboard.Key>;

  constructor() {
    super(LAKE_SCENE);
  }

  create(): void {
    this.services = getServices(this);
    this.map = this.services.map;
    this.createPlaceholderTextures();
    this.createGround();
    this.createSeatMarkers();
    this.createTrees();
    this.createPlayer();
    this.createInput();
  }

  private createPlaceholderTextures(): void {
    const size = this.map.tileSize;
    const g = this.add.graphics();
    g.fillStyle(0x2f6f9f).fillRect(WATER_TILE * size, 0, size, size);
    g.fillStyle(0x3b82b5).fillRect(WATER_TILE * size + 6, 10, 10, 2);
    g.fillStyle(0x5a9a4a).fillRect(GRASS_TILE * size, 0, size, size);
    g.fillStyle(0x6bab58).fillRect(GRASS_TILE * size + 4, 6, 3, 3);
    g.fillStyle(0x4f8a41).fillRect(GRASS_TILE * size + 20, 22, 3, 3);
    g.generateTexture(TILE_TEXTURE, size * 2, size);
    g.clear();

    g.fillStyle(0xe8d8b0).fillRect(0, 0, 14, 10);
    g.fillStyle(0xc0483c).fillRect(0, 10, 14, 14);
    g.generateTexture(PLAYER_TEXTURE, 14, 24);
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

  private createSeatMarkers(): void {
    for (const seat of this.map.seats) {
      this.add
        .rectangle(seat.x, seat.y - 6, 18, 12, TIER_COLORS[seat.tier] ?? 0xffffff)
        .setDepth(SEAT_DEPTH);
      this.add
        .text(seat.x, seat.y - 6, String(seat.number), {
          fontFamily: 'monospace',
          fontSize: '10px',
          color: '#1a1a1a',
        })
        .setOrigin(0.5)
        .setDepth(SEAT_DEPTH + 1);
    }
  }

  private createTrees(): void {
    for (const [x, y] of PLACEHOLDER_TREES) {
      this.add.image(x, y, TREE_TEXTURE).setOrigin(0.5, 1).setDepth(y);
    }
  }

  private createPlayer(): void {
    const { store } = this.services;
    const { profile } = store.getState().session;
    const me = profile ? store.getState().lake.players[profile.playerId] : undefined;
    const start = me ?? this.map.spawn;
    this.player = this.add.image(start.x, start.y, PLAYER_TEXTURE).setOrigin(0.5, 1);
    this.player.setDepth(this.player.y);
    this.cameras.main.startFollow(this.player, true);
  }

  private createInput(): void {
    const keyboard = this.input.keyboard;
    if (!keyboard) throw new Error('Trình duyệt không có bàn phím');
    this.cursors = keyboard.createCursorKeys();
    this.wasd = keyboard.addKeys('W,A,S,D') as typeof this.wasd;
  }

  /** Điều khiển cục bộ để kiểm tra va chạm; CL-B-04 sẽ thay bằng joystick và đồng bộ Move. */
  update(_time: number, delta: number): void {
    const right = this.cursors.right.isDown || this.wasd.D.isDown;
    const left = this.cursors.left.isDown || this.wasd.A.isDown;
    const down = this.cursors.down.isDown || this.wasd.S.isDown;
    const up = this.cursors.up.isDown || this.wasd.W.isDown;
    const axisX = Number(right) - Number(left);
    const axisY = Number(down) - Number(up);
    if (axisX === 0 && axisY === 0) return;

    const length = Math.hypot(axisX, axisY);
    const seconds = Math.min(delta, MAX_FRAME_MS) / 1000;
    const distance = this.map.moveRules.maxSpeedPxPerSec * seconds;
    const next = stepMove(
      this.map,
      this.player.x,
      this.player.y,
      (axisX / length) * distance,
      (axisY / length) * distance,
    );
    this.player.setPosition(next.x, next.y).setDepth(next.y);
  }
}
