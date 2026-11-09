import type { MockBackend } from './MockBackend';

const FAST_SCALE = 10;

/** Góc màn hình luôn hiện chữ MOCK để không nhầm với Server thật, kèm nút tua phiên ghế. */
export function mountDevOverlay(mock: MockBackend, forcedError: string | null): void {
  const box = document.createElement('div');
  box.className = 'mock-overlay';

  const label = document.createElement('span');
  label.textContent = forcedError ? `MOCK · lỗi giả ${forcedError}` : 'MOCK';

  const button = document.createElement('button');
  button.type = 'button';
  const refresh = () => {
    const fast = mock.getSeatTimeScale() > 1;
    button.textContent = fast ? 'Thời gian ghế x10' : 'Thời gian ghế x1';
    button.setAttribute('aria-pressed', String(fast));
  };
  button.addEventListener('click', () => {
    mock.setSeatTimeScale(mock.getSeatTimeScale() > 1 ? 1 : FAST_SCALE);
    refresh();
  });
  refresh();

  box.append(label, button);
  document.body.append(box);
}
