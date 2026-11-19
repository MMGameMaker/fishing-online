// Scene hồ dùng map placeholder và hình khối màu cho tới khi có map thật và asset ART.
import { lakeDisplayName } from '../../core/lakeNames';
import Phaser from 'phaser';
import { isTouchDevice } from '../../core/device';
import { UI_DESIGN_WIDTH } from '../../core/env';
import { getServices, type Services } from '../../core/services';
import { CharacterView } from '../../entities/CharacterView';
import { FishingFlow } from '../../fishing/FishingFlow';
import type { Direction, PlayerView } from '../../net/contract';
import { mountUiOverlay, showError, showToast } from '../../ui/kit/components';
import { isModalOpen } from '../../ui/kit/modal';
import { preloadHeadBubble } from '../../entities/HeadBubble';
import { CatchBanner } from '../../ui/announce/CatchBanner';
import { COIN_ART } from '../../ui/coinArt';
import { HomeHud, isHomeHudEnabled } from '../../ui/home/HomeHud';
import { PlayerInfoPopup } from '../../ui/friends/PlayerInfoPopup';
import { ActionButton } from './ActionButton';
import { Joystick } from './Joystick';
import { getLakeMapArt } from './mapArt';
import { MoveSender, RemoteMotion, directionFromVector } from './movement';
import { NEAR_SEAT_PX, nearestPlayer, nearestSeat, seatReach } from './seatLogic';
import { SeatPrompt, preloadSitPrompt } from './SeatPrompt';
import { ConnectionWatch } from './ConnectionWatch';
import { SocialUi } from '../../social/SocialUi';
import { ensureEmoteAnims, preloadEmotes } from '../../social/emojis';
import { SeatMarkers } from './SeatMarkers';
import { SeatUi } from './SeatUi';
import {
  nearestStandable,
  randomSpawn,
  startPosition,
  stepMove,
  type LakeMap,
  type LakeSeat,
  type RestSeat,
} from './walkable';

/** Việc bấm F (hoặc nút hành động) sẽ làm: ngồi ghế câu, ngồi chỗ chơi, hoặc xem người/bot. */
type InteractTarget =
  | { kind: 'fish'; seat: LakeSeat }
  | { kind: 'rest'; seat: RestSeat }
  | { kind: 'player'; id: string };

export const LAKE_SCENE = 'Lake';

const TILE_TEXTURE = 'placeholder-tiles';
const TREE_TEXTURE = 'placeholder-tree';
const GROUND_DEPTH = -1000;
const ROAM_DEPTH = -600;
const MAX_FRAME_MS = 50;
const EMOJI_SHOW_MS = 3000;
const WATER_TILE = 0;
const GRASS_TILE = 1;
const BOBBER_DISTANCE_PX = 48;
const FACING_VECTORS: Record<string, { x: number; y: number }> = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
};
/** Cây chỉ để kiểm tra sắp lớp theo y, chưa phải vật cản của map. */
const PLACEHOLDER_TREES: readonly [number, number][] = [
  [176, 900],
  [240, 980],
  [130, 760],
  [300, 180],
  [1300, 180],
  [1300, 930],
];

interface RemotePlayer {
  view: CharacterView;
  motion: RemoteMotion;
  iconUntilMs: number | null;
  /** Mốc hết hạn của icon gần nhất đã hiện: không hiện lại cùng một icon (tránh chớp khi store đổi). */
  lastIconUntilMs: number;
}

export class LakeScene extends Phaser.Scene {
  private services!: Services;
  private map!: LakeMap;
  private me!: CharacterView;
  private flow!: FishingFlow;
  private seatUi!: SeatUi;
  /** Giao diện home (khung người chơi, vé, Gold, menu); chỉ trang bật enableHomeHud mới có. */
  private homeHud: HomeHud | null = null;
  private seatMarkers!: SeatMarkers;
  private seatPrompt!: SeatPrompt;
  private roamCircle!: Phaser.GameObjects.Arc;
  private joystick: Joystick | null = null;
  /** Nút hành động thay phím F trên điện thoại (pier.html). */
  private actionButton: ActionButton | null = null;
  private moveSender!: MoveSender;
  private typing = false;
  private modalOpen = false;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd!: Record<'W' | 'A' | 'S' | 'D', Phaser.Input.Keyboard.Key>;
  private root!: HTMLElement;
  private myId = '';
  private readonly remotes = new Map<string, RemotePlayer>();
  private social!: SocialUi;
  /** Popup thông tin người chơi khác (pier.html): bấm vào nhân vật để mở. */
  private playerInfo: PlayerInfoPopup | null = null;
  /** Người/bot đang là mục tiêu bấm F (viền trắng + phím F), pier.html. */
  private targetPlayerId: string | null = null;
  /** Emoji trên đầu tự ẩn sau EMOJI_SHOW_MS; mỗi người chơi một hẹn giờ. */
  private readonly emojiTimers = new Map<string, Phaser.Time.TimerEvent>();
  /** Đang gửi SitRest/StandRest: bỏ qua bấm lặp. */
  private restPending = false;
  private readonly cleanups: (() => void)[] = [];

