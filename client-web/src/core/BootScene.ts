import Phaser from 'phaser';
import type { LoginResponse } from '../net/contract';
import { GAME_HEIGHT, GAME_WIDTH } from './env';
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
    if (target === 'ui-demo') {
      this.scene.start('UiDemo');
      return;
    }
    void this.enterLake(status);
  }

  /** Tạm thời đăng nhập nhanh trong mock; CL-A-07 sẽ thay bằng màn đăng nhập. */
  private async enterLake(status: Phaser.GameObjects.Text): Promise<void> {
    const { api, hub, store, isMock } = getServices(this);
    if (!isMock) {
      status.setText('Fishing Online\nChưa có màn đăng nhập');
      return;
    }
    try {
      const login = await api.post<LoginResponse>('/auth/login', { firebaseIdToken: 'mock' });
      api.setAccessToken(login.accessToken);
      store.dispatch({ type: 'session/profile', payload: login.player });
      await hub.start();
      await hub.joinLake();
      this.scene.start('Lake');
    } catch (error) {
      console.error(error);
      status.setText('Fishing Online\nKhông vào được hồ');
    }
  }
}
