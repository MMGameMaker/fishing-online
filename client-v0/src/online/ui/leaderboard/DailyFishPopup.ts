// Tab "Bảng xếp hạng cá" (BXH cá ngày) của popup Bảng xếp hạng (LeaderboardPopup.ts): cùng khung Leaderboard Panel, dòng
// Row 1, huy hiệu Rank 1..3, dòng của mình ghim ở cuối; thêm thanh chọn loài cá (thanh Secondary L bấm xổ bảng Panel Art,
// hiện hình và tên loài đang chọn; mặc định loài đầu tiên) và hai tab tiêu chí (dài nhất / câu sớm nhất), cùng một hàng.
// Dữ liệu GET /rankings/daily-fish/{speciesId}?metric=; 0h giờ VN reset, chưa có thưởng.
import type { DailyFishEntry, DailyFishMetric, DailyFishRanking } from '../../net/contract';
import { fishImage } from '../fishArt';
import { showError } from '../kit/components';
import { animateIn, animateOut } from '../kit/motion';
import { UNKNOWN } from './leaderboardModel';
import {
  RANK,
  UI,
  el,
  img,
  rankCell,
  updateScrollHint,
  type RankView,
  type RankViewOptions,
} from './rankKit';

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

export class DailyFishView implements RankView {
  readonly root = el('div', 'rank__view rank__view--daily');
  private readonly species = el('div', 'rank__species');
  private readonly tabs = el('div', 'rank__tabs');
  private readonly heads = el('div', 'rank__heads');
  private readonly list = el('div', 'rank__list');
  private readonly gap = el('div', 'rank__gap');
  private readonly me = el('div', 'rank__me');
  private readonly empty = el(
    'div',
    'rank__empty',
    'Chưa ai câu được loài này hôm nay. Hãy là người đầu tiên!',
  );
  /** Bảng xổ chọn loài và trạng thái mở của nó. */
  private menu: HTMLElement | null = null;
  private pickerOpen = false;
  private speciesId: string | null = null;
  private metric: DailyFishMetric = 'length';
  private data: DailyFishRanking | null = null;
  private seq = 0;
  private alive = true;
  private readonly onOutside = (event: PointerEvent): void => {
    if (this.pickerOpen && !(event.target as HTMLElement | null)?.closest('.rank__picker')) {
      this.closePicker();
    }
  };

  constructor(private readonly options: RankViewOptions) {
    // Thanh chọn loài và hai tab tiêu chí nằm chung một hàng, cao bằng nhau.
    const bar = el('div', 'rank__bar');
    bar.append(this.species, this.tabs);
    this.list.addEventListener('scroll', () => this.updateHint());
    this.gap.append(el('span', 'rank__gap-arrow'));
    this.gap.setAttribute('aria-hidden', 'true');
    this.gap.hidden = true;
    this.empty.hidden = true;
    this.root.append(bar, this.heads, this.list, this.empty, this.gap, this.me);
    // Bấm ra ngoài bảng chọn loài thì đóng bảng.
    document.addEventListener('pointerdown', this.onOutside, true);
    this.render();
  }

  activate(): void {
    this.pickerOpen = false;
    this.speciesId ??= this.catalog()[0]?.speciesId ?? null;
    this.data = null;
    this.render();
    void this.reload();
  }

  timerText(): string {
    return dailyCountdown(this.data?.periodEndsAt ?? null, (this.options.now ?? Date.now)());
  }

