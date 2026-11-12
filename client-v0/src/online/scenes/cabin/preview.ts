// Trang xem trước khu fishing-cabin (cabin.html), không cần Server hay mock.
import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from '../../core/env';
import type { CabinMapId } from './cabinData';
import { CABIN_MAP_EVENT, CABIN_SCENE, CabinScene, type CabinSceneData } from './CabinScene';

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
});
game.scene.add(CABIN_SCENE, CabinScene, true, { map: 'lg' } satisfies CabinSceneData);

const buttons = [...document.querySelectorAll<HTMLButtonElement>('#tabs button')];
for (const button of buttons) {
  button.addEventListener('click', () => {
    const map = button.dataset.map as CabinMapId;
    game.scene.getScene(CABIN_SCENE)?.scene.restart({ map } satisfies CabinSceneData);
  });
}
game.events.on(CABIN_MAP_EVENT, (map: CabinMapId) => {
  for (const button of buttons)
    button.setAttribute('aria-pressed', String(button.dataset.map === map));
});

if (import.meta.env.DEV) {
  // Chỉ để kiểm tra khi phát triển.
  (window as unknown as { __cabin: unknown }).__cabin = game;
}
