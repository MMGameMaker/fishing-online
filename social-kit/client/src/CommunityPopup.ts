// Popup "Cộng đồng" (2026-11-27), mở từ menu ☰: ảnh tài khoản Google/Facebook, vào nhóm Facebook (mở liên kết + xác nhận bằng mã ghim trong nhóm)
// và chia sẻ lên Facebook / vào nhóm. Server chỉ đếm lượt bấm và kiểm mã vì Meta đã gỡ Groups API (xem social-kit/server).
// Mọi thứ phụ thuộc game (gọi API, toast, hiệu ứng hiện/ẩn, kích thước khung) đi qua CommunityHost; xem social-kit/README.md.
// Lớp CSS dùng khung của host (shop, player-info, profile-dialog); community.css chỉ chứa phần riêng của popup.
import type { CommunityView, ShareKind } from './types';
import {
  SHARE_LABEL,
  facebookShareUrl,
  normalizeGroupCode,
  providerLabel,
  safeHttpsUrl,
  sharesTotal,
} from './communityModel';

const PANEL_W = 700;
const PANEL_H = 760;
const PANEL_ZOOM = 1.4;
const BTN = 'profile-dialog__btn profile-dialog__btn--save player-info__btn community__btn';

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

/** Cổng gọi Server của popup (đường dẫn tương đối, ví dụ '/me/community'). ApiClient của game đáp ứng sẵn. */
export interface CommunityHttp {
  get<T>(path: string): Promise<T>;
  post<T>(path: string, body?: unknown): Promise<T>;
  getBlob(path: string): Promise<Blob>;
}

/** Những thứ host (game) cung cấp cho popup. */
export interface CommunityHost {
  root: HTMLElement;
  http: CommunityHttp;
  toast(message: string): void;
  error(error: unknown): void;
  animateIn(el: HTMLElement, kind: 'fade' | 'pop'): void;
  animateOut(el: HTMLElement, kind: 'fade' | 'pop'): Promise<void>;
  /** Kích thước khung thiết kế của UI, để tính tỉ lệ popup. */
  designSize: { width: number; height: number };
  /** Ảnh nút đóng. */
  closeIconUrl: string;
}

export class CommunityPopup {
  private overlay: HTMLElement | null = null;
  private view: CommunityView | null = null;
  private busy = false;
  private cleanups: (() => void)[] = [];
  private avatarUrl: string | null = null;
  private readonly body = el('div', 'community__body');

  constructor(private readonly options: CommunityHost) {}

  get isOpen(): boolean {
    return this.overlay !== null;
  }

