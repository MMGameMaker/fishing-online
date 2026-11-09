import type { FishButtonViewState } from './fishButtonState';

/** Nút câu tròn góc phải dưới; vòng đếm ngược vẽ bằng biến CSS. */
export class FishButton {
  private readonly el = document.createElement('button');
  private canPress = false;

  constructor(root: HTMLElement, onPress: () => void) {
    this.el.type = 'button';
    this.el.className = 'fish-button';
    this.el.hidden = true;
    this.el.addEventListener('click', () => {
      if (this.canPress) onPress();
    });
    root.append(this.el);
  }

  render(view: FishButtonViewState, progress: number): void {
    this.el.hidden = !view.visible;
    if (!view.visible) {
      this.canPress = false;
      return;
    }
    this.canPress = view.canPress;
    this.el.textContent = view.label;
    this.el.dataset.mode = view.mode;
    this.el.setAttribute('aria-disabled', String(!view.canPress));
    this.el.style.setProperty('--bite-progress', String(progress));
  }

  destroy(): void {
    this.el.remove();
  }
}
