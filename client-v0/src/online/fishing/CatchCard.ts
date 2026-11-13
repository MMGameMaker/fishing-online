// Thẻ nhận cá dựng từ ảnh Catch Fish.png (feedback 2026-11-11).
// Ảnh gốc có sẵn hình cá và chữ mẫu ở cột giá trị: xoá đi rồi điền dữ liệu Server gửi về.
// Nhãn cột trái (Tên, Độ hiếm, Nơi sống, Kích thước, Giá) và đồng xu giữ nguyên từ ảnh.
import type { Rarity } from '../core/gameplayConfig';
import type { ResultCard } from './resultText';

const CARD_IMAGE = encodeURI('/mini game/Catch Fish.png');
const CARD_W = 536;
const CARD_H = 684;
const PICTURE_BG = 'rgb(242,214,156)';
const ROW_BG = 'rgb(251,227,174)';
/** Khung tranh cá: lòng khung từ (32, 36) tới (504, 264). */
const PICTURE = { x: 32, y: 36, w: 472, h: 228 };
/**
 * Lòng 5 hàng (x 20..512), chừa các đường kẻ chấm. Xoá cả nhãn lẫn giá trị vẽ sẵn vì chữ trong ảnh
 * bị méo khi thu phóng (feedback 2026-11-12); hàng Giá giữ đồng xu ở x 328..364.
 */
const ROW_X0 = 20;
const ROW_X1 = 512;
const COIN_LEFT = 328;
const LABEL_X = 36;
const LABELS = ['Tên', 'Độ hiếm', 'Nơi sống', 'Kích thước', 'Giá'] as const;
const ROWS = [
  { y0: 280, y1: 360, center: 331 },
  { y0: 372, y1: 428, center: 403 },
  { y0: 440, y1: 496, center: 471 },
  { y0: 508, y1: 564, center: 539 },
  { y0: 576, y1: 632, center: 603 },
] as const;
const VALUE_CENTER_X = 367;
const COIN_RIGHT = 364;
const PRICE_X = 368;

// Màu độ hiếm đậm hơn bảng chung để đọc rõ trên nền giấy.
const RARITY_INK: Record<Rarity, string> = {
  common: '#6b5a45',
  uncommon: '#2f8a3a',
  rare: '#2b6fc2',
  epic: '#8a4fd0',
  legendary: '#c8761a',
};

let cleanCard: Promise<string> | null = null;

/** Ảnh thẻ đã xoá cá và toàn bộ chữ vẽ sẵn, tạo một lần rồi dùng lại. */
function loadCleanCard(): Promise<string> {
  cleanCard ??= new Promise<string>((resolve, reject) => {
    const image = new Image();
    image.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = CARD_W;
      canvas.height = CARD_H;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(image, 0, 0);
      ctx.fillStyle = PICTURE_BG;
      ctx.fillRect(PICTURE.x, PICTURE.y, PICTURE.w, PICTURE.h);
      ctx.fillStyle = ROW_BG;
      ROWS.forEach((row, i) => {
        const h = row.y1 - row.y0;
        if (i === ROWS.length - 1) {
          ctx.fillRect(ROW_X0, row.y0, COIN_LEFT - ROW_X0, h);
          ctx.fillRect(COIN_RIGHT, row.y0, ROW_X1 - COIN_RIGHT, h);
        } else {
          ctx.fillRect(ROW_X0, row.y0, ROW_X1 - ROW_X0, h);
        }
      });
      resolve(canvas.toDataURL());
    };
    image.onerror = () => {
      cleanCard = null;
      reject(new Error(`Không tải được ${CARD_IMAGE}`));
    };
    image.src = CARD_IMAGE;
  });
  return cleanCard;
}

/** Gọi khi vào hồ để ảnh thẻ sẵn sàng trước lần câu được cá đầu tiên. */
export function preloadCatchCard(): void {
  void loadCleanCard().catch((error: unknown) => console.warn(error));
}

const pct = (value: number, total: number) => `${(value / total) * 100}%`;

export interface CatchCardData {
  card: ResultCard;
  rarity: Rarity;
  isNew: boolean;
  isRecord: boolean;
  habitat: string;
  /** Hình cá (ảnh theo loài, xem ui/fishArt.ts) đặt giữa khung tranh. */
  fish: HTMLElement;
}

export function buildCatchCard(data: CatchCardData): HTMLElement {
  const { card } = data;
  const root = document.createElement('div');
  root.className = 'catch-card';
  // Chỉ hiện ảnh đã xoá chữ mẫu; ảnh được tải sẵn từ lúc vào hồ (preloadCatchCard) nên gần như tức thì.
  void loadCleanCard()
    .then((url) => root.style.setProperty('--card-image', `url("${url}")`))
    .catch((error: unknown) => console.warn(error));

  data.fish.classList.add('catch-card__fish');
  data.fish.style.left = pct(PICTURE.x + PICTURE.w / 2, CARD_W);
  data.fish.style.top = pct(PICTURE.y + PICTURE.h / 2, CARD_H);
  // Vừa khung tranh (chừa lề), giữ tỉ lệ ảnh: cá dài như Marlin hay cá nhỏ như Minnow đều cân.
  data.fish.style.width = pct(PICTURE.w * 0.8, CARD_W);
  data.fish.style.height = pct(PICTURE.h * 0.8, CARD_H);
  root.append(data.fish);

  const value = (
    row: number,
    text: string,
    x = VALUE_CENTER_X,
    align: 'center' | 'left' = 'center',
  ): HTMLElement => {
    const el = document.createElement('div');
    el.className = `catch-card__value catch-card__value--${align}`;
    el.textContent = text;
    el.style.left = pct(x, CARD_W);
    el.style.top = pct(ROWS[row]?.center ?? 0, CARD_H);
    root.append(el);
    return el;
  };
  // Nhãn cột trái do code viết, cùng phông với giá trị.
  LABELS.forEach((label, row) =>
    value(row, label, LABEL_X, 'left').classList.add('catch-card__label'),
  );
  value(0, card.name);
  value(1, card.rarityLabel).style.color = RARITY_INK[data.rarity];
  value(2, data.habitat);
  value(3, card.length.replace(' ', ''));
  value(4, card.price === null ? '—' : String(card.price), PRICE_X, 'left');

  // Loài mới hoặc kỷ lục mới: chữ đỏ bên phải kích thước, như ảnh mẫu.
  const badge = data.isNew ? 'Loài mới' : data.isRecord ? 'Kỷ lục mới' : null;
  if (badge) {
    const el = value(3, badge, 470);
    el.classList.add('catch-card__badge');
  }
  return root;
}
