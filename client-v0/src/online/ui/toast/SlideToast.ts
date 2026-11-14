// Thông báo kiểu mới cho pier.html (feedback 2026-11-14): nền Well Art.png, giữa phía dưới màn hình,
// trượt lên (ease OutQuad), giữ 1,5 giây rồi trượt xuống (ease OutQuad). Nằm trên mọi UI. Mỗi lúc chỉ một
// thông báo: có thông báo mới thì cái đang hiện trượt xuống ngay, xong mới trượt cái tiếp theo lên.
import type Phaser from 'phaser';
import { trackCanvasFrame, type ToastKind } from '../kit/components';

const SLIDE_MS = 260;
const HOLD_MS = 1500;
/** easeOutQuad. */
const EASE_OUT_QUAD = 'cubic-bezier(0.25, 0.46, 0.45, 0.94)';
/** Khoảng cách đáy màn hình khi hiện; ẩn thì nằm khuất dưới mép. */
const BOTTOM_PX = 24;

interface Item {
  message: string;
  kind: ToastKind;
}

export class SlideToast {
  private readonly host: HTMLElement;
  private readonly queue: Item[] = [];
  private running = false;
  /** Gọi để kết thúc sớm thời gian giữ của thông báo đang hiện. */
  private cutHold: (() => void) | null = null;

  private stopTracking: (() => void) | null = null;

  /** Có `game` thì lớp thông báo bám đúng khung chơi (màn thiết kế 1920×1080), không tràn ra dải đen. */
  constructor(parent: HTMLElement = document.body, game?: Phaser.Game) {
    this.host = document.createElement('div');
    this.host.className = 'slide-toast-host';
    this.host.setAttribute('role', 'status');
    this.host.setAttribute('aria-live', 'polite');
    parent.append(this.host);
    if (game) this.stopTracking = trackCanvasFrame(game, this.host);
  }

  show(message: string, kind: ToastKind = 'info'): void {
    this.queue.push({ message, kind });
    // Có thông báo đang giữ: trượt xuống ngay để nhường chỗ.
    this.cutHold?.();
    if (!this.running) void this.drain();
  }

  destroy(): void {
    this.queue.length = 0;
    this.stopTracking?.();
    this.host.remove();
  }

  private async drain(): Promise<void> {
    this.running = true;
    while (this.queue.length > 0) await this.play(this.queue.shift()!);
    this.running = false;
  }

  private async play(item: Item): Promise<void> {
    const toast = document.createElement('div');
    toast.className = `slide-toast slide-toast--${item.kind}`;
    toast.textContent = item.message;
    this.host.append(toast);
    const hidden = `translate(-50%, calc(100% + ${BOTTOM_PX + 8}px))`;
    const shown = 'translate(-50%, 0)';
    try {
      await toast.animate([{ transform: hidden }, { transform: shown }], {
        duration: SLIDE_MS,
        easing: EASE_OUT_QUAD,
        fill: 'forwards',
      }).finished;
      // Giữ 1,5 giây, hoặc kết thúc sớm khi có thông báo mới.
      if (this.queue.length === 0) {
        await new Promise<void>((resolve) => {
          const timer = window.setTimeout(resolve, HOLD_MS);
          this.cutHold = () => {
            window.clearTimeout(timer);
            resolve();
          };
        });
      }
      this.cutHold = null;
      await toast.animate([{ transform: shown }, { transform: hidden }], {
        duration: SLIDE_MS,
        easing: EASE_OUT_QUAD,
        fill: 'forwards',
      }).finished;
    } catch {
      // Trang đóng giữa chừng: bỏ qua.
    } finally {
      this.cutHold = null;
      toast.remove();
    }
  }
}
