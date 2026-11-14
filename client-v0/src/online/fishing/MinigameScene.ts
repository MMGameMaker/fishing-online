// Màn minigame chạy phủ lên scene hồ. Theo SPEC 0.5 Client tự xử lý, không gửi từng tap.
// Giao diện dựng từ ảnh nguồn trong public/mini game (feedback 2026-11-11): đồng hồ tròn bên trái,
// thanh đường đi của cá ở trên, thanh đo có kim ở dưới; cả cụm nằm giữa, phía dưới màn hình.
// Ảnh nguồn vẽ ở tỉ lệ 4 (mỗi điểm ảnh pixel art = 4×4 px), nên mọi toạ độ ảnh dưới đây chia hết cho 4.
import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from '../core/env';
import type { Rarity } from '../core/gameplayConfig';
import type { FishingOutcome, MinigameParams, TapResult } from '../net/contract';
import {
  applyTap,
  createState,
  isLost,
  needlePos,
  remainingMs,
  type MinigameState,
} from './minigameCore';

export const MINIGAME_SCENE = 'Minigame';

export interface MinigameData {
  params: MinigameParams;
  /** Mốc performance.now() tương ứng t = 0, đã bù nửa RTT. */
  t0: number;
  onFinish: (outcome: FishingOutcome) => void;
  /** Mỗi tap được nhận: scene hồ kéo cần, lóe sáng chỗ dây câu (damage = số cm bị trừ). */
  onTap?: (kind: TapResult, damage: number) => void;
}

const ASSET_DIR = '/mini game/';
const SRC = {
  timer: { key: 'mg-src-timer', file: 'Timer.png' },
  path: { key: 'mg-src-path', file: 'Fish Path.png' },
  hitBar: { key: 'mg-src-hitbar', file: 'Hit Bar.png' },
  needle: { key: 'mg-src-needle', file: 'Needle.png' },
  fish: { key: 'mg-src-fish', file: 'Fish Marker.png' },
} as const;
// Texture vẽ lại khi trạng thái đổi (vùng xanh/vàng, số chấm, đồng hồ).
const TEX = { timer: 'mg-timer', path: 'mg-path', hitBar: 'mg-hitbar' } as const;

/** Ảnh nguồn thu nhỏ 1/4 để vừa khung 480×270; camera phóng lại theo cửa sổ. */
const SCALE = 0.25;
// Bố cục theo toạ độ ảnh nguồn, gốc là góc trái trên của thanh đường đi.
const LAYOUT = {
  timerX: -148,
  timerY: 4,
  hitBarY: 72,
  fishY: 12,
  /** Mép phải của con cá khi còn đủ HP (đứng ngay sau đầu phải thanh đường đi). */
  fishRight: 756,
  width: 904,
  height: 140,
};
const ORIGIN_X = Math.round(GAME_WIDTH / 2 - (LAYOUT.width / 2 + LAYOUT.timerX) * SCALE);
const ORIGIN_Y = 196;

// Thanh đo (Hit Bar.png 680×68): lòng thanh từ x 12 tới 668, y 12 tới 52.
const HIT_INNER_LEFT = 12;
const HIT_INNER_WIDTH = 656;
const HIT_INNER_TOP = 12;
const HIT_INNER_BOTTOM = 52;
const HIT_PLAIN_COL = 100; // Cột nền xám, dùng để xoá vùng màu vẽ sẵn trong ảnh.
const HIT_ZONE_FROM = 300; // Vùng xanh vẽ sẵn trong ảnh: x 300 tới 608.
const HIT_ZONE_TO = 608;
const HIT_STRIPE_FROM = 304; // Sọc xanh lặp lại sau mỗi 24 px.
const HIT_STRIPE_PERIOD = 24;
const HIT_YELLOW_COL = 400;

// Thanh đường đi (Fish Path.png 680×72): 14 chấm trắng 8×8 tại x = 24 + 48k, y = 28.
const DOT_COUNT = 14;
const DOT_FIRST_X = 24;
const DOT_STEP = 48;
const DOT_Y = 28;
const DOT_SIZE = 8;

