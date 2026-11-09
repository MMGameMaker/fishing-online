// Màn minigame chạy phủ lên scene hồ. Theo SPEC 0.5 Client tự xử lý, không gửi từng tap.
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

const BAR_X = 60;
const BAR_Y = 150;
const BAR_WIDTH = 360;
const BAR_HEIGHT = 18;
const HP_Y = 118;
const FLASH_MS = 250;
const COLORS = {
  panel: 0x10141f,
  bar: 0x39415a,
  green: 0x4f9bea,
  yellow: 0xf2c14e,
  needle: 0xffffff,
  hp: 0xd9534f,
  hpBack: 0x39415a,
};
const EFFECTS = {
  normal: { text: 'Trúng!', color: '#8fc4f5' },
  weak: { text: 'x2', color: '#f2c14e' },
  miss: { text: 'Trượt!', color: '#d9534f' },
} as const;

export class MinigameScene extends Phaser.Scene {
  private round!: MinigameState;
  private t0 = 0;
  private onFinish!: MinigameData['onFinish'];
  private finished = false;
  private graphics!: Phaser.GameObjects.Graphics;
  private timerText!: Phaser.GameObjects.Text;
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
    // Canvas của scene lớn hơn 480×270 thì phóng camera để giữ đúng bố cục.
    const zoom = this.scale.width / GAME_WIDTH;
    if (zoom !== 1) this.cameras.main.setZoom(zoom).centerOn(GAME_WIDTH / 2, 145);
    const style = {
      fontFamily: 'monospace',
      fontSize: '10px',
      color: '#f4f0e0',
      resolution: Math.max(1, Math.ceil(zoom)),
    };
    this.add.rectangle(GAME_WIDTH / 2, 145, 400, 96, COLORS.panel, 0.92);
    this.add.text(BAR_X, HP_Y - 13, 'Khoảng cách tới cá', style);
    this.timerText = this.add.text(BAR_X + BAR_WIDTH, HP_Y - 13, '', style).setOrigin(1, 0);
    this.effectText = this.add
      .text(GAME_WIDTH / 2, BAR_Y + BAR_HEIGHT + 14, '', { ...style, fontStyle: 'bold' })
      .setOrigin(0.5);
    this.graphics = this.add.graphics();
    this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT - 76, 'Bấm khi kim vào vùng xanh, vùng vàng kéo gấp đôi', {
        ...style,
        fontSize: '8px',
      })
      .setOrigin(0.5);

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
    this.effectText.setText('Đang gửi kết quả...').setColor('#f4f0e0');
    this.onFinish(outcome);
  }

  update(): void {
    const state = this.round;
    const { params } = state;
    const t = this.elapsed();
    if (!this.finished && isLost(state, t)) this.finish('failed');

    const remaining = Math.max(0, remainingMs(state, t));
    const flashing = performance.now() < this.penaltyFlashUntil;
    this.timerText
      .setText(`${(remaining / 1000).toFixed(1).replace('.', ',')} giây`)
      .setColor(flashing ? '#d9534f' : '#f4f0e0');

    const g = this.graphics.clear();
    const hpRatio = Math.max(0, state.hp) / params.fishHp;
    g.fillStyle(COLORS.hpBack).fillRect(BAR_X, HP_Y, BAR_WIDTH, 8);
    g.fillStyle(COLORS.hp).fillRect(BAR_X, HP_Y, BAR_WIDTH * hpRatio, 8);

    g.fillStyle(COLORS.bar).fillRect(BAR_X, BAR_Y, BAR_WIDTH, BAR_HEIGHT);
    g.fillStyle(COLORS.green).fillRect(
      BAR_X + state.greenStart * BAR_WIDTH,
      BAR_Y,
      params.greenWidth * BAR_WIDTH,
      BAR_HEIGHT,
    );
    g.fillStyle(COLORS.yellow).fillRect(
      BAR_X + state.yellowStart * BAR_WIDTH,
      BAR_Y,
      params.yellowWidth * BAR_WIDTH,
      BAR_HEIGHT,
    );
    const needleX = BAR_X + needlePos(t, params.needlePassMs) * BAR_WIDTH;
    g.fillStyle(COLORS.needle).fillRect(needleX - 1, BAR_Y - 4, 2, BAR_HEIGHT + 8);
  }
}
