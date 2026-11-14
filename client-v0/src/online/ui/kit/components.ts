// Thành phần UI dùng chung, vẽ bằng DOM trên canvas.
import type Phaser from 'phaser';
import { GAME_WIDTH, UI_DESIGN_WIDTH } from '../../core/env';
import { ApiError } from '../../net/ApiClient';
import { errorTextFor } from './errorText';
import { formatGold } from './format';

const DEFAULT_TOAST_MS = 3000;

/**
 * Tạo lớp UI phủ đúng lên canvas. Mọi phần tử bên trong tính px theo màn thiết kế 1920×1080;
 * cả lớp được scale một lần theo cỡ canvas nên toàn bộ UI giữ tỉ lệ khi kéo cửa sổ.
 */
export function mountUiOverlay(game: Phaser.Game): { root: HTMLElement; destroy: () => void } {
  const root = document.createElement('div');
  root.className = 'ui-root';
  document.body.append(root);

  const sync = () => {
    const rect = game.canvas.getBoundingClientRect();
    const scale = rect.width / UI_DESIGN_WIDTH;
    if (!scale) return;
    root.style.left = `${rect.left}px`;
    root.style.top = `${rect.top}px`;
    root.style.width = `${UI_DESIGN_WIDTH}px`;
    // Canvas 16:9 thì cao 1080; canvas tỉ lệ khác (bridge cũ) vẫn được phủ kín.
    root.style.height = `${rect.height / scale}px`;
    root.style.transform = `scale(${scale})`;
    root.style.setProperty('--ui-scale', String(UI_DESIGN_WIDTH / GAME_WIDTH));
  };

  const observer = new ResizeObserver(sync);
  observer.observe(game.canvas);
  game.scale.on('resize', sync);
  window.addEventListener('resize', sync);
  sync();

  return {
    root,
    destroy: () => {
      observer.disconnect();
      game.scale.off('resize', sync);
      window.removeEventListener('resize', sync);
      root.remove();
    },
  };
}

export function createPanel(title: string, content: HTMLElement): HTMLElement {
  const panel = document.createElement('section');
  panel.className = 'ui-panel';
  const heading = document.createElement('div');
  heading.className = 'ui-panel__title';
  heading.textContent = title;
  const body = document.createElement('div');
  body.className = 'ui-panel__body';
  body.append(content);
  panel.append(heading, body);
  return panel;
}

export type ButtonVariant = 'default' | 'primary' | 'danger';

export interface ButtonOptions {
  label: string;
  onClick?: () => void;
  variant?: ButtonVariant;
  disabled?: boolean;
}

export function createButton(options: ButtonOptions): HTMLButtonElement {
  const button = document.createElement('button');
  button.type = 'button';
  button.textContent = options.label;
  button.className = 'ui-button';
  if (options.variant && options.variant !== 'default') {
    button.classList.add(`ui-button--${options.variant}`);
  }
  button.disabled = options.disabled ?? false;
  if (options.onClick) button.addEventListener('click', options.onClick);
  return button;
}

export interface TabDefinition {
  id: string;
  label: string;
  render: () => HTMLElement;
}

export function createTabs(tabs: TabDefinition[]): HTMLElement {
  const container = document.createElement('div');
  const bar = document.createElement('div');
  bar.className = 'ui-tabs__bar';
  bar.setAttribute('role', 'tablist');
  const content = document.createElement('div');
  container.append(bar, content);

  const select = (selected: TabDefinition) => {
    content.replaceChildren(selected.render());
    bar.querySelectorAll('button').forEach((button) => {
      button.setAttribute('aria-selected', String(button.dataset.tab === selected.id));
    });
  };

  for (const tab of tabs) {
    const button = createButton({ label: tab.label, onClick: () => select(tab) });
    button.classList.add('ui-tabs__tab');
    button.dataset.tab = tab.id;
    button.setAttribute('role', 'tab');
    bar.append(button);
  }
  if (tabs[0]) select(tabs[0]);
  return container;
}

export function createGoldLabel(gold: string): { el: HTMLElement; set: (gold: string) => void } {
  const el = document.createElement('span');
  el.className = 'ui-gold';
  const set = (value: string) => {
    el.textContent = `${formatGold(value)} Gold`;
  };
  set(gold);
  return { el, set };
}

export type ToastKind = 'info' | 'error';

export function showToast(
  root: HTMLElement,
  message: string,
  kind: ToastKind = 'info',
  durationMs = DEFAULT_TOAST_MS,
): void {
  let host = root.querySelector<HTMLElement>('.ui-toasts');
  if (!host) {
    host = document.createElement('div');
    host.className = 'ui-toasts';
    host.setAttribute('role', 'status');
    root.append(host);
  }
  const toast = document.createElement('div');
  toast.className = `ui-toast ui-toast--${kind}`;
  toast.textContent = message;
  host.append(toast);
  window.setTimeout(() => toast.remove(), durationMs);
}

/** Hiển thị lỗi theo mã từ ApiError hoặc ack của hub. */
export function showError(root: HTMLElement, error: unknown): void {
  let code = '';
  if (error instanceof ApiError) code = error.code;
  else if (typeof error === 'object' && error !== null && 'code' in error) {
    code = String(error.code);
  }
  showToast(root, errorTextFor(code), 'error');
}

export interface ConfirmOptions {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
}

/** Hộp xác nhận; trả true khi người chơi đồng ý. */
export function confirmDialog(root: HTMLElement, options: ConfirmOptions): Promise<boolean> {
  return new Promise((resolve) => {
    const overlay = document.createElement('div');
    overlay.className = 'ui-dialog';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');

    const close = (result: boolean) => {
      overlay.remove();
      resolve(result);
    };

    const body = document.createElement('div');
    const message = document.createElement('p');
    message.style.margin = '0';
    message.textContent = options.message;
    const actions = document.createElement('div');
    actions.className = 'ui-dialog__actions';
    actions.append(
      createButton({ label: options.cancelLabel ?? 'Hủy', onClick: () => close(false) }),
      createButton({
        label: options.confirmLabel ?? 'Đồng ý',
        variant: 'primary',
        onClick: () => close(true),
      }),
    );
    body.append(message, actions);
    overlay.append(createPanel(options.title, body));
    root.append(overlay);
  });
}
