// Popup "Sổ tay cá" theo ảnh mẫu 2026-11-13, mở từ ô icon nhà trong menu (HomeHud). Khung Codex Panel.png:
// bên trái ảnh cá + 6 dòng thông tin, bên phải lưới ô cá. Đủ mọi loài trong catalog: loài đã câu hiện ảnh
// thật, loài chưa câu phủ đen (bóng cá) và không điền "Nhỏ nhất/Lớn nhất đã câu". Dữ liệu GET /me/codex.
import type { Catalog } from '../../core/gameplayConfig';
import { UI_DESIGN_HEIGHT, UI_DESIGN_WIDTH } from '../../core/env';
import type { Services } from '../../core/services';
import type { CodexEntry, CodexResponse } from '../../net/contract';
import { showError } from '../kit/components';
import { RARITY_LABELS } from '../kit/format';
import { animateIn, animateOut } from '../kit/motion';
import { fishImage } from '../fishArt';
import { SHOP_RARITY_COLORS } from '../shop/shopModel';

const UI = (file: string) => encodeURI(`/new resources/ui/${file}`);
const CLOSE = encodeURI('/mini game/Button Close.png');
const PANEL_W = 1640;
const PANEL_H = 844;
/** Lưới 6 cột × 4 hàng như ảnh mẫu; nhiều loài hơn thì cuộn. */
const MIN_SLOTS = 24;

const cm = (tenthCm: number) => `${(tenthCm / 10).toFixed(1).replace('.', ',')}cm`;

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

export interface CodexRow {
  label: string;
  value: string;
  color?: string;
}

/** 6 dòng thông tin của loài đang chọn; loài chưa câu thì bỏ trống 2 dòng nhỏ nhất/lớn nhất đã câu. */
export function codexRows(
  speciesId: string,
  catalog: Catalog | null,
  entry: CodexEntry | undefined,
  habitat: string,
): CodexRow[] {
  const fish = catalog?.fish.find((f) => f.speciesId === speciesId);
  const caught = entry?.discovered === true;
  const smallest = entry?.smallestLengthTenthCm ?? entry?.bestLengthTenthCm ?? null;
  return [
    { label: 'Tên', value: fish?.name ?? speciesId },
    {
      label: 'Độ hiếm',
      value: fish ? RARITY_LABELS[fish.rarity] : '—',
      color: fish ? SHOP_RARITY_COLORS[fish.rarity] : undefined,
    },
    { label: 'Nơi sống', value: habitat },
    { label: 'Kích thước', value: fish ? `${cm(fish.minTenthCm)} - ${cm(fish.maxTenthCm)}` : '—' },
    { label: 'Nhỏ nhất đã câu', value: caught && smallest !== null ? cm(smallest) : '' },
    {
      label: 'Lớn nhất đã câu',
      value: caught && entry?.bestLengthTenthCm != null ? cm(entry.bestLengthTenthCm) : '',
    },
  ];
}

export interface CodexPopupOptions {
  root: HTMLElement;
  services: Services;
}

export class CodexPopup {
  private overlay: HTMLElement | null = null;
  private entries = new Map<string, CodexEntry>();
  private selected: string | null = null;
  private picture: HTMLElement | null = null;
  private rows: HTMLElement | null = null;
  private grid: HTMLElement | null = null;
  private cleanups: (() => void)[] = [];

  constructor(private readonly options: CodexPopupOptions) {}

