// Scene xem trước khu fishing-cabin: phòng lg, phòng md và sân sau. Chưa nối LakeScene hay Server.
import Phaser from 'phaser';
import { PreviewCamera, type Bounds } from '../preview/previewCamera';
import {
  BIRD_ANIMS,
  DOOR_FRAME,
  METADATA_KEY,
  PIER_ATLAS,
  POND,
  POND_CELLS,
  POND_WATER_FRAMES,
  SHORE_FRAME_COUNT,
  SHORE_TYPES,
  RES,
  ROOMS,
  ROOM_ATLAS,
  WINDOW_ANIM,
  YARD_ATLAS,
  YARD_DOOR,
  YARD_VIEW,
  backyardGround,
  collidersOf,
  isSandPixel,
  mulberry32,
  partPlacements,
  type CabinMapId,
  type MapJson,
  type PartMetadata,
  type RoomId,
  type TilePlacement,
} from './cabinData';

export const CABIN_SCENE = 'Cabin';

const ATLASES = [
  { key: ROOM_ATLAS, file: 'sheet-room-fishing-cabin-0' },
  { key: YARD_ATLAS, file: 'sheet-fishing-cabin-yard-0' },
  { key: PIER_ATLAS, file: 'sheet-fishing-pier-0' },
] as const;
const MAP_FILES = ['fishing-cabin-lg.json', 'fishing-cabin-md.json', 'fishing-cabin-backyard.json'];

const FLOOR_DEPTH = -10000;
const FRONT_DEPTH = 10000;
const DEBUG_DEPTH = 20000;

/** Tốc độ animation tự chọn; atlas chỉ có danh sách frame. */
const ANIM_FPS = 10;
const SHORE_FPS = 6;

/** Khúc gỗ và cột cắt từ lớp tường trước của phòng lg, dùng dựng vách sau nhà ở sân sau. */
const LG_FRONT_TEXTURE = 'cabin-lg-front-wall';
const LOG_CROP = { x: 79, y: 112, width: 416, height: 48 };
const POST_CROP = { x: 192, y: 16, width: 16, height: 96 };
const YARD_WALL = { x: 400, y: 541, width: 296 };
const YARD_POSTS_X = [408, 660];
const YARD_POST_TOP = 571;
const POND_TEXTURE = 'cabin-pond-shore';

interface AtlasJson {
  animations?: Record<string, string[]>;
}

export interface CabinSceneData {
  map?: CabinMapId;
  /** Phòng vừa đi ra, để cửa sân sau dẫn về đúng phòng. */
  fromRoom?: RoomId;
}

/** Báo cho trang xem trước biết map nào đang mở. */
export const CABIN_MAP_EVENT = 'cabin-map-changed';

export class CabinScene extends Phaser.Scene {
  private mapId: CabinMapId = 'lg';
  private fromRoom: RoomId = 'lg';
  private camera!: PreviewCamera;
  private debug!: Phaser.GameObjects.Graphics;

  constructor() {
    super(CABIN_SCENE);
  }

  init(data: CabinSceneData): void {
    this.mapId = data.map ?? 'lg';
    this.fromRoom = data.fromRoom ?? (this.mapId === 'md' ? 'md' : 'lg');
  }

  preload(): void {
    const atlasBase = `${RES}/anim/atlases`;
    for (const { key, file } of ATLASES) {
      this.load.atlas(key, `${atlasBase}/${file}.png`, `${atlasBase}/${file}.json`);
      this.load.json(`${key}-json`, `${atlasBase}/${file}.json`);
    }
    this.load.json(METADATA_KEY, `${RES}/anim/embedded-metadata-0.json`);
    for (const file of MAP_FILES) this.load.json(file, `${RES}/maps/${file}`);
  }

  create(): void {
    this.createAnims();
    if (this.mapId === 'backyard') this.createBackyard();
    else this.createRoom(this.mapId);
    this.createDebugToggle();
    this.game.events.emit(CABIN_MAP_EVENT, this.mapId);
  }

