// Popup "Cài đặt" theo ảnh mẫu 2026-11-16, mở từ ô icon bánh răng trong menu (HomeHud). Khung Settings Panel.png:
// 2 thanh kéo Âm thanh (tiếng câu cá) và Nhạc nền; kéo về 0 là tắt, lưu localStorage (core/audioSettings).
import {
  type AudioSettings,
  clamp01,
  getAudioSettings,
  setAudioSetting,
} from '../../core/audioSettings';
import { UI_DESIGN_HEIGHT, UI_DESIGN_WIDTH } from '../../core/env';
import { animateIn, animateOut } from '../kit/motion';
import { localPoint, localRect } from '../../core/viewFrame';

const DIR = '/new resources/ui/Setting/';
const art = (file: string) => encodeURI(DIR + file);
const CLOSE = encodeURI('/mini game/Button Close.png');
const PANEL_W = 697;
const PANEL_H = 340;
/** Bề rộng ảnh thanh trượt và núm (px ảnh), dùng để tính vị trí núm. */
const TRACK_W = 344;
const KNOB_W = 52;
const KEY_STEP = 0.05;

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className: string,
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  node.className = className;
  return node;
}

function image(src: string, className: string): HTMLImageElement {
  const img = el('img', className);
  img.src = src;
  img.alt = '';
  img.draggable = false;
  return img;
}

/** Tâm núm (px, tính từ mép trái thanh) ứng với giá trị 0..1. */
export function knobCenter(value: number): number {
  return KNOB_W / 2 + clamp01(value) * (TRACK_W - KNOB_W);
}

/** Giá trị 0..1 ứng với vị trí con trỏ (tỉ lệ 0..1 theo bề rộng thanh đang hiển thị). */
export function valueFromPointer(fraction: number): number {
  const center = clamp01(fraction) * TRACK_W;
  return clamp01((center - KNOB_W / 2) / (TRACK_W - KNOB_W));
}

interface SliderOptions {
  key: keyof AudioSettings;
  label: string;
  className: string;
}

export interface SettingsPopupOptions {
  root: HTMLElement;
}

export class SettingsPopup {
  private overlay: HTMLElement | null = null;
  private cleanups: (() => void)[] = [];

  constructor(private readonly options: SettingsPopupOptions) {}

  open(): void {
    if (this.overlay) return;
    const overlay = el('div', 'shop settings');
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-label', 'Cài đặt');
    const panel = el('div', 'settings__panel');
    const close = el('button', 'settings__close');
    close.type = 'button';
    close.setAttribute('aria-label', 'Đóng cài đặt');
    close.append(image(CLOSE, ''));
    close.addEventListener('click', () => this.close());
    panel.append(
      image(art('Settings Panel.png'), 'shop__art'),
      close,
      this.slider({ key: 'sound', label: 'Âm thanh', className: 'settings__slider--sound' }),
      this.slider({ key: 'music', label: 'Nhạc nền', className: 'settings__slider--music' }),
    );
    overlay.append(panel);

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
  }

  close(): void {
    const overlay = this.overlay;
    if (!overlay) return;
    this.overlay = null;
    this.cleanups.forEach((cleanup) => cleanup());
    this.cleanups = [];
    overlay.style.pointerEvents = 'none';
    const panel = overlay.querySelector<HTMLElement>('.settings__panel');
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

  private slider({ key, label, className }: SliderOptions): HTMLElement {
    const root = el('div', `settings__slider ${className}`);
    root.tabIndex = 0;
    root.setAttribute('role', 'slider');
    root.setAttribute('aria-label', label);
    root.setAttribute('aria-valuemin', '0');
    root.setAttribute('aria-valuemax', '100');
    const fill = el('div', 'settings__fill');
    fill.style.borderImageSource = `url("${art('Âm thanh Fill.png')}")`;
    const knob = image(art('Nhạc nền Knob.png'), 'settings__knob');
    root.append(image(art('Nhạc nền Track.png'), 'settings__track'), fill, knob);

    const render = (value: number) => {
      const center = knobCenter(value);
      knob.style.left = `${center - KNOB_W / 2}px`;
      // Phần màu cam chạy từ đầu thanh tới tâm núm; về 0 thì ẩn hẳn (đang tắt).
      fill.style.width = `${center}px`;
      fill.style.visibility = value > 0 ? 'visible' : 'hidden';
      root.setAttribute('aria-valuenow', String(Math.round(value * 100)));
    };
    render(getAudioSettings()[key]);

    const fromEvent = (event: PointerEvent) => {
      const rect = localRect(root);
      const value = valueFromPointer(
        rect.width > 0 ? (localPoint(event).x - rect.left) / rect.width : 0,
      );
      render(value);
      setAudioSetting(key, value);
    };
    root.addEventListener('pointerdown', (event) => {
      root.setPointerCapture(event.pointerId);
      fromEvent(event);
    });
    root.addEventListener('pointermove', (event) => {
      if (root.hasPointerCapture(event.pointerId)) fromEvent(event);
    });
    root.addEventListener('keydown', (event) => {
      const delta =
        event.key === 'ArrowRight' || event.key === 'ArrowUp'
          ? KEY_STEP
          : event.key === 'ArrowLeft' || event.key === 'ArrowDown'
            ? -KEY_STEP
            : 0;
      if (!delta) return;
      event.preventDefault();
      const value = clamp01(getAudioSettings()[key] + delta);
      render(value);
      setAudioSetting(key, value);
    });
    return root;
  }
}
