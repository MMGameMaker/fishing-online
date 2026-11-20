// Popup "Bạn bè" (BOT-02 mục 4), mở từ ô "Bạn bè" trong menu HomeHud: danh sách bạn (avatar, tên, level,
// online/offline) với nút Nhắn tin và Xem thông tin; phần lời mời đang chờ với nút Đồng ý/Từ chối.
// Dữ liệu GET /friends, cập nhật theo event FriendRequestReceived/FriendAdded qua store. Hiện/ẩn qua motion.ts.
import { UI_DESIGN_HEIGHT, UI_DESIGN_WIDTH } from '../../core/env';
import type { Services } from '../../core/services';
import type { FriendEntry, FriendRequestEntry } from '../../net/contract';
import { faceElement } from '../../social/skinFace';
import { showError, showToast } from '../kit/components';
import { animateIn, animateOut } from '../kit/motion';
import {
  acceptFriend,
  declineFriend,
  reloadFriends,
  reloadTrades,
  removeFriend,
} from './friendActions';
import { TradeComposer, tradeRow } from './tradeUi';

const CLOSE = encodeURI('/mini game/Button Close.png');
const PANEL_W = 640;
const PANEL_H = 720;
const PANEL_ZOOM = 1.3;
/** Đổi cá tạm ẩn khỏi giao diện (feedback 2026-11-20); code giữ nguyên để bật lại. */
const TRADE_ENABLED = false;

type FriendsTab = 'friends' | 'requests';

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

export interface FriendsPopupOptions {
  root: HTMLElement;
  services: Services;
  openDirect: (playerId: string) => void;
  openPlayer: (playerId: string) => void;
}

export class FriendsPopup {
  private overlay: HTMLElement | null = null;
  private readonly list = el('div', 'friends__list');
  /** Hai tab "Bạn bè" / "Lời mời kết bạn" (feedback 2026-11-20); mở popup luôn về tab Bạn bè. */
  private tab: FriendsTab = 'friends';
  private readonly tabFriends = el('button', 'friends__tab');
  private readonly tabRequests = el('button', 'friends__tab');
  private readonly requestsBadge = el('span', 'chat-tabs__badge');
  private cleanups: (() => void)[] = [];
  private busy = new Set<string>();
  private confirming = new Set<string>();
  private readonly tradeBusy = new Set<string>();
  /** Đang ở màn chọn cá đổi với một người bạn (thay cho danh sách). */
  private composer: TradeComposer | null = null;

  constructor(private readonly options: FriendsPopupOptions) {}

