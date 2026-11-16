// Popup "Bảng xếp hạng tuần" theo ảnh mẫu 2026-11-16, mở từ ô "Bảng xếp hạng" trong menu (HomeHud).
// Khung Rank/Leaderboard Panel.png 1144×812, dòng Rank/Row 1.png 1104×90, huy hiệu Rank 1..3.png.
// Dòng cuối là của chính mình; chưa có dữ liệu thì chỉ điền tên, các cột còn lại là "?".
// Mọi số liệu lấy từ BE (GET /rankings/total-catch-weekly, phân trang, tối đa top 50) theo doc/GAMEPLAY_SCOPE.md;
// danh sách cuộn, tới cuối thì tải trang kế.
import { UI_DESIGN_HEIGHT, UI_DESIGN_WIDTH } from '../../core/env';
import type { Services } from '../../core/services';
import { COIN_ART } from '../coinArt';
import { animateIn, animateOut } from '../kit/motion';
import type { RankingResponse } from '../../net/contract';
import { showError } from '../kit/components';
import { formatGold } from '../kit/format';
import {
  BOARD_ID,
  PAGE_SIZE,
  UNKNOWN,
  countdownText,
  formatCount,
  myRowFrom,
  toRow,
  type RankRow,
} from './leaderboardModel';

const UI = (file: string) => encodeURI(`/new resources/ui/${file}`);
const RANK = (file: string) => UI(`Rank/${file}`);
const CLOSE = encodeURI('/mini game/Button Close.png');
const PANEL_W = 1144;
const PANEL_H = 812;

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className: string,
  text?: string,
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function img(src: string, className: string): HTMLImageElement {
  const node = el('img', className);
  node.src = src;
  node.alt = '';
  node.draggable = false;
  return node;
}

function rankCell(rank: number | null): HTMLElement {
  const cell = el('span', 'rank__rank');
  if (rank !== null && rank >= 1 && rank <= 3)
    cell.append(img(RANK(`Rank ${rank}.png`), 'rank__crown'));
  else cell.textContent = rank === null ? UNKNOWN : String(rank);
  return cell;
}

