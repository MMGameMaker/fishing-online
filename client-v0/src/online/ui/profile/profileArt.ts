// Art tạm (placeholder pixel) cho popup Tài khoản: avatar thỏ và icon 8 thành tựu.
// Vẽ từ lưới ký tự thành SVG data URI; thay bằng sprite thật khi có art. Nguồn: tự tạo trong repo.
const PALETTE: Record<string, string> = {
  k: '#4a2a14',
  b: '#8a5a2b',
  B: '#2f7fd0',
  L: '#8ccaf5',
  y: '#f5c542',
  Y: '#ffe58a',
  o: '#e8782a',
  w: '#fffaf0',
  r: '#d03a2a',
  g: '#4caf50',
  p: '#f4a6b8',
  e: '#2a1608',
  s: '#b8b8b8',
};

function pixelSvg(rows: string[]): string {
  const h = rows.length;
  const w = Math.max(...rows.map((row) => row.length));
  let rects = '';
  rows.forEach((row, y) => {
    [...row].forEach((ch, x) => {
      const color = PALETTE[ch];
      if (color) rects += `<rect x="${x}" y="${y}" width="1" height="1" fill="${color}"/>`;
    });
  });
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" shape-rendering="crispEdges">${rects}</svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

const GRIDS: Record<string, string[]> = {
  diligent: [
    '..........kk',
    '.........kb.',
    '........kb.r',
    '.......kb..r',
    '......kb...r',
    '.....kb....r',
    '....kb.....r',
    '...kb......r',
    '..kb......rr',
    '.kb.........',
    'kb..........',
  ],
  collector: [
    '............',
    '.kkkkkkkkk..',
    '.kBBBBBBBk..',
    '.kBBLLLBBk..',
    '.kBLyyyLBk..',
    '.kBLyyyLBk..',
    '.kBBLLLBBk..',
    '.kBBBBBBBk..',
    '.kkkkkkkkk..',
    '.kwwwwwwwk..',
    '..kkkkkkk...',
  ],
  rare_hunter: [
    '............',
    '....LLL.....',
    '..BBBBBBB.B.',
    '.BBBeBBBBBBB',
    'BBBBBBBBBBB.',
    '.BBBBBBBBBBB',
    '..BBBBBBB.B.',
    '....LLL.....',
  ],
  legend_lake: [
    '............',
    '....YYY.....',
    '..yyyyyyy.y.',
    '.yyyeyyyyyyy',
    'yyyyyyyyyyy.',
    '.yyyyyyyyyyy',
    '..yyyyyyy.y.',
    '....YYY.....',
  ],
  giant_fish: [
    '....oooo....',
    '..oooooooo.o',
    '.ooooeooooooo',
    'oooooooooooo.',
    '.ooooooooooo.',
    '..oooooooo.o',
    '....oooo....',
  ],
  pioneer: [
    '.kr.........',
    '.krrrrr.....',
    '.krrrrrrr...',
    '.krrrrr.....',
    '.kr.........',
    '.k..........',
    '.k..........',
    '.k..........',
    'kkk.........',
  ],
  merchant: [
    '...kk.kk....',
    '....kkk.....',
    '...kbbbk....',
    '..kbbbbbk...',
    '.kbbyybbbk..',
    '.kbbyyYbbk..',
    '.kbbbyybbk..',
    '..kbbbbbk...',
    '...kkkkk....',
  ],
  persistent: [
    '.kkkkkkkkk..',
    '..kYYYYYk...',
    '...kYYYk....',
    '....kYk.....',
    '.....k......',
    '....kyk.....',
    '...kyyyk....',
    '..kyyyyyk...',
    '.kkkkkkkkk..',
  ],
  avatar: [
    '..ww....ww..',
    '..wp....pw..',
    '..wp....pw..',
    '..ww....ww..',
    '..wwwwwwww..',
    '.wwwwwwwwww.',
    '.wwewwwwewww',
    '.wwwwppwwww.',
    '.wwwwwkwwww.',
    '..wwwwwwww..',
  ],
};

const cache = new Map<string, string>();

export function profileArt(id: string): string {
  let url = cache.get(id);
  if (!url) {
    url = pixelSvg(GRIDS[id] ?? GRIDS.diligent!);
    cache.set(id, url);
  }
  return url;
}
