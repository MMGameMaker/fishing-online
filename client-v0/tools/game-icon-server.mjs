// Dựng icon game 512×512 (kiểu poster: tiêu đề lớn, cá nhảy, thỏ trên thuyền) bằng canvas trong trình duyệt, art lấy từ game.
//     node tools/game-icon-server.mjs        # rồi mở http://localhost:5199/fish.html (bản hiện dùng: ảnh mẫu của Zen thành pixel, giữ nền của ảnh, cá ở giữa nằm trên chữ, tên Fishing Online; vá nền mất ~1 phút)
//                                            # /pixel.html: bản có thỏ thay nhân vật
//                                            # hoặc /icon.html (bản poster tự vẽ); trang tự ghi public/icon-512.png
// (Bản pixel art cũ vẽ bằng code: tools/make_game_icon.mjs.)
import http from 'node:http';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, extname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const MIME = { '.png': 'image/png', '.json': 'application/json', '.html': 'text/html; charset=utf-8', '.jpg': 'image/jpeg' };
http
  .createServer((req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    const url = new URL(req.url, 'http://localhost');
    if (req.method === 'POST' && url.pathname === '/save') {
      const chunks = [];
      req.on('data', (c) => chunks.push(c));
      req.on('end', () => {
        const buf = Buffer.concat(chunks);
        writeFileSync(join(ROOT, 'public', 'icon-512.png'), buf);
        res.end(String(buf.length));
      });
      return;
    }
    const file =
      url.pathname === '/icon.html'
        ? join(ROOT, 'tools', 'game-icon.html')
        : url.pathname === '/fish.html'
          ? join(ROOT, 'tools', 'game-icon-fish.html')
          : url.pathname === '/pixel.html'
          ? join(ROOT, 'tools', 'game-icon-pixel.html')
          : url.pathname === '/ref.jpg'
            ? join(ROOT, 'tools', 'game-icon-ref.jpg')
            : url.pathname.startsWith('/assets/')
          ? join(ROOT, 'public', url.pathname)
          : null;
    if (!file || !existsSync(file)) {
      res.statusCode = 404;
      res.end('not found');
      return;
    }
    res.setHeader('Content-Type', MIME[extname(file)] || 'application/octet-stream');
    res.end(readFileSync(file));
  })
  .listen(5199, () => console.log('Mở http://localhost:5199/icon.html'));
