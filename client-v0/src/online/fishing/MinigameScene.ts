// Màn minigame chạy phủ lên scene hồ. Theo SPEC 0.5 Client tự xử lý, không gửi từng tap.
// Giao diện dựng từ ảnh nguồn trong public/mini game (feedback 2026-11-11): đồng hồ tròn bên trái,
// thanh đường đi của cá ở trên, thanh đo có kim ở dưới; cả cụm nằm giữa, phía dưới màn hình.
// Ảnh nguồn vẽ ở tỉ lệ 4 (mỗi điểm ảnh pixel art = 4×4 px), nên mọi toạ độ ảnh dưới đây chia hết cho 4.
import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from '../core/env';
import type { FishingOutcome, MinigameParams } from '../net/contract';
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
const PATH_COLOR = 'rgb(43,143,181)';

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
const FADE_IN_MS = 220;
const FADE_OUT_MS = 180;
/** Khi hiện, cụm minigame trồi lên từ thấp hơn bao nhiêu px (khung 480×270). */
const FADE_RISE_PX = 6;
const EFFECTS = {
  normal: { text: 'Trúng!', color: '#7fe3ff' },
  weak: { text: 'x2', color: '#f2c84b' },
  miss: { text: 'Trượt!', color: '#ff6b5e' },
} as const;

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
    // Canvas lấp kín cửa sổ với tỉ lệ bất kỳ: phóng camera theo chiều hẹp hơn để khung 480×270 luôn vừa màn hình.
    const zoom = Math.min(this.scale.width / GAME_WIDTH, this.scale.height / GAME_HEIGHT);
    if (zoom !== 1) this.cameras.main.setZoom(zoom);
    this.cameras.main.centerOn(GAME_WIDTH / 2, GAME_HEIGHT / 2);
    for (const { key } of Object.values(SRC)) {
      this.textures.get(key).setFilter(Phaser.Textures.FilterMode.NEAREST);
    }

    this.timerParts = splitTimer(readPixels(this, SRC.timer.key));
    this.hitBarSrc = readPixels(this, SRC.hitBar.key);
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
    place(TEX.timer, LAYOUT.timerX, LAYOUT.timerY);
    place(TEX.path, 0, 0);
    place(TEX.hitBar, 0, LAYOUT.hitBarY);
    this.fish = place(SRC.fish.key, 0, LAYOUT.fishY);
    this.needle = this.add
      .image(...at(0, LAYOUT.hitBarY + this.hitBarSrc.height / 2), SRC.needle.key)
      .setScale(SCALE);

    const font = {
      fontFamily: 'Courier New, monospace',
      fontStyle: 'bold',
      stroke: '#14364a',
      strokeThickness: 2,
      resolution: Math.max(2, Math.ceil(zoom)),
    };
    this.distanceText = this.add
      .text(...at(LAYOUT.fishRight, -2), '', { ...font, fontSize: '8px', color: '#ffffff' })
      .setOrigin(1, 1);
    this.effectText = this.add.text(...at(0, -2), '', { ...font, fontSize: '8px' }).setOrigin(0, 1);

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
      targets: this.children.list,
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
    this.round = outcome.state;
    const effect = EFFECTS[outcome.kind];
    this.effectText.setText(effect.text).setColor(effect.color);
    if (outcome.kind === 'miss') this.penaltyFlashUntil = performance.now() + FLASH_MS;
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

    const remaining = Math.max(0, remainingMs(state, t));
    const flashing = performance.now() < this.penaltyFlashUntil;
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
    this.fish.x = ORIGIN_X + fishLeft * SCALE;
    this.drawPath(Math.min(DOT_COUNT, Math.floor((fishLeft - DOT_FIRST_X) / DOT_STEP) + 1));

    const needleX = HIT_INNER_LEFT + needlePos(t, params.needlePassMs) * HIT_INNER_WIDTH;
    this.needle.x = ORIGIN_X + needleX * SCALE;
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

  /** Thanh đường đi: giữ visible chấm đầu tiên, che các chấm còn lại bằng màu nền thanh. */
  private drawPath(visible: number): void {
    if (visible === this.drawnDots) return;
    this.drawnDots = visible;
    const texture = this.textures.get(TEX.path) as Phaser.Textures.CanvasTexture;
    const ctx = texture.getContext();
    ctx.clearRect(0, 0, texture.width, texture.height);
    ctx.drawImage(sourceImage(this, SRC.path.key), 0, 0);
    ctx.fillStyle = PATH_COLOR;
    for (let i = Math.max(0, visible); i < DOT_COUNT; i++) {
      ctx.fillRect(DOT_FIRST_X + i * DOT_STEP, DOT_Y, DOT_SIZE, DOT_SIZE);
    }
    texture.refresh();
  }
}
