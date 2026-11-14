// Điều phối giao diện một lần câu theo AttemptUpdate từ Server.
import Phaser from 'phaser';
import type { Services } from '../core/services';
import type { HeadIcon } from '../entities/CharacterView';
import type { CharacterAnim } from '../entities/placeholderArt';
import type { AttemptView, FishingOutcome, TapResult } from '../net/contract';
import { showError, showToast } from '../ui/kit/components';
import { animateIn, animateOut } from '../ui/kit/motion';
import { FishButton } from './FishButton';
import {
  biteProgress,
  canLeaveSeat,
  isAttemptActive,
  isControlLocked,
  isPullVisible,
  shouldAutoCast,
} from './fishButtonState';
import { MINIGAME_SCENE, type MinigameData, type MinigameScene } from './MinigameScene';
import { drawFishIcon } from '../../art.js';
import { fishImage, preloadFishArt } from '../ui/fishArt';
import { buildCatchCard, preloadCatchCard } from './CatchCard';
import { SIDE_CONFETTI_PEAK_MS, burstConfetti, burstSideConfetti } from './confetti';
import { buildResultCard, cancelText } from './resultText';
import { playBiteBeep } from './sound';
import { submitFishingResult } from './submitResult';

const DEFAULT_BITE_WINDOW_MS = 3000;
/** Chờ từ lúc thu cần tới khi minigame hiện, nếu catalog chưa có (feedback 2026-11-11). */
const DEFAULT_MINIGAME_INTRO_MS = 750;
const CAST_ANIM_MS = 500;
/** Thời gian hiện icon buồn trước khi tự câu lại. */
const FAIL_HOLD_MS = 2000;
/** Trượt cá thì chờ khoảng này rồi tự câu lại, không rời ghế. */
const MISSED_RECAST_MS = 1000;
const CAST_RETRY_MS = 5000;
/** Bỏ qua cú chạm dư của minigame để popup không bị đóng nhầm. */
const RESULT_TAP_GUARD_MS = 400;
const CLOSE_KEY_HINT = 'Bấm F hoặc Space để tiếp tục';

