// Popup "BXH cá ngày": dựng lại giống popup Bảng xếp hạng tuần (cùng khung Leaderboard Panel, dòng Row 1, huy hiệu
// Rank 1..3, dòng của mình ghim ở cuối), thêm hàng tab chọn loài cá và hai tab tiêu chí (dài nhất / câu sớm nhất).
// Mở bằng phím B (HomeHud). Dữ liệu GET /rankings/daily-fish/{speciesId}?metric=; 0h giờ VN reset, chưa có thưởng.
import { UI_DESIGN_HEIGHT, UI_DESIGN_WIDTH } from '../../core/env';
import type { Services } from '../../core/services';
import type { DailyFishEntry, DailyFishMetric, DailyFishRanking } from '../../net/contract';
import { fishImage } from '../fishArt';
import { showError } from '../kit/components';
import { animateIn, animateOut } from '../kit/motion';
import { CLOSE, PANEL_H, PANEL_W, RANK, UI, el, img, rankCell } from './LeaderboardPopup';
import { UNKNOWN } from './leaderboardModel';

export const DAILY_METRICS: { id: DailyFishMetric; label: string }[] = [
  { id: 'length', label: 'Dài nhất' },
  { id: 'earliest', label: 'Câu sớm nhất' },
];

/** 12,3cm */
export const dailyLengthText = (tenthCm: number): string =>
  `${(tenthCm / 10).toFixed(1).replace('.', ',')}cm`;

/** Giờ câu theo giờ Việt Nam, vd. "06:05". */
export function dailyTimeText(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return UNKNOWN;
  return date.toLocaleTimeString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'Asia/Ho_Chi_Minh',
  });
}

/** "5 giờ 20 phút" còn lại tới 0h giờ VN. */
export function dailyCountdown(periodEndsAt: string | null, nowMs: number): string {
  const end = periodEndsAt ? Date.parse(periodEndsAt) : NaN;
  if (Number.isNaN(end)) return UNKNOWN;
  const left = Math.max(0, end - nowMs);
  return `${Math.floor(left / 3_600_000)} giờ ${Math.floor((left % 3_600_000) / 60_000)} phút`;
}

export interface DailyFishPopupOptions {
  root: HTMLElement;
  services: Services;
  /** Giờ Server (đồng hồ đếm ngược); mặc định giờ máy. */
  now?: () => number;
}

export class DailyFishPopup {
  private overlay: HTMLElement | null = null;
  private cleanups: (() => void)[] = [];
  private timer: HTMLElement | null = null;
  private species: HTMLElement | null = null;
  private tabs: HTMLElement | null = null;
  private heads: HTMLElement | null = null;
  private list: HTMLElement | null = null;
  private gap: HTMLElement | null = null;
  private me: HTMLElement | null = null;
  private speciesId: string | null = null;
  private metric: DailyFishMetric = 'length';
  private data: DailyFishRanking | null = null;
  private seq = 0;
  private readonly empty = el(
    'div',
    'rank__empty',
    'Chưa ai câu được loài này hôm nay. Hãy là người đầu tiên!',
  );

  constructor(private readonly options: DailyFishPopupOptions) {}

  /** Phím B: mở, bấm lần nữa thì đóng. */
  toggle(): void {
    if (this.overlay) this.close();
    else this.open();
  }

