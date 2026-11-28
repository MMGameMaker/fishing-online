import Phaser from 'phaser';
import { preloadCharacterArt } from '../entities/characterArt';
import type { Catalog, PlayerProfile, SelectSkinResponse, SkinsResponse } from '../net/contract';
import type { BootScreens } from '../ui/boot/BootScreens';
import { startBackgroundMusic } from './backgroundMusic';
import { shouldApplyGoogleName, toDisplayName } from './googleName';
import { getFirebaseIdToken, type LoginProvider } from './idToken';
import { getServices } from './services';

export const BOOT_SCENE = 'Boot';

export interface BootOptions {
  /** Mock vẫn đăng nhập Google để lấy tên tài khoản làm tên người chơi (pier.html). */
  googleInMock?: boolean;
  /** Màn đăng nhập/tải theo thiết kế (DOM); không có thì dùng chữ Phaser (pier.html bật). */
  screens?: BootScreens;
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
    // Kéo cửa sổ khi đang ở màn khởi động/đăng nhập: giữ chữ ở giữa canvas.
    const recenter = () => {
      status.setPosition(this.scale.width / 2, this.scale.height / 2);
      status.setFontSize(Math.round(12 * Math.max(1, this.scale.height / 270)));
    };
    this.scale.on(Phaser.Scale.Events.RESIZE, recenter);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () =>
      this.scale.off(Phaser.Scale.Events.RESIZE, recenter),
    );

    const target = new URLSearchParams(window.location.search).get('scene');
    if (target === 'boot') return;
    if (target === 'ui-demo' || target === 'char-debug') {
      this.scene.start(target === 'ui-demo' ? 'UiDemo' : 'CharacterDebug');
      return;
    }
    // Có màn đăng nhập/tải theo thiết kế thì ẩn chữ Phaser tạm.
    if (this.options().screens) status.setVisible(false);
    void this.enterLake(status);
  }

  private screens(): BootScreens | undefined {
    return this.options().screens;
  }

  /** Vào hồ: Lake phát sự kiện create thì tắt dần màn tải. */
  private startLake(): void {
    const screens = this.screens();
    if (screens) {
      this.scene.get('Lake').events.once(Phaser.Scenes.Events.CREATE, () => screens.hide());
    }
    startBackgroundMusic();
    this.scene.start('Lake');
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
    const screens = this.screens();
    screens?.showLoading('Đang khởi động...', 10);
    if (getServices(this).api.devPlayerId) {
      await this.devLogin(status);
      return;
    }
    const signedIn = !this.usesGoogle() || Boolean(await getFirebaseIdToken(false, false));
    if (screens && this.usesGoogle()) {
      // Đã đăng nhập từ lần trước: Main Menu (CHƠI, Đăng xuất); chưa thì khung Đăng nhập (feedback 2026-11-17).
      if (signedIn) this.showMenu(status, screens);
      else this.showGoogleLogin(status, screens);
      return;
    }
    if (!signedIn) {
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

  /** Khung Đăng nhập; bấm nút Google thì đăng nhập rồi vào thẳng hồ. Popup phải mở ngay trong thao tác bấm. */
  private showGoogleLogin(status: Phaser.GameObjects.Text, screens: BootScreens): void {
    this.showLoginScreen(status, screens);
  }

  /** Khung Đăng nhập với hai nút Google và Facebook (Facebook từ 2026-11-27); popup phải mở ngay trong thao tác bấm. */
  private showLoginScreen(status: Phaser.GameObjects.Text, screens: BootScreens, error?: string): void {
    const start = (provider: LoginProvider) => () => {
      screens.showLoading('Đang đăng nhập...', 20);
      void this.login(status, true, provider);
    };
    screens.showLogin(start('google'), error, start('facebook'));
    // Nạp trước Facebook SDK để FB.login mở được ngay trong thao tác bấm (lỗi thì bỏ qua, bấm nút sẽ báo).
    if (!getServices(this).isMock || this.usesGoogle()) {
      void import('../../firebaseAuth.js').then((auth) => auth.prepareFacebook()).catch(() => undefined);
    }
  }

  /** Main Menu: CHƠI thì vào hồ bằng tài khoản Google đã nhớ; Đăng xuất thì về khung Đăng nhập. */
  private showMenu(status: Phaser.GameObjects.Text, screens: BootScreens): void {
    screens.showMenu(
      () => {
        screens.showLoading('Đang vào game...', 20);
        void this.login(status, false);
      },
      () => void this.logout(status, screens),
    );
  }

  /** Thu hồi phiên trên Server (cookie refresh) và thoát Google; lỗi mạng vẫn thoát Google. */
  private async logout(status: Phaser.GameObjects.Text, screens: BootScreens): Promise<void> {
    const { api } = getServices(this);
    try {
      await api.post('/auth/logout');
    } catch (error) {
      console.warn('Không thu hồi được phiên trên Server', error);
    }
    try {
      const { signOutGoogle } = await import('../../firebaseAuth.js');
      await signOutGoogle();
    } catch (error) {
      console.error('Không đăng xuất được Google', error);
    }
    this.showGoogleLogin(status, screens);
  }

  private async login(
    status: Phaser.GameObjects.Text,
    interactive: boolean,
    provider: LoginProvider = 'google',
  ): Promise<void> {
    const { api, hub, store, isMock } = getServices(this);
    const screens = this.screens();
    try {
      // Mock có bật Google: vẫn mở popup Google thật để lấy tên, Server mock không cần token.
      const google = this.usesGoogle() ? await getFirebaseIdToken(false, interactive, provider) : null;
      if (this.usesGoogle() && !google) throw new Error('Chưa đăng nhập');
      const idToken = isMock ? 'mock' : google;
      if (!idToken) throw new Error('Chưa đăng nhập');
      screens?.showLoading('Đang vào game...', 35);
      const login = await api.login(idToken);
      const player = this.usesGoogle() ? await this.applyGoogleName(login.player) : login.player;
      store.dispatch({ type: 'session/profile', payload: player });
      screens?.setProgress(55, 'Đang tải dữ liệu...');
      store.dispatch({ type: 'catalog/set', payload: await api.get<Catalog>('/catalog') });
      if (screens) {
        // Chọn nhân vật (thỏ hoặc bạn thú) trước khi vào hồ; lỗi tải danh sách thì bỏ qua, vào bằng nhân vật đang có.
        await this.chooseCharacter(screens);
        screens.showLoading('Đang kết nối...', 75);
      }
      screens?.setProgress(75, 'Đang kết nối...');
      await hub.start();
      await hub.joinLake();
      screens?.setProgress(90, 'Đang vào hồ...');
      this.startLake();
    } catch (error) {
      console.error(error);
      if (screens) {
        this.showLoginScreen(status, screens, 'Không đăng nhập được, vui lòng thử lại.');
        return;
      }
      status.setText('Fishing Online\nKhông vào được hồ');
    }
  }

  /** Panel Chọn nhân vật (yêu cầu 2026-11-25): lưu skin đã chọn lên Server trước khi vào hồ. */
  private async chooseCharacter(screens: BootScreens): Promise<void> {
    const { api, store } = getServices(this);
    // Chỉ hiện lần đầu, khi tài khoản chưa chọn nhân vật; chọn xong Server lưu lại và không hỏi nữa.
    if (store.getState().session.profile?.characterChosen !== false) return;
    let list: SkinsResponse;
    try {
      list = await api.get<SkinsResponse>('/skins');
    } catch (error) {
      console.warn('Không tải được danh sách nhân vật, bỏ qua bước chọn', error);
      return;
    }
    await screens.chooseCharacter({
      skins: list.skins,
      selectedId: list.selectedSkinId,
      select: async (skinId) => {
        const result = await api.put<SelectSkinResponse>('/me/skin', { skinId });
        const profile = store.getState().session.profile;
        if (profile) {
          store.dispatch({
            type: 'session/profile',
            payload: { ...profile, selectedSkinId: result.selectedSkinId, characterChosen: true },
          });
        }
      },
    });
  }

  /**
   * Đăng nhập dev (?dev=Tên, chỉ bản dev + Server Development/DevBypass): Server tự tạo người chơi
   * theo player id; đặt tên theo ?dev= để phân biệt các tab khi test nhiều người chơi.
   */
  private async devLogin(status: Phaser.GameObjects.Text): Promise<void> {
    const { api, hub, store } = getServices(this);
    try {
      let player = await api.get<PlayerProfile>('/me');
      const name = toDisplayName(new URLSearchParams(window.location.search).get('dev'));
      if (name && name !== player.displayName) {
        try {
          player = await api.put<PlayerProfile>('/me/display-name', { displayName: name });
        } catch (error) {
          console.warn('Không đặt được tên dev', error);
        }
      }
      store.dispatch({ type: 'session/profile', payload: player });
      store.dispatch({ type: 'catalog/set', payload: await api.get<Catalog>('/catalog') });
      await hub.start();
      await hub.joinLake();
      this.startLake();
    } catch (error) {
      console.error(error);
      status.setVisible(true);
      this.screens()?.hide();
      status.setText(
        'Fishing Online\nKhông vào được (đăng nhập dev cần Server Development + DevBypass)',
      );
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
