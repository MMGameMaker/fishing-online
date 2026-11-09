import Phaser from 'phaser';
import './ui/kit/kit.css';
import { BootScene } from './core/BootScene';
import { GAME_HEIGHT, GAME_WIDTH } from './core/env';
import { createServices, setServices } from './core/services';
import { LakeScene } from './scenes/lake/LakeScene';
import { UiDemoScene } from './ui/kit/UiDemoScene';

async function start(): Promise<void> {
  const services = await createServices();
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
    scene: [BootScene, LakeScene, UiDemoScene],
  });
  setServices(game, services);

  if (import.meta.env.DEV) {
    // Chỉ để kiểm tra khi phát triển.
    (window as unknown as { __fishing: unknown }).__fishing = { game, services };
  }
}

void start();
