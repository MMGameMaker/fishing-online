// Popup "Tài khoản" theo ảnh mẫu 2026-11-16, mở từ ô "Hồ sơ" trong menu (HomeHud). Khung
// Infomation/Frame.png 1080×572: avatar + UID, ô tên (đổi tên), ô danh hiệu (đổi danh hiệu), ô lời nhắn,
// 3 ô cá khoe (chọn loài từ Sổ tay), cột Thành tựu. Danh hiệu, lời nhắn, cá khoe và thành tựu gọi API /me/*
// (Server C# và mock cùng contract, xem docs/work/W02-art-map-ho.md). Bấm avatar mở khung Ngoại hình (ui/skin).
import { UI_DESIGN_HEIGHT, UI_DESIGN_WIDTH } from '../../core/env';
import type { Services } from '../../core/services';
import type {
  AchievementEntry,
  AchievementsResponse,
  ClaimAchievementResponse,
  CodexResponse,
  PlayerProfile,
  ShowcaseResponse,
  ShowcaseSlot,
} from '../../net/contract';
import { fishImage } from '../fishArt';
import { COIN_ART } from '../coinArt';
import { levelProgress } from '../home/levelProgress';
import { showError, showToast } from '../kit/components';
import { formatGold } from '../kit/format';
import { animateIn, animateOut } from '../kit/motion';
import { SkinPopup } from '../skin/SkinPopup';
import { profileArt } from './profileArt';
import {
  BIO_MAX,
  NAME_MAX,
  SHOWCASE_SLOTS,
  TITLES,
  formatLength,
  achievementView,
  titleLabel,
  validateName,
} from './profileModel';

const UI = (file: string) => encodeURI(`/new resources/ui/${file}`);
const CLOSE = encodeURI('/mini game/Button Close.png');
const PANEL_W = 1080;
const PANEL_H = 572;
/** Khung vẽ ở tỉ lệ 4; phóng 1.5 để mỗi điểm ảnh gốc thành 6 px nguyên trên màn 1920×1080. */
const PANEL_ZOOM = 1.5;

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

function img(src: string, className: string): HTMLImageElement {
  const node = el('img', className);
  node.src = src;
  node.alt = '';
  node.draggable = false;
  return node;
}

/** UID 6 chữ số tạm, suy ra từ playerId (Server chưa có UID riêng). */
export function uidFromPlayerId(playerId: string): string {
  let hash = 0;
  for (const ch of playerId) hash = (hash * 31 + ch.charCodeAt(0)) % 1_000_000;
  return String(hash).padStart(6, '0');
}

export interface ProfilePopupOptions {
  root: HTMLElement;
  services: Services;
}

export class ProfilePopup {
  private overlay: HTMLElement | null = null;
  private dialog: HTMLElement | null = null;
  private achievements: AchievementEntry[] = [];
  private showcase: ShowcaseSlot[] = [];
  private readonly slotsEl = el('div', 'profile__slots');
  private claiming = false;
  private cleanups: (() => void)[] = [];
  private nameEl = el('div', 'profile__name');
  private levelEl = el('div', 'profile__level');
  private expEl = el('div', 'profile__exp');
  private uidEl = el('div', 'profile__uid');
  private titleEl = el('div', 'profile__title');
  private bioEl = el('div', 'profile__bio');
  private list = el('div', 'profile__ach');
  /** Khung Ngoại hình, mở khi bấm avatar. */
  private readonly skin: SkinPopup;

  constructor(private readonly options: ProfilePopupOptions) {
    this.skin = new SkinPopup(options);
  }

