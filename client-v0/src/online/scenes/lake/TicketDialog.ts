// Popup mua vé câu cá dựng theo hình mẫu (feedback 2026-11-11), ảnh nguồn trong public/mini game.
// Khung thiết kế 1120×564 px, thu nhỏ theo cửa sổ. Giá, số phút và giới hạn số lượng lấy theo
// ticketPricing của Server; Client chỉ tính để hiển thị, Server tính lại khi mua.
import type { TicketPricingConfig } from '../../core/gameplayConfig';
import { formatGold } from '../../ui/kit/format';
import { animateIn, animateOut } from '../../ui/kit/motion';
import { priceSummary } from './seatLogic';

const DIR = '/mini game/';
const asset = (file: string) => encodeURI(DIR + file);
const DESIGN_W = 1120;
const DESIGN_H = 564;

// Slider.png 384×48: núm kéo ở x 0..40, thanh từ x 40 tới 384 (đầu phải bo tròn ở x 364..384).
export const SLIDER = { w: 384, h: 48, knobW: 40, capW: 20, fillCol: 200 };
// Art Ticket.png: chữ "10 phút" vẽ sẵn, xoá đi vì số phút đổi theo lượng vé chọn.
const TICKET_TEXT_BOX = { x: 148, y: 84, w: 96, h: 28, color: 'rgb(232,96,76)' };

let sliderParts: Promise<{ track: string; knob: string }> | null = null;
let ticketArt: Promise<string> | null = null;

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`Không tải được ${src}`));
    image.src = src;
  });
}

function canvas(w: number, h: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return [c, c.getContext('2d')!];
}

/** Tách Slider.png thành núm kéo và thanh trống (đầu trái lấy đối xứng từ đầu phải). */
export function loadSliderParts(): Promise<{ track: string; knob: string }> {
  sliderParts ??= loadImage(asset('Slider.png')).then((image) => {
    const { w, h, knobW, capW, fillCol } = SLIDER;
    const [knob, kctx] = canvas(knobW, h);
    kctx.drawImage(image, 0, 0, knobW, h, 0, 0, knobW, h);
    const [track, tctx] = canvas(w, h);
    tctx.drawImage(image, 0, 0);
    tctx.clearRect(0, 0, knobW + 4, h);
    for (let x = capW; x < knobW + 4; x++) tctx.drawImage(image, fillCol, 0, 1, h, x, 0, 1, h);
    tctx.save();
    tctx.scale(-1, 1);
    tctx.drawImage(image, w - capW, 0, capW, h, -capW, 0, capW, h);
    tctx.restore();
    return { track: track.toDataURL(), knob: knob.toDataURL() };
  });
  return sliderParts;
}

function loadTicketArt(): Promise<string> {
  ticketArt ??= loadImage(asset('Art Ticket.png')).then((image) => {
    const [c, ctx] = canvas(image.width, image.height);
    ctx.drawImage(image, 0, 0);
    const box = TICKET_TEXT_BOX;
    ctx.fillStyle = box.color;
    ctx.fillRect(box.x, box.y, box.w, box.h);
    return c.toDataURL();
  });
  return ticketArt;
}

/** Gọi sớm để ảnh popup sẵn sàng trước lần mở đầu tiên. */
export function preloadTicketDialog(): void {
  void Promise.all([loadSliderParts(), loadTicketArt()]).catch((error: unknown) =>
    console.warn(error),
  );
}

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className: string,
  text?: string,
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function image(src: string, className: string): HTMLImageElement {
  const node = el('img', className);
  node.src = src;
  node.alt = '';
  node.draggable = false;
  return node;
}

export interface TicketDialogOptions {
  root: HTMLElement;
  pricing: TicketPricingConfig;
  maxUnits: number;
  /** Gửi lệnh mua; trả true khi mua thành công. */
  buy: (units: number) => Promise<boolean>;
}

