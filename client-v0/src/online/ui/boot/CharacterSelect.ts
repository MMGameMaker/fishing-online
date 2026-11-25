// Panel "Chọn nhân vật" hiện khi vào game, sau khi đăng nhập và trước khi vào hồ (yêu cầu 2026-11-25), chọn theo 2 BƯỚC: bước 1 chọn LOÀI ở bản trắng
// (Thỏ, Mèo, Cáo..., cuối lưới là skin shop đã mua), bước 2 chọn MÀU (đổi bảng màu lúc chạy, skinColor.ts); muốn đổi loài phải bấm Quay lại. Bấm "VÀO HỒ" thì lưu
// lựa chọn (PUT /me/skin với id dạng `skin_02~brown`, do nơi gọi truyền `select`) rồi tiếp tục vào game. Panel chỉ hiện lần đầu.
import {
  LEGACY_SKIN_COLOR,
  SKIN_COLORS,
  SKIN_SPECIES,
  WHITE_COLOR_ID,
  composeSkinId,
  parseSkinId,
  skinColorOf,
} from '../../entities/skinColor';
import type { SkinView } from '../../net/contract';
import { animateIn, animateOut } from '../kit/motion';
import { skinImage } from '../skin/skinArt';

export interface CharacterSelectOptions {
  skins: readonly SkinView[];
  /** Skin đang dùng (chọn sẵn khi mở). */
  selectedId: string;
  /** Lưu lựa chọn lên Server; ném lỗi nếu thất bại (panel báo lỗi và cho thử lại). */
  select: (skinId: string) => Promise<void>;
}

/** Một lựa chọn trong lưới: loài (đổi được màu) hoặc skin shop đã mua (giữ nguyên). */
interface Choice {
  /** Id skin trắng (loài) hoặc id skin shop. */
  base: string;
  name: string;
  recolorable: boolean;
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
  private pickedBase: string;
  private pickedColor = WHITE_COLOR_ID;
  private readonly list: Choice[];
  private busy = false;
  private resolve: (() => void) | null = null;
  private readonly grid = el('div', 'pick__grid');
  private readonly preview = el('div', 'pick__preview');
  private readonly nameEl = el('div', 'pick__name');
  /** Tiêu đề chung cho cả hai bước (yêu cầu 2026-11-25: không hiện số bước). */
  private readonly titleEl = el('h2', 'pick__title', 'TẠO NHÂN VẬT');
  private readonly next = el('button', 'pick__play', 'TIẾP TỤC');
  private readonly back = el('button', 'pick__play pick__back', 'QUAY LẠI');
  /** 1 = chọn loài, 2 = chọn màu. */
  private step: 1 | 2 = 1;
  private readonly errorEl = el('p', 'pick__error');
  private readonly play = el('button', 'pick__play', 'VÀO HỒ');

  constructor(
    /** Phần tử `.boot--select` do BootScreens cấp; panel dựng vào trong đó. */
    private readonly host: HTMLElement,
    private readonly options: CharacterSelectOptions,
  ) {
    // Loài ở bản trắng, rồi skin shop đã mua.
    this.list = [
      ...SKIN_SPECIES.map((species) => ({ base: species.base, name: species.name, recolorable: true })),
      ...options.skins
        .filter((skin) => skin.owned && skin.unlock === 'shop')
        .map((skin) => ({ base: skin.skinId, name: skin.name, recolorable: false })),
    ];
    // Chọn sẵn đúng nhân vật đang dùng; skin cũ (đã bake riêng từng màu) đổi sang loài + màu tương ứng.
    const current = parseSkinId(LEGACY_SKIN_COLOR[options.selectedId] ?? options.selectedId);
    const found = this.list.find((choice) => choice.base === current.base);
    this.pickedBase = (found ?? this.list[0])!.base;
    this.pickedColor = found?.recolorable ? current.colorId : WHITE_COLOR_ID;
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
    for (const button of [this.play, this.next, this.back]) button.type = 'button';
    this.play.addEventListener('click', () => void this.confirm());
    this.next.addEventListener('click', () => this.goStep(2));
    this.back.addEventListener('click', () => this.goStep(1));
    const actions = el('div', 'pick__actions');
    actions.append(this.back, this.next, this.play);
    panel.append(this.titleEl, body, this.errorEl, actions);
    this.host.replaceChildren(panel);
    this.render();
    this.host.hidden = false;
    animateIn(panel, 'pop');
    return new Promise((resolve) => {
      this.resolve = resolve;
    });
  }

