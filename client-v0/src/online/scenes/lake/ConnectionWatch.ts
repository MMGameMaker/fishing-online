// Theo dõi kết nối hub khi đang ở hồ (feedback 2026-11-12): SignalR chỉ tự nối lại ~18 giây
// (RECONNECT_DELAYS_MS); Server tắt lâu hơn thì kết nối đóng hẳn và trước đây Client đứng im không báo.
// Nay hiện băng "Mất kết nối" và thử lại mỗi RETRY_MS tới khi vào lại được hồ.
import type { ConnectionState } from '../../net/GameHub';
import { animateIn, removeWithMotion } from '../../ui/kit/motion';

export const RETRY_MS = 5000;

export interface WatchedHub {
  readonly state: ConnectionState;
  onConnectionState(listener: (state: ConnectionState) => void): () => void;
  start(): Promise<void>;
  joinLake(): Promise<{ ok: boolean }>;
}

/** Phần hiển thị băng thông báo; mặc định là DOM trong root, test truyền bản giả. */
export interface BannerView {
  show(text: string): void;
  hide(): void;
}

/** Băng DOM trên đầu màn hình, hiện/ẩn qua ui/kit/motion.ts. */
export function domBanner(root: HTMLElement): BannerView {
  let banner: HTMLElement | null = null;
  return {
    show(text) {
      if (banner) {
        banner.textContent = text;
        return;
      }
      banner = document.createElement('div');
      banner.className = 'connection-banner';
      banner.setAttribute('role', 'status');
      banner.textContent = text;
      root.append(banner);
      animateIn(banner, 'fade');
    },
    hide() {
      const current = banner;
      banner = null;
      if (current) void removeWithMotion(current, 'fade');
    },
  };
}

export interface ConnectionWatchOptions {
  root: HTMLElement;
  hub: WatchedHub;
  view?: BannerView;
  setTimer?: (fn: () => void, ms: number) => number;
  clearTimer?: (id: number) => void;
}

export class ConnectionWatch {
  private shown = false;
  private readonly view: BannerView;
  private timer: number | null = null;
  private retrying = false;
  private readonly unsubscribe: () => void;
  private readonly setTimer: (fn: () => void, ms: number) => number;
  private readonly clearTimer: (id: number) => void;

  constructor(private readonly options: ConnectionWatchOptions) {
    this.setTimer = options.setTimer ?? ((fn, ms) => window.setTimeout(fn, ms));
    this.clearTimer = options.clearTimer ?? ((id) => window.clearTimeout(id));
    this.view = options.view ?? domBanner(options.root);
    this.unsubscribe = options.hub.onConnectionState((state) => this.onState(state));
  }

  get isShowingBanner(): boolean {
    return this.shown;
  }

  destroy(): void {
    this.unsubscribe();
    if (this.timer !== null) this.clearTimer(this.timer);
    this.hideBanner();
  }

  private onState(state: ConnectionState): void {
    if (state === 'reconnecting') this.showBanner('Mất kết nối với Server, đang thử lại…');
    if (state === 'connected') this.hideBanner();
    // Đóng hẳn (hết lượt tự nối lại của SignalR): tự thử lại theo chu kỳ.
    if (state === 'disconnected' && !this.retrying) {
      this.showBanner('Mất kết nối với Server, đang thử lại…');
      this.schedule();
    }
  }

  private schedule(): void {
    if (this.timer !== null) this.clearTimer(this.timer);
    this.timer = this.setTimer(() => void this.retry(), RETRY_MS);
  }

  private async retry(): Promise<void> {
    this.timer = null;
    this.retrying = true;
    try {
      await this.options.hub.start();
      // Vào lại hồ để Server gửi snapshot (người chơi, ghế) và biết mình còn ở đây.
      const ack = await this.options.hub.joinLake();
      if (!ack.ok) throw new Error('JoinLake bị từ chối');
      this.hideBanner();
    } catch {
      this.schedule();
    } finally {
      this.retrying = false;
    }
  }

  private showBanner(text: string): void {
    this.shown = true;
    this.view.show(text);
  }

  private hideBanner(): void {
    if (!this.shown) return;
    this.shown = false;
    this.view.hide();
  }
}
