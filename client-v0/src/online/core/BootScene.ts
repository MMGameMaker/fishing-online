import Phaser from 'phaser';
import type { Catalog } from '../net/contract';
import { GAME_HEIGHT, GAME_WIDTH } from './env';
import { getFirebaseIdToken } from './idToken';
import { getServices } from './services';

export const BOOT_SCENE = 'Boot';

export class BootScene extends Phaser.Scene {
  constructor() {
    super(BOOT_SCENE);
  }

  create(): void {
    const status = this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT / 2, 'Fishing Online\nĐang khởi động...', {
        fontFamily: 'monospace',
        fontSize: '12px',
        color: '#e8e4d0',
        align: 'center',
      })
      .setOrigin(0.5);

    const target = new URLSearchParams(window.location.search).get('scene');
    if (target === 'boot') return;
    if (target === 'ui-demo' || target === 'char-debug') {
      this.scene.start(target === 'ui-demo' ? 'UiDemo' : 'CharacterDebug');
      return;
    }
    void this.enterLake(status);
  }

  /** Mock đăng nhập ngay; Server thật cần Google, popup phải mở từ thao tác bấm. */
  private async enterLake(status: Phaser.GameObjects.Text): Promise<void> {
    const { isMock } = getServices(this);
    if (!isMock && !(await getFirebaseIdToken(false, false))) {
      status.setText('Fishing Online\nBấm để đăng nhập Google');
      status.setInteractive({ useHandCursor: true });
      status.once('pointerdown', () => {
        status.disableInteractive();
        status.setText('Fishing Online\nĐang đăng nhập...');
        void this.login(status, true);
      });
      return;
    }
    await this.login(status, false);
  }

  private async login(status: Phaser.GameObjects.Text, interactive: boolean): Promise<void> {
    const { api, hub, store, isMock } = getServices(this);
    try {
      const idToken = await getFirebaseIdToken(isMock, interactive);
      if (!idToken) throw new Error('Chưa đăng nhập');
      const login = await api.login(idToken);
      store.dispatch({ type: 'session/profile', payload: login.player });
      store.dispatch({ type: 'catalog/set', payload: await api.get<Catalog>('/catalog') });
      await hub.start();
      await hub.joinLake();
      this.scene.start('Lake');
    } catch (error) {
      console.error(error);
      status.setText('Fishing Online\nKhông vào được hồ');
    }
  }
}
