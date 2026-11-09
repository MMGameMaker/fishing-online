// Trang demo UI kit: mở bằng ?scene=ui-demo.
import Phaser from 'phaser';
import { RARITIES } from '../../core/gameplayConfig';
import { ERROR_CODES } from '../../net/contract';
import {
  confirmDialog,
  createButton,
  createGoldLabel,
  createPanel,
  createTabs,
  mountUiOverlay,
  showError,
  showToast,
} from './components';
import { errorTextFor } from './errorText';
import { RARITY_COLORS, RARITY_LABELS } from './format';

const section = (title: string, ...children: HTMLElement[]): HTMLElement => {
  const wrapper = document.createElement('div');
  const heading = document.createElement('h3');
  heading.textContent = title;
  const row = document.createElement('div');
  row.className = 'ui-demo__row';
  row.append(...children);
  wrapper.append(heading, row);
  return wrapper;
};

const textBlock = (text: string): HTMLElement => {
  const el = document.createElement('div');
  el.textContent = text;
  return el;
};

export class UiDemoScene extends Phaser.Scene {
  constructor() {
    super('UiDemo');
  }

  create(): void {
    const overlay = mountUiOverlay(this.game);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, overlay.destroy);
    const { root } = overlay;

    const gold = createGoldLabel('1234567');
    const rarities = RARITIES.map((rarity) => {
      const el = textBlock(RARITY_LABELS[rarity]);
      el.style.color = RARITY_COLORS[rarity];
      return el;
    });

    const errors = document.createElement('ul');
    errors.className = 'ui-demo__errors';
    for (const code of ERROR_CODES) {
      const item = document.createElement('li');
      item.textContent = `${code}: ${errorTextFor(code)}`;
      errors.append(item);
    }

    const content = document.createElement('div');
    content.append(
      section(
        'Button',
        createButton({ label: 'Thường' }),
        createButton({ label: 'Chính', variant: 'primary' }),
        createButton({ label: 'Nguy hiểm', variant: 'danger' }),
        createButton({ label: 'Khóa', disabled: true }),
      ),
      section('GoldLabel', gold.el),
      section('Rarity', ...rarities),
      section(
        'Toast và ConfirmDialog',
        createButton({ label: 'Toast', onClick: () => showToast(root, 'Đã bán cá thành công') }),
        createButton({
          label: 'Toast lỗi',
          onClick: () => showError(root, { code: 'INSUFFICIENT_GOLD' }),
        }),
        createButton({
          label: 'Xác nhận',
          onClick: () => {
            void confirmDialog(root, {
              title: 'Rời ghế',
              message: 'Không hoàn vé. Bạn có chắc muốn rời ghế?',
              confirmLabel: 'Rời ghế',
            }).then((yes) => showToast(root, yes ? 'Đã đồng ý' : 'Đã hủy'));
          },
        }),
      ),
      section(
        'Tabs',
        createTabs([
          { id: 'a', label: 'Mua', render: () => textBlock('Nội dung tab Mua') },
          { id: 'b', label: 'Bán cá', render: () => textBlock('Nội dung tab Bán cá') },
        ]),
      ),
      section('Bảng lỗi', errors),
    );

    const panel = createPanel('Demo UI kit', content);
    panel.classList.add('ui-demo');
    root.append(panel);
  }
}
