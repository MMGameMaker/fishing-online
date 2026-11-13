// Giao diện home của pier.html theo ảnh demo (2026-11-13): khung người chơi (tên, EXP, cấp), ô vé câu
// kèm popup "Vé câu cá", khung Gold và menu 6 ô. Vẽ bằng DOM trên canvas từ ảnh trong
// public/new resources/ui. Ảnh vẽ ở tỉ lệ 4 cho màn 1920×1080, nên bố cục tính theo pixel ảnh rồi
// thu phóng cả cụm theo cửa sổ (--hud-scale). Mọi popup hiện/ẩn qua ui/kit/motion.ts.
import type Phaser from 'phaser';
import type { Services } from '../../core/services';
import type { PlayerProfile } from '../../net/contract';
import { showToast } from '../kit/components';
import { formatGold } from '../kit/format';
import { animateIn, animateOut } from '../kit/motion';
import { formatClock } from '../../scenes/lake/seatLogic';
import { InventoryPopup } from '../inventory/InventoryPopup';
import { ShopPopup } from '../shop/ShopPopup';
import { expText, levelProgress } from './levelProgress';

const UI_DIR = '/new resources/ui/';
const asset = (file: string) => encodeURI(UI_DIR + file);
const COIN_ICON = encodeURI('/mini game/Coin Small.png');
const CLOSE_ICON = encodeURI('/mini game/Button Close.png');
/** Màn thiết kế của ảnh UI; nhỏ hơn thì thu cả cụm, không phóng to quá 1. */
const DESIGN_W = 1920;
const DESIGN_H = 1080;
const MIN_SCALE = 0.4;

const MENU_ITEMS = [
  { id: 'shop', label: 'Cửa hàng', icon: 'Icon Shop.png' },
  { id: 'profile', label: 'Hồ sơ', icon: 'Icon Appearance.png' },
  { id: 'leaderboard', label: 'Bảng xếp hạng', icon: 'Icon Leaderboard.png' },
  { id: 'inventory', label: 'Túi đồ', icon: 'Icon Inventory.png' },
  { id: 'close', label: 'Tắt popup', icon: 'Icon Home.png' },
  { id: 'settings', label: 'Cài đặt', icon: 'Icon Settings.png' },
] as const;
const COMING_SOON = 'Sắp ra mắt';

const REGISTRY_KEY = 'homeHud';

/** Trang nào muốn giao diện home này (hiện chỉ pier.html) thì bật trước khi game chạy. */
export function enableHomeHud(game: Phaser.Game): void {
  game.registry.set(REGISTRY_KEY, true);
}

export function isHomeHudEnabled(scene: Phaser.Scene): boolean {
  return scene.registry.get(REGISTRY_KEY) === true;
}

export interface HomeHudOptions {
  root: HTMLElement;
  services: Services;
  serverNow: () => number;
  /** Mở popup mua vé đã có (TicketDialog qua SeatUi). */
  openBuyTicket: () => Promise<boolean>;
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

function button(className: string, label: string): HTMLButtonElement {
  const node = el('button', className);
  node.type = 'button';
  node.setAttribute('aria-label', label);
  return node;
}

function img(src: string, className = ''): HTMLImageElement {
  const node = el('img', className);
  node.src = src;
  node.alt = '';
  node.draggable = false;
  return node;
}

export class HomeHud {
  private readonly layer = el('div', 'home-hud');
  private readonly left = el('div', 'home-hud__left');
  private readonly right = el('div', 'home-hud__right');
  private readonly name = el('div', 'home-card__name');
  private readonly expFill = el('div', 'home-card__exp-fill');
  private readonly expText = el('div', 'home-card__exp');
  private readonly levelText = el('div', 'home-card__level');
  private readonly chip = button('home-ticket', 'Vé câu cá');
  private readonly chipTime = el('span', 'home-ticket__time');
  private readonly popup = el('div', 'home-ticket-info');
  private readonly popupTime = el('span', 'home-ticket-info__time');
  private readonly gold = el('span', 'home-gold__amount');
  private readonly menu = el('div', 'home-menu');
  private readonly menuLabel = el('div', 'home-menu__label');
  private readonly unsubscribes: (() => void)[] = [];
  private lastClock = '';
  private lastAttemptId = '';
  private readonly shop: ShopPopup;
  private readonly inventory: InventoryPopup;