  open(): void {
    if (this.overlay) return;
    const overlay = el('div', 'shop codex');
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-label', 'Sổ tay cá');
    const panel = el('div', 'codex__panel');
    const art = el('img', 'shop__art');
    art.src = UI('Codex Panel.png');
    art.alt = '';
    const close = el('button', 'codex__close');
    close.type = 'button';
    close.setAttribute('aria-label', 'Đóng sổ tay cá');
    const closeIcon = el('img', '');
    closeIcon.src = CLOSE;
    closeIcon.alt = '';
    close.append(closeIcon);
    close.addEventListener('click', () => this.close());
    this.picture = el('div', 'codex__picture');
    this.rows = el('dl', 'codex__rows');
    this.grid = el('div', 'codex__grid');
    panel.append(art, close, this.picture, this.rows, this.grid);
    overlay.append(panel);

    // Khung vẽ cho màn thiết kế 1920×1080; ui-root đã scale cả khung chơi theo cửa sổ.
    overlay.style.setProperty(
      '--shop-scale',
      String(Math.min(1, (UI_DESIGN_WIDTH * 0.96) / PANEL_W, (UI_DESIGN_HEIGHT * 0.92) / PANEL_H)),
    );
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') this.close();
    };
    window.addEventListener('keydown', onKey);
    overlay.addEventListener('pointerdown', (event) => {
      if (event.target === overlay) this.close();
    });
    this.cleanups.push(() => window.removeEventListener('keydown', onKey));

    this.overlay = overlay;
    this.options.root.append(overlay);
    animateIn(overlay, 'fade');
    animateIn(panel, 'pop');
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
    const panel = overlay.querySelector<HTMLElement>('.codex__panel');
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

  private species(): string[] {
    return this.options.services.store.getState().catalog?.fish.map((f) => f.speciesId) ?? [];
  }

  private render(): void {
    if (!this.grid) return;
    const species = this.species();
    // Mặc định chọn loài đã câu đầu tiên, không có thì loài đầu bảng.
    if (!this.selected || !species.includes(this.selected)) {
      this.selected = species.find((id) => this.entries.get(id)?.discovered) ?? species[0] ?? null;
    }
    const slots: HTMLElement[] = [];
    for (const id of species) {
      const caught = this.entries.get(id)?.discovered === true;
      const slot = el(
        'button',
        `codex__slot${caught ? '' : ' codex__slot--unknown'}${id === this.selected ? ' codex__slot--active' : ''}`,
      );
      slot.setAttribute(
        'aria-label',
        caught ? this.nameOf(id) : `${this.nameOf(id)} (chưa câu được)`,
      );
      slot.append(fishImage(id, 'codex__slot-fish'));
      slot.addEventListener('click', () => {
        this.selected = id;
        this.render();
      });
      slots.push(slot);
    }
    for (let i = species.length; i < Math.max(MIN_SLOTS, species.length); i++) {
      slots.push(el('span', 'codex__slot codex__slot--empty'));
    }
    this.grid.replaceChildren(...slots);
    this.renderDetail();
  }

  private renderDetail(): void {
    if (!this.picture || !this.rows) return;
    const id = this.selected;
    if (!id) {
      this.picture.replaceChildren();
      this.rows.replaceChildren();
      return;
    }
    const entry = this.entries.get(id);
    const { catalog, lake } = this.options.services.store.getState();
    const caught = entry?.discovered === true;
    const image = fishImage(id, `codex__picture-fish${caught ? '' : ' codex__fish--unknown'}`);
    this.picture.replaceChildren(image);
    this.rows.replaceChildren(
      ...codexRows(id, catalog, entry, lake.mapId ?? '—').map((row) => {
        const line = el('div', 'codex__row');
        const value = el('dd', '', row.value);
        if (row.color) value.style.color = row.color;
        line.append(el('dt', '', row.label), value);
        return line;
      }),
    );
  }

  private nameOf(speciesId: string): string {
    return (
      this.options.services.store.getState().catalog?.fish.find((f) => f.speciesId === speciesId)
        ?.name ?? speciesId
    );
  }

  private async reload(): Promise<void> {
    try {
      const codex = await this.options.services.api.get<CodexResponse>('/me/codex');
      this.entries = new Map(codex.species.map((entry) => [entry.speciesId, entry]));
      this.selected = null;
      this.render();
    } catch (error) {
      showError(this.options.root, error);
    }
  }
}
