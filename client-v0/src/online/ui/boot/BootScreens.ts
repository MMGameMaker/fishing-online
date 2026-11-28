// Màn đăng nhập, Main Menu và màn tải theo thiết kế, dạng lớp DOM phủ kín cửa sổ.
// Art: public/new resources/ui/Login (khung Sign In Panel, nút Google, CHƠI, Đăng xuất) — feedback 2026-11-17.
// Chỉ pier.html bật (qua BootOptions.screens); trang khác vẫn dùng chữ Phaser cũ.
import { animateIn } from '../kit/motion';
import { CharacterSelect, type CharacterSelectOptions } from './CharacterSelect';

const TIPS = [
  'Mẹo: Ngồi vào ghế trống để bắt đầu câu cá.',
  'Mẹo: Bán cá trong cửa hàng để kiếm Gold.',
  'Mẹo: Sổ tay ghi lại mọi loài cá bạn đã câu.',
  'Mẹo: Cần câu tốt hơn giúp bắt cá hiếm dễ hơn.',
  'Mẹo: Cá thật to hoặc hiếm sẽ được khoe cho cả hồ.',
];

const LOGO = '/login/logo.png';
const ART = '/new%20resources/ui/Login';

export class BootScreens {
  private readonly root: HTMLElement;
  private readonly login: HTMLElement;
  private readonly menu: HTMLElement;
  private readonly blocked: HTMLElement;
  private readonly select: HTMLElement;
  private readonly loading: HTMLElement;
  private readonly googleBtn: HTMLButtonElement;
  private readonly playBtn: HTMLButtonElement;
  private readonly logoutBtn: HTMLButtonElement;
  private readonly taglineEl: HTMLElement;
  private readonly errorEl: HTMLElement;
  private readonly statusEl: HTMLElement;
  private readonly percentEl: HTMLElement;
  private readonly fillEl: HTMLElement;
  private readonly tipEl: HTMLElement;
  private onGoogle: (() => void) | null = null;
  private onFacebook: (() => void) | null = null;
  private readonly facebookBtn: HTMLButtonElement;
  private onPlay: (() => void) | null = null;
  private onLogout: (() => void) | null = null;

  /** `onGameVisible(true)` khi đã vào hồ (màn phủ tắt), `(false)` khi quay về đăng nhập/menu/tải. */
  constructor(
    parent: HTMLElement = document.body,
    private readonly options: { onGameVisible?: (visible: boolean) => void } = {},
  ) {
    this.root = document.createElement('div');
    this.root.className = 'boot-screens';
    this.root.innerHTML = `
      <div class="boot boot--login" hidden>
        <div class="boot__logo-zone"><img class="boot__logo" src="${LOGO}" alt="Fishing Online" /></div>
        <div class="boot__panel">
          <h2 class="boot__title">Đăng nhập</h2>
          <div class="boot__divider"><span></span><i></i><span></span></div>
          <button class="boot__google boot__art-btn" type="button" aria-label="Đăng nhập bằng Google">
            <img src="${ART}/Google.png" alt="" draggable="false" />
          </button>
          <button class="boot__facebook boot__art-btn" type="button" aria-label="Đăng nhập bằng Facebook">
            <img src="${ART}/Facebook%20(later).png" alt="" draggable="false" />
          </button>
          <p class="boot__tagline">Bạn có thể câu được cá lớn cỡ nào?</p>
          <p class="boot__error" hidden></p>
        </div>
      </div>
      <div class="boot boot--menu" hidden>
        <button class="boot__logout boot__art-btn" type="button" aria-label="Đăng xuất">
          <img src="${ART}/Button%20Logout.png" alt="" draggable="false" />
        </button>
        <div class="boot__logo-zone"><img class="boot__logo" src="${LOGO}" alt="Fishing Online" /></div>
        <button class="boot__play boot__art-btn" type="button" aria-label="Chơi">
          <img src="${ART}/Button%20Play.png" alt="" draggable="false" />
        </button>
      </div>
      <div class="boot boot--select" hidden></div>
      <div class="boot boot--blocked" hidden role="alertdialog" aria-modal="true" aria-labelledby="boot-blocked-title">
        <div class="boot__logo-zone"><img class="boot__logo" src="${LOGO}" alt="Fishing Online" /></div>
        <div class="boot__panel">
          <h2 class="boot__title" id="boot-blocked-title">Thông báo</h2>
          <div class="boot__divider"><span></span><i></i><span></span></div>
          <p class="boot__blocked-text">📵 Ứng dụng này không tương thích với điện thoại.</p>
          <p class="boot__tagline">Vui lòng truy cập bằng máy tính để chơi Fishing Online.</p>
        </div>
      </div>
      <div class="boot boot--loading" hidden>
        <div class="boot__logo-zone boot__logo-zone--grow"><img class="boot__logo" src="${LOGO}" alt="Fishing Online" /></div>
        <div class="boot__progress">
          <div class="boot__status"><span class="boot__status-text">Đang tải...</span> <span class="boot__percent">0%</span></div>
          <div class="boot__bar"><div class="boot__fill"><span class="boot__fish">🐟</span></div></div>
          <p class="boot__tip"></p>
        </div>
      </div>`;
    parent.appendChild(this.root);
    const q = <T extends HTMLElement>(sel: string): T => this.root.querySelector(sel) as T;
    this.login = q('.boot--login');
    this.menu = q('.boot--menu');
    this.blocked = q('.boot--blocked');
    this.select = q('.boot--select');
    this.loading = q('.boot--loading');
    this.googleBtn = q('.boot__google');
    this.facebookBtn = q('.boot__facebook');
    this.playBtn = q('.boot__play');
    this.logoutBtn = q('.boot__logout');
    this.taglineEl = q('.boot--login .boot__tagline');
    this.errorEl = q('.boot__error');
    this.statusEl = q('.boot__status-text');
    this.percentEl = q('.boot__percent');
    this.fillEl = q('.boot__fill');
    this.tipEl = q('.boot__tip');
    // Popup Google chỉ mở được ngay trong thao tác bấm, nên gọi thẳng trong sự kiện click.
    this.googleBtn.addEventListener('click', () => {
      if (this.googleBtn.disabled) return;
      this.onGoogle?.();
    });
    this.facebookBtn.addEventListener('click', () => {
      if (this.facebookBtn.disabled) return;
      this.onFacebook?.();
    });
    this.playBtn.addEventListener('click', () => {
      if (this.playBtn.disabled) return;
      this.playBtn.disabled = true;
      this.logoutBtn.disabled = true;
      this.onPlay?.();
    });
    this.logoutBtn.addEventListener('click', () => {
      if (this.logoutBtn.disabled) return;
      this.playBtn.disabled = true;
      this.logoutBtn.disabled = true;
      this.onLogout?.();
    });
    // Chặn phím/chuột lọt xuống game phía sau khi đang ở màn đăng nhập hoặc tải.
    this.root.addEventListener('keydown', (e) => e.stopPropagation());
  }

