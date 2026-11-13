// Hình map bến cá cho LakeScene: nền, bóng dưới cầu, nước động và vật thể dựng lại từ ảnh gốc
// (dữ liệu fishingPierMap.json). Điều khiển, ghế và câu cá do LakeScene/FishingFlow xử lý như hồ.
import Phaser from 'phaser';
import type { LakeMapArt } from '../lake/mapArt';
import type { LakeMap } from '../lake/walkable';
import mapData from './fishingPierMap.json';
import {
  PIER_SHEETS,
  PILLAR_FLOW_ANIM,
  PILLAR_FLOW_WIDTH,
  RIPPLE_ANIMS,
  depthOf,
  pickRippleSpot,
  type PierMapData,
  type PierSheet,
} from './pierMap';

const MAP = mapData as PierMapData;
const ATLAS_BASE = encodeURI('/new resources/anim/atlases');
const SHADOW_TEXTURE = 'fishing-pier-map-shadows';

const GROUND_DEPTH = -10000;
const MAP_SHADOW_DEPTH = -9500;
const RIPPLE_DEPTH = -9300;
const PILLAR_FLOW_DEPTH = -9200;

/** Số gợn sóng cùng lúc và khoảng nghỉ giữa hai lần hiện (ms). */
const RIPPLE_COUNT = 18;
const RIPPLE_REST_MS: [number, number] = [400, 2600];
/** Chiều cao thế giới nhìn thấy khi canvas phủ kín cửa sổ (pixel map). */
const VIEW_HEIGHT = 300;

/** Tốc độ animation tự chọn; atlas chỉ có danh sách frame, không có fps. */
const ANIM_FPS: Record<string, number> = {
  'big-boat/boat': 8,
  'outdoor-animations/lightTree': 8,
  'outdoor-animations/darkTree': 8,
  'water-animations/pillarRiverFlow': 8,
  'water-animations/riverFlowLong': 8,
  'water-animations/riverFlowShort': 8,
  'water-animations/riverLine': 7,
  'water-animations/riverCurve': 7,
};
const DEFAULT_FPS = 6;
/** Viền trắng quanh ghế ngồi được: 4 bản sao trắng lệch 1px phía sau ghế. */
const OUTLINE_OFFSETS: readonly [number, number][] = [
  [-1, 0],
  [1, 0],
  [0, -1],
  [0, 1],
];
const OUTLINE_FADE_MS = 140;
/** Điểm ngồi nằm ngay dưới đáy ghế đẩu (lakemap: y = đáy + 2). */
const SEAT_BELOW_STOOL_PX = 4;

interface AtlasJson {
  animations?: Record<string, string[]>;
}

/** Map chơi được của pier (vùng đi, 22 ghế câu, spawn) cho createServices/mock. */
export const PIER_LAKE_MAP: LakeMap = MAP.lake;

export class PierArt implements LakeMapArt {
  readonly drawsSeats = true;
  private scene: Phaser.Scene | null = null;
  private readonly outlines = new Map<string, Phaser.GameObjects.Image[]>();
  private highlighted: string | null = null;

  preload(scene: Phaser.Scene): void {
    for (const [key, file] of Object.entries(PIER_SHEETS)) {
      if (scene.textures.exists(key)) continue;
      scene.load.atlas(key, `${ATLAS_BASE}/${file}.png`, `${ATLAS_BASE}/${file}.json`);
      scene.load.json(`${key}-json`, `${ATLAS_BASE}/${file}.json`);
    }
  }

  create(scene: Phaser.Scene): void {
    this.scene = scene;
    this.outlines.clear();
    this.highlighted = null;
    this.createAnims(scene);
    this.createGround(scene);
    this.createMapShadows(scene);
    this.createPillarFlows(scene);
    this.createRipples(scene);
    this.createObjects(scene);
    this.createSeatOutlines(scene);
    this.fitCamera(scene);
  }