  update(_time: number, delta: number): void {
    this.camera.update(delta);
  }

  private createAnims(): void {
    for (const { key } of ATLASES) {
      const json = this.cache.json.get(`${key}-json`) as AtlasJson | undefined;
      for (const [name, frames] of Object.entries(json?.animations ?? {})) {
        if (this.anims.exists(name)) continue;
        this.anims.create({
          key: name,
          frames: frames.map((frame) => ({ key, frame })),
          frameRate: name.startsWith('water-shore-tiles/') ? SHORE_FPS : ANIM_FPS,
          repeat: name.startsWith('water-') ? -1 : 0,
        });
      }
    }
  }

  private part(key: string): PartMetadata {
    const metadata = this.cache.json.get(METADATA_KEY) as Record<string, PartMetadata>;
    const part = metadata[key];
    if (!part) throw new Error(`Thiếu metadata ${key}`);
    return part;
  }

  /** Vẽ một mảnh (sàn/tường) ghép từ tile vào RenderTexture. */
  private drawPart(key: string, x: number, y: number): Phaser.GameObjects.RenderTexture {
    const part = this.part(key);
    const rt = this.add.renderTexture(x, y, part.data.image.width, part.data.image.height);
    rt.setOrigin(0);
    this.drawTiles(rt, ROOM_ATLAS, partPlacements(part), 0, 0);
    return rt;
  }

  private drawTiles(
    rt: Phaser.GameObjects.RenderTexture,
    atlas: string,
    tiles: TilePlacement[],
    offsetX: number,
    offsetY: number,
  ): void {
    rt.beginDraw();
    for (const t of tiles) rt.batchDrawFrame(atlas, t.frame, t.x - offsetX, t.y - offsetY);
    rt.endDraw();
  }

  // ---------------- Phòng ----------------

  private createRoom(id: RoomId): void {
    const room = ROOMS[id];
    const floor = this.drawPart(room.floor, 0, 0).setDepth(FLOOR_DEPTH);
    this.drawPart(room.bottomWall, room.bottomWallAt.x, room.bottomWallAt.y).setDepth(FRONT_DEPTH);

    const middle = this.add
      .image(room.middleWall.x, room.middleWall.y, ROOM_ATLAS, room.middleWall.frame)
      .setOrigin(0);
    middle.setDepth(middle.y + middle.height);

    for (const w of room.windows) this.createWindow(w.x, w.y);
    room.birdWindows.forEach((w, i) => this.createBird(w.x, w.y, i));
    this.createDoor(room.door.x, room.door.y, () =>
      this.scene.restart({ map: 'backyard', fromRoom: id } satisfies CabinSceneData),
    );

    this.drawColliders(room.mapJson);
    this.camera = new PreviewCamera(this, { x: 0, y: 0, width: floor.width, height: floor.height });
  }

  /** Cửa sổ mở/đóng theo chu kỳ, có khoảng nghỉ ngẫu nhiên. */
  private createWindow(x: number, y: number): void {
    const sprite = this.add.sprite(x, y, ROOM_ATLAS, `${WINDOW_ANIM}1`).setOrigin(0);
    sprite.setDepth(y);
    const loop = (): void => {
      this.time.delayedCall(Phaser.Math.Between(2500, 6000), () => sprite.play(WINDOW_ANIM));
    };
    sprite.on(Phaser.Animations.Events.ANIMATION_COMPLETE, loop);
    loop();
  }

  /** Chim trên bệ cửa sổ: lần lượt vỗ cánh, kêu, ấp trứng. */
  private createBird(x: number, y: number, seed: number): void {
    const rand = mulberry32(seed + 1);
    const sprite = this.add.sprite(x, y, ROOM_ATLAS, `${BIRD_ANIMS[0]}1`).setOrigin(0);
    sprite.setDepth(y);
    const loop = (): void => {
      const anim = BIRD_ANIMS[Math.floor(rand() * BIRD_ANIMS.length)] ?? BIRD_ANIMS[0];
      this.time.delayedCall(Phaser.Math.Between(1500, 4000), () => sprite.play(anim));
    };
    sprite.on(Phaser.Animations.Events.ANIMATION_COMPLETE, loop);
    loop();
  }

