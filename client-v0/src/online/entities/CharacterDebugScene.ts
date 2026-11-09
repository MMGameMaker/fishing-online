// Trang debug: 4 hướng × mọi animation của một skin. Mở bằng ?scene=char-debug.
import Phaser from 'phaser';
import { CharacterView } from './CharacterView';
import { ANIM_NAMES, DIRECTIONS } from './placeholderArt';

const COLUMN_WIDTH = 52;
const ROW_HEIGHT = 60;
const LEFT = 50;
const TOP = 62;

export class CharacterDebugScene extends Phaser.Scene {
  constructor() {
    super('CharacterDebug');
  }

  create(): void {
    const style = { fontFamily: 'monospace', fontSize: '8px', color: '#e8e4d0' };
    ANIM_NAMES.forEach((anim, column) => {
      const x = LEFT + column * COLUMN_WIDTH;
      this.add.text(x, 4, anim, style).setOrigin(0.5, 0);
      DIRECTIONS.forEach((dir, row) => {
        const y = TOP + row * ROW_HEIGHT;
        if (column === 0) this.add.text(2, y - 16, dir, style);
        const view = new CharacterView(this, {
          x,
          y,
          skinId: 'skin_01',
          rodId: 'rod_old',
          name: '',
          dir,
        });
        view.play(anim);
      });
    });
  }
}