  constructor(private readonly options: HomeHudOptions) {
    this.shop = new ShopPopup({ root: options.root, services: options.services });
    this.inventory = new InventoryPopup({
      root: options.root,
      services: options.services,
      shop: this.shop,
    });
    this.buildCard();
    this.buildTicket();
    this.buildGold();
    this.buildMenu();
    this.layer.append(this.left, this.right);
    options.root.append(this.layer, this.menu);

    const { store } = options.services;
    this.unsubscribes.push(
      store.select(
        (s) => s.session.profile,
        () => this.renderProfile(),
      ),
      store.select(
        (s) => s.catalog,
        () => this.renderProfile(),
      ),
      store.select(
        (s) => s.session.gold,
        (gold) => (this.gold.textContent = formatGold(gold ?? '0')),
      ),
      store.select(
        (s) => s.attempt,
        (attempt) => {
          // Câu được cá thì Server đã cộng EXP/level: tải lại hồ sơ để thanh EXP đúng số thật.
          if (attempt?.phase !== 'success' || attempt.attemptId === this.lastAttemptId) return;
          this.lastAttemptId = attempt.attemptId;
          void this.reloadProfile();
        },
      ),
    );
    this.renderProfile();
    this.gold.textContent = formatGold(store.getState().session.gold ?? '0');

    const fit = () => {
      const scale = Math.max(
        MIN_SCALE,
        Math.min(1, window.innerWidth / DESIGN_W, window.innerHeight / DESIGN_H),
      );
      this.layer.style.setProperty('--hud-scale', String(scale));
      this.menu.style.setProperty('--hud-scale', String(scale));
    };
    fit();
    window.addEventListener('resize', fit);
    this.unsubscribes.push(() => window.removeEventListener('resize', fit));

    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !this.menu.hidden) void this.setMenuOpen(false);
    };
    window.addEventListener('keydown', onKey);
    this.unsubscribes.push(() => window.removeEventListener('keydown', onKey));
    const onOutside = (event: PointerEvent) => {
      const target = event.target as Node;
      if (!this.popup.hidden && !this.popup.contains(target) && !this.chip.contains(target)) {
        void this.setPopupOpen(false);
      }
    };
    document.addEventListener('pointerdown', onOutside, true);
    this.unsubscribes.push(() => document.removeEventListener('pointerdown', onOutside, true));
  }

  /** Gọi mỗi khung: đồng hồ vé đếm lùi theo giờ Server. */
  update(): void {
    const ticket = this.options.services.store.getState().lake.myTicket;
    const left = ticket ? Date.parse(ticket.expiresAt) - this.options.serverNow() : 0;
    const clock = left > 0 ? formatClock(left) : '';
    if (clock === this.lastClock) return;
    this.lastClock = clock;
    // Chỉ hiện số khi vé còn hạn; hết vé thì ô vé chỉ còn icon.
    this.chipTime.textContent = clock;
    this.popupTime.textContent = clock || 'Chưa có vé';
  }

  destroy(): void {
    this.unsubscribes.forEach((unsubscribe) => unsubscribe());
    this.shop.destroy();
    this.inventory.destroy();
    this.layer.remove();
    this.menu.remove();
  }

  private buildCard(): void {
    const card = el('div', 'home-card');
    card.append(img(asset('User Card.png'), 'home-card__art'));
    const bar = el('div', 'home-card__bar');
    bar.append(this.expFill);
    card.append(this.name, bar, this.expText, this.levelText);
    this.left.append(card);
  }

  private buildTicket(): void {
    this.chip.append(img(asset('Ticket Timer.png'), 'home-ticket__art'));
    this.chip.append(img(asset('Icon Ticket.png'), 'home-ticket__icon'), this.chipTime);
    this.chip.addEventListener('click', () => void this.setPopupOpen(this.popup.hidden));

    this.popup.append(img(asset('Ticket Info.png'), 'home-ticket-info__art'));
    const row = el('div', 'home-ticket-info__row');
    row.append(el('span', '', 'Hiệu lực trong:'), this.popupTime);
    const buy = button('home-ticket-info__buy', 'Mua thêm');
    buy.textContent = 'Mua thêm';
    buy.addEventListener('click', () => {
      void this.setPopupOpen(false);
      void this.options.openBuyTicket();
    });
    this.popup.append(el('h2', 'home-ticket-info__title', 'Vé câu cá'), row, buy);
    this.popup.hidden = true;

    const wrap = el('div', 'home-ticket-wrap');
    wrap.append(this.chip, this.popup);
    this.left.append(wrap);
  }

  private buildGold(): void {
    const box = el('div', 'home-gold');
    const menuButton = button('home-gold__menu', 'Menu');
    menuButton.append(img(asset('Button.png')));
    menuButton.addEventListener('click', () => void this.setMenuOpen(this.menu.hidden));
    box.append(img(COIN_ICON, 'home-gold__coin'), this.gold, menuButton);
    this.right.append(box);
  }

  private buildMenu(): void {
    const panel = el('div', 'home-menu__panel');
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-label', 'Menu');
    panel.append(img(asset('Menu Panel.png'), 'home-menu__art'));
    const close = button('home-menu__close', 'Đóng menu');
    close.append(img(CLOSE_ICON));
    close.addEventListener('click', () => void this.setMenuOpen(false));

    const grid = el('div', 'home-menu__grid');
    const select = (slot: HTMLButtonElement, label: string) => {
      grid.querySelector('.home-menu__slot--active')?.classList.remove('home-menu__slot--active');
      slot.classList.add('home-menu__slot--active');
      this.menuLabel.textContent = label;
    };
    for (const item of MENU_ITEMS) {
      const slot = button('home-menu__slot', item.label);
      slot.append(img(asset('Icon Button.png'), 'home-menu__frame'));
      slot.append(img(asset(item.icon), 'home-menu__icon'));
      slot.addEventListener('pointerenter', () => select(slot, item.label));
      slot.addEventListener('focus', () => select(slot, item.label));
      slot.addEventListener('click', () => {
        select(slot, item.label);
        if (item.id === 'close') void this.setMenuOpen(false);
        else if (item.id === 'shop') {
          void this.setMenuOpen(false);
          this.shop.open('sell');
        } else if (item.id === 'inventory') {
          void this.setMenuOpen(false);
          this.inventory.open('rods');
        } else showToast(this.options.root, COMING_SOON);
      });
      grid.append(slot);
    }
    const first = grid.querySelector<HTMLButtonElement>('.home-menu__slot');
    if (first) select(first, MENU_ITEMS[0].label);

    panel.append(this.menuLabel, grid, close);
    this.menu.append(panel);
    // Chạm vào nền mờ ngoài bảng cũng đóng menu.
    this.menu.addEventListener('pointerdown', (event) => {
      if (event.target === this.menu) void this.setMenuOpen(false);
    });
    this.menu.hidden = true;
  }

  private renderProfile(): void {
    const { session, catalog } = this.options.services.store.getState();
    const profile: PlayerProfile | null = session.profile;
    this.name.textContent = profile?.displayName ?? 'Người chơi';
    const level = profile?.level ?? 1;
    const progress = levelProgress(profile?.exp ?? 0, level, catalog?.levels ?? []);
    this.expFill.style.width = `${Math.round(progress.ratio * 1000) / 10}%`;
    this.expText.textContent = catalog ? expText(progress) : `EXP ${profile?.exp ?? 0}`;
    this.levelText.textContent = `Lv. ${level}`;
  }

  private async reloadProfile(): Promise<void> {
    try {
      const profile = await this.options.services.api.get<PlayerProfile>('/me');
      this.options.services.store.dispatch({ type: 'session/profile', payload: profile });
    } catch (error) {
      console.warn(error);
    }
  }

  private async setPopupOpen(open: boolean): Promise<void> {
    if (open === !this.popup.hidden) return;
    this.chip.classList.toggle('home-ticket--active', open);
    if (open) {
      this.popup.hidden = false;
      animateIn(this.popup, 'pop');
      return;
    }
    await animateOut(this.popup, 'pop');
    this.popup.hidden = true;
  }

  private async setMenuOpen(open: boolean): Promise<void> {
    if (open === !this.menu.hidden) return;
    if (open) {
      void this.setPopupOpen(false);
      this.menu.hidden = false;
      animateIn(this.menu, 'fade');
      return;
    }
    await animateOut(this.menu, 'fade');
    this.menu.hidden = true;
  }
}
