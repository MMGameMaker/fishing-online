// Popup "Túi đồ" theo 2 ảnh mẫu 2026-11-13, mở từ ô Túi đồ trong menu (HomeHud). Khung sổ tay
// (Notebook.png) với 2 tab: Đồ câu (nhân vật + chỉ số tổng, thẻ các cần đang sở hữu, bấm thẻ để
// trang bị) và Túi cá (cá trong túi, gộp cùng loài + cùng kích thước; "Chọn cá" mở tab Bán cá của
// cửa hàng ở chế độ chọn nhiều). Dữ liệu thật từ Server: /me/inventory, /me/progress, catalog.
import type { RodConfig } from '../../core/gameplayConfig';
import type { Services } from '../../core/services';
import type { InventoryResponse, ProgressResponse, Stats } from '../../net/contract';
import { showError, showToast } from '../kit/components';
import { COIN_ART } from '../coinArt';
import { fishImage } from '../fishArt';
import { formatGold } from '../kit/format';
import { animateIn, animateOut } from '../kit/motion';
import type { ShopPopup } from '../shop/ShopPopup';
import { SHOP_RARITY_COLORS, groupFish, type FishGroup } from '../shop/shopModel';

const UI = (file: string) => encodeURI(`/new resources/ui/${file}`);
const COIN = COIN_ART;
const CLOSE = encodeURI('/mini game/Button Close.png');
const SKIN_DIR = '/assets/characters/';
const rodIcon = (rodId: string) => `/assets/rods/${rodId}-icon.png`;

/** Khung thiết kế: hàng tab cao 76px nằm trên sổ tay 1392×804. */
const DESIGN_W = 1392;
const DESIGN_H = 880;

type TabId = 'rods' | 'fish';