  /** Cửa: rê chuột thì hiện cánh cửa mở, bấm để chuyển map. */
  private createDoor(
    x: number,
    y: number,
    onEnter: () => void,
    alwaysOpen = false,
  ): Phaser.GameObjects.Image {
    const door = this.add
      .image(x, y, ROOM_ATLAS, DOOR_FRAME)
      .setOrigin(0)
      .setAlpha(alwaysOpen ? 1 : 0);
    door.setDepth(y + door.height);
    // Phaser bỏ qua input của object alpha 0, nên vùng bấm là một zone riêng.
    const hit = this.add.zone(x, y, door.width, door.height).setOrigin(0);
    hit.setInteractive({ useHandCursor: true });
    const fade = (alpha: number): void => {
      this.tweens.killTweensOf(door);
      this.tweens.add({ targets: door, alpha, duration: 160, ease: 'Sine.easeOut' });
    };
    if (!alwaysOpen) {
      hit.on('pointerover', () => fade(1));
      hit.on('pointerout', () => fade(0));
    }
    hit.on('pointerup', (pointer: Phaser.Input.Pointer) => {
      // Bỏ qua khi người dùng đang kéo camera.
      if (pointer.getDistance() > 4) return;
      onEnter();
    });
    return door;
  }

  // ---------------- Sân sau ----------------

  private createBackyard(): void {
    const view: Bounds = YARD_VIEW;
    const ground = this.add.renderTexture(view.x, view.y, view.width, view.height);
    ground.setOrigin(0).setDepth(FLOOR_DEPTH);
    this.drawTiles(ground, YARD_ATLAS, backyardGround(), view.x, view.y);

    this.createPond();

    this.createYardWall();
    // Ở sân sau cửa luôn mở để thấy lối vào nhà.
    const door = this.createDoor(
      YARD_DOOR.x,
      YARD_DOOR.y,
      () => this.scene.restart({ map: this.fromRoom } satisfies CabinSceneData),
      true,
    );
    door.setDepth(YARD_WALL.y + LOG_CROP.height + 1);

    this.drawColliders('fishing-cabin-backyard.json');
    this.camera = new PreviewCamera(this, view, { x: 530, y: 640 });
  }

  /** Ao: tile bờ của fishing-pier đã bỏ phần cát (texture tạo lúc chạy), giữa ao là ô nước. */
  private createPond(): void {
    this.buildPondTexture();
    for (const c of POND_CELLS) {
      const x = POND.x + c.dx * POND.cell;
      const y = POND.y + c.dy * POND.cell;
      if (c.type === 'water') {
        const rand = mulberry32(5);
        for (const [ox, oy] of [
          [0, 0],
          [16, 0],
          [0, 16],
          [16, 16],
        ] as const) {
          const frame =
            POND_WATER_FRAMES[Math.floor(rand() * POND_WATER_FRAMES.length)] ??
            POND_WATER_FRAMES[0]!;
          this.add
            .image(x + ox, y + oy, PIER_ATLAS, frame)
            .setOrigin(0)
            .setDepth(FLOOR_DEPTH + 1);
        }
        continue;
      }
      this.add
        .sprite(x, y, POND_TEXTURE, `${c.type}1`)
        .setOrigin(0)
        .setDepth(FLOOR_DEPTH + 2)
        .play(`${POND_TEXTURE}/${c.type}`);
    }
  }

