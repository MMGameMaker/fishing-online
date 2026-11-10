// Gắn ghế thuê, câu cá và minigame của Fishing Online vào scene Coral Cove.
import type Phaser from 'phaser';
import '../ui/kit/kit.css';
import '../scenes/lake/lake.css';
import '../fishing/fishing.css';
import configJson from '@fixtures/gameplay-config.v0.json';
import type { Catalog, GameplayConfig, Rarity } from '../core/gameplayConfig';
import { createServices, type Services } from '../core/services';
import type { HeadIcon } from '../entities/CharacterView';
import type { CharacterAnim } from '../entities/placeholderArt';
import { FishingFlow, type FishingActor } from '../fishing/FishingFlow';
import { MINIGAME_SCENE, MinigameScene } from '../fishing/MinigameScene';
import type { LoginResponse, PlayerProfile } from '../net/contract';
import { SeatMarkers } from '../scenes/lake/SeatMarkers';
import { SeatUi } from '../scenes/lake/SeatUi';
import type { LakeMap, LakeSeat } from '../scenes/lake/walkable';
import { mountUiOverlay, showError, showToast } from '../ui/kit/components';
import { buildCoralMap, type RoomInfo } from './coralSeats';

const MARKER_DEPTH = 2950;
const MARKER_OFFSET_Y = -34;
const MARKER_HIT_SIZE = 36;
const RARE_RARITIES: readonly Rarity[] = ['rare', 'epic', 'legendary'];
const SCENE_PHASES: Partial<Record<CharacterAnim, string>> = {
  cast: 'cast',
  wait: 'bob',
  bite: 'hooked',
  reel: 'reel',
};

interface PlayerEntity {
  setFishing(phase: string | null): void;
  showBubble(text: string): void;
  hideBubble(): void;
  showCatch(fish: unknown, rare: boolean): void;
}

interface WorldScene extends Phaser.Scene {
  me: PlayerEntity;
  seats: { nearestSeat(me: PlayerEntity): number };
}

interface WorldSession {
  room: RoomInfo;
  me: { display: string };
  sitting: boolean;
}

export interface CoralCoveDeps {
  request(event: string, payload?: unknown): Promise<{ ok: boolean; error?: string }>;
  fishById: Record<string, unknown>;
}

/** Dùng hoạt ảnh ngồi và cần câu sẵn có của nhân vật trong scene. */
class SceneActor implements FishingActor {
  private showingSad = false;

  constructor(private readonly entity: PlayerEntity) {}

  play(anim: CharacterAnim): void {
    this.entity.setFishing(SCENE_PHASES[anim] ?? null);
  }

  setHeadIcon(icon: HeadIcon): void {
    if (icon?.type === 'sad') {
      this.entity.showBubble(':(');
      this.showingSad = true;
    } else if (this.showingSad) {
      // Bong bóng chat tự tắt sau 5 giây, icon buồn phải tắt trước phiên câu mới.
      this.entity.hideBubble();
      this.showingSad = false;
    }
  }
}

let connection: Promise<Services> | null = null;

async function connect(map: LakeMap, displayName: string): Promise<Services> {
  const services = await createServices(map, { botCount: 0 });
  const { api, hub, store } = services;
  const login = await api.post<LoginResponse>('/auth/login', { firebaseIdToken: 'mock' });
  api.setAccessToken(login.accessToken);
  const named = await api
    .put<PlayerProfile>('/me/display-name', { displayName })
    .catch(() => login.player);
  store.dispatch({ type: 'session/profile', payload: named });
  store.dispatch({ type: 'catalog/set', payload: await api.get<Catalog>('/catalog') });
  await hub.start();
  await hub.joinLake();
  return services;
}

export class CoralCoveOnline {
  private services: Services | null = null;
  private flow: FishingFlow | null = null;
  private seatUi: SeatUi | null = null;
  private markers: SeatMarkers | null = null;
  private root: HTMLElement | null = null;
  private destroyed = false;
  private seatReady = false;
  private readonly cleanups: (() => void)[] = [];

  constructor(
    private readonly scene: WorldScene,
    private readonly session: WorldSession,
    private readonly deps: CoralCoveDeps,
  ) {
    const { seatTiers } = configJson as unknown as GameplayConfig;
    connection ??= connect(buildCoralMap(session.room, seatTiers), session.me.display);
    connection
      .then((services) => {
        if (!this.destroyed) this.attach(services);
      })
      .catch((error: unknown) => {
        connection = null;
        console.error('Không vào được hồ câu', error);
      });
  }

