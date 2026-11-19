// Nút móc câu gần giữa màn hình, kèm vòng đếm ngược quanh viền; chỉ hiện khi cá cắn.
// Thu cần bằng cách bấm nút hoặc phím Space (feedback 2026-11-11). Hình nút là ảnh Button Hook.png.
import { isModalOpen } from '../ui/kit/modal';

// ?v= đổi mỗi khi thay art để trình duyệt không dùng ảnh cũ đã lưu (art mới 2026-11-17).
const HOOK_IMAGE = `${encodeURI('/mini game/Button Hook.png')}?v=20261117`;
const SVG_NS = 'http://www.w3.org/2000/svg';
/** Bán kính vòng đếm ngược (đơn vị viewBox 100), ôm ngay ngoài viền tròn của ảnh nút. */
const RING_R = 46;
/** Mép trên nút cách chân nhân vật (px lớp UI), khớp `top: calc(50% + 72px)` trong fishing.css. */
const BUTTON_BELOW_FEET_PX = 72;

/**
 * Vòng vàng chạy quanh viền nút thay cho thanh dưới nút (feedback 2026-11-16): đầy khi cá vừa cắn,
 * ngắn dần theo thời gian còn lại, bắt đầu từ đỉnh và chạy theo chiều kim đồng hồ.
 */
function ring(): SVGSVGElement {
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('class', 'fish-button__ring');
  svg.setAttribute('viewBox', '0 0 100 100');
  for (const part of ['track', 'fill']) {
    const circle = document.createElementNS(SVG_NS, 'circle');
    circle.setAttribute('class', `fish-button__ring-${part}`);
    circle.setAttribute('cx', '50');
    circle.setAttribute('cy', '50');
    circle.setAttribute('r', String(RING_R));
    // pathLength 100 để độ dài nét tính thẳng theo phần trăm.
    circle.setAttribute('pathLength', '100');
    svg.append(circle);
  }
  return svg;
}

function hookImage(): HTMLImageElement {
  const image = document.createElement('img');
  image.src = HOOK_IMAGE;
  image.alt = '';
  image.draggable = false;
  image.className = 'fish-button__image';
  return image;
}

function isTyping(): boolean {
  return ['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName ?? '');
}

export class FishButton {
  private readonly button = document.createElement('button');
  private readonly ring = ring();
  private readonly onKeyDown: (event: KeyboardEvent) => void;
  private visible = false;

  /** `belowFeetPx`: mép trên nút cách chân nhân vật (px lớp UI); mặc định 72. */
  constructor(
    root: HTMLElement,
    onPress: () => void,
    private readonly belowFeetPx = BUTTON_BELOW_FEET_PX,
  ) {
    this.button.type = 'button';
    this.button.className = 'fish-button';
    this.button.setAttribute('aria-hidden', 'true');
    this.button.tabIndex = -1;
    this.button.setAttribute('aria-label', 'Thu cần (Space)');
    this.button.addEventListener('pointerdown', (event) => {
      if (!this.visible) return;
      event.stopPropagation();
      onPress();
    });
    const key = document.createElement('div');
    key.className = 'fish-button__key';
    key.textContent = 'SPACE';
    // Chữ SPACE đè lên nút, vòng đếm ngược ôm viền nút (feedback 2026-11-16).
    const face = document.createElement('div');
    face.className = 'fish-button__face';
    face.append(hookImage(), this.ring, key);
    this.button.append(face);
    root.append(this.button);

    // Nghe trên window vì scene Coral Cove tắt bàn phím của Phaser.
    this.onKeyDown = (event) => {
      if (event.code !== 'Space' || event.repeat || !this.visible || isTyping() || isModalOpen())
        return;
      event.preventDefault();
      onPress();
    };
    window.addEventListener('keydown', this.onKeyDown);
  }

  /**
   * Đặt nút ngay dưới chân nhân vật (toạ độ lớp UI 1920 ảo). Mặc định CSS đặt giữa màn hình, đúng khi
   * camera giữ nhân vật ở giữa; ở mép map camera chạm biên nên phải bám theo nhân vật (feedback 2026-11-17).
   */
  setAnchor(x: number, y: number): void {
    this.button.style.left = `${x}px`;
    this.button.style.top = `${y + this.belowFeetPx}px`;
  }

  render(visible: boolean, progress: number): void {
    // Hiện/ẩn bằng class để có hiệu ứng mờ dần và phóng nhẹ (feedback 2026-11-12), không bật/tắt tức thì.
    if (visible !== this.visible) {
      this.visible = visible;
      this.button.classList.toggle('fish-button--shown', visible);
      this.button.setAttribute('aria-hidden', String(!visible));
      this.button.tabIndex = visible ? 0 : -1;
    }
    if (visible) this.ring.style.setProperty('--bite-progress', String(progress));
  }

  destroy(): void {
    window.removeEventListener('keydown', this.onKeyDown);
    this.button.remove();
  }
}
