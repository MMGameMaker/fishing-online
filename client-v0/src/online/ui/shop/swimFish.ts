// Cá trong popup bán cá (yêu cầu 2026-11-21): ảnh cá kèm ánh long lanh trên mắt (sao 4 cánh nhấp nháy) và ĐUÔI vẫy sang trái-phải
// (co giãn theo chiều ngang quanh gốc đuôi, như đuôi quẫy trong không gian 3D). Cá bơi lên xuống/xoay cả con do CSS ở lớp cha
// (`.shop-sell-dialog__fish-spin`). Vây, miệng, xúc tu, kìm KHÔNG cử động (Zen bỏ: lỗi bóng đôi); Mực, Tôm Hùm, Cá Đuối, Cá Chình
// không có đuôi cử động.
import { fishArtUrl, fishImage } from '../fishArt';

/**
 * Vị trí mắt từng loài (tỉ lệ theo cả ảnh, 0..1, x từ trái, y từ trên), đo trên ảnh hiển thị; dò tự động bằng vùng tối tròn
 * không đáng tin (thân sẫm, viền đen) nên ghi tay. Loài chưa khai báo thì không có ánh long lanh.
 */
const EYES: Readonly<Record<string, [number, number]>> = {
  cowfish: [0.248, 0.42],
  goby: [0.116, 0.455],
  bass: [0.16, 0.45],
  pomfret: [0.124, 0.425],
  eel: [0.75, 0.865],
  goldcarp: [0.088, 0.5],
  trout: [0.088, 0.53],
  flyingfish: [0.113, 0.335],
  minnow: [0.092, 0.42],
  perch: [0.108, 0.47],
  stonefish: [0.243, 0.43],
  stingray: [0.44, 0.65],
  koi: [0.196, 0.605],
  shark: [0.238, 0.476],
  puffer: [0.108, 0.46],
  pangasius: [0.152, 0.39],
  sturgeon: [0.152, 0.45],
  moonfin: [0.6, 0.43],
  lobster: [0.57, 0.19],
  carp: [0.164, 0.45],
};

/**
 * Đuôi từng loài: vùng cắt x0, y0, x1, y1 theo tỉ lệ ảnh (cắt hết chiều cao từ chỗ đuôi bắt đầu để không sót mép đuôi) (Zen khoanh trên từng loài; log docs/work/W02-art-map-ho.md). Đuôi bị khoét
 * khỏi thân và vẽ thành lớp riêng nên co giãn không để lại bóng đôi. Loài không có trong bảng thì đuôi đứng yên.
 */
const TAILS: Readonly<Record<string, [number, number, number, number]>> = {
  cowfish: [0.8, 0, 1, 1],
  goby: [0.82, 0, 1, 1],
  bass: [0.82, 0, 1, 1],
  pomfret: [0.77, 0, 1, 1],
  goldcarp: [0.79, 0, 1, 1],
  trout: [0.83, 0, 1, 1],
  flyingfish: [0.76, 0, 1, 1],
  minnow: [0.78, 0, 1, 1],
  perch: [0.87, 0, 1, 1],
  stonefish: [0.78, 0, 1, 1],
  koi: [0.76, 0, 1, 1],
  shark: [0.8, 0, 1, 1],
  puffer: [0.83, 0, 1, 1],
  pangasius: [0.82, 0, 1, 1],
  sturgeon: [0.83, 0, 1, 1],
  // Vây lưng và vây hậu môn lấn sang tới x≈0,87: chỉ lấy dải giữa (2026-11-21, trước dính vây lưng vào đuôi).
  carp: [0.833, 0.25, 1, 0.8],
};
/** Đuôi chồng lên thân thêm chừng này (tỉ lệ chiều rộng ảnh) để chỗ nối không hở khi đuôi co lại. */
const TAIL_OVERLAP = 0.02;

/** Diện tích hiển thị mục tiêu (px²) của con cá trong popup bán cá. */
const TARGET_AREA = 56_000;

function layer(image: HTMLImageElement, className: string): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = image.naturalWidth;
  canvas.height = image.naturalHeight;
  canvas.className = `swim-fish__layer ${className}`;
  canvas.getContext('2d')!.drawImage(image, 0, 0);
  return canvas;
}

/**
 * Dựng cá cỡ vừa khung `maxW`×`maxH` (px). Trả về phần tử có thể đưa vào popup ngay: lúc đầu là ảnh nguyên, khi ảnh tải xong thì
 * khung được co theo tỉ lệ ảnh và thêm ánh long lanh trên mắt.
 */
export function swimFish(speciesId: string, maxW: number, maxH: number): HTMLElement {
  const root = document.createElement('div');
  root.className = 'swim-fish';
  root.append(fishImage(speciesId));

  const eye = EYES[speciesId];
  const source = new Image();
  source.addEventListener('load', () => {
    const { naturalWidth: w, naturalHeight: h } = source;
    if (!w || !h) return;
    // Khung khít theo tỉ lệ ảnh để toạ độ mắt (tỉ lệ theo ảnh) đúng chỗ.
    // Cỡ theo DIỆN TÍCH cố định để các loài trông to bằng nhau (cá dẹt dài không bị nhỏ hơn cá tròn); cá quá dài thì bị giới hạn bởi bề ngang.
    const scale = Math.min(maxW / w, maxH / h, Math.sqrt(TARGET_AREA / (w * h)));
    root.style.width = `${w * scale}px`;
    root.style.height = `${h * scale}px`;
    const tail = TAILS[speciesId];
    if (tail) {
      try {
        // Thân (đã khoét đuôi) và đuôi là hai canvas chồng khít; đuôi co giãn ngang quanh gốc của nó (CSS).
        const [tx0, ty0, tx1, ty1] = tail;
        const body = layer(source, 'swim-fish__body');
        const bctx = body.getContext('2d')!;
        bctx.clearRect(tx0 * w, ty0 * h, (tx1 - tx0) * w + 1, (ty1 - ty0) * h + 1);
        const piece = layer(source, 'swim-fish__tail');
        const overlap = TAIL_OVERLAP * w;
        const pctx = piece.getContext('2d')!;
        pctx.globalCompositeOperation = 'destination-in';
        pctx.fillRect(tx0 * w - overlap, ty0 * h, (tx1 - tx0) * w + overlap + 1, (ty1 - ty0) * h + 1);
        piece.style.transformOrigin = `${((tx0 * w - overlap) / w) * 100}% ${((ty0 + ty1) / 2) * 100}%`;
        root.replaceChildren(body, piece);
      } catch (error) {
        console.warn(error);
      }
    }
    if (!eye) return;
    const glint = document.createElement('div');
    glint.className = 'swim-fish__eye';
    glint.style.left = `${eye[0] * 100}%`;
    glint.style.top = `${eye[1] * 100}%`;
    glint.style.setProperty('--eye', `${Math.max(10, w * scale * 0.075)}px`);
    root.append(glint);
  });
  source.src = fishArtUrl(speciesId);
  return root;
}