  private buildPondTexture(): void {
    if (this.textures.exists(POND_TEXTURE)) return;
    const size = POND.cell;
    const canvas = this.textures.createCanvas(
      POND_TEXTURE,
      size * SHORE_FRAME_COUNT,
      size * SHORE_TYPES.length,
    );
    if (!canvas) throw new Error('Không tạo được texture bờ ao');
    const ctx = canvas.getContext();
    const atlas = this.textures.get(PIER_ATLAS);
    SHORE_TYPES.forEach((type, row) => {
      for (let i = 1; i <= SHORE_FRAME_COUNT; i++) {
        const f = atlas.get(`water-shore-tiles/shore${type}${i}`);
        const dx = (i - 1) * size;
        const dy = row * size;
        ctx.drawImage(
          f.source.image as CanvasImageSource,
          f.cutX,
          f.cutY,
          f.cutWidth,
          f.cutHeight,
          dx + f.x,
          dy + f.y,
          f.cutWidth,
          f.cutHeight,
        );
        canvas.add(`${type}${i}`, 0, dx, dy, size, size);
      }
    });
    const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const px = img.data;
    for (let i = 0; i < px.length; i += 4) {
      if (isSandPixel(px[i]!, px[i + 1]!, px[i + 2]!)) px[i + 3] = 0;
    }
    ctx.putImageData(img, 0, 0);
    canvas.refresh();
    for (const type of SHORE_TYPES) {
      this.anims.create({
        key: `${POND_TEXTURE}/${type}`,
        frames: Array.from({ length: SHORE_FRAME_COUNT }, (_, i) => ({
          key: POND_TEXTURE,
          frame: `${type}${i + 1}`,
        })),
        frameRate: SHORE_FPS,
        repeat: -1,
      });
    }
  }

  /** Vách sau nhà và hai hàng cọc rào, ghép từ khúc gỗ của phòng lg (sân sau không có art vách riêng). */
  private createYardWall(): void {
    if (!this.textures.exists(LG_FRONT_TEXTURE)) {
      const rt = this.drawPart(ROOMS.lg.bottomWall, 0, 0);
      rt.saveTexture(LG_FRONT_TEXTURE);
      rt.setVisible(false);
      const tex = this.textures.get(LG_FRONT_TEXTURE);
      const half = YARD_WALL.width / 2;
      tex.add('logLeft', 0, LOG_CROP.x, LOG_CROP.y, half, LOG_CROP.height);
      tex.add('logRight', 0, LOG_CROP.x + LOG_CROP.width - half, LOG_CROP.y, half, LOG_CROP.height);
      tex.add('post', 0, POST_CROP.x, POST_CROP.y, POST_CROP.width, POST_CROP.height);
    }
    const wallBottom = YARD_WALL.y + LOG_CROP.height;
    this.add
      .image(YARD_WALL.x, YARD_WALL.y, LG_FRONT_TEXTURE, 'logLeft')
      .setOrigin(0)
      .setDepth(wallBottom);
    this.add
      .image(YARD_WALL.x + YARD_WALL.width / 2, YARD_WALL.y, LG_FRONT_TEXTURE, 'logRight')
      .setOrigin(0)
      .setDepth(wallBottom);

    const bottom = YARD_VIEW.y + YARD_VIEW.height;
    for (const x of YARD_POSTS_X) {
      for (let y = YARD_POST_TOP; y < bottom; y += POST_CROP.height) {
        this.add
          .image(x, y, LG_FRONT_TEXTURE, 'post')
          .setOrigin(0)
          .setDepth(y + POST_CROP.height);
      }
    }
  }

  // ---------------- Va chạm (kiểm tra) ----------------

  private drawColliders(mapFile: string): void {
    const map = this.cache.json.get(mapFile) as MapJson;
    this.debug = this.add.graphics().setDepth(DEBUG_DEPTH).setVisible(false);
    for (const c of collidersOf(map)) {
      const color = c.kind === 'water' ? 0x3fa9ff : 0xff4060;
      this.debug.fillStyle(color, 0.25).fillRect(c.x, c.y, c.width, c.height);
      this.debug.lineStyle(1, color, 0.9).strokeRect(c.x, c.y, c.width, c.height);
    }
  }

  private createDebugToggle(): void {
    this.input.keyboard!.on('keydown-C', () => this.debug.setVisible(!this.debug.visible));
  }
}
