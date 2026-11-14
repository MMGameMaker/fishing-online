// Popup "CỬA HÀNG" theo ảnh mẫu 2026-11-13, mở từ ô Cửa hàng trong menu (HomeHud).
// 3 tab: Bán cá (túi cá thật từ Server, gộp cùng loài + cùng kích thước), Trang bị (5 cần, giá Server,
// cần đã có thì "Đã có") và Nạp Gold (gói thử, Server bản dev cộng Gold). Ảnh trong
// public/new resources/ui và public/mini game, vẽ cho màn 1920×1080; cả popup thu theo cửa sổ.
import { RARITY_LABELS, formatGold } from '../kit/format';
import { UI_DESIGN_HEIGHT, UI_DESIGN_WIDTH } from '../../core/env';
import type { Services } from '../../core/services';
import type { InventoryResponse, SellFishResponse, ShopBuyResponse } from '../../net/contract';
import { showError, showToast } from '../kit/components';
import { animateIn, animateOut } from '../kit/motion';
import { SLIDER, loadSliderParts } from '../../scenes/lake/TicketDialog';
import { fishImage } from '../fishArt';
import { fishDescription } from './fishInfo';
import {
  SHOP_RARITY_COLORS,
  catchIdsToSell,
  chunkIds,
  groupFish,
  rodOffers,
  selectionSummary,
  type FishGroup,
} from './shopModel';
import { TOP_UP_PACKS, type TopUpResponse } from './topUpPacks';

const UI = (file: string) => encodeURI(`/new resources/ui/${file}`);
const MINI = (file: string) => encodeURI(`/mini game/${file}`);
const COIN = MINI('Coin Small.png');
const CLOSE = MINI('Button Close.png');
const rodIcon = (rodId: string) => `/assets/rods/${rodId}-icon.png`;

const SHOP_W = 1352;
const SHOP_H = 880;
const SELL_W = 1160;
const SELL_H = 620;

export type TabId = 'sell' | 'equip' | 'topup';
const TABS: { id: TabId; label: string; icon: string }[] = [
  { id: 'sell', label: 'Bán cá', icon: UI('Icon Sell.png') },
  { id: 'equip', label: 'Trang bị', icon: UI('Icon Equipment.png') },
  { id: 'topup', label: 'Nạp Gold', icon: UI('Icon Gold.png') },
];

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

function img(src: string, className = ''): HTMLImageElement {
  const node = el('img', className);
  node.src = src;
  node.alt = '';
  node.draggable = false;
  return node;
}

function button(className: string, label: string, text?: string): HTMLButtonElement {
  const node = el('button', className, text);
  node.type = 'button';
  node.setAttribute('aria-label', label);
  return node;
}

/** "12,4cm" như ảnh mẫu. */
const lengthText = (tenthCm: number) => `${(tenthCm / 10).toFixed(1).replace('.', ',')}cm`;

/** Số Gold kèm đồng xu nhỏ. */
function goldTag(amount: number | string, className = 'shop-gold-tag'): HTMLElement {
  const tag = el('span', className);
  tag.append(img(COIN, 'shop-coin'), el('span', '', formatGold(String(amount))));
  return tag;
}

/** Thu khung lớn hơn màn thiết kế 1920×1080 cho vừa; ui-root đã scale cả khung chơi theo cửa sổ. */
function fitScale(target: HTMLElement, w: number, h: number): () => void {
  target.style.setProperty(
    '--shop-scale',
    String(Math.min(1, (UI_DESIGN_WIDTH * 0.96) / w, (UI_DESIGN_HEIGHT * 0.92) / h)),
  );
  return () => {};
}

export interface ShopPopupOptions {
  root: HTMLElement;
  services: Services;
}

export class ShopPopup {
  private overlay: HTMLElement | null = null;
  private goldText: HTMLElement | null = null;
  private tabButtons = new Map<TabId, HTMLButtonElement>();
  private body: HTMLElement | null = null;
  private tab: TabId = 'sell';
  private selecting = false;
  private readonly selected = new Set<string>();
  private busy = false;
  private cleanups: (() => void)[] = [];

  constructor(private readonly options: ShopPopupOptions) {}

  get isOpen(): boolean {
    return this.overlay !== null;
  }

