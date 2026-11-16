// Khung "Ngoại hình" theo ảnh mẫu 2026-11-16 (public/new resources/ui/Skin), mở từ avatar trong popup Hồ sơ.
// Khung Appearance Panel.png 1124×712 (vẽ ở tỉ lệ 4): ô xem trước + tên + nút Mặc bên trái, lưới thẻ skin bên phải.
// Skin lấy từ Server (GET /skins, PUT /me/skin); skin shop chưa mua hiện mờ và không mặc được, mua ở cửa hàng.
import { UI_DESIGN_HEIGHT, UI_DESIGN_WIDTH } from '../../core/env';
import type { Services } from '../../core/services';
import type { SelectSkinResponse, SkinView } from '../../net/contract';
import { showError, showToast } from '../kit/components';
import { animateIn, animateOut } from '../kit/motion';
import { loadSkins, skinImage } from './skinArt';

const UI = (file: string) => encodeURI(`/new resources/ui/${file}`);
const CLOSE = encodeURI('/mini game/Button Close.png');
const PANEL_W = 1124;
const PANEL_H = 712;
const PANEL_ZOOM = 1.5;
/** Thanh cuộn vẽ sẵn trong ảnh: x 1056..1068, y 160..656. */
const TRACK_TOP = 160;
const TRACK_HEIGHT = 496;
const THUMB_MIN = 48;

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

export interface SkinPopupOptions {
  root: HTMLElement;
  services: Services;
}

export class SkinPopup {
  private overlay: HTMLElement | null = null;
  private skins: SkinView[] = [];
  /** Skin đang xem ở ô bên trái (chưa chắc đang mặc). */
  private viewing: string | null = null;
  private busy = false;
  private cleanups: (() => void)[] = [];
  private readonly grid = el('div', 'skin__grid');
  private readonly preview = el('div', 'skin__preview');
  private readonly nameEl = el('div', 'skin__name');
  private readonly action = el('div', 'skin__action');
  private readonly trackCover = el('div', 'skin__track');
  private readonly thumb = el('div', 'skin__thumb');

  constructor(private readonly options: SkinPopupOptions) {}

  get isOpen(): boolean {
    return this.overlay !== null;
  }

  open(): void {
    if (this.overlay) return;
    const overlay = el('div', 'shop skin');
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-label', 'Ngoại hình');
    const panel = el('div', 'skin__panel');
    const close = el('button', 'skin__close');
    close.type = 'button';
    close.setAttribute('aria-label', 'Đóng ngoại hình');
    close.append(img(CLOSE));
    close.addEventListener('click', () => this.close());
    panel.append(
      img(UI('Skin/Appearance Panel.png'), 'shop__art'),
      close,
      this.preview,
      this.nameEl,
      this.action,
      this.grid,
      this.trackCover,
      this.thumb,
    );
    overlay.append(panel);
    overlay.style.setProperty(
      '--shop-scale',
      String(
        Math.min(
          PANEL_ZOOM,
          (UI_DESIGN_WIDTH * 0.96) / PANEL_W,
          (UI_DESIGN_HEIGHT * 0.92) / PANEL_H,
        ),
      ),
    );

    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      // Đóng riêng khung này, không đóng luôn popup Hồ sơ nằm dưới.
      event.stopImmediatePropagation();
      this.close();
    };
    // Giai đoạn capture để chạy trước phím Escape của popup Hồ sơ.
    window.addEventListener('keydown', onKey, true);
    overlay.addEventListener('pointerdown', (event) => {
      if (event.target === overlay) this.close();
    });
    const onScroll = () => this.syncScrollbar();
    this.grid.addEventListener('scroll', onScroll);
    const { store } = this.options.services;
    this.cleanups.push(
      () => window.removeEventListener('keydown', onKey, true),
      () => this.grid.removeEventListener('scroll', onScroll),
      store.select(
        (s) => s.session.profile?.selectedSkinId,
        () => this.render(),
      ),
    );

