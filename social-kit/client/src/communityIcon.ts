// Icon pixel "Cộng đồng" (hai người đứng cạnh nhau) cho ô trong menu ☰, vẽ bằng canvas rồi trả về data URL (không cần file ảnh).
const PIXELS = [
  '................',
  '....oooo........',
  '...oBBBBo.oooo..',
  '...oBBBBooBBBBo.',
  '...oBBBBooBBBBo.',
  '....oooo.oBBBBo.',
  '...oYYYYo.oooo..',
  '..oYYYYYYooYYYo.',
  '..oYYYYYYooYYYYo',
  '..oYYYYYYooYYYYo',
  '..oYYooYYo.oYYYo',
  '...oo..oo...ooo.',
  '................',
];
const COLORS: Record<string, string> = { o: '#5a3818', B: '#ffd9a0', Y: '#3d8fdc' };
const SCALE = 4;

export function communityIconUrl(): string {
  const canvas = document.createElement('canvas');
  canvas.width = 16 * SCALE;
  canvas.height = 16 * SCALE;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';
  PIXELS.forEach((row, y) => {
    [...row].forEach((ch, x) => {
      const color = COLORS[ch];
      if (!color) return;
      ctx.fillStyle = color;
      ctx.fillRect(x * SCALE, (y + 1) * SCALE, SCALE, SCALE);
    });
  });
  return canvas.toDataURL('image/png');
}
