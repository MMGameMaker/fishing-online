// Màn đăng nhập và màn tải theo thiết kế (logo, thẻ "Đăng nhập", thanh tải), dạng lớp DOM phủ kín cửa sổ.
// Chỉ pier.html bật (qua BootOptions.screens); trang khác vẫn dùng chữ Phaser cũ.
const TIPS = [
  'Mẹo: Ngồi vào ghế trống để bắt đầu câu cá.',
  'Mẹo: Bán cá trong cửa hàng để kiếm Gold.',
  'Mẹo: Sổ tay ghi lại mọi loài cá bạn đã câu.',
  'Mẹo: Cần câu tốt hơn giúp bắt cá hiếm dễ hơn.',
  'Mẹo: Cá thật to hoặc hiếm sẽ được khoe cho cả hồ.',
];

const LOGO = '/login/logo.png';

const GOOGLE_SVG = `<svg viewBox="0 0 18 18" width="18" height="18" aria-hidden="true">
  <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.9c1.7-1.57 2.7-3.88 2.7-6.62z"/>
  <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.9-2.26c-.8.54-1.84.86-3.06.86-2.35 0-4.34-1.59-5.05-3.72H.95v2.33A9 9 0 0 0 9 18z"/>
  <path fill="#FBBC05" d="M3.95 10.7A5.4 5.4 0 0 1 3.67 9c0-.59.1-1.17.28-1.7V4.97H.95A9 9 0 0 0 0 9c0 1.45.35 2.83.95 4.03l3-2.33z"/>
  <path fill="#EA4335" d="M9 3.58c1.32 0 2.51.46 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0A9 9 0 0 0 .95 4.97l3 2.33C4.66 5.17 6.65 3.58 9 3.58z"/>
</svg>`;

export class BootScreens {
  private readonly root: HTMLElement;
  private readonly login: HTMLElement;
  private readonly loading: HTMLElement;
  private readonly googleBtn: HTMLButtonElement;
  private readonly errorEl: HTMLElement;
  private readonly statusEl: HTMLElement;
  private readonly percentEl: HTMLElement;
  private readonly fillEl: HTMLElement;
  private readonly tipEl: HTMLElement;
  private onGoogle: (() => void) | null = null;

  constructor(parent: HTMLElement = document.body) {
    this.root = document.createElement('div');
    this.root.className = 'boot-screens';
    this.root.innerHTML = `
      <div class="boot boot--login" hidden>
        <div class="boot__logo-zone"><img class="boot__logo" src="${LOGO}" alt="Fishing Online" /></div>
        <div class="boot__card">
          <div class="boot__card-title"><span class="boot__orn">✦</span><h2>Đăng nhập</h2><span class="boot__orn">✦</span></div>
          <div class="boot__divider"></div>
          <button class="boot__google" type="button">${GOOGLE_SVG}<span>Đăng nhập bằng Google</span></button>
          <p class="boot__tagline">Bạn có thể câu được cá lớn cỡ nào?</p>
          <p class="boot__error" hidden></p>
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
    this.loading = q('.boot--loading');
    this.googleBtn = q('.boot__google');
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
    // Chặn phím/chuột lọt xuống game phía sau khi đang ở màn đăng nhập hoặc tải.
    this.root.addEventListener('keydown', (e) => e.stopPropagation());
  }

  /** Hiện màn đăng nhập; `onClick` chạy trong thao tác bấm nút Google. */
  showLogin(onClick: () => void, error?: string): void {
    this.onGoogle = onClick;
    this.googleBtn.disabled = false;
    this.setError(error);
    this.loading.hidden = true;
    this.login.hidden = false;
    this.root.classList.add('is-open');
    this.root.classList.remove('is-leaving');
  }

  /** Hiện màn tải với dòng trạng thái và tiến độ 0–100. */
  showLoading(status = 'Đang tải...', percent = 0): void {
    if (this.loading.hidden) {
      this.tipEl.textContent = TIPS[Math.floor(Math.random() * TIPS.length)] ?? '';
    }
    this.login.hidden = true;
    this.loading.hidden = false;
    this.root.classList.add('is-open');
    this.root.classList.remove('is-leaving');
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

  /** Tắt dần màn phủ khi đã vào được hồ. */
  hide(): void {
    this.setProgress(100);
    this.root.classList.add('is-leaving');
    window.setTimeout(() => {
      if (!this.root.classList.contains('is-leaving')) return;
      this.root.classList.remove('is-open', 'is-leaving');
      this.login.hidden = true;
      this.loading.hidden = true;
    }, 350);
  }

  private setError(message?: string): void {
    this.errorEl.hidden = !message;
    this.errorEl.textContent = message ?? '';
  }
}
