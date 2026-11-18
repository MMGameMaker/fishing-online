// Popup "BXH cá ngày": mỗi loài hai bảng top 10 (dài nhất / câu sớm nhất trong ngày, 0h giờ VN reset), mở từ nút
// bằng phím B (chỗ gắn nút sẽ chọn sau). Dữ liệu GET /rankings/daily-fish/{speciesId}?metric=; chưa có thưởng.
import { UI_DESIGN_HEIGHT, UI_DESIGN_WIDTH } from '../../core/env';
import type { Services } from '../../core/services';
import type { DailyFishEntry, DailyFishMetric, DailyFishRanking } from '../../net/contract';
import { fishImage } from '../fishArt';
import { showError } from '../kit/components';
import { animateIn, animateOut } from '../kit/motion';

const CLOSE = encodeURI('/mini game/Button Close.png');
const PANEL_W = 640;
const PANEL_H = 720;

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
  if (Number.isNaN(date.getTime())) return '?';
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
  if (Number.isNaN(end)) return '?';
  const left = Math.max(0, end - nowMs);
  return `${Math.floor(left / 3_600_000)} giờ ${Math.floor((left % 3_600_000) / 60_000)} phút`;
}

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

export interface DailyFishPopupOptions {
  root: HTMLElement;
  services: Services;
  now?: () => number;
}

export class DailyFishPopup {
  private overlay: HTMLElement | null = null;
  private cleanups: (() => void)[] = [];
  private readonly body = el('div', 'daily__body');
  private speciesId: string | null = null;
  private metric: DailyFishMetric = 'length';
  private data: DailyFishRanking | null = null;
  private seq = 0;

  constructor(private readonly options: DailyFishPopupOptions) {}

  /** Phím B: mở, bấm lần nữa thì đóng. */
  toggle(): void {
    if (this.overlay) this.close();
    else this.open();
  }

  open(): void {
    if (this.overlay) return;
    const overlay = el('div', 'shop friends daily');
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-label', 'BXH cá ngày');
    const panel = el('div', 'player-info__panel friends__panel');
    const close = el('button', 'profile__close player-info__close');
    close.type = 'button';
    close.setAttribute('aria-label', 'Đóng BXH cá ngày');
    const icon = el('img', '');
    icon.src = CLOSE;
    icon.alt = '';
    close.append(icon);
    close.addEventListener('click', () => this.close());
    panel.append(close, el('h2', 'friends__title', 'BXH cá ngày'), this.body);
    overlay.append(panel);
    overlay.style.setProperty(
      '--shop-scale',
      String(Math.min(1.3, (UI_DESIGN_WIDTH * 0.92) / PANEL_W, (UI_DESIGN_HEIGHT * 0.9) / PANEL_H)),
    );
    overlay.addEventListener('pointerdown', (event) => {
      if (event.target === overlay) this.close();
    });
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') this.close();
    };
    window.addEventListener('keydown', onKey);
    this.cleanups.push(() => window.removeEventListener('keydown', onKey));
    this.overlay = overlay;
    this.options.root.append(overlay);
    animateIn(overlay, 'fade');
    animateIn(panel, 'pop');
    this.speciesId ??= this.species()[0]?.speciesId ?? null;
    this.render();
    void this.reload();
  }

  private species(): { speciesId: string; name: string }[] {
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
    if (!this.overlay) return;
    const species = this.species();
    const species_row = el('div', 'daily__species');
    for (const fish of species) {
      const chip = el('button', `daily__chip${fish.speciesId === this.speciesId ? ' daily__chip--on' : ''}`);
      chip.type = 'button';
      chip.title = fish.name;
      chip.setAttribute('aria-label', fish.name);
      chip.setAttribute('aria-pressed', String(fish.speciesId === this.speciesId));
      chip.append(fishImage(fish.speciesId, 'daily__chip-img'));
      chip.addEventListener('click', () => {
        this.speciesId = fish.speciesId;
        void this.reload();
      });
      species_row.append(chip);
    }
    const tabs = el('div', 'daily__tabs');
    for (const metric of DAILY_METRICS) {
      const tab = el(
        'button',
        `profile-dialog__btn ${metric.id === this.metric ? 'profile-dialog__btn--save' : 'profile-dialog__btn--cancel'} friends__btn`,
        metric.label,
      );
      tab.type = 'button';
      tab.addEventListener('click', () => {
        this.metric = metric.id;
        void this.reload();
      });
      tabs.append(tab);
    }

    const nodes: HTMLElement[] = [species_row, tabs];
    const name = species.find((f) => f.speciesId === this.speciesId)?.name ?? '';
    nodes.push(
      el(
        'p',
        'trade__hint',
        `${name}: top 10 người chơi hôm nay. Làm mới lúc 0h giờ Việt Nam` +
          (this.data ? ` (còn ${dailyCountdown(this.data.periodEndsAt, (this.options.now ?? Date.now)())}).` : '.'),
      ),
    );
    if (!this.data) nodes.push(el('p', 'friends__empty', 'Đang tải...'));
    else if (this.data.items.length === 0) {
      nodes.push(el('p', 'friends__empty', 'Chưa ai câu được loài này hôm nay. Hãy là người đầu tiên!'));
    } else {
      for (const entry of this.data.items) nodes.push(this.row(entry, false));
      if (this.data.me && this.data.me.rank === null) {
        nodes.push(el('p', 'friends__empty', '...'), this.row(this.data.me, true));
      }
    }
    this.body.replaceChildren(...nodes);
  }

  private row(entry: DailyFishEntry, beyondTop: boolean): HTMLElement {
    const mine = entry.playerId === this.options.services.store.getState().session.profile?.playerId;
    const row = el('div', `friends__row daily__row${mine || beyondTop ? ' friends__row--request' : ''}`);
    const main = this.data?.metric === 'earliest' ? dailyTimeText(entry.caughtAt) : dailyLengthText(entry.lengthTenthCm);
    const sub = this.data?.metric === 'earliest' ? dailyLengthText(entry.lengthTenthCm) : dailyTimeText(entry.caughtAt);
    row.append(
      el('span', 'daily__rank', entry.rank === null ? '?' : String(entry.rank)),
      el('span', 'daily__name', entry.displayName),
      el('span', 'daily__value', main),
      el('span', 'daily__sub', sub),
    );
    return row;
  }

  close(): void {
    const overlay = this.overlay;
    if (!overlay) return;
    this.overlay = null;
    this.cleanups.forEach((cleanup) => cleanup());
    this.cleanups = [];
    overlay.style.pointerEvents = 'none';
    const panel = overlay.querySelector<HTMLElement>('.friends__panel');
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
