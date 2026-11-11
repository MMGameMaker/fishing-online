// Màn minigame chạy phủ lên scene hồ. Theo SPEC 0.5 Client tự xử lý, không gửi từng tap.
// Bố cục theo ảnh mẫu doc/feedback/minigame-ui.png (feedback 2026-11-11): đồng hồ tròn bên trái,
// thanh khoảng cách tới cá ở trên, thanh đo có kim ở dưới; cả cụm nằm giữa, phía dưới màn hình.
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

// Toạ độ trong khung 480×270, đo theo tỉ lệ của ảnh mẫu.
const BAR_X = 160;
const BAR_WIDTH = 174;
const TRACK_Y = 199;
const TRACK_HEIGHT = 17;
const METER_Y = 217;
const METER_HEIGHT = 16;
const RING_X = 140;
const RING_Y = 216;
const RING_RADIUS = 16;
const RING_WIDTH = 4;
const DOT_COUNT = 14;
const FISH_X = BAR_X + BAR_WIDTH + 9;
const FLASH_MS = 250;
const COLORS = {
  outline: 0x2b2b2b,
  track: 0xb9b9b9,
  trackDark: 0xa4a4a4,
  dot: 0xffffff,
  meter: 0xe2e2e2,
  green: 0x7cc6d6,
  yellow: 0xe8d95a,
  needle: 0xffffff,
  ringTime: 0x98e08f,
  ringUsed: 0x5a5a5a,
  ringInner: 0xb5b5b5,
  penalty: 0xd9534f,
  fish: 0x111111,
};
const EFFECTS = {
  normal: { text: 'Trúng!', color: '#2f7f95' },
  weak: { text: 'x2', color: '#b8a21c' },
  miss: { text: 'Trượt!', color: '#d9534f' },
} as const;

export class MinigameScene extends Phaser.Scene {
  private round!: MinigameState;
  private t0 = 0;
  private onFinish!: MinigameData['onFinish'];
  private finished = false;
  private graphics!: Phaser.GameObjects.Graphics;
  private secondsText!: Phaser.GameObjects.Text;
  private distanceText!: Phaser.GameObjects.Text;
  private effectText!: Phaser.GameObjects.Text;
  private penaltyFlashUntil = 0;

  constructor() {
    super(MINIGAME_SCENE);
  }

  init(data: MinigameData): void {
    this.round = createState(data.params);
    this.t0 = data.t0;
    this.onFinish = data.onFinish;
    this.finished = false;
    this.penaltyFlashUntil = 0;
  }

  create(): void {
    // Canvas lấp kín cửa sổ với tỉ lệ bất kỳ: phóng camera theo chiều hẹp hơn để khung 480×270 luôn vừa màn hình.
    const zoom = Math.min(this.scale.width / GAME_WIDTH, this.scale.height / GAME_HEIGHT);
    if (zoom !== 1) this.cameras.main.setZoom(zoom);
    this.cameras.main.centerOn(GAME_WIDTH / 2, GAME_HEIGHT / 2);
    const font = {
      fontFamily: 'Trebuchet MS, Verdana, sans-serif',
      resolution: Math.max(1, Math.ceil(zoom)),
    };
    this.graphics = this.add.graphics();
    this.secondsText = this.add
      .text(RING_X, RING_Y, '', { ...font, fontSize: '11px', color: '#98e08f' })
      .setOrigin(0.5);
    this.distanceText = this.add
      .text(BAR_X + BAR_WIDTH, TRACK_Y - 2, '', { ...font, fontSize: '10px', color: '#111111' })
      .setOrigin(1, 1);
    this.effectText = this.add
      .text(BAR_X, TRACK_Y - 2, '', { ...font, fontSize: '9px', fontStyle: 'bold' })
      .setOrigin(0, 1);

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
    this.effectText.setText('Đang gửi kết quả...').setColor('#111111');
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
    this.secondsText
      .setText(String(Math.ceil(remaining / 1000)))
      .setColor(flashing ? '#d9534f' : '#98e08f');
    this.distanceText.setText(`${hp}cm`);

    const g = this.graphics.clear();
    this.drawRing(g, remaining / params.durationMs, flashing);
    this.drawTrack(g, hp / params.fishHp);
    this.drawMeter(g, state, needlePos(t, params.needlePassMs));
  }

