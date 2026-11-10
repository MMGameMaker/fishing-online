/** Nút Kéo giữa màn hình; lớp chạm phủ kín nên chạm điểm nào cũng tính là Kéo. */
export class FishButton {
  private readonly layer = document.createElement('div');
  private readonly button = document.createElement('div');

  constructor(root: HTMLElement, onPress: () => void) {
    this.layer.className = 'fish-tap-layer';
    this.layer.hidden = true;
    this.layer.addEventListener('pointerdown', onPress);
    this.button.className = 'fish-button';
    this.button.textContent = 'Kéo!';
    this.layer.append(this.button);
    root.append(this.layer);
  }

  render(visible: boolean, progress: number): void {
    this.layer.hidden = !visible;
    if (visible) this.button.style.setProperty('--bite-progress', String(progress));
  }

  destroy(): void {
    this.layer.remove();
  }
}