// Đồng hồ (Timer.png 128×134): tâm vòng tròn ở (64, 64).
const TIMER_CENTER = 64;
const TIMER_GREY = [91, 107, 122] as const;
const TIMER_DARK = [20, 32, 43] as const;
const TIMER_FACE = [42, 53, 64] as const;
const TIMER_BEVEL = [59, 72, 85] as const;
/** Vùng có số "11" vẽ sẵn, xoá đi để vẽ số giây thật. */
const TIMER_DIGITS_BOX = { x0: 44, y0: 44, x1: 92, y1: 84 };
const DIGIT_COLOR = 'rgb(140,240,140)';
const DIGIT_PENALTY_COLOR = 'rgb(255,120,110)';
const DIGIT_CELL = 8; // Một ô chữ số = 8×8 px ảnh nguồn (2×2 điểm pixel art).
/** Chữ số 3×5 ô, đọc từng hàng từ trên xuống. */
const DIGITS: Record<string, string[]> = {
  '0': ['111', '101', '101', '101', '111'],
  '1': ['010', '110', '010', '010', '111'],
  '2': ['111', '001', '111', '100', '111'],
  '3': ['111', '001', '111', '001', '111'],
  '4': ['101', '101', '111', '001', '001'],
  '5': ['111', '100', '111', '001', '111'],
  '6': ['111', '100', '111', '101', '111'],
  '7': ['111', '001', '001', '001', '001'],
  '8': ['111', '101', '111', '101', '111'],
  '9': ['111', '101', '111', '001', '111'],
};

const FLASH_MS = 250;
/** Chữ bay lên sau mỗi tap: quãng bay (px khung 480×270) và thời gian. */
const FLOAT_RISE_PX = 16;
const FLOAT_MS = 750;
/** Trượt: thanh đo nháy đỏ và rung ngang. */
const MISS_SHAKE_MS = 300;
const MISS_SHAKE_PX = 2;
const MISS_RED = 0xff3b30;
/** Điểm yếu: rung nhẹ cả màn minigame. */
const WEAK_SHAKE_MS = 160;
const WEAK_SHAKE_INTENSITY = 0.006;
/** Cá trên thanh đường đi đung đưa như đang bơi. */
const FISH_SWAY_DEG = 7;
const FISH_SWAY_MS = 520;
const FISH_BOB_PX = 1;
/** Sóng nước trên thanh đường đi: vẽ lại mỗi WAVE_FRAME_MS, chạy hết một chu kỳ trong WAVE_PERIOD_MS. */
const WAVE_FRAME_MS = 90;
const WAVE_PERIOD_MS = 1600;
const WATER_RGB = [43, 143, 181] as const;
const WAVE_LIGHT = [72, 172, 206] as const;
const WAVE_DARK = [34, 124, 162] as const;
/** Đồng hồ nháy đỏ khi còn dưới mốc này. */
const TIMER_WARN_MS = 3000;
const TIMER_BLINK_MS = 220;
const TIMER_WARN_TINT = 0xff7a70;
/** Màu thân cá theo độ hiếm (thay màu kem của ảnh gốc); độ hiếm khác giữ nguyên ảnh. */
const FISH_BODY_RGB = [255, 246, 204] as const;
const RARITY_FISH_RGB: Partial<Record<Rarity, readonly [number, number, number]>> = {
  epic: [196, 128, 255],
  legendary: [255, 206, 64],
};
const FADE_IN_MS = 220;
const FADE_OUT_MS = 180;
/** Khi hiện, cụm minigame trồi lên từ thấp hơn bao nhiêu px (khung 480×270). */
const FADE_RISE_PX = 6;
const COLORS = { normal: '#ffffff', weak: '#ffd84a', miss: '#ff6b5e' } as const;

const snap4 = (value: number) => Math.round(value / 4) * 4;

function sourceImage(scene: Phaser.Scene, key: string): CanvasImageSource {
  return scene.textures.get(key).getSourceImage() as CanvasImageSource;
}

