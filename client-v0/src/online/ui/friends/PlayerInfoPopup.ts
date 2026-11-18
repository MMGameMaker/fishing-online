// Popup thông tin người chơi khác (BOT-02 mục 4): bấm vào nhân vật trên hồ hoặc "Xem" trong danh sách bạn.
// Avatar theo skin, tên, level, thanh kinh nghiệm, danh hiệu, lời nhắn, 3 ô cá khoe và nút Kết bạn (đổi thành
// "Đã gửi lời mời" / "Bạn bè" + "Nhắn tin"). Dùng lại khung, ô cá và nút của popup Tài khoản (profile.css).
// Dữ liệu: GET /players/{id}/profile (Server C# và mock cùng contract). Hiện/ẩn qua ui/kit/motion.ts.
import { UI_DESIGN_HEIGHT, UI_DESIGN_WIDTH } from '../../core/env';
import type { Services } from '../../core/services';
import type { FriendStatus, PublicProfile } from '../../net/contract';
import { faceElement } from '../../social/skinFace';
import { fishImage } from '../fishArt';
import { levelProgress } from '../home/levelProgress';
import { showError, showToast } from '../kit/components';
import { animateIn, animateOut } from '../kit/motion';
import { SHOWCASE_SLOTS, formatLength, titleLabel } from '../profile/profileModel';
import { acceptFriend, declineFriend, sendFriendRequest } from './friendActions';
import { currentFriendStatus, friendButtons } from './friendStatus';

const CLOSE = encodeURI('/mini game/Button Close.png');
const PANEL_W = 640;
const PANEL_H = 600;
const PANEL_ZOOM = 1.4;

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

export interface PlayerInfoPopupOptions {
  root: HTMLElement;
  services: Services;
  /** Nút "Nhắn tin": mở tab Tin riêng với người này. */
  openDirect: (playerId: string) => void;
}

export class PlayerInfoPopup {
  private overlay: HTMLElement | null = null;
  private profile: PublicProfile | null = null;
  private busy = false;
  private cleanups: (() => void)[] = [];
  private readonly body = el('div', 'player-info__content');
  private readonly actions = el('div', 'player-info__actions');

  constructor(private readonly options: PlayerInfoPopupOptions) {}

  get isOpen(): boolean {
    return this.overlay !== null;
  }

  async open(playerId: string): Promise<void> {
    if (this.overlay && this.profile?.playerId === playerId) return;
    this.close(true);
    const overlay = el('div', 'shop player-info');
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-label', 'Thông tin người chơi');
    const panel = el('div', 'player-info__panel');
    const close = el('button', 'profile__close player-info__close');
    close.type = 'button';
    close.setAttribute('aria-label', 'Đóng');
    const icon = el('img', '');
    icon.src = CLOSE;
    icon.alt = '';
    close.append(icon);
    close.addEventListener('click', () => this.close());
    this.body.replaceChildren(el('p', 'player-info__loading', 'Đang tải...'));
    this.actions.replaceChildren();
    panel.append(close, this.body, this.actions);
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
    this.cleanups.push(
      () => window.removeEventListener('keydown', onKey),
      this.options.services.store.select(
        (s) => s.social,
        () => this.renderActions(),
      ),
    );
    this.overlay = overlay;
    this.options.root.append(overlay);
    animateIn(overlay, 'fade');
    animateIn(panel, 'pop');

    try {
      const profile = await this.options.services.api.get<PublicProfile>(
        `/players/${playerId}/profile`,
      );
      if (this.overlay !== overlay) return;
      this.profile = profile;
      this.render();
    } catch (error) {
      showError(this.options.root, error);
      if (this.overlay === overlay) this.close();
    }
  }

  close(immediate = false): void {
    const overlay = this.overlay;
    if (!overlay) return;
    this.overlay = null;
    this.profile = null;
    this.cleanups.forEach((cleanup) => cleanup());
    this.cleanups = [];
    if (immediate) {
      overlay.remove();
      return;
    }
    overlay.style.pointerEvents = 'none';
    const panel = overlay.querySelector<HTMLElement>('.player-info__panel');
    void Promise.all([
      panel ? animateOut(panel, 'pop') : Promise.resolve(),
      animateOut(overlay, 'fade'),
    ]).then(() => overlay.remove());
  }

  destroy(): void {
    this.close(true);
  }

  private speciesName(speciesId: string): string {
    return (
      this.options.services.store.getState().catalog?.fish.find((f) => f.speciesId === speciesId)
        ?.name ?? speciesId
    );
  }