  open(): void {
    if (this.overlay) return;
    const overlay = el('div', 'shop rank rank--daily');
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-label', 'BXH cá ngày');
    const panel = el('div', 'rank__panel');
    const close = el('button', 'rank__close');
    close.type = 'button';
    close.setAttribute('aria-label', 'Đóng BXH cá ngày');
    close.append(img(CLOSE, ''));
    close.addEventListener('click', () => this.close());

    this.timer = el('div', 'rank__timer', UNKNOWN);
    this.species = el('div', 'rank__species');
    this.tabs = el('div', 'rank__tabs');
    this.heads = el('div', 'rank__heads');
    this.list = el('div', 'rank__list');
    this.gap = el('div', 'rank__gap', '...');
    this.gap.hidden = true;
    this.me = el('div', 'rank__me');
    this.empty.hidden = true;
    panel.append(
      img(RANK('Leaderboard Panel.png'), 'rank__art'),
      this.timer,
      el('h2', 'rank__title', 'BXH CÁ NGÀY'),
      close,
      this.species,
      this.tabs,
      this.heads,
      this.list,
      this.empty,
      this.gap,
      this.me,
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
    this.speciesId ??= this.catalog()[0]?.speciesId ?? null;
    this.data = null;
    this.render();
    void this.reload();
  }

  private catalog(): { speciesId: string; name: string }[] {
    return this.options.services.store.getState().catalog?.fish ?? [];
  }

  private async reload(): Promise<void> {
    const speciesId = this.speciesId;
    if (!speciesId) return;
    const seq = ++this.seq;
    this.data = null;
    this.render();
    try {
      const data = await this.options.services.api.get<DailyFishRanking>(
        `/rankings/daily-fish/${encodeURIComponent(speciesId)}?metric=${this.metric}`,
      );
      if (!this.overlay || seq !== this.seq) return;
      this.data = data;
      this.render();
    } catch (error) {
      if (this.overlay && seq === this.seq) showError(this.options.root, error);
    }
  }

  private render(): void {
    if (!this.overlay || !this.list || !this.gap || !this.me || !this.timer) return;
    if (!this.species || !this.tabs || !this.heads) return;
    const { services, now } = this.options;
    this.timer.textContent = dailyCountdown(this.data?.periodEndsAt ?? null, (now ?? Date.now)());

    this.species.replaceChildren(
      ...this.catalog().map((fish) => {
        const on = fish.speciesId === this.speciesId;
        const chip = el('button', `rank__chip${on ? ' rank__chip--on' : ''}`);
        chip.type = 'button';
        chip.title = fish.name;
        chip.setAttribute('aria-label', fish.name);
        chip.setAttribute('aria-pressed', String(on));
        chip.append(fishImage(fish.speciesId, 'rank__chip-img'));
        chip.addEventListener('click', () => {
          if (this.speciesId === fish.speciesId) return;
          this.speciesId = fish.speciesId;
          void this.reload();
        });
        return chip;
      }),
    );
    this.tabs.replaceChildren(
      ...DAILY_METRICS.map((metric) => {
        const tab = el(
          'button',
          `rank__tab${metric.id === this.metric ? ' rank__tab--on' : ''}`,
          metric.label,
        );
        tab.type = 'button';
        tab.addEventListener('click', () => {
          if (this.metric === metric.id) return;
          this.metric = metric.id;
          void this.reload();
        });
        return tab;
      }),
    );

    const earliest = this.metric === 'earliest';
    this.heads.replaceChildren(
      el('span', 'rank__head-name', 'Tên'),
      el('span', 'rank__head-count', earliest ? 'Giờ câu' : 'Chiều dài'),
      el('span', 'rank__head-reward', earliest ? 'Chiều dài' : 'Giờ câu'),
    );

    const items = this.data?.items ?? [];
    this.list.replaceChildren(...items.map((entry) => this.row(entry, false)));
    const empty = this.data !== null && items.length === 0;
    this.empty.hidden = !empty;
    const me = this.data?.me ?? null;
    // "..." chỉ khi mình ngoài top 10 (còn trong top thì dòng của mình đã hiện ở trên và ghim lại ở cuối).
    this.gap.hidden = !this.data || empty || (me !== null && me.rank !== null);
    const name = services.store.getState().session.profile?.displayName ?? 'Người chơi';
    this.me.replaceChildren(this.row(me, true, name));
  }

  /** Mọi số liệu do BE trả; dòng của mình chưa có dữ liệu thì chỉ có tên, còn lại "?". */
  private row(entry: DailyFishEntry | null, mine: boolean, fallbackName = ''): HTMLElement {
    const line = el('div', `rank__row${mine ? ' rank__row--me' : ''}`);
    const earliest = this.metric === 'earliest';
    const length = entry ? dailyLengthText(entry.lengthTenthCm) : UNKNOWN;
    const time = entry ? dailyTimeText(entry.caughtAt) : UNKNOWN;
    line.append(
      img(RANK('Row 1.png'), 'rank__row-art'),
      rankCell(entry?.rank ?? null),
      img(UI('Avatar.png'), 'rank__avatar'),
      el('span', 'rank__name', entry?.displayName ?? fallbackName),
      el('span', 'rank__count', earliest ? time : length),
      el('span', 'rank__reward', earliest ? length : time),
    );
    return line;
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