function readPixels(scene: Phaser.Scene, key: string): ImageData {
  const image = sourceImage(scene, key) as HTMLImageElement;
  const canvas = document.createElement('canvas');
  canvas.width = image.width;
  canvas.height = image.height;
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(image, 0, 0);
  return ctx.getImageData(0, 0, image.width, image.height);
}

function canvasTexture(scene: Phaser.Scene, key: string, w: number, h: number) {
  const existing = scene.textures.get(key);
  if (scene.textures.exists(key)) return existing as Phaser.Textures.CanvasTexture;
  const texture = scene.textures.createCanvas(key, w, h)!;
  texture.setFilter(Phaser.Textures.FilterMode.NEAREST);
  return texture;
}

const same = (data: Uint8ClampedArray, i: number, rgb: readonly number[]) =>
  data[i] === rgb[0] && data[i + 1] === rgb[1] && data[i + 2] === rgb[2];

/**
 * Tách ảnh đồng hồ thành hai bản không có số: vòng toàn xanh và vòng toàn xám.
 * Ảnh gốc có một cung xám ở phía trên bên phải, lấy màu xanh từ điểm đối xứng bên trái để lấp.
 */
function splitTimer(src: ImageData): { full: ImageData; empty: ImageData } {
  const { width, height } = src;
  const full = new ImageData(new Uint8ClampedArray(src.data), width, height);
  const d = full.data;
  const box = TIMER_DIGITS_BOX;
  for (let y = box.y0; y < box.y1; y++) {
    for (let x = box.x0; x < box.x1; x++) {
      const i = (y * width + x) * 4;
      if (same(d, i, TIMER_FACE) || same(d, i, TIMER_DARK) || same(d, i, TIMER_BEVEL)) continue;
      d.set([...TIMER_FACE, 255], i);
    }
  }
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      if (!same(d, i, TIMER_GREY)) continue;
      const m = (y * width + (width - 1 - x)) * 4;
      d.set(d.subarray(m, m + 4), i);
    }
  }
  const empty = new ImageData(new Uint8ClampedArray(d), width, height);
  const e = empty.data;
  for (let i = 0; i < e.length; i += 4) {
    const r = e[i] ?? 0;
    const g = e[i + 1] ?? 0;
    const b = e[i + 2] ?? 0;
    if (!(g > r + 15 && g > b + 10)) continue;
    // Giữ độ đậm nhạt ở mép (pha giữa viền tối và xám) để mép vòng không bị răng cưa.
    const t = Math.min(1, Math.max(0, (g - TIMER_DARK[1]) / (196 - TIMER_DARK[1])));
    const mix = (dark: number, grey: number) => Math.round(dark + t * (grey - dark));
    e[i] = mix(TIMER_DARK[0], TIMER_GREY[0]);
    e[i + 1] = mix(TIMER_DARK[1], TIMER_GREY[1]);
    e[i + 2] = mix(TIMER_DARK[2], TIMER_GREY[2]);
  }
  return { full, empty };
}

export class MinigameScene extends Phaser.Scene {
  private round!: MinigameState;
  private t0 = 0;
  private onFinish!: MinigameData['onFinish'];
  private finished = false;
  private closing = false;
  private penaltyFlashUntil = 0;
  private onTap: MinigameData['onTap'];
  private rarity: Rarity | undefined;
  private missShakeUntil = 0;
  private waveDrawnAt = -Infinity;
  private pathSrc!: ImageData;
  private hitBar!: Phaser.GameObjects.Image;
  private hitBarRed!: Phaser.GameObjects.Rectangle;
  private timerImage!: Phaser.GameObjects.Image;

  private timerParts!: { full: ImageData; empty: ImageData };
  private hitBarSrc!: ImageData;
  private needle!: Phaser.GameObjects.Image;
  private fish!: Phaser.GameObjects.Image;
  private distanceText!: Phaser.GameObjects.Text;
  private effectText!: Phaser.GameObjects.Text;
  // Khoá của lần vẽ trước, để chỉ vẽ lại texture khi có thay đổi.
  private drawnTimer = '';
  private drawnZones = '';
  private drawnDots = -1;

