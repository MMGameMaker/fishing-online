// Giao diện home của pier.html theo ảnh demo (2026-11-13): khung người chơi (tên, EXP, cấp), ô vé câu
// kèm popup "Vé câu cá", khung Gold và menu 6 ô. Vẽ bằng DOM trên canvas từ ảnh trong
// public/new resources/ui. Ảnh vẽ ở tỉ lệ 4 cho màn 1920×1080; bố cục tính theo pixel ảnh,
// ui-root scale cả khung chơi theo canvas. Mọi popup hiện/ẩn qua ui/kit/motion.ts.
import type Phaser from 'phaser';
import type { Services } from '../../core/services';
import type { PlayerProfile } from '../../net/contract';
import { showToast } from '../kit/components';
import { formatGold } from '../kit/format';
import { animateIn, animateOut } from '../kit/motion';
import { formatClock } from '../../scenes/lake/seatLogic';
import { CodexPopup } from '../codex/CodexPopup';
import { SettingsPopup } from '../settings/SettingsPopup';
import { InventoryPopup } from '../inventory/InventoryPopup';
import { DailyFishPopup } from '../leaderboard/DailyFishPopup';
import { LeaderboardPopup } from '../leaderboard/LeaderboardPopup';
import { ProfilePopup } from '../profile/ProfilePopup';
import { FriendsPopup } from '../friends/FriendsPopup';
import { COIN_ART } from '../coinArt';
import { ShopPopup } from '../shop/ShopPopup';
import { playGoldGain } from './goldFx';
import { expText, levelProgress } from './levelProgress';

const UI_DIR = '/new resources/ui/';
const asset = (file: string) => encodeURI(UI_DIR + file);
const COIN_ICON = COIN_ART;
const CLOSE_ICON = encodeURI('/mini game/Button Close.png');

interface MenuItem {
  id: string;
  label: string;
  /** Ảnh trong public/new resources/ui, hoặc URL đầy đủ (icon tạm). */
  icon: string;
  /** Ảnh gốc lớn hơn nhiều so với ô: thu bằng lọc mịn thay vì NEAREST. */
  smooth?: boolean;
}

