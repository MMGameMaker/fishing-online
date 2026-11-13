// Ảnh pixel art từng loài cá (xuất bằng tools/export_fish_art.py vào public/assets/fish), dùng cho popup
// câu được cá, cửa hàng và túi đồ (feedback 2026-11-13, thay icon cá chung). Loài chưa có ảnh thì dùng
// icon cá chung của bộ UI.
const FISH_DIR = '/assets/fish/';
const FALLBACK = encodeURI('/new resources/ui/Icon Sell.png');

export const fishArtUrl = (speciesId: string): string => `${FISH_DIR}${speciesId}.png`;

/**
 * Ảnh cá vừa khung chứa (object-fit: contain trong CSS), nét pixel. `fallback` false: để nơi gọi tự xử lý
 * khi loài chưa có ảnh (sự kiện error); mặc định đổi sang icon cá chung.
 */
export function fishImage(speciesId: string, className = '', fallback = true): HTMLImageElement {
  const image = document.createElement('img');
  image.className = className ? `fish-art ${className}` : 'fish-art';
  image.alt = '';
  image.draggable = false;
  if (fallback) {
    image.addEventListener('error', () => image.src !== FALLBACK && (image.src = FALLBACK), {
      once: true,
    });
  }
  image.src = fishArtUrl(speciesId);
  return image;
}

const preloaded = new Set<string>();

/** Tải sẵn ảnh các loài để popup câu được cá hiện hình ngay. */
export function preloadFishArt(speciesIds: readonly string[]): void {
  for (const id of speciesIds) {
    if (preloaded.has(id)) continue;
    preloaded.add(id);
    const image = new Image();
    image.src = fishArtUrl(id);
  }
}
