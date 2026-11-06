// Chép tài nguyên từ project Cocos (client/assets/resources) sang public/assets,
// bỏ qua các file .meta của Cocos. Chạy lại lệnh này khi sửa map / sheet bên Cocos:
//   npm run sync-assets
import { cpSync, existsSync, rmSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const src = resolve(root, '../client/assets/resources');
const dst = join(root, 'public/assets');

if (!existsSync(src)) {
    console.error('Không tìm thấy ' + src);
    process.exit(1);
}
for (const dir of ['maps', 'rooms', 'sheets']) {
    rmSync(join(dst, dir), { recursive: true, force: true });
    cpSync(join(src, dir), join(dst, dir), {
        recursive: true,
        filter: (p) => !p.endsWith('.meta'),
    });
}
console.log('Đã chép maps, rooms, sheets vào public/assets');
