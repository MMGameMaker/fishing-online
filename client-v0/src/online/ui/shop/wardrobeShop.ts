// Tab "Trang phục" của Cửa hàng (yêu cầu 2026-11-25): mũ, áo, quần lẻ và nguyên bộ, 300 Gold mỗi món. Bốn nhóm Mũ / Áo / Quần / Nguyên bộ; mỗi thẻ cho xem thử món
// trên nhân vật đang chọn, nút giá (chưa có), Trang bị (đã có) hoặc Tháo (đang mang). Dữ liệu từ GET /wardrobe; mua/mặc do ShopPopup gọi Server.
import type { WardrobeItemView, WardrobeResponse, WardrobeSlot } from '../../net/contract';
import { COIN_ART } from '../coinArt';
import { formatGold } from '../kit/format';
import { outfitImage } from '../skin/skinArt';

export const WARDROBE_SLOTS: { id: WardrobeSlot; label: string }[] = [
  { id: 'hat', label: 'Mũ' },
  { id: 'top', label: 'Áo' },
  { id: 'legs', label: 'Quần' },
  { id: 'set', label: 'Nguyên bộ' },
];

export interface WardrobeTabContext {
  data: WardrobeResponse | null;
  slot: WardrobeSlot;
  /** Skin đang dùng, để xem thử đồ trên đúng nhân vật. */
  skinId: string;
  busy: boolean;
  onSlot: (slot: WardrobeSlot) => void;
  onBuy: (item: WardrobeItemView) => void;
  /** Trang bị món chưa mang, tháo món đang mang. */
  onToggle: (item: WardrobeItemView) => void;
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

const equippedIdOf = (data: WardrobeResponse, slot: WardrobeSlot): string | null =>
  slot === 'hat'
    ? data.equipped.hatId
    : slot === 'top'
      ? data.equipped.topId
      : slot === 'legs'
        ? data.equipped.legsId
        : (data.equipped.setId ?? null);

export function renderWardrobeTab(ctx: WardrobeTabContext): HTMLElement {
  const wrap = el('div', 'shop-wardrobe');

  const bar = el('div', 'shop-wardrobe__bar');
  for (const slot of WARDROBE_SLOTS) {
    const count = ctx.data?.items.filter((item) => item.slot === slot.id).length;
    const tab = el(
      'button',
      `shop-small shop-wardrobe__slot${slot.id === ctx.slot ? ' shop-wardrobe__slot--on' : ''}`,
      count === undefined ? slot.label : `${slot.label} (${count})`,
    );
    tab.type = 'button';
    tab.addEventListener('click', () => ctx.onSlot(slot.id));
    bar.append(tab);
  }
  wrap.append(bar);

  const grid = el('div', 'shop-cards shop-cards--rods shop-cards--wardrobe');
  if (!ctx.data) {
    grid.append(el('p', 'shop-empty', 'Đang tải...'));
    wrap.append(grid);
    return wrap;
  }
  const equipped = equippedIdOf(ctx.data, ctx.slot);
  for (const item of ctx.data.items.filter((entry) => entry.slot === ctx.slot)) {
    const worn = item.itemId === equipped;
    const card = el('div', 'shop-card shop-card--rod shop-card--wardrobe');
    card.title = item.name;
    const slot = el('span', 'shop-card__slot');
    slot.append(outfitImage(ctx.skinId, [item.itemId], 2, 'shop-card__outfit'));
    const action = el('button', 'shop-small shop-card__price');
    action.type = 'button';
    action.disabled = ctx.busy;
    if (!item.owned) {
      // Chỉ hiện giá (đồng xu + số), không chữ "Mua" (yêu cầu 2026-11-25).
      action.setAttribute('aria-label', `Mua ${item.name}`);
      const tag = el('span', 'shop-gold-tag shop-gold-tag--button');
      const coin = el('img', 'shop-coin');
      coin.src = COIN_ART;
      coin.alt = '';
      tag.append(coin, el('span', '', formatGold(String(item.priceGold))));
      action.append(tag);
      action.addEventListener('click', () => ctx.onBuy(item));
    } else {
      action.textContent = worn ? 'Tháo' : 'Trang bị';
      action.addEventListener('click', () => ctx.onToggle(item));
    }
    card.append(slot, el('span', 'shop-card__name', item.name), action);
    grid.append(card);
  }
  wrap.append(grid);
  return wrap;
}
