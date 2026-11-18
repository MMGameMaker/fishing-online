// Giao diện đổi cá giữa bạn bè (popup Bạn bè): ô chọn cá để đề nghị và dòng đề nghị đang chờ.
// Luật hiển thị theo Server: mỗi bên 1–5 con, chỉ cá lấy cá (không Gold), cá nhận về không tính thành tích.
import type { Services } from '../../core/services';
import {
  TRADE_MAX_FISH,
  type FriendEntry,
  type TradeEntry,
  type TradeFish,
} from '../../net/contract';
import { fishImage } from '../fishArt';
import { showError, showToast } from '../kit/components';
import {
  acceptTrade,
  cancelTrade,
  createTrade,
  declineTrade,
  loadFriendFish,
  reloadInventory,
  reloadTrades,
} from './friendActions';

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

const lengthText = (tenthCm: number) => `${(tenthCm / 10).toFixed(1).replace('.', ',')}cm`;

function speciesName(services: Services, speciesId: string): string {
  return (
    services.store.getState().catalog?.fish.find((f) => f.speciesId === speciesId)?.name ??
    speciesId
  );
}

function button(text: string, primary: boolean, onClick: () => void, disabled = false) {
  const node = el(
    'button',
    `profile-dialog__btn ${primary ? 'profile-dialog__btn--save' : 'profile-dialog__btn--cancel'} friends__btn`,
    text,
  );
  node.type = 'button';
  node.disabled = disabled;
  node.addEventListener('click', onClick);
  return node;
}

/** Một con cá: hình, tên và chiều dài; có thể bấm chọn khi truyền `onToggle`. */
export function fishChip(
  services: Services,
  fish: TradeFish,
  selected = false,
  onToggle?: () => void,
): HTMLElement {
  const chip = el('button', `trade__fish${selected ? ' trade__fish--on' : ''}`);
  chip.type = 'button';
  chip.setAttribute('aria-pressed', String(selected));
  if (!onToggle) chip.disabled = true;
  else chip.addEventListener('click', onToggle);
  const name = speciesName(services, fish.speciesId);
  chip.title = `${name} · ${lengthText(fish.lengthTenthCm)}`;
  chip.append(
    fishImage(fish.speciesId, 'trade__fish-img'),
    el('span', 'trade__fish-name', name),
    el('span', 'trade__fish-len', lengthText(fish.lengthTenthCm)),
  );
  return chip;
}

function fishList(services: Services, fish: TradeFish[]): HTMLElement {
  const list = el('div', 'trade__fish-list');
  list.append(...fish.map((f) => fishChip(services, f)));
  return list;
}

export interface TradeRowOptions {
  services: Services;
  root: HTMLElement;
  /** Gọi sau khi thao tác xong (thành công hoặc lỗi) để popup vẽ lại. */
  refresh: () => void;
  busy: Set<string>;
}

/** Đề nghị đang chờ. `incoming`: người kia đưa `offer`, mình đưa `request`; ngược lại với đề nghị mình gửi. */
export function tradeRow(trade: TradeEntry, incoming: boolean, options: TradeRowOptions): HTMLElement {
  const { services, root, refresh, busy } = options;
  const row = el('div', `friends__row trade__row${incoming ? ' friends__row--request' : ''}`);
  const body = el('div', 'trade__body');
  const other = incoming ? trade.fromName : trade.toName;
  body.append(
    el('div', 'friends__name', incoming ? `${other} muốn đổi cá với bạn` : `Bạn đề nghị đổi với ${other}`),
    el('div', 'trade__caption', incoming ? `${other} đưa` : 'Bạn đưa'),
    fishList(services, trade.offer),
    el('div', 'trade__caption', incoming ? 'Đổi lấy cá của bạn' : `Đổi lấy cá của ${other}`),
    fishList(services, trade.request),
  );

  const run = async (action: () => Promise<void>, done?: string): Promise<void> => {
    if (busy.has(trade.tradeId)) return;
    busy.add(trade.tradeId);
    refresh();
    try {
      await action();
      if (done) showToast(root, done);
    } catch (error) {
      showError(root, error);
      // Đề nghị có thể đã hết hiệu lực (cá đã bán/đổi, người kia rút lại): đồng bộ lại cả danh sách.
      void reloadTrades(services).catch(() => undefined);
    } finally {
      busy.delete(trade.tradeId);
      refresh();
    }
  };

  const actions = el('div', 'friends__actions trade__actions');
  const disabled = busy.has(trade.tradeId);
  if (incoming) {
    actions.append(
      button('Đồng ý', true, () => void run(() => acceptTrade(services, trade.tradeId), 'Đã đổi cá xong.'), disabled),
      button('Từ chối', false, () => void run(() => declineTrade(services, trade.tradeId)), disabled),
    );
  } else {
    actions.append(
      button('Rút lại', false, () => void run(() => cancelTrade(services, trade.tradeId)), disabled),
    );
  }
  row.append(body, actions);
  return row;
}