  open(): void {
    if (this.overlay) return;
    const overlay = el('div', 'shop profile');
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-label', 'Tài khoản');
    const panel = el('div', 'profile__panel');
    const close = el('button', 'profile__close');
    close.type = 'button';
    close.setAttribute('aria-label', 'Đóng tài khoản');
    close.append(img(CLOSE, ''));
    close.addEventListener('click', () => this.close());

    const avatar = el('div', 'profile__avatar');
    avatar.append(img(profileArt('avatar'), 'profile__avatar-img'));

    panel.append(
      img(UI('Infomation/Frame.png'), 'shop__art'),
      close,
      avatar,
      this.hit('profile__hit profile__hit--avatar', 'Đổi ngoại hình', () => this.skin.open()),
      this.uidEl,
      this.nameEl,
      this.levelEl,
      this.expEl,
      this.hit('profile__hit profile__hit--name', 'Đổi tên', () => this.openNameDialog()),
      this.titleEl,
      this.hit('profile__hit profile__hit--title', 'Đổi danh hiệu', () => this.openTitleDialog()),
      this.bioEl,
      this.hit('profile__hit profile__hit--bio', 'Sửa lời nhắn', () => this.openBioDialog()),
      this.slotsEl,
      this.list,
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
      if (event.key !== 'Escape' || this.skin.isOpen) return;
      if (this.dialog) this.closeDialog();
      else this.close();
    };
    window.addEventListener('keydown', onKey);
    overlay.addEventListener('pointerdown', (event) => {
      if (event.target === overlay && !this.dialog) this.close();
    });
    this.cleanups.push(
      () => window.removeEventListener('keydown', onKey),
      this.options.services.store.select(
        (s) => s.session.profile,
        () => this.renderProfile(),
      ),
      this.options.services.store.select(
        (s) => s.catalog,
        () => this.renderProfile(),
      ),
    );

    this.overlay = overlay;
    this.options.root.append(overlay);
    animateIn(overlay, 'fade');
    animateIn(panel, 'pop');
    this.renderProfile();
    this.renderAchievements();
    this.renderShowcase();
    void this.reloadAchievements();
    void this.reloadShowcase();
  }

  close(): void {
    const overlay = this.overlay;
    if (!overlay) return;
    this.skin.destroy();
    this.overlay = null;
    this.dialog = null;
    this.cleanups.forEach((cleanup) => cleanup());
    this.cleanups = [];
    overlay.style.pointerEvents = 'none';
    const panel = overlay.querySelector<HTMLElement>('.profile__panel');
    void Promise.all([
      panel ? animateOut(panel, 'pop') : Promise.resolve(),
      animateOut(overlay, 'fade'),
    ]).then(() => overlay.remove());
  }

  destroy(): void {
    this.skin.destroy();
    this.cleanups.forEach((cleanup) => cleanup());
    this.cleanups = [];
    this.overlay?.remove();
    this.overlay = null;
    this.dialog = null;
  }

  private hit(className: string, label: string, onClick: () => void): HTMLButtonElement {
    const node = el('button', className);
    node.type = 'button';
    node.setAttribute('aria-label', label);
    node.addEventListener('click', onClick);
    return node;
  }

  // ---------- Ô cá khoe ----------

  private async reloadShowcase(): Promise<void> {
    try {
      this.showcase = (await this.options.services.api.get<ShowcaseResponse>('/me/showcase')).slots;
      this.renderShowcase();
    } catch (error) {
      showError(this.options.root, error);
    }
  }

  /** Ô trống hiện dấu +; ô có cá hiện ảnh loài và chiều dài con dài nhất. Bấm để chọn/đổi/gỡ. */
  private renderShowcase(): void {
    const slots: HTMLElement[] = [];
    for (let i = 0; i < SHOWCASE_SLOTS; i++) {
      const data = this.showcase.find((s) => s.slot === i);
      const slot = el('button', 'profile__slot');
      slot.type = 'button';
      if (data?.speciesId) {
        const name = this.speciesName(data.speciesId);
        slot.setAttribute('aria-label', `Ô cá khoe ${i + 1}: ${name}`);
        slot.append(fishImage(data.speciesId, 'profile__slot-fish'));
        if (data.lengthTenthCm !== null) {
          slot.append(el('span', 'profile__slot-length', formatLength(data.lengthTenthCm)));
        }
      } else {
        slot.setAttribute('aria-label', `Ô cá khoe ${i + 1}: trống`);
        slot.append(el('span', 'profile__plus'));
      }
      slot.addEventListener('click', () => void this.openShowcaseDialog(i));
      slots.push(slot);
    }
    this.slotsEl.replaceChildren(...slots);
  }

  private speciesName(speciesId: string): string {
    return (
      this.options.services.store.getState().catalog?.fish.find((f) => f.speciesId === speciesId)
        ?.name ?? speciesId
    );
  }

