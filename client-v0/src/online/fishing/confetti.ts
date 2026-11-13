// Pháo hoa giấy khi câu được cá (feedback 2026-11-12): các mảnh giấy màu bắn tung từ giữa màn hình
// rồi rơi xuống, xoay và mờ dần. Dùng Web Animations, không cần thêm CSS; tự gỡ khi chạy xong.

const COLORS = ['#ffd84a', '#ff6b5e', '#7fe3ff', '#8ee07a', '#c480ff', '#ffffff'];
const PIECES = 56;
const DURATION_MS: [number, number] = [1300, 2100];
/** Tầm bắn ngang và cao (px), rồi rơi xuống quá điểm xuất phát. */
const SPREAD_X = 260;
const RISE_Y: [number, number] = [120, 300];
const FALL_Y: [number, number] = [160, 360];

const between = (min: number, max: number) => min + Math.random() * (max - min);

/** Bắn pháo giấy trong root (phủ kín, không chặn chạm); trả về lớp chứa để gỡ sớm nếu cần. */
// Không tắt theo prefers-reduced-motion, cùng cách với ui/kit/motion.ts (máy dev đang bật chế độ này).
export function burstConfetti(root: HTMLElement): HTMLElement {
  const layer = document.createElement('div');
  layer.setAttribute('aria-hidden', 'true');
  Object.assign(layer.style, {
    position: 'absolute',
    inset: '0',
    overflow: 'hidden',
    pointerEvents: 'none',
    zIndex: '1',
  });
  root.append(layer);

  let running = PIECES;
  for (let i = 0; i < PIECES; i++) {
    const piece = document.createElement('i');
    const w = Math.round(between(5, 9));
    Object.assign(piece.style, {
      position: 'absolute',
      left: '50%',
      top: '45%',
      width: `${w}px`,
      height: `${Math.round(w * between(1.3, 2))}px`,
      background: COLORS[i % COLORS.length]!,
      imageRendering: 'pixelated',
    });
    layer.append(piece);
    const dx = between(-SPREAD_X, SPREAD_X);
    const rise = between(...RISE_Y);
    const fall = between(...FALL_Y);
    const spin = between(-720, 720);
    const duration = between(...DURATION_MS);
    const delay = between(0, 120);
    const animation = piece.animate(
      [
        { transform: 'translate(0, 0) rotate(0deg)', offset: 0 },
        {
          transform: `translate(${dx * 0.7}px, ${-rise}px) rotate(${spin * 0.4}deg)`,
          offset: 0.35,
          easing: 'cubic-bezier(0.3, 0, 0.7, 1)',
        },
        { transform: `translate(${dx}px, ${fall}px) rotate(${spin}deg)`, offset: 1 },
      ],
      {
        duration,
        delay,
        easing: 'cubic-bezier(0.15, 0.7, 0.4, 1)',
        fill: 'forwards',
      },
    );
    // Giữ rõ tới 70% đường bay rồi mới mờ dần.
    piece.animate([{ opacity: 1, offset: 0.7 }, { opacity: 0 }], {
      duration,
      delay,
      fill: 'forwards',
    });
    animation.onfinish = () => {
      running -= 1;
      if (running === 0) layer.remove();
    };
  }
  return layer;
}