  private attach(services: Services): void {
    this.services = services;
    const { game } = this.scene;
    if (!game.scene.getScene(MINIGAME_SCENE)) game.scene.add(MINIGAME_SCENE, MinigameScene);

    const overlay = mountUiOverlay(game);
    this.root = overlay.root;
    overlay.root.classList.add('ui-root--world');
    document.body.classList.add('online-cove');
    this.cleanups.push(overlay.destroy, () => document.body.classList.remove('online-cove'));

    this.flow = new FishingFlow(
      this.scene,
      services,
      overlay.root,
      new SceneActor(this.scene.me),
      () => null,
      () => this.serverNow(),
      () => this.seatReady,
    );
    this.seatUi = new SeatUi(overlay.root, services, () => this.flow?.canLeaveSeat() ?? false);
    this.markers = new SeatMarkers(
      this.scene,
      services.map.seats,
      services.store,
      (seat) => this.pressSeat(seat),
      { depth: MARKER_DEPTH, offsetY: MARKER_OFFSET_Y, hitSize: MARKER_HIT_SIZE },
    );

    const { store } = services;
    this.cleanups.push(
      store.select(
        (s) => s.lake.mySession?.seatId ?? null,
        (seatId) => void this.syncSitting(seatId),
      ),
      store.select(
        (s) => s.attempt,
        (attempt) => {
          if (attempt?.phase !== 'success' || !attempt.result) return;
          const fish = this.deps.fishById[attempt.result.speciesId];
          if (fish) this.scene.me.showCatch(fish, RARE_RARITIES.includes(attempt.result.rarity));
        },
      ),
    );
  }

  private serverNow(): number {
    return Date.now() + (this.services?.store.getState().lake.serverTimeOffsetMs ?? 0);
  }

  private async syncSitting(seatId: string | null): Promise<void> {
    this.seatReady = false;
    if (seatId === null) {
      if (this.session.sitting) await this.deps.request('standUp');
      return;
    }
    const seat = this.services?.map.seats.find((s) => s.seatId === seatId);
    if (!seat) return;
    const result = await this.deps.request('sitDown', { index: seat.number - 1 });
    if (!result.ok && this.root) showToast(this.root, result.error ?? 'Không ngồi được ghế này.');
    this.seatReady = this.services?.store.getState().lake.mySession?.seatId === seatId;
  }

  /** Nút Sit của scene và số trên ghế cùng đi qua đây. */
  pressSeatIndex(index: number): void {
    const seat = this.services?.map.seats[index];
    if (seat) this.pressSeat(seat);
  }

  private pressSeat(seat: LakeSeat): void {
    const { services, root, seatUi } = this;
    if (!services || !root || !seatUi || this.isLocked()) return;
    const { lake } = services.store.getState();
    const view = lake.seats[seat.seatId];
    if (!view) return;
    if (lake.mySession?.seatId === seat.seatId) return;
    if (view.state === 'occupied') showError(root, { code: 'SEAT_TAKEN' });
    else if (view.state === 'cooldown') showError(root, { code: 'SEAT_COOLDOWN' });
    else if (lake.mySession) showError(root, { code: 'ALREADY_HAS_SEAT' });
    else if (this.scene.seats.nearestSeat(this.scene.me) === seat.number - 1) seatUi.openBuy(seat);
  }

  leave(): void {
    if (this.flow?.canLeaveSeat()) void this.seatUi?.leave();
  }

  isLocked(): boolean {
    return this.flow?.isLocked() ?? false;
  }

  /** Đang mở hộp thoại hoặc đang câu thì bấm vào map không làm nhân vật đi. */
  blocksWorldClick(): boolean {
    return this.isLocked() || this.root?.querySelector('.ui-dialog') != null;
  }

  update(): void {
    if (!this.flow) return;
    const serverNowMs = this.serverNow();
    this.flow.update();
    this.markers?.update(serverNowMs);
    this.seatUi?.update(serverNowMs);
  }

  destroy(): void {
    this.destroyed = true;
    this.flow?.destroy();
    this.seatUi?.destroy();
    this.cleanups.forEach((cleanup) => cleanup());
    this.cleanups.length = 0;
  }
}