  private choice(): Choice | undefined {
    return this.list.find((choice) => choice.base === this.pickedBase);
  }

  /** Id lưu lên Server: skin trắng + hậu tố màu (không có hậu tố nếu trắng). */
  private pickedId(): string {
    return composeSkinId(this.pickedBase, this.pickedColor);
  }

  private goStep(step: 1 | 2): void {
    this.step = step;
    this.errorEl.hidden = true;
    this.render();
  }

  private render(): void {
    const picked = this.choice();
    const recolorable = picked?.recolorable ?? false;
    const scroll = this.grid.scrollTop;
    if (this.step === 1) {
      // Bước 1: lưới loài, vẽ ở bản trắng (hoặc đúng màu đang giữ).
      this.grid.replaceChildren(
        ...this.list.map((choice) => {
          const on = choice.base === this.pickedBase;
          const card = el('button', `pick__card${on ? ' pick__card--on' : ''}`);
          card.type = 'button';
          card.setAttribute('aria-label', choice.name);
          card.setAttribute('aria-pressed', String(on));
          card.append(skinImage(choice.base, 3, 'pick__card-art'), el('span', 'pick__card-name', choice.name));
          card.addEventListener('click', () => {
            if (choice.base !== this.pickedBase) this.pickedColor = WHITE_COLOR_ID;
            this.pickedBase = choice.base;
            this.render();
          });
          return card;
        }),
      );
    } else {
      // Bước 2: lưới màu của loài đã chọn, mỗi thẻ vẽ loài đó ở màu tương ứng.
      this.grid.replaceChildren(
        ...SKIN_COLORS.map((color) => {
          const on = color.id === this.pickedColor;
          const card = el('button', `pick__card${on ? ' pick__card--on' : ''}`);
          card.type = 'button';
          card.setAttribute('aria-label', color.name);
          card.setAttribute('aria-pressed', String(on));
          card.append(
            skinImage(composeSkinId(this.pickedBase, color.id), 3, 'pick__card-art'),
            el('span', 'pick__card-name', color.name),
          );
          card.addEventListener('click', () => {
            this.pickedColor = color.id;
            this.render();
          });
          return card;
        }),
      );
    }
    this.grid.scrollTop = scroll;
    // Thẻ đang chọn nằm ngoài khung nhìn thì cuộn tới.
    this.grid.querySelector('.pick__card--on')?.scrollIntoView({ block: 'nearest' });

    // Ô xem trước bên trái và tên (bước 1 chỉ hiện loài, bước 2 thêm màu).
    // Bước 1 chưa chọn màu nên xem trước bản trắng, cùng với lưới.
    this.preview.replaceChildren(
      skinImage(this.step === 1 ? this.pickedBase : this.pickedId(), 7, 'pick__preview-art'),
    );
    const colorName = this.step === 2 ? skinColorOf(this.pickedColor)?.name : undefined;
    this.nameEl.textContent = picked ? (colorName ? `${picked.name} ${colorName}` : picked.name) : '';

    // Nút: bước 1 có TIẾP TỤC (skin shop không có bước màu nên vào hồ luôn); bước 2 có QUAY LẠI + VÀO HỒ.
    this.back.hidden = this.step !== 2;
    this.next.hidden = !(this.step === 1 && recolorable);
    this.play.hidden = this.step === 1 && recolorable;
    this.next.disabled = this.busy || !picked;
    this.back.disabled = this.busy;
    this.play.disabled = this.busy || !picked;
  }

  private async confirm(): Promise<void> {
    if (this.busy || !this.choice()) return;
    this.busy = true;
    this.errorEl.hidden = true;
    this.render();
    try {
      // Luôn gọi Server (kể cả giữ nhân vật mặc định) để lưu "đã chọn", lần sau không hiện panel nữa.
      await this.options.select(this.pickedId());
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