  private render(): void {
    const profile = this.profile;
    if (!profile) return;
    const { catalog, lake } = this.options.services.store.getState();

    const top = el('div', 'player-info__top');
    const avatar = el('div', 'player-info__avatar');
    avatar.append(faceElement(profile.skinId, 'player-info__face'));
    const id = el('div', 'player-info__id');
    const nameRow = el('div', 'player-info__name-row');
    const online = profile.online || Boolean(lake.players[profile.playerId]);
    const dot = el('span', `chat-direct__dot${online ? ' chat-direct__dot--on' : ''}`);
    dot.title = online ? 'Đang ở hồ' : 'Không ở hồ';
    nameRow.append(dot, el('span', 'player-info__name', profile.displayName));
    const progress = levelProgress(profile.exp, profile.level, catalog?.levels ?? []);
    const bar = el('div', 'profile__bar player-info__bar');
    const fill = el('div', 'profile__bar-fill');
    fill.style.width = `${Math.round(progress.ratio * 1000) / 10}%`;
    bar.append(fill);
    const level = el('div', 'player-info__level');
    level.append(
      el('span', '', `Lv.${profile.level}`),
      el(
        'span',
        '',
        !catalog
          ? `Kinh nghiệm ${profile.exp}`
          : progress.needed === null
            ? 'Kinh nghiệm tối đa'
            : `Kinh nghiệm ${progress.current}/${progress.needed}`,
      ),
    );
    id.append(nameRow, level, bar, el('div', 'player-info__title', titleLabel(profile.titleId)));
    top.append(avatar, id);

    const bio = el('div', `player-info__bio${profile.bio ? '' : ' profile__bio--empty'}`);
    bio.textContent = profile.bio || 'Chưa có lời nhắn.';

    const slots = el('div', 'player-info__slots');
    for (let i = 0; i < SHOWCASE_SLOTS; i++) {
      const data = profile.showcase.find((s) => s.slot === i);
      const slot = el('div', 'profile__slot player-info__slot');
      if (data?.speciesId) {
        slot.setAttribute('aria-label', this.speciesName(data.speciesId));
        slot.title = this.speciesName(data.speciesId);
        slot.append(fishImage(data.speciesId, 'profile__slot-fish'));
        if (data.lengthTenthCm !== null) {
          slot.append(el('span', 'profile__slot-length', formatLength(data.lengthTenthCm)));
        }
      }
      slots.append(slot);
    }

    this.body.replaceChildren(top, bio, el('div', 'player-info__caption', 'Cá khoe'), slots);
    animateIn(this.body, 'fade');
    this.renderActions();
  }

  private status(): FriendStatus {
    const profile = this.profile;
    if (!profile) return 'none';
    return currentFriendStatus(
      profile.playerId,
      profile.friendStatus,
      this.options.services.store.getState().social,
    );
  }

  private renderActions(): void {
    const profile = this.profile;
    if (!profile || !this.overlay) return;
    const view = friendButtons(this.status());
    const nodes: HTMLElement[] = [];
    if (view.label) nodes.push(el('span', 'player-info__status', view.label));
    for (const action of view.actions) {
      const button = el(
        'button',
        `profile-dialog__btn ${action.primary ? 'profile-dialog__btn--save' : 'profile-dialog__btn--cancel'} player-info__btn`,
        action.text,
      );
      button.type = 'button';
      button.disabled = Boolean(action.disabled) || this.busy;
      button.addEventListener('click', () => void this.run(action.id, profile));
      nodes.push(button);
    }
    this.actions.replaceChildren(...nodes);
  }

  private async run(
    action: 'request' | 'accept' | 'decline' | 'message',
    profile: PublicProfile,
  ): Promise<void> {
    if (action === 'message') {
      this.close();
      this.options.openDirect(profile.playerId);
      return;
    }
    if (this.busy) return;
    this.busy = true;
    this.renderActions();
    const { services, root } = this.options;
    try {
      if (action === 'request') {
        const status = await sendFriendRequest(services, profile.playerId);
        showToast(
          root,
          status === 'friends'
            ? `Bạn và ${profile.displayName} đã là bạn bè.`
            : 'Đã gửi lời mời kết bạn.',
        );
      } else if (action === 'accept') {
        await acceptFriend(services, profile.playerId);
        showToast(root, `Bạn và ${profile.displayName} đã là bạn bè.`);
      } else {
        await declineFriend(services, profile.playerId);
        if (this.profile) this.profile = { ...this.profile, friendStatus: 'none' };
      }
    } catch (error) {
      showError(root, error);
    } finally {
      this.busy = false;
      this.renderActions();
    }
  }
}
