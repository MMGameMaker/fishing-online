// Nút móc câu gần giữa màn hình, kèm thanh đếm ngược; chỉ hiện khi cá cắn.
// Thu cần bằng cách bấm nút hoặc phím Space (feedback 2026-11-11). Hình nút là ảnh Button Hook.png.
const HOOK_IMAGE = encodeURI('/mini game/Button Hook.png');

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
  private readonly bar = document.createElement('div');
  private readonly onKeyDown: (event: KeyboardEvent) => void;
  private visible = false;

  constructor(root: HTMLElement, onPress: () => void) {
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
    this.bar.className = 'fish-button__bar';
    this.button.append(hookImage(), key, this.bar);
    root.append(this.button);

    // Nghe trên window vì scene Coral Cove tắt bàn phím của Phaser.
    this.onKeyDown = (event) => {
      if (event.code !== 'Space' || event.repeat || !this.visible || isTyping()) return;
      event.preventDefault();
      onPress();
    };
    window.addEventListener('keydown', this.onKeyDown);
  }

  render(visible: boolean, progress: number): void {
    // Hiện/ẩn bằng class để có hiệu ứng mờ dần và phóng nhẹ (feedback 2026-11-12), không bật/tắt tức thì.
    if (visible !== this.visible) {
      this.visible = visible;
      this.button.classList.toggle('fish-button--shown', visible);
      this.button.setAttribute('aria-hidden', String(!visible));
      this.button.tabIndex = visible ? 0 : -1;
    }
    if (visible) this.bar.style.setProperty('--bite-progress', String(progress));
  }

  destroy(): void {
    window.removeEventListener('keydown', this.onKeyDown);
    this.button.remove();
  }
}
