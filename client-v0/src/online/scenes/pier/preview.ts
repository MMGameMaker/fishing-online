// Trang pier.html: chạy Fishing Online (đăng nhập, hồ, ghế, câu cá, minigame) trên map bến cá.
// Dùng chung LakeScene/FishingFlow với fishing.html, chỉ thay map chơi và hình nền.
// Server thật chưa có map pier (ghế, vùng đi), nên trang này dùng với chế độ mock.
import Phaser from 'phaser';
import '../../ui/kit/kit.css';
import '../lake/lake.css';
import '../../fishing/fishing.css';
import '../../social/social.css';
import { BootScene, setBootOptions } from '../../core/BootScene';
import { createServices, setServices } from '../../core/services';
import { MinigameScene } from '../../fishing/MinigameScene';
import { LakeScene } from '../lake/LakeScene';
import { setLakeMapArt } from '../lake/mapArt';
import { PIER_LAKE_MAP, PierArt } from './PierArt';

async function start(): Promise<void> {
  const services = await createServices(PIER_LAKE_MAP);
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
  // Đảm bảo canvas bám theo cửa sổ cả khi đổi cỡ/xoay màn hình.
  window.addEventListener('resize', () => game.scale.refresh());

  if (import.meta.env.DEV) {
    // Chỉ để kiểm tra khi phát triển.
    (window as unknown as { __fishing: unknown }).__fishing = { game, services };
  }
}

void start();