  constructor() {
    super(MINIGAME_SCENE);
  }

  init(data: MinigameData): void {
    this.round = createState(data.params);
    this.t0 = data.t0;
    this.onFinish = data.onFinish;
    this.onTap = data.onTap;
    this.rarity = data.params.rarity;
    this.missShakeUntil = 0;
    this.waveDrawnAt = -Infinity;
    this.finished = false;
    this.penaltyFlashUntil = 0;
    this.drawnTimer = '';
    this.drawnZones = '';
    this.drawnDots = -1;
    this.closing = false;
  }

  preload(): void {
    for (const { key, file } of Object.values(SRC)) {
      if (!this.textures.exists(key)) this.load.image(key, encodeURI(ASSET_DIR + file));
    }
  }

  create(): void {
    // Phóng camera theo chiều hẹp hơn để khung 480×270 luôn vừa canvas, kể cả khi kéo cửa sổ giữa chừng.
    const fitCamera = () => {
      const zoom = Math.min(this.scale.width / GAME_WIDTH, this.scale.height / GAME_HEIGHT);
      this.cameras.main.setZoom(zoom);
      this.cameras.main.centerOn(GAME_WIDTH / 2, GAME_HEIGHT / 2);
    };
    fitCamera();
    this.scale.on(Phaser.Scale.Events.RESIZE, fitCamera);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () =>
      this.scale.off(Phaser.Scale.Events.RESIZE, fitCamera),
    );
    for (const { key } of Object.values(SRC)) {
      this.textures.get(key).setFilter(Phaser.Textures.FilterMode.NEAREST);
    }

    this.timerParts = splitTimer(readPixels(this, SRC.timer.key));
    this.hitBarSrc = readPixels(this, SRC.hitBar.key);
    this.pathSrc = readPixels(this, SRC.path.key);
    const timerSrc = sourceImage(this, SRC.timer.key) as HTMLImageElement;
    const pathSrc = sourceImage(this, SRC.path.key) as HTMLImageElement;
    canvasTexture(this, TEX.timer, timerSrc.width, timerSrc.height);
    canvasTexture(this, TEX.path, pathSrc.width, pathSrc.height);
    canvasTexture(this, TEX.hitBar, this.hitBarSrc.width, this.hitBarSrc.height);

    const at = (x: number, y: number) => [ORIGIN_X + x * SCALE, ORIGIN_Y + y * SCALE] as const;
    const place = (key: string, x: number, y: number) =>
      this.add
        .image(...at(x, y), key)
        .setOrigin(0)
        .setScale(SCALE);
    this.timerImage = place(TEX.timer, LAYOUT.timerX, LAYOUT.timerY);
    place(TEX.path, 0, 0);
    this.hitBar = place(TEX.hitBar, 0, LAYOUT.hitBarY);
    // Gốc giữa để cá xoay đung đưa quanh thân; update() đặt lại toạ độ theo HP.
    this.fish = place(this.fishTexture(), 0, LAYOUT.fishY).setOrigin(0.5);
    this.needle = this.add
      .image(...at(0, LAYOUT.hitBarY + this.hitBarSrc.height / 2), SRC.needle.key)
      .setScale(SCALE);

    const font = {
      fontFamily: 'Courier New, monospace',
      fontStyle: 'bold',
      stroke: '#14364a',
      strokeThickness: 2,
      resolution: Math.max(2, Math.ceil(this.cameras.main.zoom)),
    };
    this.distanceText = this.add
      .text(...at(LAYOUT.fishRight, -2), '', { ...font, fontSize: '8px', color: '#ffffff' })
      .setOrigin(1, 1);
    this.effectText = this.add.text(...at(0, -2), '', { ...font, fontSize: '8px' }).setOrigin(0, 1);

