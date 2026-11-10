// Nút móc câu ở góc phải màn hình, kèm thanh đếm ngược; chỉ hiện khi cá cắn (SPEC 0.9 mục 2.6).
const SVG_NS = 'http://www.w3.org/2000/svg';
const HOOK_PATH = 'M15 3v15a5 5 0 1 1-10 0v-2';

function hookIcon(): SVGSVGElement {
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('aria-hidden', 'true');
  svg.classList.add('fish-button__icon');
  const path = document.createElementNS(SVG_NS, 'path');
  path.setAttribute('d', HOOK_PATH);
  const eye = document.createElementNS(SVG_NS, 'circle');
  eye.setAttribute('cx', '15');
  eye.setAttribute('cy', '3');
  eye.setAttribute('r', '1.6');
  svg.append(path, eye);
  return svg;
}

export class FishButton {
  private readonly button = document.createElement('button');
  private readonly bar = document.createElement('div');

  constructor(root: HTMLElement, onPress: () => void) {
    this.button.type = 'button';
    this.button.className = 'fish-button';
    this.button.hidden = true;
    this.button.setAttribute('aria-label', 'Thu cần');
    this.button.addEventListener('pointerdown', (event) => {
      event.stopPropagation();
      onPress();
    });
    this.bar.className = 'fish-button__bar';
    this.button.append(hookIcon(), this.bar);
    root.append(this.button);
  }

  render(visible: boolean, progress: number): void {
    this.button.hidden = !visible;
    if (visible) this.bar.style.setProperty('--bite-progress', String(progress));
  }

  destroy(): void {
    this.button.remove();
  }
}