  /** Đồng hồ tròn: phần xanh là thời gian còn lại, phần xám là đã trôi. */
  private drawRing(g: Phaser.GameObjects.Graphics, ratio: number, flashing: boolean): void {
    const left = Phaser.Math.Clamp(ratio, 0, 1);
    const top = -Math.PI / 2;
    const used = top + (1 - left) * Math.PI * 2;
    g.fillStyle(COLORS.outline).fillCircle(RING_X, RING_Y, RING_RADIUS + 1);
    g.fillStyle(flashing ? COLORS.penalty : COLORS.ringTime).fillCircle(
      RING_X,
      RING_Y,
      RING_RADIUS,
    );
    if (left < 1) {
      g.fillStyle(COLORS.ringUsed);
      g.slice(RING_X, RING_Y, RING_RADIUS, top, used, false).fillPath();
    }
    g.fillStyle(COLORS.outline).fillCircle(RING_X, RING_Y, RING_RADIUS - RING_WIDTH + 1);
    g.fillStyle(COLORS.ringInner).fillCircle(RING_X, RING_Y, RING_RADIUS - RING_WIDTH);
  }

  /** Thanh khoảng cách: cá tiến dần về bên trái theo HP còn lại, chấm trắng là quãng còn phải kéo. */
  private drawTrack(g: Phaser.GameObjects.Graphics, hpRatio: number): void {
    const ratio = Phaser.Math.Clamp(hpRatio, 0, 1);
    g.fillStyle(COLORS.track).fillRect(BAR_X, TRACK_Y, BAR_WIDTH, TRACK_HEIGHT);
    g.fillStyle(COLORS.trackDark).fillRect(
      BAR_X + BAR_WIDTH * 0.35,
      TRACK_Y,
      BAR_WIDTH * 0.3,
      TRACK_HEIGHT,
    );
    g.lineStyle(1, COLORS.outline).lineBetween(BAR_X, TRACK_Y, BAR_X + BAR_WIDTH, TRACK_Y);
    const midY = TRACK_Y + TRACK_HEIGHT / 2;
    const step = BAR_WIDTH / DOT_COUNT;
    const visible = Math.ceil(DOT_COUNT * ratio);
    g.fillStyle(COLORS.dot);
    for (let i = 0; i < visible; i++) g.fillCircle(BAR_X + step * (i + 0.5), midY, 1.3);
    const fishX = BAR_X + (FISH_X - BAR_X) * ratio;
    this.drawFish(g, Math.max(BAR_X + 6, fishX), midY);
  }

  /** Con cá đen quay đầu sang trái (về phía người câu). */
  private drawFish(g: Phaser.GameObjects.Graphics, x: number, y: number): void {
    g.fillStyle(COLORS.fish);
    g.fillEllipse(x, y, 12, 7);
    g.fillTriangle(x + 4, y, x + 10, y - 4, x + 10, y + 4);
    g.fillStyle(COLORS.dot).fillCircle(x - 3, y - 1, 0.9);
  }

  /** Thanh đo bo tròn: vùng xanh, vùng vàng nằm trong vùng xanh, kim trắng chạy qua lại. */
  private drawMeter(g: Phaser.GameObjects.Graphics, state: MinigameState, needle: number): void {
    const { params } = state;
    const radius = METER_HEIGHT / 2;
    g.fillStyle(COLORS.meter).fillRoundedRect(BAR_X, METER_Y, BAR_WIDTH, METER_HEIGHT, radius);
    g.fillStyle(COLORS.green).fillRect(
      BAR_X + state.greenStart * BAR_WIDTH,
      METER_Y,
      params.greenWidth * BAR_WIDTH,
      METER_HEIGHT,
    );
    g.fillStyle(COLORS.yellow).fillRect(
      BAR_X + state.yellowStart * BAR_WIDTH,
      METER_Y,
      params.yellowWidth * BAR_WIDTH,
      METER_HEIGHT,
    );
    g.lineStyle(1, COLORS.outline).strokeRoundedRect(
      BAR_X,
      METER_Y,
      BAR_WIDTH,
      METER_HEIGHT,
      radius,
    );

    const x = BAR_X + needle * BAR_WIDTH;
    const top = METER_Y - 2;
    const bottom = METER_Y + METER_HEIGHT + 2;
    g.fillStyle(COLORS.needle);
    g.fillRect(x - 0.75, top, 1.5, bottom - top);
    g.fillTriangle(x - 2.5, top + 2, x + 2.5, top + 2, x, top - 1);
    g.fillTriangle(x - 2.5, bottom - 2, x + 2.5, bottom - 2, x, bottom + 1);
  }
}
