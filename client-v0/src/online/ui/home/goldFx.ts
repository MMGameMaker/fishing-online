// Gold tăng (bán cá, nhận thưởng thành tựu…): đồng xu bay từ giữa màn hình vào ô Gold, số Gold đếm lên,
// đồng xu trong ô nảy nhẹ (feedback 2026-11-17, mục "Gợi ý effect và FX" của review).
import { playSound } from '../../fishing/sound';
import { formatGold } from '../kit/format';
import { frameSize, localRect } from '../../core/viewFrame';

const COIN_COUNT = 8;
const FLY_MS = 760;
const STAGGER_MS = 45;
const COUNT_MS = 650;
const COIN_PX = 34;

/** Đếm số Gold từ `from` lên `to` trên phần tử `target`. */
function countUp(target: HTMLElement, from: number, to: number): void {
  const start = performance.now();
  const step = (now: number) => {
    const t = Math.min(1, (now - start) / COUNT_MS);
    const eased = 1 - (1 - t) ** 3;
    target.textContent = formatGold(String(Math.round(from + (to - from) * eased)));
    if (t < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

/**
 * Chạy hiệu ứng Gold tăng. `coinIcon` là ảnh đồng xu trong ô Gold (đích bay tới), `amount` là chữ số Gold.
 * Trả về ngay; chữ số được đặt về `to` khi xong.
 */
export function playGoldGain(
  coinIcon: HTMLElement,
  amount: HTMLElement,
  coinSrc: string,
  from: number,
  to: number,
): void {
  const target = localRect(coinIcon);
  // Không bỏ qua khi máy bật "giảm chuyển động" (Windows tắt hiệu ứng hoạt cảnh làm hiệu ứng này biến mất, yêu cầu 2026-11-21).
  if (target.width === 0) {
    amount.textContent = formatGold(String(to));
    return;
  }
  // Bay về đích thì thu dần về đúng cỡ biểu tượng đồng xu ở đích.
  const endScale = target.width / COIN_PX;
  const endX = target.left + target.width / 2 - COIN_PX / 2;
  const endY = target.top + target.height / 2 - COIN_PX / 2;
  const frame = frameSize();
  const startX = frame.width / 2 - COIN_PX / 2;
  const startY = frame.height / 2 - COIN_PX / 2;
  for (let i = 0; i < COIN_COUNT; i++) {
    const coin = document.createElement('img');
    coin.src = coinSrc;
    coin.alt = '';
    coin.className = 'gold-fx-coin';
    coin.style.cssText = `left:${startX}px;top:${startY}px;width:${COIN_PX}px;height:${COIN_PX}px`;
    document.body.append(coin);
    // Bung ra một vòng nhỏ rồi bay vào ô Gold.
    const angle = (i / COIN_COUNT) * Math.PI * 2;
    const spreadX = Math.cos(angle) * 90;
    const spreadY = Math.sin(angle) * 60;
    // Mỗi đoạn có easing riêng: bung ra nhanh (ease-out) rồi tăng tốc bay vào ô Gold (ease-in).
    const animation = coin.animate(
      [
        { transform: 'translate(0, 0) scale(0.6)', opacity: 0, easing: 'ease-out' },
        {
          transform: `translate(${spreadX}px, ${spreadY}px) scale(1.15)`,
          opacity: 1,
          offset: 0.35,
          easing: 'cubic-bezier(0.55, 0, 0.9, 0.4)',
        },
        { transform: `translate(${endX - startX}px, ${endY - startY}px) scale(${endScale})`, opacity: 1 },
      ],
      { duration: FLY_MS, delay: i * STAGGER_MS, fill: 'both' },
    );
    animation.onfinish = () => {
      coin.remove();
      if (i === 0) {
        playSound('woodenClick', 0.3);
        countUp(amount, from, to);
      }
      coinIcon.animate(
        [{ transform: 'scale(1)' }, { transform: 'scale(1.25)' }, { transform: 'scale(1)' }],
        { duration: 160, easing: 'ease-out' },
      );
    };
  }
}
