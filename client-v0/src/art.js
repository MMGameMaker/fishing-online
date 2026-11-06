// Small original icons generated in code (no third-party art). Character art itself is real
// sprite work composited by src/referenceArt.js — see drawCharacterPreview there.
function shade(hex, amount) {
  const n = parseInt(hex.slice(1), 16);
  const f = (v) => Math.round(amount < 0 ? v * (1 + amount) : v + (255 - v) * amount);
  return `rgb(${f(n >> 16)},${f((n >> 8) & 255)},${f(n & 255)})`;
}

function makeCanvas(w, h) {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const g = canvas.getContext('2d');
  return { canvas, g, R: (c, x, y, rw = 1, rh = 1) => { g.fillStyle = c; g.fillRect(x, y, rw, rh); } };
}

export function drawFishIcon(color, junk = false) {
  const { canvas, R } = makeCanvas(16, 8);
  const dark = shade(color, -0.3);
  if (junk) {
    R(color, 3, 0, 5, 5);
    R(color, 3, 5, 11, 2);
    R(dark, 3, 7, 11, 1);
    return canvas;
  }
  R(color, 4, 2, 9, 4);
  R(color, 6, 1, 5, 6);
  R(dark, 0, 1, 2, 6);
  R(dark, 2, 3, 2, 2);
  R(dark, 7, 0, 3, 1);
  R('#1c1c28', 11, 3, 1, 1);
  return canvas;
}