    this.overlay = overlay;
    this.options.root.append(overlay);
    animateIn(overlay, 'fade');
    animateIn(panel, 'pop');
    this.viewing = this.equippedId();
    this.render();
    void this.reload();
  }

  close(): void {
    const overlay = this.overlay;
    if (!overlay) return;
    this.overlay = null;
    this.cleanups.forEach((cleanup) => cleanup());
    this.cleanups = [];
    overlay.style.pointerEvents = 'none';
    const panel = overlay.querySelector<HTMLElement>('.skin__panel');
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

  private equippedId(): string {
    return this.options.services.store.getState().session.profile?.selectedSkinId ?? 'skin_01';
  }

  private async reload(): Promise<void> {
    try {
      this.skins = (await loadSkins(this.options.services.api)).skins;
      this.render();
    } catch (error) {
      showError(this.options.root, error);
    }
  }

  private render(): void {
    if (!this.overlay) return;
    const equipped = this.equippedId();
    const viewing = this.skins.find((skin) => skin.skinId === this.viewing);

    const scrollTop = this.grid.scrollTop;
    this.grid.replaceChildren(
      ...this.skins.map((skin) => {
        const isEquipped = skin.skinId === equipped;
        const card = el('button', 'skin__card');
        card.type = 'button';
        card.setAttribute('aria-label', skin.name);
        card.setAttribute('aria-pressed', String(skin.skinId === this.viewing));
        card.classList.toggle('skin__card--equipped', isEquipped);
        card.classList.toggle('skin__card--viewing', skin.skinId === this.viewing);
        card.classList.toggle('skin__card--locked', !skin.owned);
        card.append(
          skinImage(skin.skinId, 3, 'skin__card-art'),
          el('span', 'skin__card-name', skin.name),
        );
        card.addEventListener('click', () => {
          this.viewing = skin.skinId;
          this.render();
        });
        return card;
      }),
    );

    this.grid.scrollTop = scrollTop;

    this.preview.replaceChildren(
      ...(viewing ? [skinImage(viewing.skinId, 5, 'skin__preview-art')] : []),
    );
    this.nameEl.textContent = viewing?.name ?? 'Tên trang phục';

    // Đang mặc thì chừa nút "Đã mặc" vẽ sẵn trong ảnh; còn lại che nút đó và vẽ nút Mặc / Chưa sở hữu.
    this.action.replaceChildren();
    this.action.hidden = !viewing || viewing.skinId === equipped;
    if (viewing && viewing.skinId !== equipped) {
      const wear = el('button', 'shop-small skin__wear', viewing.owned ? 'Mặc' : 'Chưa sở hữu');
      wear.type = 'button';
      wear.disabled = !viewing.owned || this.busy;
      wear.addEventListener('click', () => void this.wear(viewing));
      this.action.append(wear);
    }
    this.syncScrollbar();
  }

  /** Thanh cuộn: ảnh chỉ vẽ một thanh tĩnh, nên khi có nhiều hàng thẻ thì che và vẽ lại thanh chạy theo nội dung. */
  private syncScrollbar(): void {
    const { scrollHeight, clientHeight, scrollTop } = this.grid;
    const overflow = scrollHeight > clientHeight + 1;
    this.trackCover.hidden = !overflow;
    this.thumb.hidden = !overflow;
    if (!overflow) return;
    const height = Math.max(THUMB_MIN, Math.round((TRACK_HEIGHT * clientHeight) / scrollHeight));
    const ratio = scrollTop / Math.max(1, scrollHeight - clientHeight);
    this.thumb.style.height = `${height}px`;
    this.thumb.style.top = `${TRACK_TOP + Math.round((TRACK_HEIGHT - height) * ratio)}px`;
  }

  private async wear(skin: SkinView): Promise<void> {
    if (this.busy) return;
    this.busy = true;
    this.render();
    const { api, store } = this.options.services;
    try {
      const result = await api.put<SelectSkinResponse>('/me/skin', { skinId: skin.skinId });
      const profile = store.getState().session.profile;
      if (profile) {
        store.dispatch({
          type: 'session/profile',
          payload: { ...profile, selectedSkinId: result.selectedSkinId },
        });
      }
      showToast(this.options.root, `Đã mặc ${skin.name}.`);
    } catch (error) {
      showError(this.options.root, error);
    } finally {
      this.busy = false;
      this.render();
    }
  }
}