  private async openShowcaseDialog(slot: number): Promise<void> {
    const { api } = this.options.services;
    let discovered: { speciesId: string; best: number | null }[];
    try {
      const codex = await api.get<CodexResponse>('/me/codex');
      discovered = codex.species
        .filter((s) => s.discovered)
        .map((s) => ({ speciesId: s.speciesId, best: s.bestLengthTenthCm }));
    } catch (error) {
      showError(this.options.root, error);
      return;
    }
    const current = this.showcase.find((s) => s.slot === slot)?.speciesId ?? null;
    const body = el('div', 'profile-dialog__body');
    if (discovered.length === 0) {
      body.append(
        el('p', 'profile-dialog__note', 'Chưa câu được loài nào. Câu cá rồi quay lại nhé.'),
      );
    } else {
      body.append(
        el('p', 'profile-dialog__note', 'Chọn loài muốn khoe (hiện con dài nhất đã câu).'),
      );
      const grid = el('div', 'profile-dialog__fish');
      for (const fish of discovered) {
        const option = el(
          'button',
          `profile-dialog__fish-option${fish.speciesId === current ? ' profile-dialog__title-option--active' : ''}`,
        );
        option.type = 'button';
        option.setAttribute('aria-label', this.speciesName(fish.speciesId));
        option.append(
          fishImage(fish.speciesId, 'profile-dialog__fish-img'),
          el('span', '', fish.best !== null ? formatLength(fish.best) : ''),
        );
        option.addEventListener('click', () => void this.saveShowcase(slot, fish.speciesId));
        grid.append(option);
      }
      body.append(grid);
    }
    const actions = this.actions(null);
    if (current) {
      const clear = el('button', 'profile-dialog__btn profile-dialog__btn--cancel', 'Gỡ cá');
      clear.type = 'button';
      clear.addEventListener('click', () => void this.saveShowcase(slot, null));
      actions.append(clear);
    }
    body.append(actions);
    this.openDialog('Chọn cá khoe', body);
  }

  private async saveShowcase(slot: number, speciesId: string | null): Promise<void> {
    try {
      const result = await this.options.services.api.put<ShowcaseResponse>('/me/showcase', {
        slot,
        speciesId,
      });
      this.showcase = result.slots;
      this.renderShowcase();
      this.closeDialog();
    } catch (error) {
      showError(this.options.root, error);
    }
  }

  private renderProfile(): void {
    const { session, catalog } = this.options.services.store.getState();
    const profile: PlayerProfile | null = session.profile;
    this.nameEl.textContent = profile?.displayName ?? 'Người chơi';
    this.uidEl.textContent = `UID: ${uidFromPlayerId(profile?.playerId ?? '')}`;
    const level = profile?.level ?? 1;
    this.levelEl.textContent = `Lv.${level}`;
    const progress = levelProgress(profile?.exp ?? 0, level, catalog?.levels ?? []);
    this.expEl.textContent = catalog
      ? progress.needed === null
        ? 'Kinh nghiệm tối đa'
        : `Kinh nghiệm ${progress.current}/${progress.needed}`
      : `Kinh nghiệm ${profile?.exp ?? 0}`;
    this.titleEl.textContent = titleLabel(profile?.titleId);
    const bio = profile?.bio ?? '';
    this.bioEl.textContent = bio || 'Để lại lời nhắn...';
    this.bioEl.classList.toggle('profile__bio--empty', !bio);
  }

  // ---------- Thành tựu ----------

  private async reloadAchievements(): Promise<void> {
    try {
      const data = await this.options.services.api.get<AchievementsResponse>('/me/achievements');
      this.achievements = data.achievements;
      this.renderAchievements();
    } catch (error) {
      showError(this.options.root, error);
    }
  }

  private renderAchievements(): void {
    this.list.replaceChildren(...this.achievements.map((entry) => this.buildCard(entry)));
  }

