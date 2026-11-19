// Điện thoại trên pier.html (feedback 2026-11-19): vào bằng máy đang dọc thì game tự xoay sang phải 90° (theo chiều
// kim đồng hồ, đỉnh game nằm về cạnh phải màn hình). Người chơi xoay máy sang ngang (trái hay phải) thì hệ điều hành
// đặt lại trang, màn thành ngang và game về thẳng, không còn xoay CSS.
// Cách làm: xoay cả `body`. `transform` trên body làm mọi phần tử position: fixed bên trong (toast, popup, HUD…)
// xoay theo. Phaser tính cỡ canvas và toạ độ chạm bằng getBoundingClientRect nên bị lệch khi xoay, phải vá ở đây.
import type Phaser from 'phaser';
import { isTouchDevice } from '../../core/device';
import { isViewRotated, localRect, setViewRotated, toLocal } from '../../core/viewFrame';

const ROTATED_STYLE = [
  'position',
  'margin',
  'width',
  'height',
  'left',
  'top',
  'transform-origin',
  'transform',
] as const;

export interface MobileFrame {
  /** Gọi sau `new Phaser.Game(...)`: vá cỡ canvas và toạ độ chạm của Phaser cho khung đã xoay. */
  attach(game: Phaser.Game): void;
}

export function startMobileFrame(): MobileFrame {
  let game: Phaser.Game | null = null;

  const apply = (): void => {
    const w = window.innerWidth;
    const h = window.innerHeight;
    const rotate = isTouchDevice() && h > w;
    setViewRotated(rotate, w);
    const body = document.body.style;
    if (rotate) {
      // Khung bố cục h×w xoay quanh tâm sẽ phủ đúng màn hình w×h.
      body.position = 'fixed';
      body.margin = '0';
      body.width = `${h}px`;
      body.height = `${w}px`;
      body.left = `${(w - h) / 2}px`;
      body.top = `${(h - w) / 2}px`;
      body.transformOrigin = '50% 50%';
      body.transform = 'rotate(90deg)';
    } else {
      for (const prop of ROTATED_STYLE) body.removeProperty(prop);
    }
    // Cỡ khung bố cục theo px thật (không dùng vw/vh: không đổi chỗ khi xoay, và vh sai khi thanh địa chỉ co giãn).
    const root = document.documentElement.style;
    root.setProperty('--fw', `${rotate ? h : w}px`);
    root.setProperty('--fh', `${rotate ? w : h}px`);
    if (game?.isBooted) {
      game.scale.getParentBounds();
      game.scale.refresh();
    }
  };

  apply();
  window.addEventListener('resize', apply);
  window.addEventListener('orientationchange', apply);
  window.visualViewport?.addEventListener('resize', apply);
  document.addEventListener('fullscreenchange', apply);

  return {
    attach(target) {
      game = target;
      patchScale(target);
      patchInput(target);
      apply();
    },
  };
}

// Số pixel tối đa của canvas (điện thoại 3x mà phủ cả màn thì rất nặng GPU).
const MAX_CANVAS_PIXELS = 3_500_000;
const MAX_PIXEL_RATIO = 3;

/**
 * Tỉ lệ canvas/CSS (feedback 2026-11-19: hình mờ, vỡ trên điện thoại). Phaser 3.90 không biết devicePixelRatio:
 * canvas chỉ có đúng số pixel CSS rồi bị trình duyệt phóng 2–3 lần. Cảm ứng mới bật (máy tính giữ nguyên 1).
 */
function pixelRatio(cssWidth: number, cssHeight: number): number {
  if (!isTouchDevice() || cssWidth <= 0 || cssHeight <= 0) return 1;
  const budget = Math.sqrt(MAX_CANVAS_PIXELS / (cssWidth * cssHeight));
  return Math.max(1, Math.min(window.devicePixelRatio || 1, MAX_PIXEL_RATIO, budget));
}

/**
 * Cỡ cha và vùng canvas lấy từ bố cục (offsetWidth, localRect) thay vì hộp bao đã xoay.
 * Cỡ game = cỡ CSS × tỉ lệ pixel: canvas có đủ pixel thật của màn hình, CSS (pier.html) thu về đúng khung.
 * Camera tự phóng theo cỡ canvas; toạ độ chạm đã nhân `displayScale` nên không cần sửa thêm.
 */
function patchScale(game: Phaser.Game): void {
  const scale = game.scale;
  const originalParentBounds = scale.getParentBounds.bind(scale);
  scale.getParentBounds = () => {
    const parent = scale.parent as HTMLElement | null;
    const ratio = parent ? pixelRatio(parent.offsetWidth, parent.offsetHeight) : 1;
    if (!isViewRotated() && ratio === 1) return originalParentBounds();
    if (!parent) return false;
    const width = Math.round(parent.offsetWidth * ratio);
    const height = Math.round(parent.offsetHeight * ratio);
    const size = scale.parentSize;
    if (size.width === width && size.height === height) return false;
    size.setSize(width, height);
    return true;
  };
  const originalUpdateBounds = scale.updateBounds.bind(scale);
  scale.updateBounds = () => {
    if (!isViewRotated()) return originalUpdateBounds();
    const rect = localRect(scale.canvas);
    const bounds = scale.canvasBounds;
    bounds.x = rect.left;
    bounds.y = rect.top;
    bounds.width = rect.width;
    bounds.height = rect.height;
  };
}

/** Chạm trên màn hình thật → toạ độ canvas. Bản gốc của Phaser chỉ nhận từng trục nên không xoay được. */
function patchInput(game: Phaser.Game): void {
  const input = game.input;
  const original = input.transformPointer.bind(input);
  input.transformPointer = (pointer, pageX, pageY, wasMove) => {
    if (!isViewRotated()) return original(pointer, pageX, pageY, wasMove);
    const p0 = pointer.position;
    const p1 = pointer.prevPosition;
    p1.x = p0.x;
    p1.y = p0.y;
    const local = toLocal(pageX, pageY);
    const bounds = game.scale.canvasBounds;
    const display = game.scale.displayScale;
    const x = (local.x - bounds.x) * display.x;
    const y = (local.y - bounds.y) * display.y;
    const smooth = pointer.smoothFactor;
    if (!wasMove || smooth === 0) {
      p0.x = x;
      p0.y = y;
    } else {
      p0.x = x * smooth + p1.x * (1 - smooth);
      p0.y = y * smooth + p1.y * (1 - smooth);
    }
  };
}
