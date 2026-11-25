import { CELEBRATION_KINDS, CELEBRATION_NAMES } from '../entities/celebrations';
import { EXPRESSION_KINDS, EXPRESSION_NAMES } from '../entities/faceExpression';
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
  // Nút dưới bảng: thêm mỗi loài một con vào túi (mở lại Cửa hàng/Túi đồ để thấy).
  const grant = document.createElement('button');
  grant.type = 'button';
  grant.className = 'mock-fish__grant';
  grant.textContent = 'Có tất cả cá';
  grant.addEventListener('click', () => {
    const count = mock.grantAllFish();
    grant.textContent = `Đã thêm ${count} loài ✓`;
    window.setTimeout(() => (grant.textContent = 'Có tất cả cá'), 1800);
  });
  // Nút chọn lại nhân vật: quên lựa chọn đã lưu rồi tải lại trang để hiện lại panel Chọn nhân vật (mock nhớ nhân vật qua localStorage).
  const pick = document.createElement('button');
  pick.type = 'button';
  pick.className = 'mock-fish__pick';
  pick.textContent = 'Chọn nhân vật';
  pick.addEventListener('click', () => {
    mock.forgetCharacter();
    window.location.reload();
  });
  // Nút cộng 3000 vàng để thử mua đồ; cập nhật luôn Gold hiện trên HUD qua store của game.
  const gold = document.createElement('button');
  gold.type = 'button';
  gold.className = 'mock-fish__gold';
  gold.textContent = '+3000 vàng';
  gold.addEventListener('click', () => {
    const total = mock.addGold(3000);
    const game = (window as unknown as { __fishing?: { services?: { store?: { dispatch: (action: unknown) => void } } } })
      .__fishing;
    game?.services?.store?.dispatch({ type: 'session/gold', payload: String(total) });
  });
  // Ba nút thử anim ăn mừng của nhân vật mình (nhảy mừng, xoay vòng, nhún nhảy).
  const celebrate = CELEBRATION_KINDS.map((kind) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'mock-fish__celebrate';
    button.textContent = CELEBRATION_NAMES[kind];
    button.addEventListener('click', () => {
      const game = (window as unknown as { __fishing?: { game?: { scene?: { getScenes: (active: boolean) => unknown[] } } } })
        .__fishing?.game;
      for (const scene of game?.scene?.getScenes(true) ?? []) {
        (scene as { celebrateMe?: (kind: string) => boolean }).celebrateMe?.(kind);
      }
    });
    return button;
  });
  // Hai nút thử biểu cảm mặt (chớp mắt, mắt cười) của nhân vật mình.
  const expressions = EXPRESSION_KINDS.map((kind) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'mock-fish__celebrate';
    button.textContent = EXPRESSION_NAMES[kind];
    button.addEventListener('click', () => {
      const game = (window as unknown as { __fishing?: { game?: { scene?: { getScenes: (active: boolean) => unknown[] } } } })
        .__fishing?.game;
      for (const scene of game?.scene?.getScenes(true) ?? []) {
        (scene as { expressMe?: (kind: string) => boolean }).expressMe?.(kind);
      }
    });
    return button;
  });
  box.append(head, list, grant, gold, pick, ...celebrate, ...expressions);
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
