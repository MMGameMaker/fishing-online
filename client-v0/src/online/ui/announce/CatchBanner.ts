// Thanh thông báo khoe cá ở nửa trên màn hình (doc/GAMEPLAY_SCOPE "Khoe cá kiểu 1", hiệu ứng theo người
// dùng 2026-11-13): thanh xanh mở theo chiều dọc từ giữa (scaleY 0 → 1), dòng chữ chạy từ phải sang trái
// (doc: lặp 3 lần), rồi thanh khép theo chiều dọc về giữa (1 → 0). Nhiều thông báo thì xếp hàng chạy lần lượt.
import type { HubEvents } from '../../net/contract';
import { SHOP_RARITY_COLORS } from '../shop/shopModel';

type Announcement = HubEvents['CatchAnnounced'];

const OPEN_MS = 220;
const CLOSE_MS = 200;
/** Tốc độ chữ chạy (px/giây) và số lượt chạy theo doc. */
const SCROLL_PX_PER_S = 150;
const SCROLL_TIMES = 3;
/** Hàng chờ dài quá thì bỏ thông báo cũ để thanh không chạy mãi khi đông người câu. */
const MAX_QUEUE = 5;

/**
 * Nội dung: "Chúc mừng [tên] là người đầu tiên câu được [cá]!" (tên vàng, cá màu độ hiếm).
 * `onLight`: hiện trên nền kem (khung chat) nên dùng sắc đậm hơn cho dễ đọc.
 */
export function announcementParts(
  a: Announcement,
  onLight = false,
): { text: string; color?: string }[] {
  const fishColor = onLight && a.rarity === 'legendary' ? '#b98500' : SHOP_RARITY_COLORS[a.rarity];
  return [
    { text: 'Chúc mừng ' },
    { text: a.displayName, color: onLight ? '#d0661c' : '#ffd84a' },
    { text: a.first ? ' là người đầu tiên câu được ' : ' đã câu được ' },
    { text: a.speciesName, color: fishColor },
    { text: '!' },
  ];
}

export function renderAnnouncement(target: HTMLElement, a: Announcement, onLight = false): void {
  target.replaceChildren(
    ...announcementParts(a, onLight).map((part) => {
      const span = document.createElement('span');
      span.textContent = part.text;
      if (part.color) span.style.color = part.color;
      return span;
    }),
  );
}

export class CatchBanner {
  private readonly queue: Announcement[] = [];
  private running = false;
  private destroyed = false;
  private current: HTMLElement | null = null;

  constructor(private readonly root: HTMLElement) {}

  show(announcement: Announcement): void {
    this.queue.push(announcement);
    while (this.queue.length > MAX_QUEUE) this.queue.shift();
    if (!this.running) void this.drain();
  }

  destroy(): void {
    this.destroyed = true;
    this.queue.length = 0;
    this.current?.remove();
  }

  private async drain(): Promise<void> {
    this.running = true;
    while (!this.destroyed && this.queue.length > 0) {
      await this.play(this.queue.shift()!);
    }
    this.running = false;
  }

  private async play(announcement: Announcement): Promise<void> {
    const bar = document.createElement('div');
    bar.className = 'catch-banner';
    bar.setAttribute('role', 'status');
    const track = document.createElement('div');
    track.className = 'catch-banner__track';
    const text = document.createElement('div');
    text.className = 'catch-banner__text';
    renderAnnouncement(text, announcement);
    track.append(text);
    bar.append(track);
    this.root.append(bar);
    this.current = bar;

    try {
      await bar.animate([{ transform: 'scaleY(0)' }, { transform: 'scaleY(1)' }], {
        duration: OPEN_MS,
        easing: 'cubic-bezier(0.2, 0.9, 0.3, 1.2)',
        fill: 'forwards',
      }).finished;
      // Chữ đi từ ngoài mép phải tới khuất hẳn mép trái, lặp SCROLL_TIMES lượt.
      const distance = track.clientWidth + text.scrollWidth;
      await text.animate(
        [
          { transform: `translateX(${track.clientWidth}px)` },
          { transform: `translateX(${-text.scrollWidth}px)` },
        ],
        {
          duration: (distance / SCROLL_PX_PER_S) * 1000,
          iterations: SCROLL_TIMES,
          easing: 'linear',
          fill: 'forwards',
        },
      ).finished;
      await bar.animate([{ transform: 'scaleY(1)' }, { transform: 'scaleY(0)' }], {
        duration: CLOSE_MS,
        easing: 'ease-in',
        fill: 'forwards',
      }).finished;
    } catch {
      // Animation bị huỷ khi scene tắt: bỏ qua.
    } finally {
      bar.remove();
      if (this.current === bar) this.current = null;
    }
  }
}
