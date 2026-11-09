// Điều phối giao diện một lần câu theo AttemptUpdate từ Server.
import type Phaser from 'phaser';
import type { Services } from '../core/services';
import type { HeadIcon } from '../entities/CharacterView';
import type { CharacterAnim } from '../entities/placeholderArt';
import type { AttemptView, FishingOutcome } from '../net/contract';
import { createPanel, showError, showToast } from '../ui/kit/components';
import { FishButton } from './FishButton';
import { biteProgress, fishButtonView, isAttemptActive, isControlLocked } from './fishButtonState';
import { MINIGAME_SCENE, type MinigameData } from './MinigameScene';
import { buildResultCard, cancelText } from './resultText';
import { playBiteBeep } from './sound';
import { submitFishingResult } from './submitResult';

const DEFAULT_RESULT_POPUP_MS = 3000;
const DEFAULT_BITE_WINDOW_MS = 3000;
const CAST_ANIM_MS = 500;
const FAIL_HOLD_MS = 1500;
const BOBBER_RADIUS = 3;

/** Nhân vật của người chơi trong lần câu, dùng được cho mọi scene. */
export interface FishingActor {
  play(anim: CharacterAnim): void;
  setHeadIcon(icon: HeadIcon): void;
}

export class FishingFlow {
  private readonly button: FishButton;
  private readonly bobber: Phaser.GameObjects.Arc;
  private readonly unsubscribe: () => void;
  private resultLockUntilMs = 0;
  private characterBusyUntilMs = 0;
  private commandPending = false;
  private hookSentAtMs: number | null = null;
  private lastAttemptKey = '';
  private castTimer: Phaser.Time.TimerEvent | null = null;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly services: Services,
    private readonly root: HTMLElement,
    private readonly me: FishingActor,
    private readonly bobberPoint: () => { x: number; y: number } | null,
    private readonly serverNow: () => number,
  ) {
    this.button = new FishButton(root, () => this.press());
    this.bobber = scene.add.circle(0, 0, BOBBER_RADIUS, 0xf25c54).setVisible(false);
    this.unsubscribe = services.store.select(
      (s) => s.attempt,
      (attempt) => this.onAttempt(attempt),
    );
  }

  /** Khóa di chuyển và các thao tác khác trong lúc câu. */
  isLocked(nowMs = performance.now()): boolean {
    return isControlLocked(this.services.store.getState().attempt, this.resultLockUntilMs, nowMs);
  }

  isFishing(): boolean {
    return isAttemptActive(this.services.store.getState().attempt);
  }

  /** Còn đang diễn animation kết quả, chưa được chuyển về idle. */
  isCharacterBusy(nowMs = performance.now()): boolean {
    return this.isLocked(nowMs) || nowMs < this.characterBusyUntilMs;
  }

  update(): void {
    const { attempt, lake, catalog } = this.services.store.getState();
    const nowMs = performance.now();
    this.button.render(
      fishButtonView({
        hasSession: lake.mySession !== null,
        attempt,
        resultLockUntilMs: this.resultLockUntilMs,
        nowMs,
      }),
      biteProgress(
        attempt,
        this.serverNow(),
        catalog?.fishing.biteWindowMs ?? DEFAULT_BITE_WINDOW_MS,
      ),
    );
    if (nowMs >= this.characterBusyUntilMs && this.characterBusyUntilMs > 0) {
      this.characterBusyUntilMs = 0;
      this.me.setHeadIcon(null);
    }
  }

  destroy(): void {
    this.unsubscribe();
    this.button.destroy();
  }

  private press(): void {
    if (this.commandPending) return;
    const attempt = this.services.store.getState().attempt;
    if (attempt?.phase === 'bite') void this.hook(attempt.attemptId);
    else void this.cast();
  }

  private async run(command: () => Promise<{ ok: boolean; error: unknown }>): Promise<void> {
    this.commandPending = true;
    try {
      const ack = await command();
      if (!ack.ok) showError(this.root, ack.error);
    } catch (error) {
      console.warn(error);
      showError(this.root, { code: 'NETWORK_ERROR' });
    } finally {
      this.commandPending = false;
    }
  }

  private cast(): Promise<void> {
    return this.run(() => this.services.hub.invoke('CastLine', {}));
  }

  private hook(attemptId: string): Promise<void> {
    this.hookSentAtMs = performance.now();
    return this.run(() => this.services.hub.invoke('HookFish', { attemptId }));
  }

  private onAttempt(attempt: AttemptView | null): void {
    if (!attempt) return;
    const key = `${attempt.attemptId}:${attempt.phase}`;
    if (key === this.lastAttemptKey) return;
    this.lastAttemptKey = key;
    this.castTimer?.remove();
    this.castTimer = null;

    switch (attempt.phase) {
      case 'waiting':
        this.showWaiting();
        break;
      case 'bite':
        this.me.play('bite');
        this.me.setHeadIcon({ type: 'bite' });
        this.bobber.setFillStyle(0x7a1f1a).setScale(0.6);
        playBiteBeep();
        break;
      case 'minigame':
        this.startMinigame(attempt);
        break;
      case 'success':
        this.showSuccess(attempt);
        break;
      case 'failed':
        this.finishRound();
        this.me.play('fail');
        this.me.setHeadIcon({ type: 'sad' });
        this.characterBusyUntilMs = performance.now() + FAIL_HOLD_MS;
        break;
      case 'cancelled':
        this.finishRound();
        this.me.play('idle');
        this.me.setHeadIcon(null);
        showToast(this.root, cancelText(attempt.reason));
        break;
    }
  }

  private showWaiting(): void {
    this.me.play('cast');
    this.me.setHeadIcon(null);
    this.characterBusyUntilMs = 0;
    this.castTimer = this.scene.time.delayedCall(CAST_ANIM_MS, () => {
      this.me.play('wait');
      const point = this.bobberPoint();
      if (point) {
        this.bobber
          .setPosition(point.x, point.y)
          .setDepth(point.y)
          .setFillStyle(0xf25c54)
          .setScale(1)
          .setVisible(true);
      }
    });
  }

  private startMinigame(attempt: AttemptView): void {
    if (!attempt.minigame) return;
    this.me.play('reel');
    this.me.setHeadIcon(null);
    const receivedAt = performance.now();
    const rtt = this.hookSentAtMs === null ? 0 : receivedAt - this.hookSentAtMs;
    const data: MinigameData = {
      params: attempt.minigame,
      t0: receivedAt - rtt / 2,
      onFinish: (outcome) => void this.submit(attempt.attemptId, outcome),
    };
    this.scene.scene.launch(MINIGAME_SCENE, data);
  }

  /** Chỉ hiện cá/EXP khi Server đã ghi kết quả; không tự cộng phần thưởng. */
  private async submit(attemptId: string, outcome: FishingOutcome): Promise<void> {
    const { hub, store } = this.services;
    const result = await submitFishingResult(
      (args, requestId) => hub.invoke('SubmitFishingResult', args, requestId),
      attemptId,
      outcome,
    );
    if (result.kind === 'settled') {
      store.dispatch({ type: 'AttemptUpdate', payload: result.attempt });
      return;
    }
    showError(this.root, { code: result.kind === 'rejected' ? result.code : 'NETWORK_ERROR' });
    this.finishRound();
    // Tra lại trạng thái thật để không kẹt ở bước minigame.
    await hub.joinLake().catch((error: unknown) => console.warn(error));
  }

  private finishRound(): void {
    this.scene.scene.stop(MINIGAME_SCENE);
    this.bobber.setVisible(false);
    this.hookSentAtMs = null;
  }

  private showSuccess(attempt: AttemptView): void {
    this.finishRound();
    this.me.play('success');
    const { catalog } = this.services.store.getState();
    const popupMs = catalog?.fishing.resultPopupMs ?? DEFAULT_RESULT_POPUP_MS;
    this.resultLockUntilMs = performance.now() + popupMs;
    if (attempt.result) this.openPopup(buildResultCard(attempt.result, catalog), popupMs);
  }

  private openPopup(card: ReturnType<typeof buildResultCard>, popupMs: number): void {
    const body = document.createElement('div');
    body.className = 'result-card';

    const icon = document.createElement('div');
    icon.className = 'result-card__fish';
    icon.style.background = card.rarityColor;

    const add = (text: string, className: string, color?: string) => {
      const el = document.createElement('div');
      el.className = className;
      el.textContent = text;
      if (color) el.style.color = color;
      body.append(el);
    };
    body.append(icon);
    add(card.name, 'result-card__name');
    add(card.rarityLabel, 'result-card__rarity', card.rarityColor);
    add(card.length, 'result-card__length');
    if (card.badge) add(card.badge, 'result-card__badge');
    add(card.exp, 'result-card__exp');
    if (card.levelUp) add(card.levelUp, 'result-card__badge');

    const panel = createPanel('Câu được cá!', body);
    panel.classList.add('result-popup');
    this.root.append(panel);
    window.setTimeout(() => {
      panel.remove();
      this.me.play('idle');
    }, popupMs);
  }
}
