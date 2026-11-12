import Phaser from 'phaser';
import { preloadCharacterArt } from '../entities/characterArt';
import type { Catalog, PlayerProfile } from '../net/contract';
import { shouldApplyGoogleName, toDisplayName } from './googleName';
import { getFirebaseIdToken } from './idToken';
import { getServices } from './services';

export const BOOT_SCENE = 'Boot';

export interface BootOptions {
  /** Mock vẫn đăng nhập Google để lấy tên tài khoản làm tên người chơi (pier.html). */
  googleInMock?: boolean;
}

const BOOT_OPTIONS_KEY = 'bootOptions';

export function setBootOptions(game: Phaser.Game, options: BootOptions): void {
  game.registry.set(BOOT_OPTIONS_KEY, options);
}

export class BootScene extends Phaser.Scene {
  constructor() {
    super(BOOT_SCENE);
  }

  /** Nạp art nhân vật thỏ và cần câu trước khi vào hồ. */
  preload(): void {
    preloadCharacterArt(this);
  }

  create(): void {
    const status = this.add
      .text(this.scale.width / 2, this.scale.height / 2, 'Fishing Online\nĐang khởi động...', {
        fontFamily: 'monospace',
        // Canvas phủ kín cửa sổ (pier.html) thì chữ to theo, khung 480×270 vẫn 12px.
        fontSize: `${Math.round(12 * Math.max(1, this.scale.height / 270))}px`,
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

  private options(): BootOptions {
    return (this.registry.get(BOOT_OPTIONS_KEY) as BootOptions | undefined) ?? {};
  }

  /** Có dùng Google không: Server thật luôn cần; mock chỉ khi trang bật googleInMock. */
  private usesGoogle(): boolean {
    return !getServices(this).isMock || Boolean(this.options().googleInMock);
  }

  /** Mock đăng nhập ngay; cần Google mà chưa đăng nhập thì popup phải mở từ thao tác bấm. */
  private async enterLake(status: Phaser.GameObjects.Text): Promise<void> {
    if (this.usesGoogle() && !(await getFirebaseIdToken(false, false))) {
      status.setText('Fishing Online\nBấm để đăng nhập Google');
      // Bấm vào đâu trên màn hình cũng được, canvas có thể rất lớn khi phủ kín cửa sổ.
      this.input.once('pointerdown', () => {
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
      // Mock có bật Google: vẫn mở popup Google thật để lấy tên, Server mock không cần token.
      const google = this.usesGoogle() ? await getFirebaseIdToken(false, interactive) : null;
      if (this.usesGoogle() && !google) throw new Error('Chưa đăng nhập');
      const idToken = isMock ? 'mock' : google;
      if (!idToken) throw new Error('Chưa đăng nhập');
      const login = await api.login(idToken);
      const player = this.usesGoogle() ? await this.applyGoogleName(login.player) : login.player;
      store.dispatch({ type: 'session/profile', payload: player });
      store.dispatch({ type: 'catalog/set', payload: await api.get<Catalog>('/catalog') });
      await hub.start();
      await hub.joinLake();
      this.scene.start('Lake');
    } catch (error) {
      console.error(error);
      status.setText('Fishing Online\nKhông vào được hồ');
    }
  }

  /** Đặt tên người chơi theo tài khoản Google; lỗi (trùng tên, sai luật) thì giữ tên cũ. */
  private async applyGoogleName(player: PlayerProfile): Promise<PlayerProfile> {
    const { api, isMock } = getServices(this);
    try {
      const { currentDisplayName } = await import('../../firebaseAuth.js');
      const name = toDisplayName(await currentDisplayName());
      if (!shouldApplyGoogleName(player.displayName, name, isMock)) return player;
      return await api.put<PlayerProfile>('/me/display-name', { displayName: name });
    } catch (error) {
      console.warn('Không đặt được tên theo Google', error);
      return player;
    }
  }
}