  open(): void {
    if (this.overlay) return;
    const overlay = el('div', 'shop friends');
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-label', 'Bạn bè');
    const panel = el('div', 'player-info__panel friends__panel');
    const close = el('button', 'profile__close player-info__close');
    close.type = 'button';
    close.setAttribute('aria-label', 'Đóng bạn bè');
    const icon = el('img', '');
    icon.src = CLOSE;
    icon.alt = '';
    close.append(icon);
    close.addEventListener('click', () => this.close());
    this.tab = 'friends';
    const tabs = el('div', 'friends__tabs');
    tabs.setAttribute('role', 'tablist');
    for (const [button, tab, label] of [
      [this.tabFriends, 'friends', 'Bạn bè'],
      [this.tabRequests, 'requests', 'Lời mời kết bạn'],
    ] as const) {
      button.type = 'button';
      button.setAttribute('role', 'tab');
      button.replaceChildren(el('span', 'friends__tab-label', label));
      button.onclick = () => {
        if (this.tab === tab) return;
        this.tab = tab;
        this.closeComposer();
        this.render();
        this.list.scrollTop = 0;
      };
      tabs.append(button);
    }
    this.tabRequests.append(this.requestsBadge);
    panel.append(close, el('h2', 'friends__title', 'Bạn bè'), tabs, this.list);
    overlay.append(panel);
    overlay.style.setProperty(
      '--shop-scale',
      String(
        Math.min(
          PANEL_ZOOM,
          (UI_DESIGN_WIDTH * 0.92) / PANEL_W,
          (UI_DESIGN_HEIGHT * 0.9) / PANEL_H,
        ),
      ),
    );
    overlay.addEventListener('pointerdown', (event) => {
      if (event.target === overlay) this.close();
    });
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') this.close();
    };
    window.addEventListener('keydown', onKey);
    const { store } = this.options.services;
    this.cleanups.push(
      () => window.removeEventListener('keydown', onKey),
      store.select(
        (s) => s.social,
        () => this.render(),
      ),
      // Chỉ vẽ lại khi tập bạn bè đang ở hồ đổi. Server thật gửi vị trí người/bot liên tục nên `lake.players` đổi
      // tham chiếu mỗi tick; vẽ lại theo nó thay nút giữa lúc nhấn và nhả chuột, làm click không bao giờ kích hoạt.
      store.select(
        (s) =>
          (s.social.friends ?? [])
            .filter((f) => Boolean(s.lake.players[f.playerId]))
            .map((f) => f.playerId)
            .sort()
            .join(','),
        () => this.render(),
      ),
      store.select(
        (s) => s.inventory,
        () => this.composer?.render(),
      ),
    );
    this.overlay = overlay;
    this.options.root.append(overlay);
    animateIn(overlay, 'fade');
    animateIn(panel, 'pop');
    this.render();
    void reloadFriends(this.options.services).catch((error: unknown) =>
      showError(this.options.root, error),
    );
    void reloadTrades(this.options.services).catch(() => undefined);
  }

  close(): void {
    const overlay = this.overlay;
    if (!overlay) return;
    this.closeComposer();
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
    this.closeComposer();
    this.cleanups.forEach((cleanup) => cleanup());
    this.cleanups = [];
    this.overlay?.remove();
    this.overlay = null;
  }

  private closeComposer(): void {
    this.composer?.destroy();
    this.composer = null;
  }

  private openComposer(friend: FriendEntry): void {
    this.closeComposer();
    this.composer = new TradeComposer({
      services: this.options.services,
      root: this.options.root,
      friend,
      onBack: () => {
        this.closeComposer();
        this.render();
      },
    });
    this.render();
  }

  private render(): void {
    if (!this.overlay) return;
    if (this.composer) {
      this.list.replaceChildren(this.composer.element);
      return;
    }
    const { social, lake } = this.options.services.store.getState();
    this.tabFriends.classList.toggle('friends__tab--active', this.tab === 'friends');
    this.tabRequests.classList.toggle('friends__tab--active', this.tab === 'requests');
    this.tabFriends.setAttribute('aria-selected', String(this.tab === 'friends'));
    this.tabRequests.setAttribute('aria-selected', String(this.tab === 'requests'));
    const pending = social.incoming.length;
    this.requestsBadge.textContent = pending > 99 ? '99+' : String(pending);
    this.requestsBadge.hidden = pending === 0;
    if (this.tab === 'requests') {
      this.list.replaceChildren(...this.requestNodes());
      return;
    }
    const nodes: HTMLElement[] = [];
    const trades = social.trades;
    const tradeCount = (trades?.incoming.length ?? 0) + (trades?.outgoing.length ?? 0);
    if (TRADE_ENABLED && trades && tradeCount > 0) {
      const options = {
        services: this.options.services,
        root: this.options.root,
        refresh: () => this.render(),
        busy: this.tradeBusy,
      };
      nodes.push(el('h3', 'friends__section', `Đề nghị đổi cá (${tradeCount})`));
      for (const trade of trades.incoming) nodes.push(tradeRow(trade, true, options));
      for (const trade of trades.outgoing) nodes.push(tradeRow(trade, false, options));
    }
    const friends = [...(social.friends ?? [])]
      .map((f) => ({ ...f, online: f.online || Boolean(lake.players[f.playerId]) }))
      .sort(
        (a, b) =>
          Number(b.online) - Number(a.online) || a.displayName.localeCompare(b.displayName, 'vi'),
      );
    nodes.push(el('h3', 'friends__section', `Bạn bè (${friends.length})`));
    if (social.friends === null) nodes.push(el('p', 'friends__empty', 'Đang tải...'));
    else if (friends.length === 0) {
      nodes.push(
        el(
          'p',
          'friends__empty',
          'Chưa có bạn bè. Bấm vào người chơi khác trên hồ để xem thông tin và kết bạn.',
        ),
      );
    }
    for (const friend of friends) nodes.push(this.friendRow(friend));
    this.list.replaceChildren(...nodes);
  }

  private requestNodes(): HTMLElement[] {
    const { incoming } = this.options.services.store.getState().social;
    if (incoming.length === 0) {
      return [el('p', 'friends__empty', 'Chưa có lời mời kết bạn nào.')];
    }
    return [
      el('h3', 'friends__section', `Lời mời kết bạn (${incoming.length})`),
      ...incoming.map((request) => this.requestRow(request)),
    ];
  }

  private person(
    entry: { skinId: string; displayName: string; level: number },
    online: boolean | null,
  ): HTMLElement {
    const who = el('div', 'friends__who');
    const avatar = el('span', 'chat-msg__avatar');
    avatar.append(faceElement(entry.skinId, 'chat-msg__face'));
    const info = el('div', 'friends__info');
    const name = el('div', 'friends__name');
    if (online !== null) {
      name.append(el('span', `chat-direct__dot${online ? ' chat-direct__dot--on' : ''}`));
    }
    name.append(el('span', '', entry.displayName));
    info.append(
      name,
      el(
        'div',
        'friends__meta',
        online === null
          ? `Lv.${entry.level}`
          : `Lv.${entry.level} · ${online ? 'Đang ở hồ' : 'Ngoại tuyến'}`,
      ),
    );
    who.append(avatar, info);
    return who;
  }

  private button(
    text: string,
    primary: boolean,
    onClick: () => void,
    disabled = false,
  ): HTMLButtonElement {
    const button = el(
      'button',
      `profile-dialog__btn ${primary ? 'profile-dialog__btn--save' : 'profile-dialog__btn--cancel'} friends__btn`,
      text,
    );
    button.type = 'button';
    button.disabled = disabled;
    button.addEventListener('click', onClick);
    return button;
  }

  private friendRow(friend: FriendEntry): HTMLElement {
    const row = el('div', 'friends__row');
    const actions = el('div', 'friends__actions');
    actions.append(
      this.button('Nhắn tin', true, () => {
        this.close();
        this.options.openDirect(friend.playerId);
      }),
      ...(TRADE_ENABLED ? [this.button('Đổi cá', false, () => this.openComposer(friend))] : []),
      this.button('Xem', false, () => this.options.openPlayer(friend.playerId)),
      this.button(
        this.confirming.has(friend.playerId) ? 'Bấm lại để xoá' : 'Xoá',
        false,
        () => void this.remove(friend),
        this.busy.has(friend.playerId),
      ),
    );
    row.append(this.person(friend, friend.online), actions);
    return row;
  }

  private requestRow(request: FriendRequestEntry): HTMLElement {
    const row = el('div', 'friends__row friends__row--request');
    const actions = el('div', 'friends__actions');
    const busy = this.busy.has(request.playerId);
    actions.append(
      this.button('Đồng ý', true, () => void this.answer(request, true), busy),
      this.button('Từ chối', false, () => void this.answer(request, false), busy),
    );
    const who = this.person(request, null);
    who.addEventListener('click', () => this.options.openPlayer(request.playerId));
    row.append(who, actions);
    return row;
  }

  /** Bấm lần đầu chỉ hỏi lại (4 giây), bấm lần hai mới xoá bạn. */
  private async remove(friend: FriendEntry): Promise<void> {
    if (this.busy.has(friend.playerId)) return;
    if (!this.confirming.has(friend.playerId)) {
      this.confirming.add(friend.playerId);
      this.render();
      window.setTimeout(() => {
        if (this.confirming.delete(friend.playerId)) this.render();
      }, 4000);
      return;
    }
    this.confirming.delete(friend.playerId);
    this.busy.add(friend.playerId);
    this.render();
    try {
      await removeFriend(this.options.services, friend.playerId);
      showToast(this.options.root, `Đã xoá ${friend.displayName} khỏi danh sách bạn bè.`);
    } catch (error) {
      showError(this.options.root, error);
    } finally {
      this.busy.delete(friend.playerId);
      this.render();
    }
  }

  private async answer(request: FriendRequestEntry, accept: boolean): Promise<void> {
    if (this.busy.has(request.playerId)) return;
    this.busy.add(request.playerId);
    this.render();
    try {
      if (accept) {
        await acceptFriend(this.options.services, request.playerId);
        showToast(this.options.root, `Bạn và ${request.displayName} đã là bạn bè.`);
      } else {
        await declineFriend(this.options.services, request.playerId);
      }
    } catch (error) {
      showError(this.options.root, error);
    } finally {
      this.busy.delete(request.playerId);
      this.render();
    }
  }
}