  /** Esc đóng bảng chọn loài trước, bấm lần nữa mới đóng popup. */
  handleEscape(): boolean {
    if (!this.pickerOpen) return false;
    this.closePicker();
    return true;
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
      if (!this.alive || seq !== this.seq) return;
      this.data = data;
      this.render();
    } catch (error) {
      if (this.alive && seq === this.seq) showError(this.options.root, error);
    }
  }

  private render(): void {
    const { services } = this.options;
    this.options.onTimer();
    this.renderPicker(this.species);
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
    // Mũi tên chỉ ẩn hẳn khi chưa có dữ liệu hoặc bảng trống; còn lại mờ dần/hiện lại theo vị trí cuộn (updateHint).
    this.gap.hidden = !this.data || empty;
    const name = services.store.getState().session.profile?.displayName ?? 'Người chơi';
    this.me.replaceChildren(this.row(me, true, name));
    requestAnimationFrame(() => this.updateHint());
  }

  private updateHint(): void {
    updateScrollHint(this.list, this.gap);
  }

  /** Thanh chọn loài: loài đang chọn (hình + tên) trên thanh, bấm xổ bảng liệt kê mọi loài. */
  private renderPicker(host: HTMLElement): void {
    const fishes = this.catalog();
    // Chưa chọn (hoặc loài không còn trong danh mục) thì lấy loài đầu tiên làm mặc định.
    const current = fishes.find((f) => f.speciesId === this.speciesId) ?? fishes[0];
    if (!current) {
      host.replaceChildren();
      this.menu = null;
      return;
    }
    this.speciesId = current.speciesId;
    const keepScroll = this.menu?.scrollTop ?? 0;

    const wrap = el('div', 'rank__picker');
    const bar = el('button', `rank__pick${this.pickerOpen ? ' rank__pick--open' : ''}`);
    bar.type = 'button';
    bar.setAttribute('aria-haspopup', 'listbox');
    bar.setAttribute('aria-expanded', String(this.pickerOpen));
    bar.setAttribute('aria-label', `Loài cá: ${current.name}`);
    bar.append(
      fishImage(current.speciesId, 'rank__pick-img'),
      el('span', 'rank__pick-name', current.name),
      el('span', 'rank__pick-caret'),
    );
    bar.addEventListener('click', () => (this.pickerOpen ? this.closePicker() : this.openPicker()));

    const menu = el('div', 'rank__menu');
    menu.setAttribute('role', 'listbox');
    menu.hidden = !this.pickerOpen;
    for (const fish of fishes) {
      const on = fish.speciesId === current.speciesId;
      const option = el('button', `rank__option${on ? ' rank__option--on' : ''}`);
      option.type = 'button';
      option.setAttribute('role', 'option');
      option.setAttribute('aria-selected', String(on));
      option.append(
        fishImage(fish.speciesId, 'rank__option-img'),
        el('span', 'rank__option-name', fish.name),
      );
      option.addEventListener('click', () => this.pickSpecies(fish.speciesId));
      menu.append(option);
    }
    wrap.append(bar, menu);
    host.replaceChildren(wrap);
    this.menu = menu;
    menu.scrollTop = keepScroll;
  }

  private openPicker(): void {
    const menu = this.menu;
    if (!menu || this.pickerOpen) return;
    this.pickerOpen = true;
    this.species.querySelector('.rank__pick')?.classList.add('rank__pick--open');
    this.species.querySelector('.rank__pick')?.setAttribute('aria-expanded', 'true');
    menu.hidden = false;
    animateIn(menu, 'fade');
    const on = menu.querySelector<HTMLElement>('.rank__option--on');
    // Đưa loài đang chọn vào giữa khung, làm tròn theo dòng để không lộ nửa dòng.
    if (on) {
      const rowHeight = on.offsetHeight || 60;
      menu.scrollTop = Math.round((on.offsetTop - (menu.clientHeight - rowHeight) / 2) / rowHeight) * rowHeight;
    }
  }

  private closePicker(): void {
    const menu = this.menu;
    if (!this.pickerOpen) return;
    this.pickerOpen = false;
    this.species.querySelector('.rank__pick')?.classList.remove('rank__pick--open');
    this.species.querySelector('.rank__pick')?.setAttribute('aria-expanded', 'false');
    if (!menu) return;
    void animateOut(menu, 'fade').then(() => {
      if (!this.pickerOpen) menu.hidden = true;
    });
  }

  private pickSpecies(speciesId: string): void {
    this.closePicker();
    if (this.speciesId === speciesId) return;
    this.speciesId = speciesId;
    void this.reload();
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

  destroy(): void {
    this.alive = false;
    document.removeEventListener('pointerdown', this.onOutside, true);
    this.root.remove();
  }
}
