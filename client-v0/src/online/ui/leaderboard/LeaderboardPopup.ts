// Popup "Bảng xếp hạng" gộp hai bảng (yêu cầu 2026-11-21), mở từ ô "Bảng xếp hạng" trong menu hoặc bấm F cạnh bục
// "Hội Quán Cao Thủ" (HomeHud). Khung Rank/Leaderboard Panel.png 1144×812; hai tab "BXH Tuần" và
// "BXH Ngày" (nền Tab - State Default/Active.png, không icon, kiểu popup Túi đồ) nằm trên khung. Mặc định mở
// ra bảng tuần. Nội dung từng tab là một RankView: WeeklyBoardView (tuần) và DailyFishView (cá ngày, trước đây mở bằng phím B,
// đã bỏ phím tắt).
import { UI_DESIGN_HEIGHT, UI_DESIGN_WIDTH } from '../../core/env';
import type { Services } from '../../core/services';
import { animateIn, animateOut } from '../kit/motion';
import { DailyFishView } from './DailyFishPopup';
import { CLOSE, PANEL_H, PANEL_W, RANK, el, img, type RankView } from './rankKit';
import { WeeklyBoardView } from './WeeklyBoardView';

export type BoardTab = 'weekly' | 'daily';

const TABS: { id: BoardTab; label: string }[] = [
  { id: 'weekly', label: 'BXH Tuần' },
  { id: 'daily', label: 'BXH Ngày' },
];

export interface LeaderboardPopupOptions {
  root: HTMLElement;
  services: Services;
  /** Giờ Server (đồng hồ đếm ngược); mặc định giờ máy. */
  now?: () => number;
}

export class LeaderboardPopup {
  private overlay: HTMLElement | null = null;
  private cleanups: (() => void)[] = [];
  private timer: HTMLElement | null = null;
  private views: Record<BoardTab, RankView> | null = null;
  private tabButtons = new Map<BoardTab, HTMLButtonElement>();
  private active: BoardTab = 'weekly';

  constructor(private readonly options: LeaderboardPopupOptions) {}

  open(): void {
    if (this.overlay) return;
    const { root, services, now } = this.options;
    const overlay = el('div', 'shop rank');
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-label', 'Bảng xếp hạng');
    const panel = el('div', 'rank__panel');
    const timer = el('div', 'rank__timer', '?');
    const close = el('button', 'rank__close');
    close.type = 'button';
    close.setAttribute('aria-label', 'Đóng bảng xếp hạng');
    close.append(img(CLOSE, ''));
    close.addEventListener('click', () => this.close());

    // Mỗi tab báo đồng hồ riêng; chỉ cập nhật khi tab đó đang hiện.
    const onTimer = (id: BoardTab) => () => {
      if (this.active === id) this.syncTimer();
    };
    const views: Record<BoardTab, RankView> = {
      weekly: new WeeklyBoardView({ root, services, now, onTimer: onTimer('weekly') }),
      daily: new DailyFishView({ root, services, now, onTimer: onTimer('daily') }),
    };
    const boards = el('nav', 'rank__boards');
    boards.setAttribute('role', 'tablist');
    this.tabButtons.clear();
    for (const tab of TABS) {
      const button = el('button', 'rank__board-tab', tab.label);
      button.type = 'button';
      button.setAttribute('role', 'tab');
      button.addEventListener('click', () => this.switchTo(tab.id));
      this.tabButtons.set(tab.id, button);
      boards.append(button);
    }

    this.active = 'weekly';
    views.daily.root.hidden = true;
    // Thân khung: tab nội dung nằm dưới, đồng hồ, tiêu đề và nút đóng nằm trên để luôn bấm được; hàng tab chuyển bảng ở trên khung.
    const body = el('div', 'rank__body');
    body.append(
      img(RANK('Leaderboard Panel.png'), 'rank__art'),
      views.weekly.root,
      views.daily.root,
      timer,
      el('h2', 'rank__title', 'BẢNG XẾP HẠNG'),
      close,
    );
    panel.append(body, boards);
    overlay.append(panel);
    overlay.style.setProperty(
      '--shop-scale',
      String(Math.min(1, (UI_DESIGN_WIDTH * 0.96) / PANEL_W, (UI_DESIGN_HEIGHT * 0.92) / PANEL_H)),
    );
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      if (this.views?.[this.active].handleEscape()) return;
      this.close();
    };
    window.addEventListener('keydown', onKey);
    overlay.addEventListener('pointerdown', (event) => {
      if (event.target === overlay) this.close();
    });
    this.cleanups.push(() => window.removeEventListener('keydown', onKey));

    this.timer = timer;
    this.views = views;
    this.overlay = overlay;
    root.append(overlay);
    animateIn(overlay, 'fade');
    animateIn(panel, 'pop');
    this.syncTabs();
    this.syncTimer();
    views.weekly.activate();
  }

  /** Chuyển tab: tab cũ mờ dần rồi ẩn, tab mới hiện dần và tải lại dữ liệu. */
  private switchTo(id: BoardTab): void {
    const views = this.views;
    if (!views || this.active === id) return;
    const old = views[this.active];
    this.active = id;
    void animateOut(old.root, 'fade').then(() => {
      if (this.views && this.views[this.active] !== old) old.root.hidden = true;
    });
    const next = views[id];
    next.root.hidden = false;
    animateIn(next.root, 'fade');
    this.syncTabs();
    this.syncTimer();
    next.activate();
  }

  private syncTabs(): void {
    for (const [id, button] of this.tabButtons) {
      const on = id === this.active;
      button.classList.toggle('rank__board-tab--active', on);
      button.setAttribute('aria-selected', String(on));
    }
  }

  private syncTimer(): void {
    if (this.timer && this.views) this.timer.textContent = this.views[this.active].timerText();
  }

  close(): void {
    const overlay = this.overlay;
    if (!overlay) return;
    this.overlay = null;
    this.cleanups.forEach((cleanup) => cleanup());
    this.cleanups = [];
    overlay.style.pointerEvents = 'none';
    const panel = overlay.querySelector<HTMLElement>('.rank__panel');
    const views = this.views;
    this.views = null;
    void Promise.all([
      panel ? animateOut(panel, 'pop') : Promise.resolve(),
      animateOut(overlay, 'fade'),
    ]).then(() => {
      views?.weekly.destroy();
      views?.daily.destroy();
      overlay.remove();
    });
  }

  destroy(): void {
    this.cleanups.forEach((cleanup) => cleanup());
    this.cleanups = [];
    this.views?.weekly.destroy();
    this.views?.daily.destroy();
    this.views = null;
    this.overlay?.remove();
    this.overlay = null;
  }
}
