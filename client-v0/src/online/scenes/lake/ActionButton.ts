// Nút hành động ở góc phải dưới cho điện thoại (pier.html, feedback 2026-11-19), thay phím F:
// ngồi vào ghế, xem thông tin người/bot, hoặc đứng dậy khi đang ngồi chơi. Hiện/ẩn có easing (CSS), không bật tắt tức thì.
const F_ART = encodeURI('/new resources/ui/Sit Prompt F.png');

export class ActionButton {
  private readonly button = document.createElement('button');
  private readonly label = document.createElement('span');
  private shown = false;

  constructor(root: HTMLElement, onPress: () => void) {
    this.button.type = 'button';
    this.button.className = 'action-button';
    this.button.tabIndex = -1;
    this.button.setAttribute('aria-hidden', 'true');
    const key = document.createElement('img');
    key.className = 'action-button__key';
    key.src = F_ART;
    key.alt = '';
    key.draggable = false;
    this.label.className = 'action-button__label';
    this.button.append(key, this.label);
    root.append(this.button);
    // pointerdown như nút câu cá: phản hồi ngay khi chạm, không chờ nhả ngón.
    this.button.addEventListener('pointerdown', (event) => {
      if (!this.shown) return;
      event.preventDefault();
      event.stopPropagation();
      onPress();
    });
  }

  /** `label` null = ẩn nút; có chữ = hiện nút với chữ đó (giữ chữ cũ trong lúc mờ dần). */
  update(label: string | null): void {
    const visible = label !== null;
    if (label !== null && this.label.textContent !== label) this.label.textContent = label;
    if (visible === this.shown) return;
    this.shown = visible;
    this.button.classList.toggle('action-button--shown', visible);
    this.button.setAttribute('aria-hidden', String(!visible));
  }

  destroy(): void {
    this.button.remove();
  }
}