  /** Viền trắng ghế đang ngồi được; đổi ghế thì viền cũ mờ đi, viền mới hiện dần. */
  highlightSeat(seatId: string | null): void {
    if (seatId === this.highlighted || !this.scene) return;
    const fade = (seat: string | null, alpha: number): void => {
      const parts = seat ? this.outlines.get(seat) : undefined;
      if (!parts) return;
      this.scene!.tweens.killTweensOf(parts);
      this.scene!.tweens.add({
        targets: parts,
        alpha,
        duration: OUTLINE_FADE_MS,
        ease: 'Sine.easeOut',
      });
    };
    fade(this.highlighted, 0);
    fade(seatId, 1);
    this.highlighted = seatId;
  }

  /** Mỗi ghế câu gắn với ghế đẩu chứa điểm ngồi; dựng sẵn viền ẩn (alpha 0). */
  private createSeatOutlines(scene: Phaser.Scene): void {
    const stools = MAP.objects.filter((o) => o.frame === 'main-objects/stool');
    for (const seat of MAP.lake.seats) {
      const stool = stools.find(
        (o) =>
          seat.x >= o.x &&
          seat.x <= o.x + o.w &&
          seat.y >= o.y &&
          seat.y <= (o.by ?? o.y + o.h) + SEAT_BELOW_STOOL_PX,
      );
      if (!stool) continue;
      const depth = depthOf(stool) - 0.5;
      this.outlines.set(
        seat.seatId,
        OUTLINE_OFFSETS.map(([dx, dy]) =>
          scene.add
            .image(stool.x + dx, stool.y + dy, stool.sheet, stool.frame)
            .setOrigin(0)
            .setTintFill(0xffffff)
            .setDepth(depth)
            .setAlpha(0),
        ),
      );
    }
  }