/** Mở popup; trả true nếu đã mua vé, false nếu đóng hoặc mua thất bại. */
export function openTicketDialog({
  root,
  pricing,
  maxUnits,
  buy,
}: TicketDialogOptions): Promise<boolean> {
  return new Promise((resolve) => {
    let units = 1;
    let busy = false;
    const overlay = el('div', 'ticket-dialog');
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    const panel = el('div', 'ticket-dialog__panel');
    overlay.append(panel);

    const fit = () => {
      const scale = Math.min(
        1,
        (window.innerWidth * 0.94) / DESIGN_W,
        (window.innerHeight * 0.9) / DESIGN_H,
      );
      panel.style.setProperty('--ticket-scale', String(scale));
    };
    let resolved = false;
    let closing = false;
    const close = (result: boolean) => {
      if (!resolved) {
        resolved = true;
        resolve(result);
      }
      if (closing) return;
      closing = true;
      window.removeEventListener('resize', fit);
      window.removeEventListener('keydown', onKey);
      // Mờ dần nền tối, khung thu nhỏ rồi mới gỡ (feedback 2026-11-12).
      overlay.style.pointerEvents = 'none';
      void Promise.all([animateOut(panel, 'pop'), animateOut(overlay, 'fade')]).then(() =>
        overlay.remove(),
      );
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !busy) close(false);
    };

    const closeButton = el('button', 'ticket-dialog__close');
    closeButton.type = 'button';
    closeButton.setAttribute('aria-label', 'Đóng');
    closeButton.append(image(asset('Button Close.png'), ''));
    closeButton.addEventListener('click', () => {
      if (!busy) close(false);
    });

    const ticket = el('img', 'ticket-dialog__art');
    ticket.alt = '';
    void loadTicketArt()
      .then((src) => (ticket.src = src))
      .catch((error: unknown) => console.warn(error));

    const price = el('div', 'ticket-dialog__price');
    const priceUnits = el('span', '');
    const priceTotal = el('span', '');
    price.append(priceUnits, image(asset('Coin Small.png'), 'ticket-dialog__coin'), priceTotal);

    const slider = el('div', 'ticket-dialog__slider');
    const knob = el('div', 'ticket-dialog__knob');
    slider.append(knob);
    void loadSliderParts()
      .then(({ track, knob: knobSrc }) => {
        slider.style.backgroundImage = `url("${track}")`;
        knob.style.backgroundImage = `url("${knobSrc}")`;
      })
      .catch((error: unknown) => console.warn(error));

    const round = (label: string, delta: number, aria: string, side: 'minus' | 'plus') => {
      const button = el('button', `ticket-dialog__round ticket-dialog__round--${side}`, label);
      button.type = 'button';
      button.setAttribute('aria-label', aria);
      button.addEventListener('click', () => setUnits(units + delta));
      return button;
    };
    const minus = round('−', -1, 'Bớt 1', 'minus');
    const plus = round('+', 1, 'Thêm 1', 'plus');

    // Amount Bar.png chia 4 ô đều nhau: MIN, -10, +10, MAX.
    const amount = el('div', 'ticket-dialog__amount');
    const amountActions: [string, () => number][] = [
      ['Ít nhất', () => 1],
      ['Bớt 10', () => units - 10],
      ['Thêm 10', () => units + 10],
      ['Nhiều nhất', () => maxUnits],
    ];
    for (const [aria, next] of amountActions) {
      const zone = el('button', 'ticket-dialog__amount-zone');
      zone.type = 'button';
      zone.setAttribute('aria-label', aria);
      zone.addEventListener('click', () => setUnits(next()));
      amount.append(zone);
    }

    const duration = el('div', 'ticket-dialog__duration');
    const buyButton = el('button', 'ticket-dialog__buy', 'Mua');
    buyButton.type = 'button';
    buyButton.addEventListener('click', () => {
      if (busy) return;
      busy = true;
      buyButton.disabled = true;
      void buy(units)
        .then((ok) => {
          if (ok) close(true);
        })
        .catch((error: unknown) => console.warn(error))
        .finally(() => {
          busy = false;
          buyButton.disabled = false;
        });
    });

    panel.append(
      el('h2', 'ticket-dialog__title', 'Vé câu cá'),
      closeButton,
      el(
        'p',
        'ticket-dialog__desc',
        'Mua vé để có thể câu cá. Thời gian hiệu lực của vé được áp dụng ngay sau khi mua.',
      ),
      ticket,
      price,
      minus,
      slider,
      plus,
      amount,
      duration,
      buyButton,
    );

    function setUnits(next: number): void {
      units = Math.max(1, Math.min(maxUnits, Math.round(next)));
      const { minutes, total } = priceSummary(pricing, units);
      priceUnits.textContent = String(units);
      priceTotal.textContent = formatGold(total);
      duration.textContent = `Hiệu lực: ${minutes} phút`;
      const ratio = maxUnits > 1 ? (units - 1) / (maxUnits - 1) : 0;
      knob.style.left = `${ratio * (SLIDER.w - SLIDER.knobW)}px`;
      minus.disabled = units <= 1;
      plus.disabled = units >= maxUnits;
    }

    // Kéo núm hoặc bấm lên thanh để chọn số lượng.
    const unitsAt = (clientX: number) => {
      const rect = slider.getBoundingClientRect();
      const knobW = (rect.width * SLIDER.knobW) / SLIDER.w;
      const ratio = (clientX - rect.left - knobW / 2) / Math.max(1, rect.width - knobW);
      return 1 + Math.max(0, Math.min(1, ratio)) * (maxUnits - 1);
    };
    slider.addEventListener('pointerdown', (event) => {
      slider.setPointerCapture(event.pointerId);
      setUnits(unitsAt(event.clientX));
    });
    slider.addEventListener('pointermove', (event) => {
      if (slider.hasPointerCapture(event.pointerId)) setUnits(unitsAt(event.clientX));
    });

    window.addEventListener('resize', fit);
    window.addEventListener('keydown', onKey);
    fit();
    setUnits(1);
    animateIn(overlay, 'fade');
    animateIn(panel, 'pop');
    root.append(overlay);
  });
}