const isTyping = (): boolean =>
  ['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName ?? '');
const BOBBER_RADIUS = 3;
/** Nhịp kéo cần khi bỏ qua minigame trước khi gửi "câu được". */
const SKIP_MINIGAME_PULL_MS = 350;
/** Lóe sáng chỗ dây câu mỗi lần tap trúng: trúng thường nhẹ, điểm yếu mạnh và rung màn. */
const LINE_FLASH = {
  normal: { scale: 3, alpha: 0.7, ms: 220 },
  weak: { scale: 5.5, alpha: 1, ms: 320 },
} as const;
const WEAK_SHAKE_MS = 150;
const WEAK_SHAKE_INTENSITY = 0.002;

/** Nhân vật của người chơi trong lần câu, dùng được cho mọi scene. */
export interface FishingActor {
  play(anim: CharacterAnim): void;
  setHeadIcon(icon: HeadIcon): void;
  /** Giật cần khi tap trúng minigame (strong = điểm yếu). */
  tugRod?(strong: boolean): void;
  /** Phao vẽ sẵn trong art cần; có thì không vẽ phao tròn đỏ riêng nữa. */
  bobberPoint?(): { x: number; y: number } | null;
}

export interface PierFishingOptions {
  /** Ảnh đồng xu cho dòng Giá của thẻ câu được cá (Coin Art.png); bỏ trống giữ ảnh thẻ. */
  catchCardCoin?: string;
  /** Pháo giấy bắn từ hai góc dưới, khoảng 0,6 giây sau mới hiện popup cá (feedback 2026-11-14). */
  sideConfetti?: boolean;
  /** Vệt sáng quét qua con cá trong popup (feedback 2026-11-14). */
  lightSweep?: boolean;
  /** Popup cá đóng bằng F hoặc Space (hiện gợi ý trong thẻ), không đóng bằng chạm ra ngoài (feedback 2026-11-14). */
  closePopupByKey?: boolean;
  /**
   * Tạm bỏ qua minigame (feedback 2026-11-14): thu cần là gửi "câu được" luôn. Code minigame giữ nguyên,
   * tắt cờ này là dùng lại.
   */
  skipMinigame?: boolean;
}

export class FishingFlow {
  private readonly button: FishButton;
  private readonly bobber: Phaser.GameObjects.Arc;
  private readonly unsubscribe: () => void;
  private resultOpen = false;
  private nextCastAtMs = 0;
  private characterBusyUntilMs = 0;
  private commandPending = false;
  private hookSentAtMs: number | null = null;
  private lastAttemptKey = '';
  private castTimer: Phaser.Time.TimerEvent | null = null;
  /** Hẹn giờ theo giờ thật (không theo đồng hồ scene) để khớp hạn minigame của Server. */
  private introTimer: number | null = null;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly services: Services,
    private readonly root: HTMLElement,
    private readonly me: FishingActor,
    private readonly bobberPoint: () => { x: number; y: number } | null,
    private readonly serverNow: () => number,
    private readonly isSeatReady: () => boolean = () => true,
    /** Màu hình cá theo loài của scene; không có thì tô theo màu độ hiếm. */
    private readonly fishColor: (speciesId: string) => string | undefined = () => undefined,
    /** Tên hồ ở dòng "Nơi sống" của thẻ nhận cá; mặc định là mapId Server gửi về. */
    private readonly habitat: () => string = () => services.store.getState().lake.mapId ?? '—',
    /** Tuỳ chọn riêng của pier.html; trang khác bỏ trống để giữ hành vi cũ. */
    private readonly pier: PierFishingOptions = {},
  ) {
    this.button = new FishButton(root, () => this.press());
    preloadCatchCard();
    preloadFishArt(services.store.getState().catalog?.fish.map((f) => f.speciesId) ?? []);
    this.bobber = scene.add.circle(0, 0, BOBBER_RADIUS, 0xf25c54).setVisible(false);
    this.unsubscribe = services.store.select(
      (s) => s.attempt,
      (attempt) => this.onAttempt(attempt),
    );
  }

  /** Khóa di chuyển và các thao tác khác trong lúc câu. */
  isLocked(): boolean {
    return isControlLocked(this.services.store.getState().attempt, this.resultOpen);
  }

  /** Rời ghế được trừ khi đã thu cần mà chưa có kết quả; LeaveSeat hủy lần câu đang chờ. */
  canLeaveSeat(): boolean {
    return canLeaveSeat(this.services.store.getState().attempt, this.hookSentAtMs !== null);
  }

  isFishing(): boolean {
    return isAttemptActive(this.services.store.getState().attempt);
  }

  /** Còn đang diễn animation kết quả, chưa được chuyển về idle. */
  isCharacterBusy(nowMs = performance.now()): boolean {
    return this.isLocked() || nowMs < this.characterBusyUntilMs;
  }

  update(): void {
    const { attempt, lake, catalog } = this.services.store.getState();
    const nowMs = performance.now();
    this.button.render(
      isPullVisible(attempt),
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
    const autoCast = shouldAutoCast({
      hasSession: lake.mySeat !== null,
      seatReady: this.isSeatReady(),
      attempt,
      resultOpen: this.resultOpen,
      commandPending: this.commandPending,
      nextCastAtMs: this.nextCastAtMs,
      nowMs,
    });
    if (autoCast) void this.cast();
  }

  destroy(): void {
    this.clearIntro();
    this.unsubscribe();
    this.button.destroy();
  }

  private press(): void {
    if (this.commandPending) return;
    const attempt = this.services.store.getState().attempt;
    if (attempt?.phase === 'bite') void this.hook(attempt.attemptId);
  }

  private async run(command: () => Promise<{ ok: boolean; error: unknown }>): Promise<boolean> {
    this.commandPending = true;
    try {
      const ack = await command();
      if (!ack.ok) showError(this.root, ack.error);
      return ack.ok;
    } catch (error) {
      console.warn(error);
      showError(this.root, { code: 'NETWORK_ERROR' });
      return false;
    } finally {
      this.commandPending = false;
    }
  }

  private async cast(): Promise<void> {
    const ok = await this.run(() => this.services.hub.invoke('CastLine', {}));
    if (!ok) this.nextCastAtMs = performance.now() + CAST_RETRY_MS;
  }

  private async hook(attemptId: string): Promise<void> {
    this.hookSentAtMs = performance.now();
    const ok = await this.run(() => this.services.hub.invoke('HookFish', { attemptId }));
    if (!ok) this.hookSentAtMs = null;
  }

  private onAttempt(attempt: AttemptView | null): void {
    if (!attempt) return;
    const key = `${attempt.attemptId}:${attempt.phase}`;
    if (key === this.lastAttemptKey) return;
    this.lastAttemptKey = key;
    this.castTimer?.remove();
    this.castTimer = null;
    this.clearIntro();

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
        // Trượt cá: vẫn ngồi ghế, không icon buồn, khoảng 1 giây sau tự câu lại (feedback 2026-11-11).
        if (attempt.reason === 'missed_bite') {
          this.nextCastAtMs = performance.now() + MISSED_RECAST_MS;
          this.me.play('idle');
          this.me.setHeadIcon(null);
          break;
        }
        this.nextCastAtMs = performance.now() + FAIL_HOLD_MS;
        this.me.play('fail');
        this.me.setHeadIcon({ type: 'sad' });
        this.characterBusyUntilMs = this.nextCastAtMs;
        break;
      case 'cancelled':
        this.finishRound();
        this.me.play('idle');
        this.me.setHeadIcon(null);
        this.nextCastAtMs = performance.now() + FAIL_HOLD_MS;
        // Rời ghế đã có thông báo của phiên ghế, không báo trùng.
        if (attempt.reason !== 'left_seat') showToast(this.root, cancelText(attempt.reason));
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
      // Art cần đã vẽ dây và phao: không thêm phao tròn trùng chỗ.
      if (point && !this.me.bobberPoint?.()) {
        this.bobber
          .setPosition(point.x, point.y)
          .setDepth(point.y)
          .setFillStyle(0xf25c54)
          .setScale(1)
          .setVisible(true);
      }
    });
  }

  /** Server tính hạn minigame sau introMs kể từ lúc thu cần, nên Client chờ đúng khoảng đó rồi mới hiện. */
  private startMinigame(attempt: AttemptView): void {
    if (!attempt.minigame) return;
    this.me.play('reel');
    this.me.setHeadIcon(null);
    if (this.pier.skipMinigame) {
      // Server nhận kết quả ngay khi lần câu sang pha minigame; giữ một nhịp kéo cần ngắn cho có cảm giác.
      this.introTimer = window.setTimeout(() => {
        this.introTimer = null;
        void this.submit(attempt.attemptId, 'success');
      }, SKIP_MINIGAME_PULL_MS);
      return;
    }
    const receivedAt = performance.now();
    const rtt = this.hookSentAtMs === null ? 0 : receivedAt - this.hookSentAtMs;
    const introMs =
      this.services.store.getState().catalog?.minigame.introMs ?? DEFAULT_MINIGAME_INTRO_MS;
    const t0 = receivedAt - rtt / 2 + introMs;
    const data: MinigameData = {
      params: attempt.minigame,
      t0,
      onFinish: (outcome) => void this.submit(attempt.attemptId, outcome),
      onTap: (kind) => this.onMinigameTap(kind),
    };
    this.introTimer = window.setTimeout(
      () => {
        this.introTimer = null;
        this.scene.scene.launch(MINIGAME_SCENE, data);
      },
      Math.max(0, t0 - performance.now()),
    );
  }

  /** Tap trúng: nhân vật giật cần, lóe sáng ở phao/dây câu; điểm yếu thì sáng mạnh hơn và rung màn. */
  private onMinigameTap(kind: TapResult): void {
    if (kind === 'miss') return;
    const strong = kind === 'weak';
    this.me.tugRod?.(strong);
    if (strong) this.scene.cameras.main.shake(WEAK_SHAKE_MS, WEAK_SHAKE_INTENSITY);
    const point = this.me.bobberPoint?.() ?? this.bobberPoint();
    if (!point) return;
    const look = LINE_FLASH[kind];
    const flash = this.scene.add
      .circle(point.x, point.y, BOBBER_RADIUS, 0xffffff)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(point.y + 1)
      .setAlpha(look.alpha);
    this.scene.tweens.add({
      targets: flash,
      scale: look.scale,
      alpha: 0,
      duration: look.ms,
      ease: 'Cubic.easeOut',
      onComplete: () => flash.destroy(),
    });
  }

  private clearIntro(): void {
    if (this.introTimer !== null) window.clearTimeout(this.introTimer);
    this.introTimer = null;
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
    // Minigame mờ dần rồi mới dừng scene (feedback 2026-11-12).
    const minigame = this.scene.scene.get(MINIGAME_SCENE) as MinigameScene | null;
    if (minigame && this.scene.scene.isActive(MINIGAME_SCENE)) minigame.fadeOut();
    else this.scene.scene.stop(MINIGAME_SCENE);
    this.bobber.setVisible(false);
    this.hookSentAtMs = null;
  }

  private showSuccess(attempt: AttemptView): void {
    this.finishRound();
    this.me.play('success');
    const { catalog } = this.services.store.getState();
    const { result } = attempt;
    if (!result) return;
    const card = buildResultCard(result, catalog);
    // Hình cá theo loài (ảnh tải sẵn lúc vào hồ) hiện ngay trong thẻ (feedback 2026-11-11, 2026-11-13).
    const fish = fishImage(result.speciesId, '', false);
    // Loài chưa có ảnh: quay về hình cá vẽ tay tô màu theo loài/độ hiếm như trước.
    fish.addEventListener(
      'error',
      () => {
        const drawn = drawFishIcon(this.fishColor(result.speciesId) ?? card.rarityColor);
        drawn.className = fish.className;
        drawn.style.cssText = fish.style.cssText;
        fish.replaceWith(drawn);
      },
      { once: true },
    );
    const popup = () =>
      buildCatchCard({
        card,
        rarity: result.rarity,
        isNew: result.isNew,
        isRecord: result.isRecord,
        habitat: this.habitat(),
        coinSrc: this.pier.catchCardCoin,
        lightSweep: this.pier.lightSweep,
        hint: this.pier.closePopupByKey ? CLOSE_KEY_HINT : undefined,
        fish,
      });
    if (this.pier.sideConfetti) {
      // Bắn pháo từ hai góc trước, pháo lên tới đỉnh thì mới hiện thẻ cá; chặn tự quăng cần trong lúc chờ.
      this.resultOpen = true;
      burstSideConfetti(this.root);
      window.setTimeout(() => this.openPopup(popup(), false), SIDE_CONFETTI_PEAK_MS);
      return;
    }
    this.openPopup(popup());
  }

  /** Thẻ nhận cá theo ảnh Catch Fish.png; chạm ra ngoài thẻ để đóng. */
  private openPopup(card: HTMLElement, confetti = true): void {
    const popup = document.createElement('div');
    popup.className = 'result-popup';
    const byKey = Boolean(this.pier.closePopupByKey);
    popup.append(card);
    if (!byKey) {
      const hint = document.createElement('div');
      hint.className = 'result-popup__hint';
      hint.textContent = 'Chạm ra ngoài để đóng';
      popup.append(hint);
    }
    const overlay = document.createElement('div');
    overlay.className = 'result-overlay';
    overlay.append(popup);
    animateIn(popup, 'pop');
    this.root.append(overlay);
    if (confetti) burstConfetti(overlay);
    this.resultOpen = true;

    const openedAtMs = performance.now();
    const close = () => {
      // Thẻ mờ dần và thu nhỏ rồi mới gỡ (feedback 2026-11-12).
      overlay.style.pointerEvents = 'none';
      void animateOut(popup, 'pop').then(() => overlay.remove());
      this.resultOpen = false;
      this.me.play('idle');
    };
    if (byKey) {
      // F hoặc Space đóng thẻ; chặn phím để không ngồi/đứng dậy hay quăng cần thêm lần nữa.
      const onKey = (event: KeyboardEvent) => {
        if (event.code !== 'KeyF' && event.code !== 'Space') return;
        if (isTyping()) return;
        event.preventDefault();
        event.stopImmediatePropagation();
        if (event.repeat || performance.now() - openedAtMs < RESULT_TAP_GUARD_MS) return;
        window.removeEventListener('keydown', onKey, true);
        close();
      };
      window.addEventListener('keydown', onKey, true);
      return;
    }
    overlay.addEventListener('pointerdown', (event) => {
      if (performance.now() - openedAtMs < RESULT_TAP_GUARD_MS) return;
      if (card.contains(event.target as Node)) return;
      close();
    });
  }
}