  constructor() {
    super(LAKE_SCENE);
  }

  preload(): void {
    getLakeMapArt(this)?.preload(this);
    preloadEmotes(this);
    // Art riêng của pier.html: bong bóng Head Bubble.png và phím Sit Prompt F.png.
    if (isHomeHudEnabled(this)) {
      preloadHeadBubble(this);
      preloadSitPrompt(this);
    }
  }

  create(): void {
    this.services = getServices(this);
    this.map = this.services.map;
    const art = getLakeMapArt(this);
    if (art) {
      art.create(this);
      const { tileSize, widthTiles, heightTiles } = this.map;
      this.cameras.main.setBounds(0, 0, widthTiles * tileSize, heightTiles * tileSize);
    } else {
      this.createPlaceholderTextures();
      this.createGround();
      this.createTrees();
    }
    this.createMe();

    const overlay = mountUiOverlay(this.game);
    this.root = overlay.root;
    this.cleanups.push(overlay.destroy);

    this.createFishing();
    this.createSeats();
    this.createInput();
    this.createSocial();
    this.watchConnection();
    this.bindStore();
    this.syncRemotes();
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.shutdown());
  }

  private shutdown(): void {
    this.seatPrompt.destroy();
    this.actionButton?.destroy();
    this.actionButton = null;
    this.cleanups.forEach((cleanup) => cleanup());
    this.cleanups.length = 0;
    this.flow.destroy();
    this.seatUi.destroy();
    this.homeHud?.destroy();
    this.homeHud = null;
  }

  private serverNow(): number {
    return Date.now() + this.services.store.getState().lake.serverTimeOffsetMs;
  }

  private createPlaceholderTextures(): void {
    if (this.textures.exists(TILE_TEXTURE)) return;
    const size = this.map.tileSize;
    const g = this.add.graphics();
    g.fillStyle(0x2f6f9f).fillRect(WATER_TILE * size, 0, size, size);
    g.fillStyle(0x3b82b5).fillRect(WATER_TILE * size + 6, 10, 10, 2);
    g.fillStyle(0x5a9a4a).fillRect(GRASS_TILE * size, 0, size, size);
    g.fillStyle(0x6bab58).fillRect(GRASS_TILE * size + 4, 6, 3, 3);
    g.fillStyle(0x4f8a41).fillRect(GRASS_TILE * size + 20, 22, 3, 3);
    g.generateTexture(TILE_TEXTURE, size * 2, size);
    g.clear();

    g.fillStyle(0x6b4a2b).fillRect(9, 28, 6, 12);
    g.fillStyle(0x2f6b3a).fillRect(0, 0, 24, 30);
    g.generateTexture(TREE_TEXTURE, 24, 40);
    g.destroy();
  }

  private createGround(): void {
    const { tileSize, walkableRows, widthTiles, heightTiles } = this.map;
    const data = walkableRows.map((row) =>
      [...row].map((cell) => (cell === '1' ? GRASS_TILE : WATER_TILE)),
    );
    const tilemap = this.make.tilemap({ data, tileWidth: tileSize, tileHeight: tileSize });
    const tileset = tilemap.addTilesetImage(TILE_TEXTURE, TILE_TEXTURE, tileSize, tileSize, 0, 0);
    if (!tileset) throw new Error('Không tạo được tileset placeholder');
    tilemap.createLayer(0, tileset, 0, 0)?.setDepth(GROUND_DEPTH);
    this.cameras.main.setBounds(0, 0, widthTiles * tileSize, heightTiles * tileSize);
  }

  private createTrees(): void {
    for (const [x, y] of PLACEHOLDER_TREES) {
      this.add.image(x, y, TREE_TEXTURE).setOrigin(0.5, 1).setDepth(y);
    }
  }

  private createMe(): void {
    const { profile } = this.services.store.getState().session;
    this.myId = profile?.playerId ?? '';
    const mine = this.services.store.getState().lake.players[this.myId];
    // pier.html: mỗi lần vào game xuất hiện ở một chỗ ngẫu nhiên đi được trên map (trừ khi đang giữ ghế,
    // khi đó nhân vật được đặt vào ghế). Trang khác giữ luật cũ: vị trí lần trước hoặc spawn.
    const seated = this.services.store.getState().lake.mySeat !== null;
    const start =
      isHomeHudEnabled(this) && !seated
        ? randomSpawn(this.map, Math.random, (x, y) => !getLakeMapArt(this)?.isHidden?.(x, y))
        : startPosition(this.map, mine);
    const corrected = !mine || start.x !== mine.x || start.y !== mine.y;
    this.me = new CharacterView(this, {
      x: start.x,
      y: start.y,
      skinId: profile?.selectedSkinId ?? 'skin_01',
      rodId: profile?.equippedRodId ?? 'rod_old',
      name: profile?.displayName ?? '',
      isMe: true,
    });
    this.me.setTitle(profile?.titleId);
    // Không làm tròn khi bám: zoom thường là số lẻ (vd 2.4) nên camera làm tròn scroll về nguyên px map
    // chạy bước 1-2-1-2 trong khi nhân vật đi 1.5px/khung, nhân vật lắc ~1px màn hình mỗi khung (feedback 2026-11-17).
    this.cameras.main.startFollow(this.me.container, false);
    this.roamCircle = this.add.circle(0, 0, 10, 0xffffff, 0.12).setVisible(false);
    this.roamCircle.setDepth(ROAM_DEPTH);
    this.moveSender = new MoveSender((message) => {
      this.services.hub
        .invoke('Move', message)
        .catch((error: unknown) => console.warn('Gửi Move thất bại', error));
    });
    if (corrected) this.moveSender.flush(performance.now(), start.x, start.y, this.me.direction);
    // Nối lại sau khi rớt mạng: JoinLake gửi kèm vị trí đang đứng thay vì để Server giữ vị trí cũ.
    this.services.hub.setPositionProvider(() => ({
      x: this.me.x,
      y: this.me.y,
      dir: this.me.direction,
    }));
    this.cleanups.push(() => this.services.hub.setPositionProvider(null));
  }

  private createFishing(): void {
    this.flow = new FishingFlow(
      this,
      this.services,
      this.root,
      this.me,
      () => this.bobberPoint(),
      () => this.serverNow(),
      undefined,
      undefined,
      // Dòng "Nơi sống" của thẻ cá: tên hồ thay cho mã map Server gửi (feedback 2026-11-17).
      () => lakeDisplayName(this.services.store.getState().lake.mapId),
      // Riêng pier.html (feedback 2026-11-14): đồng xu Coin Art ở thẻ cá, pháo giấy hai góc, bỏ qua minigame.
      isHomeHudEnabled(this)
        ? {
            catchCardCoin: COIN_ART,
            screenConfetti: true,
            skipMinigame: true,
            buttonBelowFeetPx: 40,
            closePopupByKey: true,
            sadOnMissedBite: true,
            fishingFx: true,
          }
        : {},
    );
  }

  private createSeats(): void {
    this.seatMarkers = new SeatMarkers(
      this,
      this.map.seats,
      this.services.store,
      (seat) => this.onSeatPressed(seat),
      // pier.html: không bấm chuột vào ghế; chỉ đứng gần rồi bấm F (feedback 2026-11-19).
      { hidden: Boolean(getLakeMapArt(this)?.drawsSeats), clickable: !isHomeHudEnabled(this) },
    );
    const homeHud = isHomeHudEnabled(this);
    this.seatUi = new SeatUi(this.root, this.services, () => this.flow.canLeaveSeat(), !homeHud);
    if (homeHud) {
      this.homeHud = new HomeHud({
        root: this.root,
        services: this.services,
        serverNow: () => this.serverNow(),
        openBuyTicket: () => this.seatUi.openBuyTicket(),
        openDirect: (playerId) => this.social.openDirect(playerId),
        openPlayer: (playerId) => this.openPlayerInfo(playerId),
      });
    }
  }

  /** Server tắt/rớt mạng lâu: báo "Mất kết nối" và tự thử vào lại hồ thay vì đứng im. */
  private watchConnection(): void {
    const watch = new ConnectionWatch({ root: this.root, hub: this.services.hub });
    this.cleanups.push(() => watch.destroy());
  }

  /** Khung trò chuyện + biểu cảm; tin và emoji hiện thêm trên đầu nhân vật của người gửi. */
  private createSocial(): void {
    ensureEmoteAnims(this);
    this.social = new SocialUi({
      root: this.root,
      services: this.services,
      onTyping: (typing) => this.setTyping(typing),
      trimEmotes: isHomeHudEnabled(this),
      onOpenPlayer: (playerId) => this.openPlayerInfo(playerId),
    });
    if (isHomeHudEnabled(this)) {
      const popup = new PlayerInfoPopup({
        root: this.root,
        services: this.services,
        openDirect: (playerId) => this.social.openDirect(playerId),
      });
      this.playerInfo = popup;
      this.cleanups.push(() => {
        popup.destroy();
        this.playerInfo = null;
      });
    }
    this.input.keyboard?.addKey('ENTER').on('down', () => this.social.focusInput());
    const { hub } = this.services;
    this.cleanups.push(
      hub.on('ChatReceived', (message) => this.viewOf(message.playerId)?.say(message.text)),
      // Đổi cần (Túi đồ hoặc tab khác): nhân vật của mình và người khác cầm cần mới ngay.
      hub.on('RodChanged', ({ playerId, rodId }) => this.viewOf(playerId)?.setRod(rodId)),
      // Đổi ngoại hình (khung Ngoại hình): nhân vật của mình thay skin ngay; người khác đã nhận qua danh sách players.
      hub.on('SkinChanged', ({ playerId, skinId }) => {
        if (playerId === this.myId) this.me.setSkin(skinId);
      }),
      hub.on('EmojiReceived', ({ playerId, emojiId }) => this.showEmoji(playerId, emojiId)),
      () => this.social.destroy(),
    );
    // Khoe cá kiểu 1: thanh chạy chữ nửa trên màn hình cho mọi người (tin hệ thống vào chat qua store).
    const banner = new CatchBanner(this.root);
    this.cleanups.push(
      hub.on('CatchAnnounced', (announcement) => banner.show(announcement)),
      () => banner.destroy(),
    );
  }

  /** Đang gõ chat: tắt phím game và trả phím cho ô nhập (WASD/F/Space không điều khiển nhân vật). */
  private setTyping(typing: boolean): void {
    this.typing = typing;
    this.applyKeyboardGate();
  }

  /**
   * Popup chính đang mở (feedback 2026-11-16): nhân vật đứng yên, chặn mọi phím và chuột vào map.
   * Gọi mỗi khung; chỉ làm gì khi trạng thái đổi.
   */
  private syncModal(): void {
    const open = isModalOpen() || this.flow.isResultOpen();
    if (open === this.modalOpen) return;
    this.modalOpen = open;
    this.applyKeyboardGate();
  }

  /** Phím game tắt khi đang gõ chat hoặc có popup mở; trả phím cho ô nhập của popup. */
  private applyKeyboardGate(): void {
    const keyboard = this.input.keyboard;
    if (!keyboard) return;
    const gated = this.typing || this.modalOpen;
    keyboard.enabled = !gated;
    if (gated) {
      keyboard.disableGlobalCapture();
      keyboard.resetKeys();
    } else {
      keyboard.enableGlobalCapture();
    }
  }

  /** Mở popup thông tin người chơi (bấm F cạnh nhân vật, danh sách bạn, tên trong tab Tin riêng). */
  private openPlayerInfo(playerId: string): void {
    if (playerId === this.myId) return;
    void this.playerInfo?.open(playerId);
  }

  /** Viền trắng cho người/bot đang là mục tiêu bấm F (pier.html). */
  private updateOutlines(): void {
    if (!this.playerInfo) return;
    const blocked = this.modalOpen;
    for (const [id, remote] of this.remotes) {
      remote.view.setOutlined(!blocked && id === this.targetPlayerId);
    }
  }

  private viewOf(playerId: string): CharacterView | undefined {
    return playerId === this.myId ? this.me : this.remotes.get(playerId)?.view;
  }

  private showEmoji(playerId: string, emojiId: string): void {
    const view = this.viewOf(playerId);
    if (!view) return;
    view.setHeadIcon({ type: 'emoji', emojiId });
    this.emojiTimers.get(playerId)?.remove();
    this.emojiTimers.set(
      playerId,
      this.time.delayedCall(EMOJI_SHOW_MS, () => {
        this.emojiTimers.delete(playerId);
        this.viewOf(playerId)?.clearEmote();
      }),
    );
  }

  private createInput(): void {
    const keyboard = this.input.keyboard;
    if (!keyboard) throw new Error('Trình duyệt không có bàn phím');
    this.cursors = keyboard.createCursorKeys();
    this.wasd = keyboard.addKeys('W,A,S,D') as typeof this.wasd;
    // Nhấn F cạnh ghế trống để ngồi (feedback 2026-11-11, thay phím E); đang ngồi chơi thì F để đứng dậy.
    // pier.html: đứng gần người/bot thì F mở thông tin người đó (feedback 2026-11-19).
    keyboard.addKey('F').on('down', () => this.interact());
    // Phím gợi ý F cạnh đầu nhân vật khi đứng gần ghế trống hoặc người khác; chạm vào cũng như bấm F.
    this.seatPrompt = new SeatPrompt(this, () => this.interact());
    // Không còn bấm chuột lên map để đi; chỉ phím di chuyển hoặc joystick.
    if (isHomeHudEnabled(this)) {
      // pier.html: chỉ máy cảm ứng (điện thoại) có joystick bên trái và nút hành động bên phải thay phím F
      // (feedback 2026-11-19; trước đó pier không dùng joystick, 2026-11-14).
      if (isTouchDevice()) {
        this.joystick = new Joystick(this.root);
        this.actionButton = new ActionButton(this.root, () => this.interact());
      }
    } else if (this.sys.game.device.input.touch) {
      this.joystick = new Joystick(this.root);
    }
  }

  private bindStore(): void {
    const { store } = this.services;
    this.cleanups.push(
      store.select(
        (s) => s.session.profile?.displayName,
        (name) => {
          if (name) this.me?.setName(name);
        },
      ),
      store.select(
        (s) => s.session.profile?.titleId,
        (titleId) => this.me?.setTitle(titleId),
      ),
      store.select(
        (s) => s.lake.correction,
        (correction) => {
          if (!correction) return;
          this.me.setPosition(correction.x, correction.y);
        },
      ),
      store.select(
        (s) => s.lake.mySeat,
        (seat) => this.onSessionChanged(seat?.seatId ?? null),
      ),
      // Chỗ ngồi chơi của mình theo PlayerView Server phát cho cả phòng (gồm mình).
      store.select(
        (s) => s.lake.players[this.myId]?.restSeatId ?? null,
        (restSeatId) => this.onRestChanged(restSeatId),
      ),
      store.select(
        (s) => s.lake.players,
        () => this.syncRemotes(),
      ),
      store.select(
        (s) => s.lake.catches,
        () => this.syncCatches(),
      ),
      store.select(
        (s) => s.lake.fails,
        () => this.syncFails(),
      ),
    );
  }

  private seatById(seatId: string): LakeSeat | undefined {
    return this.map.seats.find((seat) => seat.seatId === seatId);
  }

  private onSessionChanged(seatId: string | null): void {
    const seat = seatId ? this.seatById(seatId) : undefined;
    // SPEC 0.9: đang ngồi thì không đi lại, nên không còn vẽ vòng phạm vi roamRadius.
    this.roamCircle.setVisible(false);
    this.me.setSeated(Boolean(seat));
    this.me.setDepthOverride(seat?.depth ?? null);
    if (!seat) {
      this.standUpFromSeat();
      return;
    }
    // Server không giữ map nên Client tự đặt nhân vật vào ghế rồi báo vị trí.
    this.me.setPosition(seat.x, seat.y);
    this.me.setDirection(seat.facing as Direction);
    this.moveSender.flush(performance.now(), seat.x, seat.y, seat.facing as Direction);
  }

  /** Bấm F (hoặc chạm phím F): đứng dậy khỏi chỗ ngồi chơi, mở thông tin người gần nhất, hoặc ngồi vào ghế gần nhất. */
  private interact(): void {
    if (this.myRestSeatId()) {
      void this.standRest();
      return;
    }
    const target = this.interactTargetNearMe();
    if (target?.kind === 'player') {
      if (!this.modalOpen && !this.flow.isLocked()) this.openPlayerInfo(target.id);
      return;
    }
    if (target?.kind === 'rest') {
      void this.sitRest(target.seat);
      return;
    }
    // Ưu tiên ghế trống gần nhất; không có thì ghế gần nhất để báo lỗi (đã có người…).
    const seat = target?.seat ?? nearestSeat(this.me.x, this.me.y, this.map.seats);
    if (seat) this.onSeatPressed(seat);
    else if (nearestSeat(this.me.x, this.me.y, this.restSeats())) {
      showError(this.root, { code: 'SEAT_TAKEN' });
    }
  }

  /** Người/bot khác gần nhất trong tầm; chỉ pier.html (có popup thông tin người chơi). */
  private playerNearMe(): { id: string; distance: number } | null {
    if (!this.playerInfo) return null;
    const others = [...this.remotes].map(([id, remote]) => ({
      id,
      x: remote.view.x,
      y: remote.view.y,
    }));
    return nearestPlayer(this.me.x, this.me.y, others);
  }

  /** Mục tiêu bấm F: ghế/chỗ ngồi chơi trống hoặc người/bot, cái nào gần mình hơn. */
  private interactTargetNearMe(): InteractTarget | null {
    const seat = this.seatTargetNearMe();
    const player = this.playerNearMe();
    if (player) {
      const seatDistance = seat
        ? Math.hypot(seat.seat.x - this.me.x, seat.seat.y - this.me.y)
        : Infinity;
      if (player.distance < seatDistance) return { kind: 'player', id: player.id };
    }
    return seat;
  }

  /** Ghế trống gần nhất trong tầm ngồi của nhân vật. */
  private freeSeatNearMe(): LakeSeat | null {
    const { seats } = this.services.store.getState().lake;
    return nearestSeat(
      this.me.x,
      this.me.y,
      this.map.seats,
      (seat) => seats[seat.seatId]?.state === 'available',
    );
  }

  private restSeats(): readonly RestSeat[] {
    return this.map.restSeats ?? [];
  }

  private myRestSeatId(): string | null {
    return this.services.store.getState().lake.players[this.myId]?.restSeatId ?? null;
  }

  /** Chỗ ngồi chơi đã có người (người thật hay bot), tính cả mình. */
  private restTaken(restSeatId: string): boolean {
    const { players } = this.services.store.getState().lake;
    return Object.values(players).some((player) => player.restSeatId === restSeatId);
  }

  private freeRestNearMe(): RestSeat | null {
    return nearestSeat(
      this.me.x,
      this.me.y,
      this.restSeats(),
      (seat) => !this.restTaken(seat.restSeatId),
    );
  }

  /**
   * Chỗ sẽ ngồi khi bấm F: ghế câu hoặc chỗ ngồi chơi còn trống gần nhất. Ghế dài 2 chỗ là 2 điểm ngồi,
   * nên người đầu tiên vào nửa gần mình hơn, người sau vào nửa còn lại (yêu cầu 2026-11-18).
   */
  private seatTargetNearMe():
    { kind: 'fish'; seat: LakeSeat } | { kind: 'rest'; seat: RestSeat } | null {
    const fish = this.freeSeatNearMe();
    const rest = this.freeRestNearMe();
    const distance = (seat: { x: number; y: number }): number =>
      Math.hypot(seat.x - this.me.x, seat.y - this.me.y);
    if (rest && (!fish || distance(rest) < distance(fish))) return { kind: 'rest', seat: rest };
    return fish ? { kind: 'fish', seat: fish } : null;
  }

  /** Hiện phím F khi đang đứng (chưa giữ ghế), không bận câu và có ghế trống trong tầm. */
  private updateSeatPrompt(): void {
    const { lake } = this.services.store.getState();
    const target =
      !lake.mySeat && !this.myRestSeatId() && !this.flow.isLocked()
        ? this.interactTargetNearMe()
        : null;
    // Điện thoại: nút hành động ở góc phải thay phím F cạnh đầu nhân vật.
    this.seatPrompt.update(this.me.x, this.me.headY, target !== null && !this.actionButton);
    this.updateActionButton(target);
    // Viền trắng đúng chiếc ghế sẽ ngồi hoặc người sẽ mở thông tin khi bấm F (feedback 2026-11-12, 2026-11-19).
    this.targetPlayerId = target?.kind === 'player' ? target.id : null;
    let highlight: string | null = null;
    if (target?.kind === 'rest') highlight = target.seat.restSeatId;
    else if (target?.kind === 'fish') highlight = target.seat.seatId;
    getLakeMapArt(this)?.highlightSeat?.(highlight);
  }

  /** Chữ trên nút hành động (điện thoại): việc F sẽ làm; null = ẩn nút. */
  private updateActionButton(target: InteractTarget | null): void {
    if (!this.actionButton) return;
    let label: string | null = null;
    if (!this.modalOpen) {
      if (this.myRestSeatId()) label = 'Đứng dậy';
      else if (target?.kind === 'player') label = 'Thông tin';
      else if (target) label = 'Ngồi';
    }
    this.actionButton.update(label);
  }

  /** Ngồi chơi vào chỗ trống; Server giữ chỗ nên hai người bấm cùng lúc chỉ một người ngồi được. */
  private async sitRest(seat: RestSeat): Promise<void> {
    const { lake } = this.services.store.getState();
    if (this.restPending || this.flow.isLocked() || this.modalOpen || lake.mySeat) return;
    if (this.restTaken(seat.restSeatId)) {
      showError(this.root, { code: 'SEAT_TAKEN' });
      return;
    }
    this.restPending = true;
    try {
      const ack = await this.services.hub.invoke('SitRest', {
        restSeatId: seat.restSeatId,
        x: seat.x,
        y: seat.y,
        dir: seat.facing as Direction,
      });
      if (!ack.ok) showError(this.root, ack.error);
    } catch (error) {
      console.warn(error);
      showError(this.root, { code: 'NETWORK_ERROR' });
    } finally {
      this.restPending = false;
    }
  }

  private async standRest(): Promise<void> {
    if (this.restPending) return;
    this.restPending = true;
    try {
      const ack = await this.services.hub.invoke('StandRest', {});
      if (!ack.ok) showError(this.root, ack.error);
    } catch (error) {
      console.warn(error);
      showError(this.root, { code: 'NETWORK_ERROR' });
    } finally {
      this.restPending = false;
    }
  }

  /** Server xác nhận ngồi/đứng chỗ ngồi chơi: đặt nhân vật vào chỗ (tư thế ngồi) hoặc bước ra chỗ đứng được. */
  private onRestChanged(restSeatId: string | null): void {
    const seat = restSeatId
      ? this.restSeats().find((candidate) => candidate.restSeatId === restSeatId)
      : undefined;
    if (seat) {
      const dir = seat.facing as Direction;
      this.me.setPosition(seat.x, seat.y);
      this.me.setDirection(dir);
      this.me.setSeated(true);
      this.me.setDepthOverride(seat.depth ?? null);
      this.moveSender.flush(performance.now(), seat.x, seat.y, dir);
      return;
    }
    if (this.services.store.getState().lake.mySeat) return;
    this.me.setSeated(false);
    this.me.setDepthOverride(null);
    this.standUpFromSeat();
  }

  /** Ghế là vật cản (map pier): rời ghế thì bước sang chỗ đứng được gần nhất để không kẹt. */
  private standUpFromSeat(): void {
    const spot = nearestStandable(this.map, this.me.x, this.me.y);
    if (!spot || (spot.x === this.me.x && spot.y === this.me.y)) return;
    this.me.setPosition(spot.x, spot.y);
    this.moveSender.flush(performance.now(), spot.x, spot.y, this.me.direction);
  }

  private bobberPoint(): { x: number; y: number } | null {
    const mySeat = this.services.store.getState().lake.mySeat;
    const seat = mySeat ? this.seatById(mySeat.seatId) : undefined;
    if (!seat) return null;
    const facing = FACING_VECTORS[seat.facing] ?? { x: 0, y: 1 };
    return {
      x: seat.x + facing.x * BOBBER_DISTANCE_PX,
      y: seat.y + facing.y * BOBBER_DISTANCE_PX,
    };
  }

  private onSeatPressed(seat: LakeSeat): void {
    if (this.flow.isLocked() || this.modalOpen) return;
    const { lake } = this.services.store.getState();
    const view = lake.seats[seat.seatId];
    if (!view) return;
    if (view.state === 'occupied') {
      showError(this.root, { code: 'SEAT_TAKEN' });
    } else if (lake.mySeat) {
      showError(this.root, { code: 'ALREADY_HAS_SEAT' });
    } else if (seatReach(this.me.x, this.me.y, seat, this.map.seats) <= NEAR_SEAT_PX) {
      void this.seatUi.openSeat(seat);
    } else {
      showToast(this.root, 'Hãy đi tới gần ghế để ngồi.');
    }
  }

  private syncRemotes(): void {
    const { players } = this.services.store.getState().lake;
    const now = performance.now();
    for (const player of Object.values(players)) {
      if (player.playerId !== this.myId) this.syncRemote(player, now);
    }
    for (const [id, remote] of this.remotes) {
      if (!players[id]) {
        if (this.targetPlayerId === id) this.targetPlayerId = null;
        remote.view.destroy();
        this.remotes.delete(id);
      }
    }
  }

  private syncRemote(player: PlayerView, now: number): void {
    let remote = this.remotes.get(player.playerId);
    if (!remote) {
      remote = {
        view: new CharacterView(this, {
          x: player.x,
          y: player.y,
          skinId: player.skinId,
          rodId: player.rodId,
          name: player.displayName,
          dir: player.dir,
        }),
        motion: new RemoteMotion(player.x, player.y),
        iconUntilMs: null,
        lastIconUntilMs: 0,
      };
      this.remotes.set(player.playerId, remote);
    }
    remote.motion.setTarget(player.x, player.y, now);
    remote.view.setDirection(player.dir);
    const restSeat = player.restSeatId
      ? this.restSeats().find((seat) => seat.restSeatId === player.restSeatId)
      : undefined;
    const fishSeat = player.seatId ? this.seatById(player.seatId) : undefined;
    remote.view.setSeated(player.seatId !== null || restSeat !== undefined);
    remote.view.setDepthOverride(restSeat?.depth ?? fishSeat?.depth ?? null);
    remote.view.setSkin(player.skinId);
    remote.view.setRod(player.rodId);
    remote.view.setTitle(player.titleId);
  }

  /**
   * Icon của store chỉ hiện khi chưa hết hạn và chưa từng hiện. Store giữ cả mục đã hết hạn; mỗi lần có người khác
   * câu được cá, mục cũ bị duyệt lại và icon đã tắt hiện lại một khung rồi tắt ngay: lỗi chớp hình cá (2026-11-18).
   */
  private isFreshIcon(remote: RemotePlayer, untilMs: number): boolean {
    return untilMs !== remote.lastIconUntilMs && untilMs > this.serverNow();
  }

  private syncCatches(): void {
    const { catches } = this.services.store.getState().lake;
    for (const [playerId, shown] of Object.entries(catches)) {
      const remote = this.remotes.get(playerId);
      const untilMs = Date.parse(shown.shownUntil);
      if (!remote || !this.isFreshIcon(remote, untilMs)) continue;
      remote.iconUntilMs = untilMs;
      remote.lastIconUntilMs = untilMs;
      remote.view.setHeadIcon({ type: 'fish', speciesId: shown.speciesId, rarity: shown.rarity });
    }
  }

  /** Người khác thua minigame: icon buồn trên đầu tới shownUntil (SPEC 2.6). */
  private syncFails(): void {
    const { fails } = this.services.store.getState().lake;
    for (const [playerId, shownUntil] of Object.entries(fails)) {
      const remote = this.remotes.get(playerId);
      const untilMs = Date.parse(shownUntil);
      if (!remote || !this.isFreshIcon(remote, untilMs)) continue;
      remote.iconUntilMs = untilMs;
      remote.lastIconUntilMs = untilMs;
      remote.view.setHeadIcon({ type: 'sad' });
    }
  }

  private updateRemotes(nowMs: number, serverNowMs: number): void {
    const { players } = this.services.store.getState().lake;
    for (const [id, remote] of this.remotes) {
      const sample = remote.motion.sample(nowMs);
      remote.view.setPosition(sample.x, sample.y);
      if (sample.moving) remote.view.play('walk');
      else remote.view.play(players[id]?.fishing ? 'wait' : 'idle');
      if (remote.iconUntilMs !== null && serverNowMs >= remote.iconUntilMs) {
        remote.iconUntilMs = null;
        remote.view.setHeadIcon(null);
      }
    }
  }

  private readAxis(): { x: number; y: number } {
    if (this.modalOpen) return { x: 0, y: 0 };
    const right = this.cursors.right.isDown || this.wasd.D.isDown;
    const left = this.cursors.left.isDown || this.wasd.A.isDown;
    const down = this.cursors.down.isDown || this.wasd.S.isDown;
    const up = this.cursors.up.isDown || this.wasd.W.isDown;
    const x = Number(right) - Number(left) + (this.joystick?.value.x ?? 0);
    const y = Number(down) - Number(up) + (this.joystick?.value.y ?? 0);
    const length = Math.hypot(x, y);
    return length > 1 ? { x: x / length, y: y / length } : { x, y };
  }

  private moveMe(deltaMs: number, nowMs: number): void {
    // Đang ngồi: bấm phím di chuyển là rời ghế (bị chặn khi đang minigame), không đi luôn.
    const seated = this.services.store.getState().lake.mySeat !== null;
    if (seated) {
      const keys = this.readAxis();
      if ((keys.x !== 0 || keys.y !== 0) && this.flow.canLeaveSeat()) void this.seatUi.leave();
    }
    // Đang ngồi chơi: bấm phím di chuyển là đứng dậy (chờ Server xác nhận rồi mới đi).
    const resting = this.myRestSeatId() !== null;
    if (resting) {
      const keys = this.readAxis();
      if (keys.x !== 0 || keys.y !== 0) void this.standRest();
    }
    const locked = this.flow.isLocked() || seated || resting;
    const axis = locked ? { x: 0, y: 0 } : this.readAxis();
    let moving = false;
    if (axis.x !== 0 || axis.y !== 0) {
      const distance =
        (this.map.moveRules.maxSpeedPxPerSec * Math.min(deltaMs, MAX_FRAME_MS)) / 1000;
      const next = stepMove(this.map, this.me.x, this.me.y, axis.x * distance, axis.y * distance);
      moving = next.x !== this.me.x || next.y !== this.me.y;
      if (moving) this.me.setPosition(next.x, next.y);
      this.me.setDirection(directionFromVector(axis.x, axis.y, this.me.direction));
    }
    if (moving) this.me.play('walk');
    else if (!this.flow.isCharacterBusy(nowMs)) this.me.play('idle');
    this.moveSender.update(nowMs, this.me.x, this.me.y, this.me.direction, moving);
  }

  /**
   * Nút móc câu bám chân nhân vật trên màn hình. Camera chạm mép map thì nhân vật lệch khỏi giữa màn hình,
   * nút cố định ở giữa sẽ xa nhân vật và đè lên người khác (feedback 2026-11-17).
   */
  private anchorFishButton(): void {
    const cam = this.cameras.main;
    const toUi = UI_DESIGN_WIDTH / this.scale.width;
    const x = ((this.me.x - cam.midPoint.x) * cam.zoom + cam.width / 2 + cam.x) * toUi;
    const y = ((this.me.y - cam.midPoint.y) * cam.zoom + cam.height / 2 + cam.y) * toUi;
    this.flow.setButtonAnchor(x, y);
  }

  update(_time: number, delta: number): void {
    const nowMs = performance.now();
    const serverNowMs = this.serverNow();
    this.syncModal();
    this.moveMe(delta, nowMs);
    this.flow.update();
    this.anchorFishButton();
    this.seatMarkers.update();
    this.updateSeatPrompt();
    this.seatUi.update(serverNowMs);
    this.homeHud?.update();
    this.updateRemotes(nowMs, serverNowMs);
    this.me.syncTextResolution();
    for (const remote of this.remotes.values()) remote.view.syncTextResolution();
    this.updateOutlines();
  }
}