    // Thân cá lắc qua lại như đang bơi (feedback 2026-11-12).
    this.fish.angle = -FISH_SWAY_DEG;
    this.tweens.add({
      targets: this.fish,
      angle: FISH_SWAY_DEG,
      duration: FISH_SWAY_MS,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    this.input.on('pointerdown', () => this.handleTap());
    // Nghe trên window vì game trong scene hồ cũ tắt bàn phím của Phaser.
    const onKeyDown = (event: KeyboardEvent) => {
      const typing = ['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName ?? '');
      if (event.code !== 'Space' || event.repeat || typing) return;
      event.preventDefault();
      this.handleTap();
    };
    window.addEventListener('keydown', onKeyDown);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () =>
      window.removeEventListener('keydown', onKeyDown),
    );

    // Hiện dần và trồi lên nhẹ thay vì bật tức thì (feedback 2026-11-12).
    const camera = this.cameras.main;
    const restY = camera.scrollY;
    camera.scrollY = restY - FADE_RISE_PX;
    // Đặt alpha 0 ngay, không đợi tween chạy ở khung sau, để không chớp một khung hiện đủ.
    for (const child of this.children.list) (child as Phaser.GameObjects.Image).setAlpha(0);
    this.tweens.add({
      // Chép danh sách: tween không được dính vật tạo sau (lớp đỏ khi trượt phải giữ alpha 0).
      targets: [...this.children.list],
      alpha: 1,
      duration: FADE_IN_MS,
      ease: 'Cubic.easeOut',
    });
    this.tweens.add({
      targets: camera,
      scrollY: restY,
      duration: FADE_IN_MS + 60,
      ease: 'Back.easeOut',
    });

    // Lớp đỏ phủ lòng thanh đo khi trượt; tạo sau tween hiện dần để giữ alpha 0.
    this.hitBarRed = this.add
      .rectangle(
        0,
        ORIGIN_Y + (LAYOUT.hitBarY + HIT_INNER_TOP) * SCALE,
        HIT_INNER_WIDTH * SCALE,
        (HIT_INNER_BOTTOM - HIT_INNER_TOP) * SCALE,
        MISS_RED,
      )
      .setOrigin(0)
      .setAlpha(0);
    this.needle.setDepth(1);
  }

  /** Ảnh cá theo độ hiếm: epic tím, legendary vàng (thay màu thân kem, giữ viền). */
  private fishTexture(): string {
    const rgb = this.rarity ? RARITY_FISH_RGB[this.rarity] : undefined;
    if (!rgb) return SRC.fish.key;
    const key = `${SRC.fish.key}-${this.rarity}`;
    if (this.textures.exists(key)) return key;
    const pixels = readPixels(this, SRC.fish.key);
    for (let i = 0; i < pixels.data.length; i += 4) {
      if (same(pixels.data, i, FISH_BODY_RGB)) pixels.data.set(rgb, i);
    }
    const texture = canvasTexture(this, key, pixels.width, pixels.height);
    texture.putData(pixels, 0, 0);
    texture.refresh();
    return key;
  }

  /** Chữ nảy lên rồi bay lên và mờ dần tại (x, y) trong khung 480×270. */
  private floatText(text: string, color: string, x: number, y: number, size = 8): void {
    const label = this.add
      .text(x, y, text, {
        fontFamily: 'Courier New, monospace',
        fontStyle: 'bold',
        fontSize: `${size}px`,
        color,
        stroke: '#14364a',
        strokeThickness: 2,
        resolution: Math.max(2, Math.ceil(this.cameras.main.zoom)),
      })
      .setOrigin(0.5, 1)
      .setDepth(2)
      .setScale(0.4);
    this.tweens.add({ targets: label, scale: 1, duration: 160, ease: 'Back.easeOut' });
    this.tweens.add({
      targets: label,
      y: y - FLOAT_RISE_PX,
      duration: FLOAT_MS,
      ease: 'Cubic.easeOut',
    });
    this.tweens.add({
      targets: label,
      alpha: 0,
      delay: FLOAT_MS * 0.55,
      duration: FLOAT_MS * 0.45,
      ease: 'Sine.easeIn',
      onComplete: () => label.destroy(),
    });
  }

  /** Hiệu ứng theo loại tap (feedback 2026-11-12). */
  private playTapFx(kind: TapResult, damage: number): void {
    const fishTop = this.fish.y - (this.fish.height * SCALE) / 2;
    const barY = ORIGIN_Y + LAYOUT.hitBarY * SCALE;
    if (kind === 'miss') {
      const barCenter = ORIGIN_X + (HIT_INNER_LEFT + HIT_INNER_WIDTH / 2) * SCALE;
      this.floatText('Trượt', COLORS.miss, barCenter, barY - 1);
      this.missShakeUntil = performance.now() + MISS_SHAKE_MS;
      this.tweens.killTweensOf(this.hitBarRed);
      this.hitBarRed.setAlpha(0);
      // Nháy đỏ hai lần.
      this.tweens.add({
        targets: this.hitBarRed,
        alpha: 0.55,
        duration: MISS_SHAKE_MS / 4,
        yoyo: true,
        repeat: 1,
        ease: 'Sine.easeInOut',
      });
      return;
    }
    // Đặt cao hơn nhãn quãng đường còn lại (ngay trên đầu thanh) để không đè chữ.
    this.floatText(`-${damage}cm`, COLORS[kind], this.fish.x, fishTop - 8);
    if (kind === 'weak') {
      this.floatText('Điểm yếu!', COLORS.weak, this.fish.x, fishTop - 18, 10);
      this.cameras.main.shake(WEAK_SHAKE_MS, WEAK_SHAKE_INTENSITY);
    }
  }

  /** Mờ dần rồi dừng scene; nếu ván mới bắt đầu trước khi xong (scene khởi động lại) thì bỏ qua. */
  fadeOut(): void {
    if (this.closing) return;
    this.closing = true;
    this.tweens.add({
      targets: this.children.list,
      alpha: 0,
      duration: FADE_OUT_MS,
      ease: 'Cubic.easeIn',
      onComplete: () => {
        if (this.closing) this.scene.stop();
      },
    });
  }

  private elapsed(): number {
    return Math.max(0, Math.round(performance.now() - this.t0));
  }

  private handleTap(): void {
    if (this.finished) return;
    const state = this.round;
    const outcome = applyTap(state, state.tapSeq + 1, this.elapsed());
    if (!outcome.accepted) return;
    const damage = Math.max(0, state.hp - outcome.state.hp);
    this.round = outcome.state;
    if (outcome.kind === 'miss') this.penaltyFlashUntil = performance.now() + FLASH_MS;
    this.playTapFx(outcome.kind, damage);
    this.onTap?.(outcome.kind, damage);
    if (outcome.state.won) this.finish('success');
  }

  private finish(outcome: FishingOutcome): void {
    this.finished = true;
    this.effectText.setText('Đang gửi kết quả...').setColor('#ffffff');
    this.onFinish(outcome);
  }

  update(): void {
    const state = this.round;
    const { params } = state;
    const t = this.elapsed();
    if (!this.finished && isLost(state, t)) this.finish('failed');

    const now = performance.now();
    const remaining = Math.max(0, remainingMs(state, t));
    // Sắp hết giờ: số và mặt đồng hồ nháy đỏ (feedback 2026-11-12).
    const warning =
      !this.finished && remaining > 0 && remaining <= TIMER_WARN_MS
        ? Math.floor(now / TIMER_BLINK_MS) % 2 === 0
        : false;
    const flashing = now < this.penaltyFlashUntil || warning;
    if (warning) this.timerImage.setTint(TIMER_WARN_TINT);
    else this.timerImage.clearTint();
    const hp = Math.max(0, state.hp);
    const hpRatio = Phaser.Math.Clamp(hp / params.fishHp, 0, 1);
    this.distanceText.setText(`${hp}cm`);

    this.drawTimer(remaining / params.durationMs, Math.ceil(remaining / 1000), flashing);
    this.drawHitBar(state);

    // Cá tiến dần về bên trái theo HP còn lại; chấm trắng là quãng còn phải kéo, chỉ còn ở trước mặt cá.
    const fishWidth = this.fish.width;
    const fishLeft = snap4(
      HIT_INNER_LEFT + (LAYOUT.fishRight - fishWidth - HIT_INNER_LEFT) * hpRatio,
    );
    this.fish.x = ORIGIN_X + (fishLeft + fishWidth / 2) * SCALE;
    this.fish.y =
      ORIGIN_Y +
      (LAYOUT.fishY + this.fish.height / 2) * SCALE +
      Math.round(Math.sin((now / FISH_SWAY_MS) * Math.PI) * FISH_BOB_PX);
    this.drawPath(Math.min(DOT_COUNT, Math.floor((fishLeft - DOT_FIRST_X) / DOT_STEP) + 1), now);

    // Trượt: cả thanh đo và kim rung ngang, nhỏ dần.
    const shakeLeft = this.missShakeUntil - now;
    const shake =
      shakeLeft > 0
        ? Math.round(Math.sin(now / 18) * MISS_SHAKE_PX * (shakeLeft / MISS_SHAKE_MS))
        : 0;
    this.hitBar.x = ORIGIN_X + shake;
    this.hitBarRed.x = ORIGIN_X + HIT_INNER_LEFT * SCALE + shake;
    const needleX = HIT_INNER_LEFT + needlePos(t, params.needlePassMs) * HIT_INNER_WIDTH;
    this.needle.x = ORIGIN_X + needleX * SCALE + shake;
  }

  /** Đồng hồ: phần xanh là thời gian còn lại, phần xám là đã trôi (tính từ đỉnh, theo chiều kim đồng hồ). */
  private drawTimer(ratio: number, seconds: number, flashing: boolean): void {
    const left = Phaser.Math.Clamp(ratio, 0, 1);
    const used = 1 - left;
    const key = `${Math.round(used * 512)}|${seconds}|${flashing}`;
    if (key === this.drawnTimer) return;
    this.drawnTimer = key;

    const { full, empty } = this.timerParts;
    const { width, height } = full;
    const out = new ImageData(new Uint8ClampedArray(full.data), width, height);
    // Tô theo từng ô 4×4 để mép cung xám vẫn là pixel art, không bị khử răng cưa.
    for (let by = 0; by < height; by += 4) {
      for (let bx = 0; bx < width; bx += 4) {
        const dx = bx + 2 - TIMER_CENTER;
        const dy = by + 2 - TIMER_CENTER;
        let angle = Math.atan2(dx, -dy);
        if (angle < 0) angle += Math.PI * 2;
        if (angle / (Math.PI * 2) >= used) continue;
        for (let y = by; y < Math.min(by + 4, height); y++) {
          const i = (y * width + bx) * 4;
          out.data.set(empty.data.subarray(i, i + Math.min(4, width - bx) * 4), i);
        }
      }
    }
    const texture = this.textures.get(TEX.timer) as Phaser.Textures.CanvasTexture;
    texture.putData(out, 0, 0);

    const ctx = texture.getContext();
    ctx.fillStyle = flashing ? DIGIT_PENALTY_COLOR : DIGIT_COLOR;
    const text = String(seconds);
    const gap = DIGIT_CELL / 2;
    const totalWidth = text.length * 3 * DIGIT_CELL + (text.length - 1) * gap;
    let x0 = TIMER_CENTER - totalWidth / 2;
    const y0 = TIMER_CENTER - (5 * DIGIT_CELL) / 2;
    for (const char of text) {
      DIGITS[char]?.forEach((row, ry) => {
        [...row].forEach((cell, rx) => {
          if (cell === '1')
            ctx.fillRect(x0 + rx * DIGIT_CELL, y0 + ry * DIGIT_CELL, DIGIT_CELL, DIGIT_CELL);
        });
      });
      x0 += 3 * DIGIT_CELL + gap;
    }
    texture.refresh();
  }

  /** Thanh đo: xoá vùng màu vẽ sẵn trong ảnh, rồi vẽ vùng xanh (sọc) và vùng vàng theo vòng hiện tại. */
  private drawHitBar(state: MinigameState): void {
    const { params } = state;
    const key = `${state.greenStart}|${state.yellowStart}`;
    if (key === this.drawnZones) return;
    this.drawnZones = key;

    const src = this.hitBarSrc;
    const { width } = src;
    const out = new ImageData(new Uint8ClampedArray(src.data), width, src.height);
    const copyColumn = (fromX: number, toX: number) => {
      for (let y = HIT_INNER_TOP; y < HIT_INNER_BOTTOM; y++) {
        const from = (y * width + fromX) * 4;
        out.data.set(src.data.subarray(from, from + 4), (y * width + toX) * 4);
      }
    };
    for (let x = HIT_ZONE_FROM; x < HIT_ZONE_TO; x++) copyColumn(HIT_PLAIN_COL, x);

    const toX = (ratio: number) => snap4(HIT_INNER_LEFT + ratio * HIT_INNER_WIDTH);
    const greenFrom = toX(state.greenStart);
    const greenTo = toX(state.greenStart + params.greenWidth);
    for (let x = greenFrom; x < greenTo; x++) {
      copyColumn(HIT_STRIPE_FROM + ((x - greenFrom) % HIT_STRIPE_PERIOD), x);
    }
    const yellowTo = toX(state.yellowStart + params.yellowWidth);
    for (let x = toX(state.yellowStart); x < yellowTo; x++) copyColumn(HIT_YELLOW_COL, x);

    const texture = this.textures.get(TEX.hitBar) as Phaser.Textures.CanvasTexture;
    texture.putData(out, 0, 0);
    texture.refresh();
  }

  /**
   * Thanh đường đi: nền nước có sóng chạy (vẽ lại theo nhịp WAVE_FRAME_MS), giữ visible chấm đầu tiên,
   * các chấm còn lại thành nước. Tô theo ô 4×4 để giữ nét pixel art.
   */
  private drawPath(visible: number, now: number): void {
    const due = now - this.waveDrawnAt >= WAVE_FRAME_MS;
    if (visible === this.drawnDots && !due) return;
    this.drawnDots = visible;
    if (due) this.waveDrawnAt = now;

    const src = this.pathSrc;
    const { width, height } = src;
    const out = new ImageData(new Uint8ClampedArray(src.data), width, height);
    const hidden = (x: number, y: number): boolean => {
      if (y < DOT_Y || y >= DOT_Y + DOT_SIZE || x < DOT_FIRST_X) return false;
      const i = Math.floor((x - DOT_FIRST_X) / DOT_STEP);
      return (
        i >= Math.max(0, visible) && i < DOT_COUNT && x - DOT_FIRST_X - i * DOT_STEP < DOT_SIZE
      );
    };
    const phase = ((now % WAVE_PERIOD_MS) / WAVE_PERIOD_MS) * Math.PI * 2;
    for (let by = 0; by < height; by += 4) {
      for (let bx = 0; bx < width; bx += 4) {
        const i = (by * width + bx) * 4;
        if (!same(src.data, i, WATER_RGB) && !hidden(bx, by)) continue;
        // Hai lớp gợn ngược pha: gợn sáng phía trên, gợn tối phía dưới, cùng trôi ngang.
        const crest = 20 + 6 * Math.sin(bx / 36 + phase);
        const trough = 48 + 5 * Math.sin(bx / 52 - phase * 1.3 + 1.7);
        let rgb: readonly number[] = WATER_RGB;
        if (Math.abs(by - crest) < 4) rgb = WAVE_LIGHT;
        else if (Math.abs(by - trough) < 4) rgb = WAVE_DARK;
        for (let y = by; y < Math.min(by + 4, height); y++) {
          for (let x = bx; x < Math.min(bx + 4, width); x++) {
            const j = (y * width + x) * 4;
            if (same(src.data, j, WATER_RGB) || hidden(x, y)) out.data.set([...rgb, 255], j);
          }
        }
      }
    }
    const texture = this.textures.get(TEX.path) as Phaser.Textures.CanvasTexture;
    texture.putData(out, 0, 0);
    texture.refresh();
  }
}