export interface TradeComposerOptions {
  services: Services;
  root: HTMLElement;
  friend: FriendEntry;
  onBack: () => void;
}

/** Màn chọn cá đổi: cá của mình bên trái, cá của bạn bên phải; "Gửi đề nghị" khi mỗi bên có 1–5 con. */
export class TradeComposer {
  readonly element = el('div', 'trade');
  private mine = new Set<string>();
  private theirs = new Set<string>();
  private theirFish: TradeFish[] | null = null;
  private busy = false;
  private destroyed = false;

  constructor(private readonly options: TradeComposerOptions) {
    this.render();
    const { services, friend, root } = options;
    void reloadInventory(services).catch((error: unknown) => showError(root, error));
    loadFriendFish(services, friend.playerId)
      .then((response) => {
        if (this.destroyed) return;
        this.theirFish = response.fish;
        this.render();
      })
      .catch((error: unknown) => {
        if (this.destroyed) return;
        this.theirFish = [];
        this.render();
        showError(root, error);
      });
  }

  /** Popup gọi khi store đổi (túi cá tải về, đổi xong...). */
  render(): void {
    const { services, friend } = this.options;
    const inventory = services.store.getState().inventory;
    const myFish: TradeFish[] = (inventory?.fish ?? []).map((f) => ({
      catchId: f.catchId,
      speciesId: f.speciesId,
      lengthTenthCm: f.lengthTenthCm,
    }));
    // Con đã bán/đổi trong lúc đang chọn thì bỏ khỏi lựa chọn.
    this.mine = new Set([...this.mine].filter((id) => myFish.some((f) => f.catchId === id)));

    const head = el('div', 'trade__head');
    head.append(
      button('‹ Quay lại', false, () => this.options.onBack()),
      el('h3', 'friends__section trade__title', `Đổi cá với ${friend.displayName}`),
    );

    const ready =
      this.mine.size >= 1 &&
      this.mine.size <= TRADE_MAX_FISH &&
      this.theirs.size >= 1 &&
      this.theirs.size <= TRADE_MAX_FISH;
    const send = button(this.busy ? 'Đang gửi...' : 'Gửi đề nghị', true, () => void this.send(), !ready || this.busy);

    this.element.replaceChildren(
      head,
      el(
        'p',
        'trade__hint',
        `Mỗi bên tối đa ${TRADE_MAX_FISH} con, chỉ đổi cá lấy cá (không Gold). Cá nhận về không tính vào Sổ tay, kỷ lục hay nhiệm vụ.`,
      ),
      this.column(`Cá của bạn (${this.mine.size}/${TRADE_MAX_FISH})`, myFish, this.mine, inventory === null, 'Túi cá trống.'),
      this.column(
        `Cá của ${friend.displayName} (${this.theirs.size}/${TRADE_MAX_FISH})`,
        this.theirFish ?? [],
        this.theirs,
        this.theirFish === null,
        `${friend.displayName} chưa có cá trong túi.`,
      ),
      send,
    );
  }

  private column(
    title: string,
    fish: TradeFish[],
    selected: Set<string>,
    loading: boolean,
    empty: string,
  ): HTMLElement {
    const column = el('div', 'trade__column');
    column.append(el('h4', 'trade__caption', title));
    if (loading) column.append(el('p', 'friends__empty', 'Đang tải...'));
    else if (fish.length === 0) column.append(el('p', 'friends__empty', empty));
    else {
      const grid = el('div', 'trade__fish-list');
      for (const f of fish) {
        grid.append(
          fishChip(this.options.services, f, selected.has(f.catchId), () => {
            if (selected.has(f.catchId)) selected.delete(f.catchId);
            else if (selected.size < TRADE_MAX_FISH) selected.add(f.catchId);
            this.render();
          }),
        );
      }
      column.append(grid);
    }
    return column;
  }

  private async send(): Promise<void> {
    if (this.busy) return;
    const { services, friend, root, onBack } = this.options;
    this.busy = true;
    this.render();
    try {
      await createTrade(services, {
        toPlayerId: friend.playerId,
        offerCatchIds: [...this.mine],
        requestCatchIds: [...this.theirs],
      });
      showToast(root, `Đã gửi đề nghị đổi cá cho ${friend.displayName}.`);
      onBack();
    } catch (error) {
      showError(root, error);
    } finally {
      this.busy = false;
      if (!this.destroyed) this.render();
    }
  }

  destroy(): void {
    this.destroyed = true;
  }
}