/** 5 chỉ số theo thứ tự hàng vẽ sẵn trên Rod_Card.png. */
const STAT_ROWS: { key: keyof Stats; label: string; icon: string; unit: string }[] = [
  { key: 'strength', label: 'Sức mạnh', icon: UI('Strength.png'), unit: '' },
  { key: 'normalHitZonePct', label: 'Vùng trúng thường', icon: UI('Normal Zone.png'), unit: '%' },
  { key: 'weaknessHitZonePct', label: 'Vùng điểm yếu', icon: UI('Weakness Zone.png'), unit: '%' },
  { key: 'rareLuck', label: 'May mắn cá hiếm', icon: UI('Rare Luck.png'), unit: '' },
  { key: 'largeLuck', label: 'May mắn cá lớn', icon: UI('Large Luck.png'), unit: '' },
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

const lengthText = (tenthCm: number) => `${(tenthCm / 10).toFixed(1).replace('.', ',')}cm`;

const skinCache = new Map<string, Promise<string | null>>();

/** Thỏ đứng nhìn xuống cắt sát từ sheet skin đã bake; skin chưa có art thì null. */
function skinPortrait(skinId: string): Promise<string | null> {
  let portrait = skinCache.get(skinId);
  if (!portrait) {
    portrait = (async () => {
      const response = await fetch(`${SKIN_DIR}${skinId}.json`);
      if (!response.ok) return null;
      const data = (await response.json()) as {
        frames: Record<string, { frame: { x: number; y: number; w: number; h: number } }>;
      };
      const frame = data.frames['idle_down_0']?.frame;
      if (!frame) return null;
      const image = new Image();
      image.src = `${SKIN_DIR}${skinId}.png`;
      await image.decode();
      const canvas = document.createElement('canvas');
      canvas.width = frame.w;
      canvas.height = frame.h;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(image, frame.x, frame.y, frame.w, frame.h, 0, 0, frame.w, frame.h);
      const { data: px } = ctx.getImageData(0, 0, frame.w, frame.h);
      let x0 = frame.w;
      let y0 = frame.h;
      let x1 = -1;
      let y1 = -1;
      for (let y = 0; y < frame.h; y++) {
        for (let x = 0; x < frame.w; x++) {
          if (px[(y * frame.w + x) * 4 + 3] === 0) continue;
          x0 = Math.min(x0, x);
          y0 = Math.min(y0, y);
          x1 = Math.max(x1, x);
          y1 = Math.max(y1, y);
        }
      }
      if (x1 < 0) return null;
      const out = document.createElement('canvas');
      out.width = x1 - x0 + 1;
      out.height = y1 - y0 + 1;
      out.getContext('2d')!.drawImage(canvas, -x0, -y0);
      return out.toDataURL();
    })().catch(() => null);
    skinCache.set(skinId, portrait);
  }
  return portrait;
}

export interface InventoryPopupOptions {
  root: HTMLElement;
  services: Services;
  shop: ShopPopup;
}

export class InventoryPopup {
  private overlay: HTMLElement | null = null;
  private page: HTMLElement | null = null;
  private tabs = new Map<TabId, HTMLButtonElement>();
  private tab: TabId = 'rods';
  private progress: ProgressResponse | null = null;
  private busy = false;
  private cleanups: (() => void)[] = [];

  constructor(private readonly options: InventoryPopupOptions) {}

  open(tab: TabId = 'rods'): void {
    if (this.overlay) return;
    const overlay = el('div', 'shop inv');
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-label', 'Túi đồ');
    const panel = el('div', 'inv__panel');
    overlay.append(panel);

    const tabRow = el('nav', 'inv__tabs');
    const tabDefs: { id: TabId; label: string; icon: string }[] = [
      { id: 'rods', label: 'Đồ câu', icon: UI('Icon Equipment.png') },
      { id: 'fish', label: 'Túi cá', icon: UI('Icon Sell.png') },
    ];
    for (const def of tabDefs) {
      const tabButton = button('inv__tab', def.label);
      tabButton.append(img(def.icon, 'inv__tab-icon'), el('span', 'inv__tab-label', def.label));
      tabButton.addEventListener('click', () => this.showTab(def.id));
      this.tabs.set(def.id, tabButton);
      tabRow.append(tabButton);
    }
    const close = button('inv__close', 'Đóng túi đồ');
    close.append(img(CLOSE));
    close.addEventListener('click', () => this.close());

    const book = el('div', 'inv__book');
    book.append(img(UI('Notebook.png'), 'shop__art'));
    this.page = el('div', 'inv__page');
    book.append(this.page);
    panel.append(tabRow, close, book);

    const fit = () =>
      overlay.style.setProperty(
        '--shop-scale',
        String(
          Math.min(
            1,
            (window.innerWidth * 0.96) / DESIGN_W,
            (window.innerHeight * 0.92) / DESIGN_H,
          ),
        ),
      );
    fit();
    window.addEventListener('resize', fit);
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') this.close();
    };
    window.addEventListener('keydown', onKey);
    overlay.addEventListener('pointerdown', (event) => {
      if (event.target === overlay) this.close();
    });
    const { store } = this.options.services;
    this.cleanups.push(
      () => window.removeEventListener('resize', fit),
      () => window.removeEventListener('keydown', onKey),
      store.select(
        (s) => s.inventory,
        () => this.render(),
      ),
    );

    this.overlay = overlay;
    this.options.root.append(overlay);
    animateIn(overlay, 'fade');
    animateIn(panel, 'pop');
    this.showTab(tab);
    void this.reload();
  }

  close(): void {
    const overlay = this.overlay;
    if (!overlay) return;
    this.overlay = null;
    this.page = null;
    this.tabs.clear();
    this.cleanups.forEach((cleanup) => cleanup());
    this.cleanups = [];
    overlay.style.pointerEvents = 'none';
    const panel = overlay.querySelector<HTMLElement>('.inv__panel');
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
    this.tab = tab;
    for (const [id, tabButton] of this.tabs) {
      tabButton.classList.toggle('inv__tab--active', id === tab);
    }
    this.render();
  }

  private render(): void {
    if (!this.page) return;
    this.page.replaceChildren(this.tab === 'rods' ? this.rodsTab() : this.fishTab());
  }

  // ---------- Đồ câu ----------

  private rodsTab(): HTMLElement {
    const { inventory, catalog, session } = this.options.services.store.getState();
    const wrap = el('div', 'inv-rods');

    // Bên trái: nhân vật theo skin đang dùng và chỉ số tổng (level + cần) từ Server.
    const hero = el('div', 'inv-hero');
    const figure = el('div', 'inv-hero__figure');
    const skinId = session.profile?.selectedSkinId ?? 'skin_01';
    void skinPortrait(skinId).then((src) => {
      if (src) figure.append(img(src, 'inv-hero__skin'));
    });
    const stats = el('ul', 'inv-stats');
    for (const row of STAT_ROWS) {
      const value = this.progress?.stats[row.key];
      const item = el('li', 'inv-stats__row');
      item.append(
        img(row.icon, 'inv-stats__icon'),
        el('span', 'inv-stats__label', row.label),
        el('span', 'inv-stats__value', value === undefined ? '…' : `${value}${row.unit}`),
      );
      stats.append(item);
    }
    hero.append(figure, stats);

    // Bên phải: thẻ các cần đang sở hữu, cần đang dùng có nhãn "Đang dùng".
    const owned = new Set(inventory?.rods ?? []);
    const rods = (catalog?.rods ?? []).filter((rod) => owned.has(rod.rodId));
    const list = el('div', 'inv-rods__list');
    for (const rod of rods) list.append(this.rodCard(rod, rod.rodId === inventory?.equippedRodId));
    if (!inventory) list.append(el('p', 'shop-empty', 'Đang tải...'));

    const buy = button('inv-rods__buy', 'Mua cần câu', 'Mua cần câu');
    buy.addEventListener('click', () => {
      this.close();
      this.options.shop.open('equip');
    });
    wrap.append(hero, list, buy);
    return wrap;
  }

  private rodCard(rod: RodConfig, equipped: boolean): HTMLElement {
    const card = button(
      `inv-rod${equipped ? ' inv-rod--equipped' : ''}`,
      equipped ? `${rod.name}, đang dùng` : `Trang bị ${rod.name}`,
    );
    card.append(img(UI('Rod_Card.png'), 'shop__art'));
    if (equipped) {
      const tag = el('span', 'inv-rod__tag');
      tag.append(img(UI('Equipped Tag.png')), el('span', '', 'Đang dùng'));
      card.append(tag);
    }
    card.append(img(rodIcon(rod.rodId), 'inv-rod__icon'), el('span', 'inv-rod__name', rod.name));
    const values = el('span', 'inv-rod__values');
    for (const row of STAT_ROWS) {
      // Chỉ số cộng thêm của cần: luôn có dấu + (feedback 2026-11-14).
      values.append(el('span', 'inv-rod__value', `+${rod[row.key]}${row.unit}`));
    }
    card.append(values);
    // Server đã có PUT /me/equipped-rod: bấm thẻ cần khác để trang bị (đang câu thì Server từ chối).
    if (!equipped) card.addEventListener('click', () => void this.equip(rod));
    else card.disabled = true;
    return card;
  }

  private async equip(rod: RodConfig): Promise<void> {
    if (this.busy) return;
    this.busy = true;
    const { api } = this.options.services;
    try {
      await api.put('/me/equipped-rod', { rodId: rod.rodId });
      showToast(this.options.root, `Đã trang bị ${rod.name}.`);
      await this.reload();
    } catch (error) {
      showError(this.options.root, error);
    } finally {
      this.busy = false;
    }
  }

  // ---------- Túi cá ----------

  private fishTab(): HTMLElement {
    const { inventory, catalog } = this.options.services.store.getState();
    const groups = groupFish(inventory?.fish ?? [], catalog);
    const wrap = el('div', 'inv-fish');
    const grid = el('div', 'inv-fish__grid');
    if (!inventory) grid.append(el('p', 'shop-empty', 'Đang tải túi cá...'));
    else if (groups.length === 0) grid.append(el('p', 'shop-empty', 'Túi chưa có cá nào.'));
    for (const group of groups) grid.append(this.fishCell(group));

    const choose = button('shop-small inv-fish__choose', 'Chọn cá', 'Chọn cá');
    choose.disabled = groups.length === 0;
    choose.addEventListener('click', () => {
      this.close();
      this.options.shop.open('sell', { selecting: true });
    });
    wrap.append(grid, choose);
    return wrap;
  }

  private fishCell(group: FishGroup): HTMLElement {
    const cell = el('div', 'shop-fish');
    cell.setAttribute(
      'aria-label',
      `${group.name}, ${lengthText(group.lengthTenthCm)}, ${group.catchIds.length} con`,
    );
    const slot = el('span', 'shop-fish__slot');
    slot.style.setProperty('--rarity', SHOP_RARITY_COLORS[group.rarity]);
    slot.append(
      fishImage(group.speciesId, 'shop-fish__icon'),
      el('span', 'shop-fish__count', String(group.catchIds.length)),
      el('span', 'shop-fish__length', lengthText(group.lengthTenthCm)),
    );
    const info = el('span', 'shop-fish__info');
    const price = el('span', 'shop-gold-tag');
    price.append(img(COIN, 'shop-coin'), el('span', '', formatGold(String(group.unitGold))));
    info.append(el('span', 'shop-fish__name', group.name), price);
    cell.append(slot, info);
    return cell;
  }

  private async reload(): Promise<void> {
    const { api, store } = this.options.services;
    try {
      const [inventory, progress] = await Promise.all([
        api.get<InventoryResponse>('/me/inventory'),
        api.get<ProgressResponse>('/me/progress'),
      ]);
      this.progress = progress;
      store.dispatch({ type: 'inventory/set', payload: inventory });
      store.dispatch({ type: 'session/gold', payload: inventory.gold });
      this.render();
    } catch (error) {
      showError(this.options.root, error);
    }
  }
}
