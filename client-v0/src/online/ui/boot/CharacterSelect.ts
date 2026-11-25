// Panel "Chọn nhân vật" hiện khi vào game, sau khi đăng nhập và trước khi vào hồ (yêu cầu 2026-11-25): MỘT lưới duy nhất gồm Thỏ 1-5
// rồi các bạn thú (skin bot), sau cùng là skin shop đã mua. Dữ liệu từ GET /skins (skin shop chưa mua không hiện); bấm "VÀO HỒ" thì lưu
// lựa chọn (PUT /me/skin, do nơi gọi truyền `select`) rồi tiếp tục vào game. Panel chỉ hiện lần đầu (tài khoản chưa chọn nhân vật).
import type { SkinView } from '../../net/contract';
import { animateIn, animateOut } from '../kit/motion';
import { skinImage } from '../skin/skinArt';

/** Thứ tự hiển thị: Thỏ 1-5 (skin_01..05), bạn thú (skin_bot_*), rồi skin shop đã mua (skin_06..). */
export function orderOf(skin: Pick<SkinView, 'skinId'>): number {
  if (/^skin_0[1-5]$/.test(skin.skinId)) return 0;
  return skin.skinId.startsWith('skin_bot_') ? 1 : 2;
}

export interface CharacterSelectOptions {
  skins: readonly SkinView[];
  /** Skin đang dùng (chọn sẵn khi mở). */
  selectedId: string;
  /** Lưu lựa chọn lên Server; ném lỗi nếu thất bại (panel báo lỗi và cho thử lại). */
  select: (skinId: string) => Promise<void>;
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

export class CharacterSelect {
  private picked: string;
  private readonly list: SkinView[];
  private busy = false;
  private resolve: (() => void) | null = null;
  private readonly grid = el('div', 'pick__grid');
  private readonly preview = el('div', 'pick__preview');
  private readonly nameEl = el('div', 'pick__name');
  private readonly errorEl = el('p', 'pick__error');
  private readonly play = el('button', 'pick__play', 'VÀO HỒ');

  constructor(
    /** Phần tử `.boot--select` do BootScreens cấp; panel dựng vào trong đó. */
    private readonly host: HTMLElement,
    private readonly options: CharacterSelectOptions,
  ) {
    // Chỉ liệt kê skin chọn được (miễn phí hoặc đã mua), sắp theo nhóm.
    this.list = options.skins
      .filter((skin) => skin.owned)
      .map((skin, index) => ({ skin, index }))
      .sort((a, b) => orderOf(a.skin) - orderOf(b.skin) || a.index - b.index)
      .map((entry) => entry.skin);
    const current = this.list.find((skin) => skin.skinId === options.selectedId);
    this.picked = (current ?? this.list[0])?.skinId ?? options.selectedId;
  }

  /** Dựng panel và chờ người chơi bấm VÀO HỒ (resolve sau khi lưu xong). */
  run(): Promise<void> {
    const panel = el('div', 'pick__panel');
    const left = el('div', 'pick__left');
    left.append(this.preview, this.nameEl);
    const right = el('div', 'pick__right');
    right.append(this.grid);
    const body = el('div', 'pick__body');
    body.append(left, right);
    this.errorEl.hidden = true;
    this.play.type = 'button';
    this.play.addEventListener('click', () => void this.confirm());
    panel.append(el('h2', 'pick__title', 'CHỌN NHÂN VẬT'), body, this.errorEl, this.play);
    this.host.replaceChildren(panel);
    this.render();
    this.host.hidden = false;
    animateIn(panel, 'pop');
    return new Promise((resolve) => {
      this.resolve = resolve;
    });
  }

  private skin(id: string): SkinView | undefined {
    return this.options.skins.find((skin) => skin.skinId === id);
  }

  private render(): void {
    // Lưới thẻ.
    const scroll = this.grid.scrollTop;
    this.grid.replaceChildren(
      ...this.list.map((skin) => {
        const card = el('button', `pick__card${skin.skinId === this.picked ? ' pick__card--on' : ''}`);
        card.type = 'button';
        card.setAttribute('aria-label', skin.name);
        card.setAttribute('aria-pressed', String(skin.skinId === this.picked));
        card.append(skinImage(skin.skinId, 3, 'pick__card-art'), el('span', 'pick__card-name', skin.name));
        card.addEventListener('click', () => {
          this.picked = skin.skinId;
          this.render();
        });
        return card;
      }),
    );
    this.grid.scrollTop = scroll;
    // Thẻ đang chọn nằm ngoài khung nhìn (mới mở hoặc vừa đổi tab) thì cuộn tới.
    this.grid.querySelector('.pick__card--on')?.scrollIntoView({ block: 'nearest' });

    // Ô xem trước bên trái.
    const picked = this.skin(this.picked);
    this.preview.replaceChildren(skinImage(this.picked, 7, 'pick__preview-art'));
    this.nameEl.textContent = picked?.name ?? '';
    this.play.disabled = this.busy || !picked;
  }

  private async confirm(): Promise<void> {
    if (this.busy || !this.skin(this.picked)) return;
    this.busy = true;
    this.errorEl.hidden = true;
    this.render();
    try {
      // Luôn gọi Server (kể cả giữ nhân vật mặc định) để lưu "đã chọn", lần sau không hiện panel nữa.
      await this.options.select(this.picked);
      const panel = this.host.querySelector<HTMLElement>('.pick__panel');
      if (panel) await animateOut(panel, 'pop');
      this.host.hidden = true;
      this.resolve?.();
      this.resolve = null;
    } catch (error) {
      console.error(error);
      this.errorEl.textContent = 'Không lưu được nhân vật, vui lòng thử lại.';
      this.errorEl.hidden = false;
      this.busy = false;
      this.render();
    }
  }
}
