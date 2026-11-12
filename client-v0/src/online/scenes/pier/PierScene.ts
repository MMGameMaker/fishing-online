// Scene xem trước map bến cá, dựng lại theo ảnh gốc từ dữ liệu fishingPierMap.json.
// Chưa nối với LakeScene, walkable hay Server.
import Phaser from 'phaser';
import { PreviewCamera } from '../preview/previewCamera';
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

export const PIER_SCENE = 'Pier';

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

interface AtlasJson {
  animations?: Record<string, string[]>;
}

export class PierScene extends Phaser.Scene {
  private camera!: PreviewCamera;

  constructor() {
    super(PIER_SCENE);
  }

  preload(): void {
    for (const [key, file] of Object.entries(PIER_SHEETS)) {
      this.load.atlas(key, `${ATLAS_BASE}/${file}.png`, `${ATLAS_BASE}/${file}.json`);
      this.load.json(`${key}-json`, `${ATLAS_BASE}/${file}.json`);
    }
  }

  create(): void {
    this.createAnims();
    this.createGround();
    this.createMapShadows();
    this.createPillarFlows();
    this.createRipples();
    this.createObjects();
    this.camera = new PreviewCamera(
      this,
      { x: 0, y: 0, width: MAP.width, height: MAP.height },
      { x: 600, y: 420 },
    );
  }

  update(_time: number, delta: number): void {
    this.camera.update(delta);
  }

  private createAnims(): void {
    for (const key of Object.keys(PIER_SHEETS) as PierSheet[]) {
      const json = this.cache.json.get(`${key}-json`) as AtlasJson | undefined;
      for (const [name, frames] of Object.entries(json?.animations ?? {})) {
        if (this.anims.exists(name)) continue;
        this.anims.create({
          key: name,
          frames: frames.map((frame) => ({ key, frame })),
          frameRate: ANIM_FPS[name] ?? DEFAULT_FPS,
          repeat: -1,
        });
      }
    }
  }

  /** Nền: 68 × 50 ô 16px, vẽ một lần vào RenderTexture. */
  private createGround(): void {
    const rt = this.add.renderTexture(0, 0, MAP.width, MAP.height).setOrigin(0);
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
  private createMapShadows(): void {
    if (MAP.shadows.length === 0) return;
    if (!this.textures.exists(SHADOW_TEXTURE)) {
      const used = [...new Set(MAP.shadows.map(([, , frame]) => frame))];
      const canvas = this.textures.createCanvas(SHADOW_TEXTURE, MAP.tile * used.length, MAP.tile);
      if (!canvas) throw new Error('Không tạo được texture bóng map');
      const ctx = canvas.getContext();
      const atlas = this.textures.get('pier');
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
    const rt = this.add.renderTexture(0, 0, MAP.width, MAP.height).setOrigin(0);
    rt.setDepth(MAP_SHADOW_DEPTH);
    rt.beginDraw();
    for (const [c, r, frame] of MAP.shadows) {
      rt.batchDrawFrame(SHADOW_TEXTURE, frame, c * MAP.tile, r * MAP.tile);
    }
    rt.endDraw();
  }

  /** Dòng nước chảy quanh chân cọc dưới cầu, chạy liên tục, lệch pha nhau. */
  private createPillarFlows(): void {
    for (const [x, y] of MAP.pillarFlows) {
      this.add
        .sprite(x - PILLAR_FLOW_WIDTH / 2, y, 'pier')
        .setOrigin(0)
        .setDepth(PILLAR_FLOW_DEPTH)
        .play({ key: PILLAR_FLOW_ANIM, startFrame: Phaser.Math.Between(0, 9) });
    }
  }

  /** Gợn sóng hiện ngẫu nhiên trên mặt nước trống: chạy hết một lượt rồi chuyển chỗ khác. */
  private createRipples(): void {
    for (let i = 0; i < RIPPLE_COUNT; i++) {
      const sprite = this.add.sprite(0, 0, 'pier').setOrigin(0).setDepth(RIPPLE_DEPTH);
      sprite.setVisible(false);
      const spawn = (): void => {
        const anim = Phaser.Utils.Array.GetRandom([...RIPPLE_ANIMS]);
        const spot = pickRippleSpot(MAP.openWater, anim, MAP.tile, Math.random);
        if (!spot) {
          this.time.delayedCall(500, spawn);
          return;
        }
        sprite.setPosition(spot.x, spot.y).setVisible(true);
        sprite.play({ key: anim.key, repeat: 0 });
      };
      sprite.on(Phaser.Animations.Events.ANIMATION_COMPLETE, () => {
        sprite.setVisible(false);
        this.time.delayedCall(Phaser.Math.Between(...RIPPLE_REST_MS), spawn);
      });
      this.time.delayedCall(Phaser.Math.Between(0, 3000), spawn);
    }
  }

  /** Bờ nước, bóng object, cây, nhà, thuyền, bàn ghế… đặt đúng toạ độ trong ảnh gốc. */
  private createObjects(): void {
    for (const o of MAP.objects) {
      const depth = depthOf(o);
      if (o.anim && this.anims.exists(o.anim)) {
        this.add
          .sprite(o.x, o.y, o.sheet, o.frame)
          .setOrigin(0)
          .setDepth(depth)
          .play({ key: o.anim, startFrame: o.animIndex ?? 0 });
      } else {
        this.add.image(o.x, o.y, o.sheet, o.frame).setOrigin(0).setDepth(depth);
      }
    }
  }
}