  /** `selecting`: vào thẳng chế độ chọn nhiều của tab Bán cá (nút "Chọn cá" ở Túi đồ). */
  open(tab: TabId = 'sell', options: { selecting?: boolean } = {}): void {
    if (this.overlay) return;
    void loadSliderParts().catch(() => undefined);
    const overlay = el('div', 'shop');
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-label', 'Cửa hàng');
    const panel = el('div', 'shop__panel');
    overlay.append(panel);
    panel.append(img(UI('Shop_Window.png'), 'shop__art'));

    this.goldText = el('span', 'shop__gold-amount');
    const gold = el('div', 'shop__gold');
    gold.append(img(COIN, 'shop__gold-coin'), this.goldText);
    const close = button('shop__close', 'Đóng cửa hàng');
    close.append(img(CLOSE));
    close.addEventListener('click', () => this.close());

    const tabs = el('nav', 'shop__tabs');
    for (const item of TABS) {
      const tabButton = button('shop__tab', item.label);
      tabButton.append(img(item.icon, 'shop__tab-icon'), el('span', '', item.label));
      tabButton.addEventListener('click', () => this.showTab(item.id));
      this.tabButtons.set(item.id, tabButton);
      tabs.append(tabButton);
    }
    this.body = el('div', 'shop__body');
    panel.append(gold, close, tabs, this.body);

    const { store } = this.options.services;
    this.cleanups.push(
      fitScale(overlay, SHOP_W, SHOP_H),
      store.select(
        (s) => s.session.gold,
        () => this.renderGold(),
      ),
      store.select(
        (s) => s.inventory,
        () => this.render(),
      ),
    );
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !document.querySelector('.shop-sell-dialog')) this.close();
    };
    window.addEventListener('keydown', onKey);
    this.cleanups.push(() => window.removeEventListener('keydown', onKey));

    this.overlay = overlay;
    this.options.root.append(overlay);
    animateIn(overlay, 'fade');
    animateIn(panel, 'pop');
    this.renderGold();
    this.showTab(tab);
    if (tab === 'sell' && options.selecting) {
      this.selecting = true;
      this.render();
    }
    void this.reloadInventory();
  }

  close(): void {
    const overlay = this.overlay;
    if (!overlay) return;
    this.overlay = null;
    this.cleanups.forEach((cleanup) => cleanup());
    this.cleanups = [];
    this.tabButtons.clear();
    this.selecting = false;
    this.selected.clear();
    overlay.style.pointerEvents = 'none';
    const panel = overlay.querySelector<HTMLElement>('.shop__panel');
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

  private showTab(tab: TabId): void {
    if (tab !== this.tab) {
      this.selecting = false;
      this.selected.clear();
    }
    this.tab = tab;
    for (const [id, tabButton] of this.tabButtons) {
      tabButton.classList.toggle('shop__tab--active', id === tab);
    }
    this.render();
  }

  private renderGold(): void {
    if (this.goldText) {
      this.goldText.textContent = formatGold(
        this.options.services.store.getState().session.gold ?? '0',
      );
    }
  }

  private render(): void {
    if (!this.body) return;
    const content =
      this.tab === 'sell'
        ? this.sellTab()
        : this.tab === 'equip'
          ? this.equipTab()
          : this.topUpTab();
    this.body.replaceChildren(content);
  }

  // ---------- Bán cá ----------

  private groups(): FishGroup[] {
    const { inventory, catalog } = this.options.services.store.getState();
    return groupFish(inventory?.fish ?? [], catalog);
  }

  private sellTab(): HTMLElement {
    const groups = this.groups();
    // Ô đã bán hết thì bỏ khỏi danh sách chọn.
    for (const key of [...this.selected]) {
      if (!groups.some((group) => group.key === key)) this.selected.delete(key);
    }
    const wrap = el('div', 'shop-sell');
    const grid = el('div', 'shop-sell__grid');
    if (!this.options.services.store.getState().inventory) {
      grid.append(el('p', 'shop-empty', 'Đang tải túi cá...'));
    } else if (groups.length === 0) {
      grid.append(el('p', 'shop-empty', 'Túi chưa có cá nào.'));
    }
    for (const group of groups) grid.append(this.fishCell(group));
    wrap.append(grid, this.sellBar(groups));
    return wrap;
  }

  private fishCell(group: FishGroup): HTMLElement {
    const checked = this.selected.has(group.key);
    const cell = button(
      `shop-fish${checked ? ' shop-fish--checked' : ''}`,
      `${group.name}, ${lengthText(group.lengthTenthCm)}, ${group.catchIds.length} con`,
    );
    const slot = el('span', 'shop-fish__slot');
    slot.style.setProperty('--rarity', SHOP_RARITY_COLORS[group.rarity]);
    slot.append(
      fishImage(group.speciesId, 'shop-fish__icon'),
      el('span', 'shop-fish__count', String(group.catchIds.length)),
      el('span', 'shop-fish__length', lengthText(group.lengthTenthCm)),
    );
    if (checked) slot.append(el('span', 'shop-fish__check', '✓'));
    const info = el('span', 'shop-fish__info');
    info.append(el('span', 'shop-fish__name', group.name), goldTag(group.unitGold));
    cell.append(slot, info);
    cell.addEventListener('click', () => {
      if (!this.selecting) {
        void this.openSellDialog(group);
        return;
      }
      if (checked) this.selected.delete(group.key);
      else this.selected.add(group.key);
      this.render();
    });
    return cell;
  }

  private sellBar(groups: FishGroup[]): HTMLElement {
    const bar = el('div', 'shop-sell__bar');
    if (!this.selecting) {
      const choose = button('shop-small shop-sell__choose', 'Chọn cá', 'Chọn cá');
      choose.disabled = groups.length === 0;
      choose.addEventListener('click', () => {
        this.selecting = true;
        this.render();
      });
      bar.append(el('span', ''), choose);
      return bar;
    }
    const summary = selectionSummary(groups, this.selected);
    const info = el('div', 'shop-sell__summary');
    const total = el('div', 'shop-sell__total');
    total.append(el('span', '', String(summary.count)), el('span', 'shop-sell__arrow', '▸'));
    total.append(goldTag(summary.gold));
    info.append(el('div', '', 'Chọn cá để bán.'), total);

    const all = groups.length > 0 && groups.every((group) => this.selected.has(group.key));
    const toggle = button(`shop-toggle${all ? ' shop-toggle--on' : ''}`, 'Chọn tất cả');
    toggle.setAttribute('aria-pressed', String(all));
    toggle.append(el('span', 'shop-toggle__knob'));
    toggle.addEventListener('click', () => {
      if (all) this.selected.clear();
      else groups.forEach((group) => this.selected.add(group.key));
      this.render();
    });
    const toggleRow = el('label', 'shop-sell__all');
    toggleRow.append(el('span', '', 'Chọn tất cả'), toggle);

    const cancel = button('shop-sell__cancel', 'Huỷ bán');
    cancel.append(img(CLOSE));
    cancel.addEventListener('click', () => {
      this.selecting = false;
      this.selected.clear();
      this.render();
    });
    const confirm = button('shop-sell__confirm', 'Bán cá đã chọn', '✓');
    confirm.disabled = summary.count === 0 || this.busy;
    confirm.addEventListener('click', () => void this.sell(summary.catchIds, all));

    const actions = el('div', 'shop-sell__actions');
    actions.append(toggleRow, cancel, confirm);
    bar.append(info, actions);
    return bar;
  }

  /** Bán luôn không hỏi lại (người dùng chốt). Chọn hết cả túi thì gửi `all`, còn lại gửi theo lô 200. */
  private async sell(catchIds: string[], all: boolean): Promise<boolean> {
    if (this.busy || catchIds.length === 0) return false;
    this.busy = true;
    const { api, store } = this.options.services;
    let sold = 0;
    let earned = 0;
    try {
      const batches = all ? [null] : chunkIds(catchIds);
      for (const ids of batches) {
        const result = await api.post<SellFishResponse>(
          '/shop/sell-fish',
          ids ? { catchIds: ids } : { all: true },
        );
        sold += result.soldCount;
        earned += Number(result.goldEarned);
        store.dispatch({ type: 'session/gold', payload: result.gold });
      }
      showToast(this.options.root, `Đã bán ${sold} cá, nhận ${formatGold(String(earned))} Gold.`);
      this.selecting = false;
      this.selected.clear();
      return true;
    } catch (error) {
      showError(this.options.root, error);
      return false;
    } finally {
      this.busy = false;
      await this.reloadInventory();
    }
  }

  /** Popup chi tiết một ô cá: chọn số lượng rồi bấm Bán (ảnh Sell_Popup.png). */
  private openSellDialog(group: FishGroup): Promise<void> {
    const max = group.catchIds.length;
    let quantity = 1;
    return new Promise((resolve) => {
      const overlay = el('div', 'shop-sell-dialog');
      overlay.setAttribute('role', 'dialog');
      overlay.setAttribute('aria-modal', 'true');
      const panel = el('div', 'shop-sell-dialog__panel');
      overlay.append(panel);
      const unfit = fitScale(overlay, SELL_W, SELL_H);
      let closed = false;
      const close = () => {
        if (closed) return;
        closed = true;
        unfit();
        window.removeEventListener('keydown', onKey);
        overlay.style.pointerEvents = 'none';
        void Promise.all([animateOut(panel, 'pop'), animateOut(overlay, 'fade')]).then(() => {
          overlay.remove();
          resolve();
        });
      };
      const onKey = (event: KeyboardEvent) => {
        if (event.key === 'Escape') close();
      };
      window.addEventListener('keydown', onKey);
      overlay.addEventListener('pointerdown', (event) => {
        if (event.target === overlay) close();
      });

      const rarity = el('div', 'shop-sell-dialog__rarity', RARITY_LABELS[group.rarity]);
      rarity.style.color = SHOP_RARITY_COLORS[group.rarity];
      const desc = el('p', 'shop-sell-dialog__desc', `Mô tả: ${fishDescription(group.speciesId)}`);
      const meta = el(
        'div',
        'shop-sell-dialog__meta',
        `Kích thước: ${lengthText(group.lengthTenthCm)} · Có: ${max} con`,
      );

      const price = el('div', 'shop-sell-dialog__price');
      const units = el('span', '');
      const total = el('span', '');
      price.append(units, img(COIN, 'shop-coin'), total);

      const slider = el('div', 'shop-slider');
      const knob = el('div', 'shop-slider__knob');
      slider.append(knob);
      void loadSliderParts()
        .then(({ track, knob: knobSrc }) => {
          slider.style.backgroundImage = `url("${track}")`;
          knob.style.backgroundImage = `url("${knobSrc}")`;
        })
        .catch((error: unknown) => console.warn(error));

      const round = (text: string, delta: number, aria: string, side: string) => {
        const node = button(`shop-round shop-round--${side}`, aria, text);
        node.addEventListener('click', () => set(quantity + delta));
        return node;
      };
      const minus = round('−', -1, 'Bớt 1', 'minus');
      const plus = round('+', 1, 'Thêm 1', 'plus');
      const amount = el('div', 'shop-amount');
      const steps: [string, () => number][] = [
        ['Ít nhất', () => 1],
        ['Bớt 10', () => quantity - 10],
        ['Thêm 10', () => quantity + 10],
        ['Nhiều nhất', () => max],
      ];
      for (const [aria, next] of steps) {
        const zone = button('shop-amount__zone', aria);
        zone.addEventListener('click', () => set(next()));
        amount.append(zone);
      }

      const fishBox = el('div', 'shop-sell-dialog__fish');
      fishBox.style.setProperty('--rarity', SHOP_RARITY_COLORS[group.rarity]);
      fishBox.append(fishImage(group.speciesId));
      const sellButton = button('shop-sell-dialog__sell', 'Bán', 'Bán');
      sellButton.addEventListener('click', () => {
        sellButton.disabled = true;
        void this.sell(catchIdsToSell(group, quantity), false).then((ok) => {
          if (ok) close();
          else sellButton.disabled = false;
        });
      });
      const closeButton = button('shop-sell-dialog__close', 'Đóng');
      closeButton.append(img(CLOSE));
      closeButton.addEventListener('click', close);

      panel.append(
        img(UI('Sell_Popup.png'), 'shop__art'),
        el('h2', 'shop-sell-dialog__name', group.name),
        rarity,
        meta,
        desc,
        price,
        minus,
        slider,
        plus,
        amount,
        fishBox,
        sellButton,
        closeButton,
      );

      function set(next: number): void {
        quantity = Math.max(1, Math.min(max, Math.round(next)));
        units.textContent = String(quantity);
        total.textContent = formatGold(String(quantity * group.unitGold));
        const ratio = max > 1 ? (quantity - 1) / (max - 1) : 0;
        knob.style.left = `${ratio * (SLIDER.w - SLIDER.knobW)}px`;
        minus.disabled = quantity <= 1;
        plus.disabled = quantity >= max;
      }
      const unitsAt = (clientX: number) => {
        const rect = slider.getBoundingClientRect();
        const knobW = (rect.width * SLIDER.knobW) / SLIDER.w;
        const ratio = (clientX - rect.left - knobW / 2) / Math.max(1, rect.width - knobW);
        return 1 + Math.max(0, Math.min(1, ratio)) * (max - 1);
      };
      slider.addEventListener('pointerdown', (event) => {
        slider.setPointerCapture(event.pointerId);
        set(unitsAt(event.clientX));
      });
      slider.addEventListener('pointermove', (event) => {
        if (slider.hasPointerCapture(event.pointerId)) set(unitsAt(event.clientX));
      });

      set(1);
      this.options.root.append(overlay);
      animateIn(overlay, 'fade');
      animateIn(panel, 'pop');
    });
  }

  // ---------- Trang bị ----------

  private equipTab(): HTMLElement {
    const { catalog, inventory } = this.options.services.store.getState();
    const grid = el('div', 'shop-cards shop-cards--rods');
    for (const rod of rodOffers(catalog, inventory?.rods ?? [])) {
      const card = el('div', 'shop-card shop-card--rod');
      card.title = rod.name;
      const slot = el('span', 'shop-card__slot');
      slot.append(img(rodIcon(rod.rodId), 'shop-card__rod'));
      const buy = button('shop-small shop-card__price', rod.owned ? 'Đã có' : `Mua ${rod.name}`);
      if (rod.owned || !rod.offerId) {
        buy.textContent = 'Đã có';
        buy.disabled = true;
      } else {
        buy.append(goldTag(rod.priceGold, 'shop-gold-tag shop-gold-tag--button'));
        const offerId = rod.offerId;
        buy.addEventListener('click', () => void this.buyRod(offerId, rod.name));
      }
      card.append(slot, el('span', 'shop-card__name', rod.name), buy);
      grid.append(card);
    }
    if (!catalog) grid.append(el('p', 'shop-empty', 'Đang tải...'));
    return grid;
  }

  private async buyRod(offerId: string, name: string): Promise<void> {
    if (this.busy) return;
    this.busy = true;
    const { api, store } = this.options.services;
    try {
      const result = await api.post<ShopBuyResponse>('/shop/buy', { offerId, quantity: 1 });
      store.dispatch({ type: 'session/gold', payload: result.gold });
      store.dispatch({ type: 'inventory/set', payload: result.inventory });
      showToast(this.options.root, `Đã mua ${name}.`);
    } catch (error) {
      showError(this.options.root, error);
    } finally {
      this.busy = false;
    }
  }

  // ---------- Nạp Gold ----------

  private topUpTab(): HTMLElement {
    const grid = el('div', 'shop-cards shop-cards--topup');
    for (const pack of TOP_UP_PACKS) {
      const card = el('div', 'shop-card shop-card--topup');
      const amount = el('span', 'shop-card__amount');
      amount.append(goldTag(pack.gold));
      const buy = button('shop-small shop-card__price', `Nạp ${pack.gold} Gold`, pack.priceLabel);
      buy.addEventListener('click', () => void this.topUp(pack.packId));
      card.append(img(UI('Icon Gold.png'), 'shop-card__gold'), amount, buy);
      grid.append(card);
    }
    return grid;
  }

  private async topUp(packId: string): Promise<void> {
    if (this.busy) return;
    this.busy = true;
    const { api, store } = this.options.services;
    try {
      const result = await api.post<TopUpResponse>('/dev/topup', { packId });
      store.dispatch({ type: 'session/gold', payload: result.gold });
      showToast(this.options.root, `+${formatGold(result.goldAdded)} Gold`);
    } catch (error) {
      showError(this.options.root, error);
    } finally {
      this.busy = false;
    }
  }

  private async reloadInventory(): Promise<void> {
    const { api, store } = this.options.services;
    try {
      const inventory = await api.get<InventoryResponse>('/me/inventory');
      store.dispatch({ type: 'inventory/set', payload: inventory });
      store.dispatch({ type: 'session/gold', payload: inventory.gold });
    } catch (error) {
      showError(this.options.root, error);
    }
  }
}
