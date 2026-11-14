// Trang pier.html: chạy Fishing Online (đăng nhập, hồ, ghế, câu cá, minigame) trên map bến cá.
// Dùng chung LakeScene/FishingFlow với fishing.html, chỉ thay map chơi và hình nền.
// Server thật chưa có map pier (ghế, vùng đi), nên trang này dùng với chế độ mock.
import Phaser from 'phaser';
import '../../ui/kit/kit.css';
import '../lake/lake.css';
import '../../fishing/fishing.css';
import '../../social/social.css';
import '../../ui/announce/announce.css';
import '../../ui/home/home.css';
import '../../ui/shop/shop.css';
import '../../ui/inventory/inventory.css';
import '../../ui/codex/codex.css';
// Sau cùng để ghi đè style chung (chỉ trang này).
import '../../ui/toast/toast.css';
import './pier.css';
import { BootScene, setBootOptions } from '../../core/BootScene';
import { createServices, setServices } from '../../core/services';
import { MinigameScene } from '../../fishing/MinigameScene';
import { enableHomeHud } from '../../ui/home/HomeHud';
import { setToastRenderer } from '../../ui/kit/components';
import { SlideToast } from '../../ui/toast/SlideToast';
import { LakeScene } from '../lake/LakeScene';
import { setLakeMapArt } from '../lake/mapArt';
import { PIER_LAKE_MAP, PierArt } from './PierArt';

async function start(): Promise<void> {
  const services = await createServices(PIER_LAKE_MAP, { fishingBots: true });
  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent: 'game',
    backgroundColor: '#10141f',
    pixelArt: true,
    roundPixels: true,
    // Canvas phủ kín cửa sổ; PierArt phóng camera theo cỡ cửa sổ.
    scale: {
      mode: Phaser.Scale.RESIZE,
      width: '100%',
      height: '100%',
    },
    scene: [BootScene, LakeScene, MinigameScene],
  });
  setServices(game, services);
  // Dữ liệu game vẫn mock, nhưng đăng nhập Google thật để lấy tên tài khoản làm tên người chơi.
  setBootOptions(game, { googleInMock: true });
  setLakeMapArt(game, new PierArt());
  // Giao diện home theo ảnh demo (khung người chơi, vé, Gold, menu) chỉ có ở trang này.
  enableHomeHud(game);
  // Thông báo kiểu mới (nền Well Art, trượt lên/xuống) chỉ trên trang này.
  const toast = new SlideToast();
  setToastRenderer((message, kind) => toast.show(message, kind));
  // Đảm bảo canvas bám theo cửa sổ cả khi đổi cỡ/xoay màn hình.
  window.addEventListener('resize', () => game.scale.refresh());

  if (import.meta.env.DEV) {
    // Chỉ để kiểm tra khi phát triển.
    // __fishing.announceCatch('koi') (bỏ trống = loài ngẫu nhiên): Server bản dev phát thông báo khoe cá
    // cho mọi người trong hồ, để thử thanh thông báo trên nhiều tab.
    const announceCatch = (speciesId?: string, first = true) =>
      services.api.post('/dev/announce-catch', { speciesId, first });
    (window as unknown as { __fishing: unknown }).__fishing = { game, services, announceCatch };
  }
}

void start();