const MENU_ITEMS: readonly MenuItem[] = [
  { id: 'shop', label: 'Cửa hàng', icon: 'Icon Shop.png' },
  { id: 'profile', label: 'Hồ sơ', icon: 'Icon Appearance.png' },
  { id: 'leaderboard', label: 'Bảng xếp hạng', icon: 'Icon Leaderboard.png' },
  { id: 'inventory', label: 'Túi đồ', icon: 'Icon Inventory.png' },
  // Icon Sổ tay (người dùng thêm 2026-11-16, trước đó dùng icon nhà Icon Home.png).
  { id: 'codex', label: 'Sổ tay cá', icon: 'Icon So tay.png' },
  // BOT-02 (2026-11-18): danh sách bạn. Icon thật do người dùng thêm 2026-11-19 (ảnh 1024x1024, thu về 56px).
  { id: 'friends', label: 'Bạn bè', icon: 'friend icon.png', smooth: true },
  { id: 'settings', label: 'Cài đặt', icon: 'Icon Settings.png' },
];
const menuIcon = (icon: string) => (icon.startsWith('data:') ? icon : asset(icon));
/** Chấm đỏ báo lời mời kết bạn, ẩn sẵn. */
function hiddenDot(): HTMLImageElement {
  const dot = img(asset('Infomation/Claim Dot.png'), 'home-dot');
  dot.hidden = true;
  return dot;
}
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
  /** Mở tab Tin riêng với một người (khung chat của LakeScene). */
  openDirect: (playerId: string) => void;
  /** Mở popup thông tin người chơi. */
  openPlayer: (playerId: string) => void;
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
  private readonly ticketWrap = el('div', 'home-ticket-wrap');
  private readonly popup = el('div', 'home-ticket-info');
  private readonly popupTime = el('span', 'home-ticket-info__time');
  private readonly gold = el('span', 'home-gold__amount');
  private readonly goldCoin = img(COIN_ICON, 'home-gold__coin');
  /** Số Gold đang hiện, để biết Gold tăng hay giảm khi Server gửi số mới. */
  private shownGold = 0;
  private readonly menu = el('div', 'home-menu');
  private readonly menuLabel = el('div', 'home-menu__label');
  private readonly unsubscribes: (() => void)[] = [];
  private lastClock = '';
  private ticketShown = false;
  /** Chấm đỏ đang hiện (đích của hiệu ứng), để không chạy lại hiệu ứng khi số lời mời đổi nhưng vẫn > 0. */
  private readonly shownDots = new Set<HTMLElement>();
  private lastAttemptId = '';
  private readonly shop: ShopPopup;
  private readonly inventory: InventoryPopup;
  private readonly codex: CodexPopup;
  private readonly settings: SettingsPopup;
  private readonly profile: ProfilePopup;
  private readonly leaderboard: LeaderboardPopup;
  private readonly dailyFish: DailyFishPopup;
  private readonly friends: FriendsPopup;
  /** Chấm báo có lời mời kết bạn: trên nút mở menu và trên ô "Bạn bè". */
  // Ẩn sẵn; renderFriendDots hiện khi có lời mời (setDotShown).
  private readonly menuDot = hiddenDot();
  private readonly friendsDot = hiddenDot();

  constructor(private readonly options: HomeHudOptions) {
    this.shop = new ShopPopup({ root: options.root, services: options.services });
    this.profile = new ProfilePopup({ root: options.root, services: options.services });
    this.codex = new CodexPopup({ root: options.root, services: options.services });
    this.settings = new SettingsPopup({ root: options.root });
    this.leaderboard = new LeaderboardPopup({
      root: options.root,
      services: options.services,
      now: options.serverNow,
    });
    this.dailyFish = new DailyFishPopup({
      root: options.root,
      services: options.services,
      now: options.serverNow,
    });
    this.friends = new FriendsPopup({
      root: options.root,
      services: options.services,
      openDirect: options.openDirect,
      openPlayer: options.openPlayer,
    });
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
        (s) => s.social.incoming,
        (incoming) => this.renderFriendDots(incoming.length),
      ),
      store.select(
        (s) => s.session.gold,
        (gold) => this.renderGold(gold ?? '0'),
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
    this.renderFriendDots(store.getState().social.incoming.length);
    this.gold.textContent = formatGold(store.getState().session.gold ?? '0');

    // Bố cục tính theo màn thiết kế 1920×1080; ui-root scale cả khung chơi nên không cần fit riêng.

    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !this.menu.hidden) void this.setMenuOpen(false);
      // Phím B: BXH cá ngày (tạm, nút mở sẽ gắn sau). Bỏ qua khi đang gõ chữ hoặc có phím bổ trợ.
      const target = event.target as HTMLElement | null;
      const typing = target?.matches('input, textarea, select, [contenteditable]') ?? false;
      const modifier = event.ctrlKey || event.metaKey || event.altKey;
      if ((event.key === 'b' || event.key === 'B') && !typing && !modifier && !event.repeat) {
        this.dailyFish.toggle();
      }
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
    // Hết vé thì ẩn cả ô (kèm popup đang mở); có vé lại thì hiện.
    const hasTicket = clock !== '';
    if (!hasTicket) void this.setPopupOpen(false);
    void this.setTicketShown(hasTicket);
  }

  /** Ô vé hiện/ẩn mờ dần (feedback 2026-11-19), không bật/tắt tức thì. */
  private async setTicketShown(shown: boolean): Promise<void> {
    if (shown === this.ticketShown) return;
    this.ticketShown = shown;
    if (shown) {
      this.ticketWrap.hidden = false;
      animateIn(this.ticketWrap, 'fade');
      return;
    }
    await animateOut(this.ticketWrap, 'fade');
    if (!this.ticketShown) this.ticketWrap.hidden = true;
  }

  destroy(): void {
    this.unsubscribes.forEach((unsubscribe) => unsubscribe());
    this.shop.destroy();
    this.inventory.destroy();
    this.codex.destroy();
    this.settings.destroy();
    this.leaderboard.destroy();
    this.dailyFish.destroy();
    this.profile.destroy();
    this.friends.destroy();
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

    // Ô vé chỉ hiện khi vé còn hạn (feedback 2026-11-16); update() bật/tắt theo đồng hồ.
    this.ticketWrap.append(this.chip, this.popup);
    this.ticketWrap.hidden = true;
    this.left.append(this.ticketWrap);
  }

  private buildGold(): void {
    const box = el('div', 'home-gold');
    const menuButton = button('home-gold__menu', 'Menu');
    menuButton.append(img(asset('Button.png')), this.menuDot);
    menuButton.addEventListener('click', () => void this.setMenuOpen(this.menu.hidden));
    box.append(this.goldCoin, this.gold, menuButton);
    this.right.append(box);
  }

  /** Gold tăng thì đồng xu bay vào ô Gold và số đếm lên; giảm (mua đồ) thì đổi số ngay. */
  private renderGold(gold: string): void {
    const next = Number(gold);
    const previous = this.shownGold;
    this.shownGold = next;
    if (!Number.isFinite(next) || !Number.isFinite(previous) || next <= previous) {
      this.gold.textContent = formatGold(gold);
      return;
    }
    playGoldGain(this.goldCoin, this.gold, COIN_ICON, previous, next);
  }

  private buildMenu(): void {
    const panel = el('div', 'home-menu__panel');
    panel.setAttribute('role', 'dialog');
    // Menu mở cũng chặn input vào map (feedback 2026-11-16); lớp `this.menu` có `hidden` khi đóng.
    panel.setAttribute('aria-modal', 'true');
    panel.setAttribute('aria-label', 'Menu');
    panel.append(img(asset('Menu Panel.png'), 'home-menu__art'));
    const close = button('home-menu__close', 'Đóng menu');
    close.append(img(CLOSE_ICON));
    close.addEventListener('click', () => void this.setMenuOpen(false));

    // 7 ô (thêm Bạn bè): lưới 3 cột ô nhỏ hơn để vừa khung (friends.css).
    const grid = el(
      'div',
      MENU_ITEMS.length > 6 ? 'home-menu__grid home-menu__grid--compact' : 'home-menu__grid',
    );
    const select = (slot: HTMLButtonElement, label: string) => {
      grid.querySelector('.home-menu__slot--active')?.classList.remove('home-menu__slot--active');
      slot.classList.add('home-menu__slot--active');
      this.menuLabel.textContent = label;
    };
    for (const item of MENU_ITEMS) {
      const slot = button('home-menu__slot', item.label);
      slot.append(img(asset('Icon Button.png'), 'home-menu__frame'));
      slot.append(
        img(
          menuIcon(item.icon),
          item.smooth ? 'home-menu__icon home-menu__icon--smooth' : 'home-menu__icon',
        ),
      );
      if (item.id === 'friends') slot.append(this.friendsDot);
      slot.addEventListener('pointerenter', () => select(slot, item.label));
      slot.addEventListener('focus', () => select(slot, item.label));
      slot.addEventListener('click', () => {
        select(slot, item.label);
        if (item.id === 'codex') {
          void this.setMenuOpen(false);
          this.codex.open();
        } else if (item.id === 'settings') {
          void this.setMenuOpen(false);
          this.settings.open();
        } else if (item.id === 'leaderboard') {
          void this.setMenuOpen(false);
          this.leaderboard.open();
        } else if (item.id === 'profile') {
          void this.setMenuOpen(false);
          this.profile.open();
        } else if (item.id === 'shop') {
          void this.setMenuOpen(false);
          this.shop.open('sell');
        } else if (item.id === 'friends') {
          void this.setMenuOpen(false);
          this.friends.open();
        } else if (item.id === 'inventory') {
          void this.setMenuOpen(false);
          this.inventory.open('rods');
        } else showToast(this.options.root, COMING_SOON);
      });
      grid.append(slot);
    }
    const first = grid.querySelector<HTMLButtonElement>('.home-menu__slot');
    if (first) select(first, MENU_ITEMS[0]!.label);

    panel.append(this.menuLabel, grid, close);
    this.menu.append(panel);
    // Chạm vào nền mờ ngoài bảng cũng đóng menu.
    this.menu.addEventListener('pointerdown', (event) => {
      if (event.target === this.menu) void this.setMenuOpen(false);
    });
    this.menu.hidden = true;
  }

  private renderFriendDots(incoming: number): void {
    void this.setDotShown(this.menuDot, incoming > 0);
    void this.setDotShown(this.friendsDot, incoming > 0);
  }

  /** Chấm đỏ hiện nảy lên rồi chớp chậm; ẩn thì mờ và thu nhỏ rồi mới gỡ (feedback 2026-11-19), không bật/tắt tức thì. */
  private async setDotShown(dot: HTMLElement, shown: boolean): Promise<void> {
    if (shown === this.shownDots.has(dot)) return;
    if (shown) {
      this.shownDots.add(dot);
      dot.hidden = false;
      dot.classList.remove('home-dot--pulse');
      animateIn(dot, 'pop');
      // Nảy lên xong thì chuyển sang chớp chậm liên tục.
      dot.addEventListener(
        'animationend',
        () => {
          if (!this.shownDots.has(dot)) return;
          dot.classList.remove('ui-in-pop');
          dot.classList.add('home-dot--pulse');
        },
        { once: true },
      );
      return;
    }
    this.shownDots.delete(dot);
    dot.classList.remove('home-dot--pulse');
    await animateOut(dot, 'pop');
    if (!this.shownDots.has(dot)) dot.hidden = true;
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
    const panel = this.menu.querySelector<HTMLElement>('.home-menu__panel');
    if (open) {
      void this.setPopupOpen(false);
      this.menu.hidden = false;
      animateIn(this.menu, 'fade');
      if (panel) animateIn(panel, 'pop');
      return;
    }
    await Promise.all([animateOut(this.menu, 'fade'), panel ? animateOut(panel, 'pop') : null]);
    this.menu.hidden = true;
  }
}
