// Trang xem trước riêng cho map bến cá (pier.html), không cần Server hay mock.
import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from '../../core/env';
import { PierScene } from './PierScene';

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  backgroundColor: '#10141f',
  pixelArt: true,
  roundPixels: true,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  scene: [PierScene],
});

if (import.meta.env.DEV) {
  // Chỉ để kiểm tra khi phát triển.
  (window as unknown as { __pier: unknown }).__pier = game;
}