function row(data: RankRow, mine: boolean): HTMLElement {
  const line = el('div', `rank__row${mine ? ' rank__row--me' : ''}`);
  const reward = el('span', 'rank__reward');
  if (data.reward !== null) reward.append(img(COIN_ART, 'rank__coin'));
  reward.append(el('span', '', data.reward === null ? UNKNOWN : formatGold(data.reward)));
  line.append(
    img(RANK('Row 1.png'), 'rank__row-art'),
    rankCell(data.rank),
    img(UI('Avatar.png'), 'rank__avatar'),
    el('span', 'rank__name', data.displayName),
    el('span', 'rank__count', formatCount(data.value)),
    reward,
  );
  return line;
}

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
  private list: HTMLElement | null = null;
  private gap: HTMLElement | null = null;
  private me: HTMLElement | null = null;
  private data: RankingResponse | null = null;
  private items: RankRow[] = [];
  private nextCursor: string | null = null;
  private loading = false;
  private readonly empty = el(
    'div',
    'rank__empty',
    'Hãy trở thành người câu cá đầu tiên xuất hiện trên bảng xếp hạng!',
  );

  constructor(private readonly options: LeaderboardPopupOptions) {}

  open(): void {
    if (this.overlay) return;
    const overlay = el('div', 'shop rank');
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-label', 'Bảng xếp hạng tuần');
    const panel = el('div', 'rank__panel');
    const timer = el('div', 'rank__timer', UNKNOWN);
    const close = el('button', 'rank__close');
    close.type = 'button';
    close.setAttribute('aria-label', 'Đóng bảng xếp hạng');
    close.append(img(CLOSE, ''));
    close.addEventListener('click', () => this.close());

    const heads = el('div', 'rank__heads');
    heads.append(
      el('span', 'rank__head-name', 'Tên'),
      el('span', 'rank__head-count', 'Cá đã câu'),
      el('span', 'rank__head-reward', 'Thưởng'),
    );
    const list = el('div', 'rank__list');
    list.addEventListener('scroll', () => this.loadMore());
    const gap = el('div', 'rank__gap', '...');
    gap.hidden = true;
    const me = el('div', 'rank__me');
    this.empty.hidden = true;
    this.timer = timer;
    this.list = list;
    this.gap = gap;
    this.me = me;
    panel.append(
      img(RANK('Leaderboard Panel.png'), 'rank__art'),
      timer,
      el('h2', 'rank__title', 'BẢNG XẾP HẠNG TUẦN'),
      close,
      heads,
      list,
      this.empty,
      gap,
      me,
    );
    overlay.append(panel);
    overlay.style.setProperty(
      '--shop-scale',
      String(Math.min(1, (UI_DESIGN_WIDTH * 0.96) / PANEL_W, (UI_DESIGN_HEIGHT * 0.92) / PANEL_H)),
    );
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') this.close();
    };
    window.addEventListener('keydown', onKey);
    overlay.addEventListener('pointerdown', (event) => {
      if (event.target === overlay) this.close();
    });
    this.cleanups.push(() => window.removeEventListener('keydown', onKey));

    this.overlay = overlay;
    this.options.root.append(overlay);
    animateIn(overlay, 'fade');
    animateIn(panel, 'pop');
    this.data = null;
    this.items = [];
    this.render();
    void this.reload();
  }

  private render(): void {
    if (!this.list || !this.gap || !this.me || !this.timer) return;
    const { services, now } = this.options;
    const name = services.store.getState().session.profile?.displayName ?? 'Người chơi';
    const mine = myRowFrom(this.data, name);
    this.timer.textContent = countdownText(this.data?.periodEndsAt ?? null, (now ?? Date.now)());
    this.list.replaceChildren(...this.items.map((item) => row(item, false)));
    // Bảng chưa có ai (BE đã trả về nhưng không có dòng nào): hiện lời mời ở giữa bảng.
    const empty = this.data !== null && this.items.length === 0;
    this.empty.hidden = !empty;
    this.gap.hidden = !this.data || empty;
    this.me.replaceChildren(row(mine, true));
  }

  /** Mọi số liệu (hạng, số cá, thưởng, hạn chu kỳ) lấy từ BE; lỗi thì chỉ còn dòng tên của mình. */
  private async reload(): Promise<void> {
    this.items = [];
    this.nextCursor = null;
    await this.fetchPage(null);
  }

  private async fetchPage(cursor: string | null): Promise<void> {
    if (this.loading) return;
    this.loading = true;
    try {
      const query = `limit=${PAGE_SIZE}${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ''}`;
      const data = await this.options.services.api.get<RankingResponse>(
        `/rankings/${BOARD_ID}?${query}`,
      );
      if (!this.overlay) return;
      if (cursor === null) this.data = data;
      this.items = [...this.items, ...data.items.map(toRow)];
      this.nextCursor = data.nextCursor;
      this.render();
    } catch (error) {
      if (this.overlay) showError(this.options.root, error);
    } finally {
      this.loading = false;
    }
  }

  private loadMore(): void {
    const list = this.list;
    if (!list || !this.nextCursor) return;
    if (list.scrollTop + list.clientHeight >= list.scrollHeight - 40) {
      void this.fetchPage(this.nextCursor);
    }
  }

  close(): void {
    const overlay = this.overlay;
    if (!overlay) return;
    this.overlay = null;
    this.cleanups.forEach((cleanup) => cleanup());
    this.cleanups = [];
    overlay.style.pointerEvents = 'none';
    const panel = overlay.querySelector<HTMLElement>('.rank__panel');
    void Promise.all([
      panel ? animateOut(panel, 'pop') : Promise.resolve(),
      animateOut(overlay, 'fade'),
    ]).then(() => overlay.remove());
  }

  destroy(): void {
    this.cleanups.forEach((cleanup) => cleanup());
    this.cleanups = [];
    this.overlay?.remove();
    this.overlay = null;
  }
}
