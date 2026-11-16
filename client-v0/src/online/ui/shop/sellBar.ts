// Thanh dưới của chế độ "Chọn cá" dùng chung cho tab Bán cá của cửa hàng và tab Túi cá của Túi đồ:
// số cá + tiền đã chọn, công tắc Chọn tất cả, nút huỷ và nút bán (✓). Dựng bằng class `.shop-sell__*` của shop.css.
import { COIN_ART } from '../coinArt';
import { formatGold } from '../kit/format';
import { selectionSummary, type FishGroup } from './shopModel';

const CLOSE = encodeURI('/mini game/Button Close.png');

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

function button(className: string, label: string, text?: string): HTMLButtonElement {
  const node = el('button', className, text);
  node.type = 'button';
  node.setAttribute('aria-label', label);
  return node;
}

export interface SelectingBarOptions {
  groups: readonly FishGroup[];
  selected: ReadonlySet<string>;
  /** Đang bán dở thì khoá nút ✓. */
  busy: boolean;
  /** Bật hoặc tắt chọn tất cả (`all` là trạng thái hiện tại trước khi bấm). */
  onToggleAll: (all: boolean) => void;
  onCancel: () => void;
  /** `all`: đã chọn hết cả túi nên gửi `{ all: true }` thay vì danh sách catchId. */
  onConfirm: (catchIds: string[], all: boolean) => void;
}

export function selectingBar(options: SelectingBarOptions): HTMLElement {
  const { groups, selected, busy } = options;
  const summary = selectionSummary(groups, selected);
  const bar = el('div', 'shop-sell__bar');

  const info = el('div', 'shop-sell__summary');
  const total = el('div', 'shop-sell__total');
  total.append(el('span', '', String(summary.count)), el('span', 'shop-sell__arrow', '▸'));
  const gold = el('span', 'shop-gold-tag');
  const coin = el('img', 'shop-coin');
  coin.src = COIN_ART;
  coin.alt = '';
  coin.draggable = false;
  gold.append(coin, el('span', '', formatGold(String(summary.gold))));
  total.append(gold);
  info.append(el('div', '', 'Chọn cá để bán.'), total);

  const all = groups.length > 0 && groups.every((group) => selected.has(group.key));
  const toggle = button(`shop-toggle${all ? ' shop-toggle--on' : ''}`, 'Chọn tất cả');
  toggle.setAttribute('aria-pressed', String(all));
  toggle.append(el('span', 'shop-toggle__knob'));
  toggle.addEventListener('click', () => options.onToggleAll(all));
  const toggleRow = el('label', 'shop-sell__all');
  toggleRow.append(el('span', '', 'Chọn tất cả'), toggle);

  const cancel = button('shop-sell__cancel', 'Huỷ bán');
  const closeIcon = el('img', '');
  closeIcon.src = CLOSE;
  closeIcon.alt = '';
  closeIcon.draggable = false;
  cancel.append(closeIcon);
  cancel.addEventListener('click', options.onCancel);
  const confirm = button('shop-sell__confirm', 'Bán cá đã chọn', '✓');
  confirm.disabled = summary.count === 0 || busy;
  confirm.addEventListener('click', () => options.onConfirm(summary.catchIds, all));

  const actions = el('div', 'shop-sell__actions');
  actions.append(toggleRow, cancel, confirm);
  bar.append(info, actions);
  return bar;
}