  /** Canvas phủ kín cửa sổ: phóng camera để thấy khoảng VIEW_HEIGHT px map, không lộ ngoài map. */
  private fitCamera(scene: Phaser.Scene): void {
    const apply = (): void => {
      const cam = scene.cameras.main;
      cam.setSize(scene.scale.width, scene.scale.height);
      cam.setZoom(
        Math.max(cam.height / VIEW_HEIGHT, cam.width / MAP.width, cam.height / MAP.height),
      );
    };
    apply();
    scene.scale.on(Phaser.Scale.Events.RESIZE, apply);
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () =>
      scene.scale.off(Phaser.Scale.Events.RESIZE, apply),
    );
  }

  private createAnims(scene: Phaser.Scene): void {
    for (const key of Object.keys(PIER_SHEETS) as PierSheet[]) {
      const json = scene.cache.json.get(`${key}-json`) as AtlasJson | undefined;
      for (const [name, frames] of Object.entries(json?.animations ?? {})) {
        if (scene.anims.exists(name)) continue;
        scene.anims.create({
          key: name,
          frames: frames.map((frame) => ({ key, frame })),
          frameRate: ANIM_FPS[name] ?? DEFAULT_FPS,
          repeat: -1,
        });
      }
    }
  }

  /** Nền: 68 × 50 ô 16px, vẽ một lần vào RenderTexture. */
  private createGround(scene: Phaser.Scene): void {
    const rt = scene.add.renderTexture(0, 0, MAP.width, MAP.height).setOrigin(0);
    rt.setDepth(GROUND_DEPTH);
    rt.beginDraw();
    MAP.ground.forEach((row, r) =>
      row.forEach((index, c) => {
        const frame = MAP.groundFrames[index];
        if (frame) rt.batchDrawFrame('pier', frame, c * MAP.tile, r * MAP.tile);
      }),
    );
    rt.endDraw();
  }

  /**
   * Bóng dưới mép cầu. Atlas lưu alpha 102/255 nhưng ảnh gốc hiển thị đậm hơn,
   * nên dựng texture riêng với alpha đo được rồi vẽ lên nền.
   */
  private createMapShadows(scene: Phaser.Scene): void {
    if (MAP.shadows.length === 0) return;
    if (!scene.textures.exists(SHADOW_TEXTURE)) {
      const used = [...new Set(MAP.shadows.map(([, , frame]) => frame))];
      const canvas = scene.textures.createCanvas(SHADOW_TEXTURE, MAP.tile * used.length, MAP.tile);
      if (!canvas) throw new Error('Không tạo được texture bóng map');
      const ctx = canvas.getContext();
      const atlas = scene.textures.get('pier');
      used.forEach((name, i) => {
        const f = atlas.get(name);
        const dx = i * MAP.tile;
        ctx.drawImage(
          f.source.image as CanvasImageSource,
          f.cutX,
          f.cutY,
          f.cutWidth,
          f.cutHeight,
          dx + f.x,
          f.y,
          f.cutWidth,
          f.cutHeight,
        );
        canvas.add(name, 0, dx, 0, MAP.tile, MAP.tile);
      });
      const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const alpha = Math.round(MAP.shadowAlpha * 255);
      for (let i = 3; i < img.data.length; i += 4) {
        if (img.data[i]! > 0) img.data[i] = alpha;
      }
      ctx.putImageData(img, 0, 0);
      canvas.refresh();
    }
    const rt = scene.add.renderTexture(0, 0, MAP.width, MAP.height).setOrigin(0);
    rt.setDepth(MAP_SHADOW_DEPTH);
    rt.beginDraw();
    for (const [c, r, frame] of MAP.shadows) {
      rt.batchDrawFrame(SHADOW_TEXTURE, frame, c * MAP.tile, r * MAP.tile);
    }
    rt.endDraw();
  }

  /** Dòng nước chảy quanh chân cọc dưới cầu, chạy liên tục, lệch pha nhau. */
  private createPillarFlows(scene: Phaser.Scene): void {
    for (const [x, y] of MAP.pillarFlows) {
      scene.add
        .sprite(x - PILLAR_FLOW_WIDTH / 2, y, 'pier')
        .setOrigin(0)
        .setDepth(PILLAR_FLOW_DEPTH)
        .play({ key: PILLAR_FLOW_ANIM, startFrame: Phaser.Math.Between(0, 9) });
    }
  }

  /** Gợn sóng hiện ngẫu nhiên trên mặt nước trống: chạy hết một lượt rồi chuyển chỗ khác. */
  private createRipples(scene: Phaser.Scene): void {
    for (let i = 0; i < RIPPLE_COUNT; i++) {
      const sprite = scene.add.sprite(0, 0, 'pier').setOrigin(0).setDepth(RIPPLE_DEPTH);
      sprite.setVisible(false);
      const spawn = (): void => {
        const anim = Phaser.Utils.Array.GetRandom([...RIPPLE_ANIMS]);
        const spot = pickRippleSpot(MAP.openWater, anim, MAP.tile, Math.random);
        if (!spot) {
          scene.time.delayedCall(500, spawn);
          return;
        }
        sprite.setPosition(spot.x, spot.y).setVisible(true);
        sprite.play({ key: anim.key, repeat: 0 });
      };
      sprite.on(Phaser.Animations.Events.ANIMATION_COMPLETE, () => {
        sprite.setVisible(false);
        scene.time.delayedCall(Phaser.Math.Between(...RIPPLE_REST_MS), spawn);
      });
      scene.time.delayedCall(Phaser.Math.Between(0, 3000), spawn);
    }
  }

  /** Bờ nước, bóng object, cây, nhà, thuyền, bàn ghế… đặt đúng toạ độ trong ảnh gốc. */
  private createObjects(scene: Phaser.Scene): void {
    for (const o of MAP.objects) {
      const depth = depthOf(o);
      if (o.anim && scene.anims.exists(o.anim)) {
        scene.add
          .sprite(o.x, o.y, o.sheet, o.frame)
          .setOrigin(0)
          .setDepth(depth)
          .play({ key: o.anim, startFrame: o.animIndex ?? 0 });
      } else {
        scene.add.image(o.x, o.y, o.sheet, o.frame).setOrigin(0).setDepth(depth);
      }
    }
  }
}