  async open(): Promise<void> {
    if (this.overlay) return;
    const overlay = el('div', 'shop player-info community');
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-label', 'Cộng đồng');
    const panel = el('div', 'player-info__panel community__panel');
    const close = el('button', 'profile__close player-info__close');
    close.type = 'button';
    close.setAttribute('aria-label', 'Đóng');
    const icon = el('img', '');
    icon.src = this.options.closeIconUrl;
    icon.alt = '';
    close.append(icon);
    close.addEventListener('click', () => this.close());
    this.body.replaceChildren(el('p', 'community__note', 'Đang tải...'));
    panel.append(close, el('h2', 'community__title', 'CỘNG ĐỒNG'), this.body);
    overlay.append(panel);
    overlay.style.setProperty(
      '--shop-scale',
      String(Math.min(PANEL_ZOOM, (this.options.designSize.width * 0.92) / PANEL_W, (this.options.designSize.height * 0.9) / PANEL_H)),
    );
    overlay.addEventListener('pointerdown', (event) => {
      if (event.target === overlay) this.close();
    });
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') this.close();
    };
    window.addEventListener('keydown', onKey);
    this.cleanups.push(() => window.removeEventListener('keydown', onKey));
    this.overlay = overlay;
    this.options.root.append(overlay);
    this.options.animateIn(overlay, 'fade');
    this.options.animateIn(panel, 'pop');
    await this.reload();
  }

  close(immediate = false): void {
    const overlay = this.overlay;
    if (!overlay) return;
    this.overlay = null;
    this.cleanups.forEach((cleanup) => cleanup());
    this.cleanups = [];
    if (this.avatarUrl) URL.revokeObjectURL(this.avatarUrl);
    this.avatarUrl = null;
    if (immediate) {
      overlay.remove();
      return;
    }
    overlay.style.pointerEvents = 'none';
    const panel = overlay.querySelector<HTMLElement>('.community__panel');
    void Promise.all([
      panel ? this.options.animateOut(panel, 'pop') : Promise.resolve(),
      this.options.animateOut(overlay, 'fade'),
    ]).then(() => overlay.remove());
  }

  destroy(): void {
    this.close(true);
  }

  private async reload(): Promise<void> {
    try {
      this.view = await this.options.http.get<CommunityView>('/me/community');
      this.render();
    } catch (error) {
      this.options.error(error);
      this.close();
    }
  }

  /** Gọi Server (có khoá chống bấm đúp), cập nhật khung nhìn rồi vẽ lại. */
  private async act(request: () => Promise<CommunityView>, okMessage?: string): Promise<void> {
    if (this.busy) return;
    this.busy = true;
    try {
      this.view = await request();
      if (okMessage) this.options.toast(okMessage);
      this.render();
    } catch (error) {
      // Lỗi (ví dụ mã sai) thì giữ nguyên khung và chữ người chơi đã nhập để sửa lại.
      this.options.error(error);
    } finally {
      this.busy = false;
    }
  }

  private render(): void {
    const view = this.view;
    if (!view || !this.overlay) return;
    this.body.replaceChildren(this.accountSection(view), this.groupSection(view), this.shareSection(view));
  }

  private accountSection(view: CommunityView): HTMLElement {
    const section = el('section', 'community__section community__account');
    const avatar = el('span', 'community__avatar');
    if (view.avatarUrl) {
      const img = el('img', 'community__avatar-img');
      img.alt = '';
      img.draggable = false;
      // Ảnh nằm sau đăng nhập nên lấy kèm token (http.getBlob) rồi dựng blob URL.
      void this.loadAvatar(view.avatarUrl).then((url) => {
        if (url) img.src = url;
      });
      avatar.append(img);
    } else avatar.textContent = '?';
    const text = el('div', 'community__account-text');
    text.append(
      el('strong', 'community__heading', 'Tài khoản'),
      el('span', 'community__note', providerLabel(view.avatarProvider)),
    );
    section.append(avatar, text);
    return section;
  }

  private async loadAvatar(path: string): Promise<string | null> {
    try {
      const blob = await this.options.http.getBlob(path);
      if (!this.overlay) return null;
      if (this.avatarUrl) URL.revokeObjectURL(this.avatarUrl);
      this.avatarUrl = URL.createObjectURL(blob);
      return this.avatarUrl;
    } catch {
      return null;
    }
  }

  private groupSection(view: CommunityView): HTMLElement {
    const section = el('section', 'community__section');
    section.append(el('strong', 'community__heading', 'Nhóm Facebook'));
    const groupUrl = safeHttpsUrl(view.groupUrl);
    if (!groupUrl) {
      section.append(el('p', 'community__note', 'Chưa có nhóm Facebook.'));
      return section;
    }
    const row = el('div', 'community__row');
    const join = el('button', BTN, 'Vào nhóm Facebook');
    join.type = 'button';
    join.addEventListener('click', () => {
      // Mở ngay trong thao tác bấm (tránh bị chặn popup), rồi ghi nhận lượt bấm.
      window.open(groupUrl, '_blank', 'noopener,noreferrer');
      void this.act(() => this.options.http.post<CommunityView>('/me/community/join-click'));
    });
    row.append(join);
    section.append(row);
    if (view.groupVerified) {
      section.append(el('p', 'community__ok', '✓ Đã xác nhận tham gia nhóm'));
    } else if (view.groupCodeEnabled) {
      section.append(
        el('p', 'community__note', 'Sau khi vào nhóm, tìm mã ghim trong nhóm và nhập vào đây để xác nhận.'),
      );
      const form = el('div', 'community__row');
      const input = el('input', 'community__input');
      input.type = 'text';
      input.placeholder = 'Mã trong nhóm';
      input.maxLength = 64;
      input.autocomplete = 'off';
      const confirm = el('button', BTN, 'Xác nhận');
      confirm.type = 'button';
      const submit = () => {
        const code = normalizeGroupCode(input.value);
        if (!code) {
          this.options.toast('Mã không hợp lệ.');
          return;
        }
        void this.act(
          () => this.options.http.post<CommunityView>('/me/community/verify-group', { code }),
          'Đã xác nhận tham gia nhóm.',
        );
      };
      confirm.addEventListener('click', submit);
      input.addEventListener('keydown', (event) => {
        if (event.key === 'Enter') submit();
      });
      form.append(input, confirm);
      section.append(form);
    } else {
      section.append(
        el('p', 'community__note', view.joinLinkClicked ? 'Bạn đã mở liên kết nhóm.' : 'Bấm để mở nhóm trong tab mới.'),
      );
    }
    return section;
  }

  private shareSection(view: CommunityView): HTMLElement {
    const section = el('section', 'community__section');
    section.append(el('strong', 'community__heading', 'Chia sẻ'));
    const shareUrl = safeHttpsUrl(view.shareUrl);
    if (!shareUrl) {
      section.append(el('p', 'community__note', 'Chưa có nội dung để chia sẻ.'));
      return section;
    }
    const row = el('div', 'community__row');
    for (const kind of ['feed', 'group'] as ShareKind[]) {
      const button = el('button', BTN, SHARE_LABEL[kind]);
      button.type = 'button';
      button.addEventListener('click', () => {
        window.open(facebookShareUrl(shareUrl), '_blank', 'noopener,noreferrer,width=640,height=560');
        void this.act(() => this.options.http.post<CommunityView>('/me/community/share', { kind }));
      });
      row.append(button);
    }
    section.append(
      row,
      el('p', 'community__note', 'Chia sẻ vào nhóm: chọn mục Nhóm trong cửa sổ Facebook vừa mở.'),
      el(
        'p',
        'community__stat',
        `Đã bấm chia sẻ: ${sharesTotal(view)} lần (trang cá nhân ${view.shares.feed}, nhóm ${view.shares.group}). Số này đếm lượt bấm trong game, không phải số bài thật trên Facebook.`,
      ),
    );
    return section;
  }
}