  private buildCard(entry: AchievementEntry): HTMLElement {
    const view = achievementView(entry);
    const card = el('button', `profile__card${view.claimable ? ' profile__card--claim' : ''}`);
    card.type = 'button';
    card.setAttribute(
      'aria-label',
      view.claimable ? `${entry.name}: nhận thưởng` : `${entry.name}: ${view.shown}/${view.target}`,
    );
    card.disabled = !view.claimable;

    const icon = el('div', 'profile__card-icon');
    icon.append(img(profileArt(entry.id), 'profile__card-art'));
    if (!view.done) {
      const reward = el('div', 'profile__reward');
      reward.append(img(COIN_ART, ''), el('span', '', formatGold(String(entry.rewardGold))));
      icon.append(reward);
    }

    const info = el('div', 'profile__card-info');
    const top = el('div', 'profile__card-top');
    top.append(el('span', '', entry.name), el('span', '', `Lv.${view.level}`));
    const bottom = el('div', 'profile__card-bottom');
    const track = el('div', 'profile__bar');
    const fill = el('div', 'profile__bar-fill');
    fill.style.width = `${Math.round(view.ratio * 100)}%`;
    track.append(fill);
    const count = el(
      'span',
      view.done ? 'profile__done' : 'profile__count',
      view.done ? '✓' : `${formatGold(String(view.shown))}/${formatGold(String(view.target))}`,
    );
    bottom.append(track, count);
    info.append(top, bottom);

    card.append(icon, info);
    if (view.claimable) card.append(img(UI('Infomation/Claim Dot.png'), 'profile__dot'));
    card.addEventListener('click', () => void this.claim(entry));
    return card;
  }

  private async claim(entry: AchievementEntry): Promise<void> {
    if (this.claiming || !achievementView(entry).claimable) return;
    this.claiming = true;
    const { api, store } = this.options.services;
    try {
      const result = await api.post<ClaimAchievementResponse>('/me/achievements/claim', {
        achievementId: entry.id,
      });
      store.dispatch({ type: 'session/gold', payload: result.gold });
      this.achievements = this.achievements.map((a) =>
        a.id === result.achievement.id ? result.achievement : a,
      );
      this.renderAchievements();
      showToast(this.options.root, `+${formatGold(result.goldAdded)} Gold`);
    } catch (error) {
      showError(this.options.root, error);
      void this.reloadAchievements();
    } finally {
      this.claiming = false;
    }
  }

  // ---------- Tab nhỏ: đổi tên / danh hiệu / lời nhắn ----------

  private openDialog(title: string, body: HTMLElement, boxClass = ''): HTMLElement | null {
    const panel = this.overlay?.querySelector<HTMLElement>('.profile__panel');
    if (!panel) return null;
    this.closeDialog();
    const dialog = el('div', 'profile-dialog');
    dialog.setAttribute('role', 'dialog');
    dialog.setAttribute('aria-label', title);
    const box = el('div', `profile-dialog__box${boxClass ? ` ${boxClass}` : ''}`);
    const heading = el('h2', 'profile-dialog__title', title);
    box.append(heading, body);
    dialog.append(box);
    dialog.addEventListener('pointerdown', (event) => {
      if (event.target === dialog) this.closeDialog();
    });
    panel.append(dialog);
    animateIn(box, 'pop');
    this.dialog = dialog;
    return dialog;
  }

  private closeDialog(): void {
    const dialog = this.dialog;
    if (!dialog) return;
    this.dialog = null;
    const box = dialog.firstElementChild as HTMLElement | null;
    void (box ? animateOut(box, 'pop') : Promise.resolve()).then(() => dialog.remove());
  }

  private actions(onSave: (() => void) | null): HTMLElement {
    const row = el('div', 'profile-dialog__actions');
    const cancel = el('button', 'profile-dialog__btn profile-dialog__btn--cancel', 'Hủy');
    cancel.type = 'button';
    cancel.addEventListener('click', () => this.closeDialog());
    row.append(cancel);
    if (onSave) {
      const save = el('button', 'profile-dialog__btn profile-dialog__btn--save', 'Lưu');
      save.type = 'button';
      save.addEventListener('click', onSave);
      row.append(save);
    }
    return row;
  }

