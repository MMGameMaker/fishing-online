import { animateIn, animateOut } from '../ui/kit/motion';
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

/**
 * Bảng chọn loài cá (công cụ dev, bật bằng `?mockFish=1`, yêu cầu 2026-11-21): nằm bên trái dưới thẻ người chơi; chọn loài nào
 * thì mọi lần cá cắn chỉ ra loài đó, "Ngẫu nhiên" trả về xác suất thường. Nằm trên canvas game, bám theo khung khi đổi cỡ cửa sổ.
 */
export function mountFishPicker(mock: MockBackend): void {
  const box = document.createElement('div');
  box.className = 'mock-fish';
  const head = document.createElement('button');
  head.type = 'button';
  head.className = 'mock-fish__head';
  const list = document.createElement('div');
  list.className = 'mock-fish__list';
  list.hidden = true;

  const refresh = () => {
    const forced = mock.getForcedSpecies();
    const name = mock.listSpecies().find((s) => s.speciesId === forced)?.name;
    head.textContent = `Chọn cá: ${name ?? 'Ngẫu nhiên'} ▾`;
    for (const item of list.querySelectorAll<HTMLElement>('.mock-fish__item')) {
      item.classList.toggle('mock-fish__item--on', (item.dataset.id || null) === forced);
    }
  };
  const addItem = (id: string | null, label: string) => {
    const item = document.createElement('button');
    item.type = 'button';
    item.className = 'mock-fish__item';
    item.dataset.id = id ?? '';
    item.textContent = label;
    item.addEventListener('click', () => {
      mock.setForcedSpecies(id);
      refresh();
    });
    list.append(item);
  };
  addItem(null, 'Ngẫu nhiên');
  for (const species of mock.listSpecies()) addItem(species.speciesId, `${species.name} (${species.rarity})`);

  head.addEventListener('click', () => {
    if (list.hidden) {
      list.hidden = false;
      animateIn(list, 'fade');
    } else {
      void animateOut(list, 'fade').then(() => (list.hidden = true));
    }
  });
  box.append(head, list);
  document.body.append(box);
  refresh();

  // Đặt theo canvas game: sát lề trái, dưới thẻ người chơi.
  const place = () => {
    const canvas = document.querySelector('canvas');
    const rect = canvas?.getBoundingClientRect();
    if (!rect || rect.width === 0) return;
    box.style.left = `${rect.left + 12}px`;
    box.style.top = `${rect.top + rect.height * 0.22}px`;
  };
  place();
  window.addEventListener('resize', place);
  window.setInterval(place, 1000);
}