  /** Hiện màn đăng nhập (không có nút Đăng xuất); `onClick` chạy trong thao tác bấm nút Google. */
  showLogin(onClick: () => void, error?: string, onFacebook?: () => void): void {
    this.onGoogle = onClick;
    this.onFacebook = onFacebook ?? null;
    this.googleBtn.disabled = false;
    // Không có hàm Facebook (bản không hỗ trợ) thì ẩn nút.
    this.facebookBtn.hidden = !onFacebook;
    this.facebookBtn.disabled = !onFacebook;
    this.setError(error);
    this.show(this.login);
  }

  /** Đã đăng nhập từ lần trước: Main Menu với nút CHƠI và nút Đăng xuất. */
  showMenu(onPlay: () => void, onLogout: () => void): void {
    this.onPlay = onPlay;
    this.onLogout = onLogout;
    this.playBtn.disabled = false;
    this.logoutBtn.disabled = false;
    this.show(this.menu);
  }

  /**
   * Panel Chọn nhân vật (sau đăng nhập, trước khi vào hồ): hiện cho tới khi người chơi bấm VÀO HỒ (đã lưu xong). Nơi gọi tiếp tục
   * bằng `showLoading`.
   */
  chooseCharacter(options: CharacterSelectOptions): Promise<void> {
    this.show(this.select);
    return new CharacterSelect(this.select, options).run();
  }

  /** Hiện màn tải với dòng trạng thái và tiến độ 0–100. */
  showLoading(status = 'Đang tải...', percent = 0): void {
    if (this.loading.hidden) {
      this.tipEl.textContent = TIPS[Math.floor(Math.random() * TIPS.length)] ?? '';
    }
    this.show(this.loading);
    this.setProgress(percent, status);
  }

  setProgress(percent: number, status?: string): void {
    const p = Math.max(0, Math.min(100, Math.round(percent)));
    this.fillEl.style.width = `${p}%`;
    this.percentEl.textContent = `${p}%`;
    if (status) this.statusEl.textContent = status;
  }

  /** Lỗi vào game: về màn đăng nhập kèm lời báo để bấm thử lại. */
  showError(message: string, retry: () => void): void {
    this.showLogin(retry, message);
  }

  /** Chặn vào game (điện thoại): chỉ hiện thông báo, không có nút đăng nhập, không đóng được. */
  showBlocked(): void {
    this.show(this.blocked);
  }

  /** Tắt dần màn phủ khi đã vào được hồ. */
  hide(): void {
    this.setProgress(100);
    this.options.onGameVisible?.(true);
    this.root.classList.add('is-leaving');
    window.setTimeout(() => {
      if (!this.root.classList.contains('is-leaving')) return;
      this.root.classList.remove('is-open', 'is-leaving');
      for (const screen of [this.login, this.menu, this.blocked, this.loading, this.select])
        screen.hidden = true;
    }, 350);
  }

  private show(screen: HTMLElement): void {
    // Màn mới hiện mờ dần (đăng nhập, menu, tải đổi cho nhau), không bật tức thì.
    if (screen.hidden) animateIn(screen, 'fade');
    for (const s of [this.login, this.menu, this.blocked, this.loading, this.select]) s.hidden = s !== screen;
    this.options.onGameVisible?.(false);
    this.root.classList.add('is-open');
    this.root.classList.remove('is-leaving');
  }

  private setError(message?: string): void {
    // Lời báo lỗi thế chỗ dòng giới thiệu để khung không phình ra.
    this.errorEl.hidden = !message;
    this.errorEl.textContent = message ?? '';
    this.taglineEl.hidden = Boolean(message);
  }
}
