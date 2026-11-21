// Tab "Bảng xếp hạng tuần" của popup Bảng xếp hạng (LeaderboardPopup.ts): khung Rank/Leaderboard Panel.png, dòng
// Rank/Row 1.png 1104×90, huy hiệu Rank 1..3.png; dòng cuối là của chính mình, chưa có dữ liệu thì chỉ điền tên, các cột
// còn lại là "?". Mọi số liệu lấy từ BE (GET /rankings/total-catch-weekly, phân trang, tối đa top 50) theo
// doc/GAMEPLAY_SCOPE.md; danh sách cuộn, tới cuối thì tải trang kế.
import type { RankingResponse } from '../../net/contract';
import { COIN_ART } from '../coinArt';
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

export class WeeklyBoardView implements RankView {
  readonly root = el('div', 'rank__view rank__view--weekly');
  private readonly list = el('div', 'rank__list');
  private readonly gap = el('div', 'rank__gap');
  private readonly me = el('div', 'rank__me');
  private readonly empty = el(
    'div',
    'rank__empty',
    'Hãy trở thành người câu cá đầu tiên xuất hiện trên bảng xếp hạng!',
  );
  private data: RankingResponse | null = null;
  private items: RankRow[] = [];
  private nextCursor: string | null = null;
  private loading = false;
  private alive = true;

  constructor(private readonly options: RankViewOptions) {
    const heads = el('div', 'rank__heads');
    heads.append(
      el('span', 'rank__head-name', 'Tên'),
      el('span', 'rank__head-count', 'Cá đã câu'),
      el('span', 'rank__head-reward', 'Thưởng'),
    );
    this.list.addEventListener('scroll', () => {
      this.loadMore();
      this.updateHint();
    });
    this.gap.append(el('span', 'rank__gap-arrow'));
    this.gap.setAttribute('aria-hidden', 'true');
    this.gap.hidden = true;
    this.empty.hidden = true;
    this.root.append(heads, this.list, this.empty, this.gap, this.me);
    this.render();
  }

  activate(): void {
    this.data = null;
    this.render();
    void this.reload();
  }

  timerText(): string {
    return countdownText(this.data?.periodEndsAt ?? null, (this.options.now ?? Date.now)());
  }

  handleEscape(): boolean {
    return false;
  }

  private render(): void {
    const { services } = this.options;
    const name = services.store.getState().session.profile?.displayName ?? 'Người chơi';
    const mine = myRowFrom(this.data, name);
    this.options.onTimer();
    this.list.replaceChildren(...this.items.map((item) => row(item, false)));
    // Bảng chưa có ai (BE đã trả về nhưng không có dòng nào): hiện lời mời ở giữa bảng.
    const empty = this.data !== null && this.items.length === 0;
    this.empty.hidden = !empty;
    this.gap.hidden = !this.data || empty;
    this.me.replaceChildren(row(mine, true));
    requestAnimationFrame(() => this.updateHint());
  }

  private updateHint(): void {
    updateScrollHint(this.list, this.gap, this.nextCursor !== null);
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
      if (!this.alive) return;
      if (cursor === null) this.data = data;
      this.items = [...this.items, ...data.items.map(toRow)];
      this.nextCursor = data.nextCursor;
      this.render();
    } catch (error) {
      if (this.alive) showError(this.options.root, error);
    } finally {
      this.loading = false;
    }
  }

  private loadMore(): void {
    const list = this.list;
    if (!this.nextCursor) return;
    if (list.scrollTop + list.clientHeight >= list.scrollHeight - 40) {
      void this.fetchPage(this.nextCursor);
    }
  }

  destroy(): void {
    this.alive = false;
    this.root.remove();
  }
}