  private textEditor(options: {
    multiline: boolean;
    max: number;
    value: string;
    placeholder: string;
  }): { wrap: HTMLElement; input: HTMLInputElement | HTMLTextAreaElement; hint: HTMLElement } {
    const wrap = el('div', 'profile-dialog__field');
    const input = options.multiline
      ? el('textarea', 'profile-dialog__input')
      : el('input', 'profile-dialog__input');
    if (input instanceof HTMLInputElement) input.type = 'text';
    input.maxLength = options.max;
    input.value = options.value;
    input.placeholder = options.placeholder;
    input.spellcheck = false;
    const hint = el('div', 'profile-dialog__hint');
    const update = () => {
      hint.textContent = `${[...input.value].length}/${options.max}`;
    };
    input.addEventListener('input', update);
    // Phím trong ô nhập không được lọt xuống game (di chuyển, mở menu...).
    for (const type of ['keydown', 'keyup'] as const) {
      input.addEventListener(type, (event: Event) => {
        if ((event as KeyboardEvent).key !== 'Escape') event.stopPropagation();
      });
    }
    update();
    wrap.append(input, hint);
    return { wrap, input, hint };
  }

  private openNameDialog(): void {
    const profile = this.options.services.store.getState().session.profile;
    const editor = this.textEditor({
      multiline: false,
      max: NAME_MAX,
      value: profile?.displayName ?? '',
      placeholder: 'Nhập tên mới',
    });
    const error = el('div', 'profile-dialog__error');
    const save = async () => {
      const name = editor.input.value.trim();
      const problem = validateName(name);
      error.textContent = problem ?? '';
      if (problem) return;
      if (name === profile?.displayName) return this.closeDialog();
      const { api, store } = this.options.services;
      try {
        const updated = await api.put<PlayerProfile>('/me/display-name', { displayName: name });
        store.dispatch({ type: 'session/profile', payload: updated });
        this.closeDialog();
        showToast(this.options.root, 'Đã đổi tên.');
      } catch (err) {
        showError(this.options.root, err);
      }
    };
    const body = el('div', 'profile-dialog__body');
    body.append(
      el('p', 'profile-dialog__note', `Tối đa ${NAME_MAX} ký tự. Tên mới hiện trên đầu nhân vật.`),
      editor.wrap,
      error,
      this.actions(() => void save()),
    );
    this.openDialog('Đổi tên', body);
    editor.input.focus();
    editor.input.select();
    editor.input.addEventListener('keydown', (event) => {
      if ((event as KeyboardEvent).key === 'Enter') void save();
    });
  }

  private openTitleDialog(): void {
    const current =
      this.options.services.store.getState().session.profile?.titleId ?? TITLES[0]!.id;
    const body = el('div', 'profile-dialog__body');
    const list = el('div', 'profile-dialog__titles');
    for (const title of TITLES) {
      const option = el(
        'button',
        `profile-dialog__title-option${title.id === current ? ' profile-dialog__title-option--active' : ''}`,
        title.label,
      );
      option.type = 'button';
      option.addEventListener('click', () => void this.saveTitle(title.id, current));
      list.append(option);
    }
    body.append(list, this.actions(null));
    this.openDialog('Đổi danh hiệu', body, 'profile-dialog__box--panel');
  }

  private async saveTitle(titleId: string, current: string): Promise<void> {
    if (titleId === current) return this.closeDialog();
    const { api, store } = this.options.services;
    try {
      const updated = await api.put<PlayerProfile>('/me/title', { titleId });
      store.dispatch({ type: 'session/profile', payload: updated });
      this.closeDialog();
    } catch (error) {
      showError(this.options.root, error);
    }
  }

  private openBioDialog(): void {
    const profile = this.options.services.store.getState().session.profile;
    const editor = this.textEditor({
      multiline: true,
      max: BIO_MAX,
      value: profile?.bio ?? '',
      placeholder: 'Để lại lời nhắn...',
    });
    const save = async () => {
      const { api, store } = this.options.services;
      try {
        const updated = await api.put<PlayerProfile>('/me/bio', { bio: editor.input.value.trim() });
        store.dispatch({ type: 'session/profile', payload: updated });
        this.closeDialog();
      } catch (error) {
        showError(this.options.root, error);
      }
    };
    const body = el('div', 'profile-dialog__body');
    body.append(
      el('p', 'profile-dialog__note', `Tối đa ${BIO_MAX} ký tự.`),
      editor.wrap,
      this.actions(() => void save()),
    );
    this.openDialog('Lời nhắn', body);
    editor.input.focus();
  }
}
