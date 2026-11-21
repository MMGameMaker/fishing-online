// Server giả chạy trong trình duyệt: cùng contract với Server thật nhưng chỉ làm luật đơn giản.
// Hoàn tất với mock không đồng nghĩa đã tích hợp thật.
import type { FishConfig, GameplayConfig } from '../core/gameplayConfig';
import { mulberry32 } from '../fishing/minigameCore';
import type { FetchLike } from '../net/ApiClient';
import type {
  AttemptResult,
  AttemptView,
  CodexEntry,
  CommandAck,
  Direction,
  ErrorCode,
  FishItem,
  HistoryEntry,
  HubCommandName,
  HubEventName,
  HubEvents,
  InventoryResponse,
  LakeSnapshot,
  MinigameParams,
  MySeat,
  MyTicket,
  PlayerProfile,
  DailyFishEntry,
  DailyFishRanking,
  PlayerView,
  RankingEntry,
  RankingResponse,
  SeatView,
  SelectSkinResponse,
  ShowcaseSlot,
  SitDownResult,
  SkinsResponse,
  Stats,
  TicketPurchaseResult,
} from '../net/contract';
import type { HubConnectionLike, HubHandler } from '../net/GameHub';
import {
  canStand,
  inLakeArea,
  nearestStandable,
  type LakeMap,
  type LakeSeat,
  type RestSeat,
} from '../scenes/lake/walkable';
import {
  addStats,
  expToNext,
  levelForExp,
  levelStats,
  minigameParams,
  pickSpecies,
  pickStats,
  rodById,
  rollLength,
  uniformInt,
  type Random,
} from './rules';
import { MOCK_SKINS } from './skinCatalog';
import { TOP_UP_PACKS } from '../ui/shop/topUpPacks';
import { BIO_MAX, TITLES } from '../ui/profile/profileModel';
import {
  ACHIEVEMENT_DEFS,
  achievementEntries,
  nextClaim,
  type AchievementCounters,
} from './achievements';
import {
  BOT_REST_CHANCE,
  BOT_TO_SEAT_MS,
  nextRound,
  pickBotNames,
  startFishing,
  startResting,
  startWander,
  type BotState,
} from './botFishing';
import {
  BOT_PAUSE_MS,
  BOT_WALK_EVERY_MS,
  BOT_WALK_SPEED,
  findRoute,
  pickWanderTarget,
  tooClose,
  walkStep,
} from './botWalk';
import {
  DEFAULT_BOT_TIERS,
  allowedFishingBots,
  botTarget,
  pickBotTier,
  type BotChatState,
} from './botSocial';
import { MockSocial, SocialError } from './MockSocial';

export interface MockOptions {
  config: GameplayConfig;
  map: LakeMap;
  seed?: number;
  startMs?: number;
  /** Lỗi giả cho mọi lệnh thay đổi trạng thái, trừ đăng nhập, vào hồ và di chuyển. */
  forcedError?: ErrorCode | null;
  botCount?: number;
  /** Ping giả (ms) cho lệnh và event hub. */
  latencyMs?: number;
  /** Bot có tên người, ngồi ghế câu cá và khoe cá (pier.html, feedback 2026-11-14). */
  fishingBots?: boolean;
}

/** Bảng mã lỗi → HTTP theo BE-A-01 và SPEC mục 5. */
const HTTP_STATUS: Partial<Record<ErrorCode, number>> = {
  VALIDATION_FAILED: 400,
  INVALID_QUANTITY: 400,
  UNAUTHENTICATED: 401,
  SESSION_EXPIRED: 401,
  FISH_NOT_FOUND: 404,
  SEAT_TAKEN: 409,
  ALREADY_HAS_SEAT: 409,
  NO_TICKET: 409,
  ATTEMPT_ACTIVE: 409,
  IDEMPOTENCY_CONFLICT: 409,
  ROD_ALREADY_OWNED: 409,
  SKIN_ALREADY_OWNED: 409,
  PRICE_CHANGED: 409,
  STATE_CONFLICT: 409,
  INSUFFICIENT_GOLD: 422,
  ROD_NOT_OWNED: 422,
  SKIN_NOT_OWNED: 422,
  NOT_IN_SEAT: 422,
  RATE_LIMITED: 429,
  PLAYER_NOT_FOUND: 404,
  NOT_FRIENDS: 403,
  TRADE_NOT_FOUND: 404,
  TRADE_LIMIT_REACHED: 409,
};

const MY_ID = '11111111-1111-4111-8111-111111111111';
const TICK_MS = 100;
const BOT_MOVE_EVERY_MS = 600;
const BOT_STEP_PX = 16;
/** Số nhịp 100 ms liên tiếp không đổi vị trí (chưa tới đích) thì bot coi là bị chặn: 5 nhịp = 0,5 giây. */
const BOT_STUCK_TICKS = 5;
const BOT_CATCH_CHANCE = 0.02;
const BOT_FAIL_CHANCE = 0.02;
const SCALE_BROADCAST_EVERY_MS = 1000;
const NO_FORCED_ERROR: ReadonlySet<HubCommandName> = new Set(['JoinLake', 'Move']);
const DIRECTIONS: readonly Direction[] = ['up', 'down', 'left', 'right'];
const NAME_PATTERN = /^[\p{L}\p{N} _]{3,16}$/u;

class CommandError extends Error {
  constructor(
    readonly code: ErrorCode,
    message: string = code,
  ) {
    super(message);
  }
}

interface SeatRuntime {
  info: LakeSeat;
  state: SeatView['state'];
  occupantPlayerId: string | null;
}

/** Vé không gắn với ghế (SPEC 2.2); ngồi ghế là SessionRuntime riêng. */
interface TicketRuntime {
  expiresAtMs: number;
  purchasedMinutes: number;
  ticketVersion: number;
}

interface SessionRuntime {
  sessionId: string;
  seatId: string;
  startedAtMs: number;
}

interface AttemptRuntime {
  attemptId: string;
  phase: 'waiting' | 'bite' | 'minigame';
  biteAtMs: number;
  biteDeadlineMs: number | null;
  species: FishConfig | null;
  minigame: MinigameParams | null;
  minigameStartedAtMs: number | null;
  minigameDeadlineMs: number | null;
}

interface SettledAttempt {
  outcome: AttemptView['phase'];
  view: AttemptView;
  /** Server tự kết thúc vì quá deadline, khác với Client báo thua. */
  expired: boolean;
}

interface CodexRuntime {
  totalCaught: number;
  bestLengthTenthCm: number;
  smallestLengthTenthCm: number;
  firstCaughtAt: string;
}

interface IdempotentReceipt {
  fingerprint: string;
  status: number;
  body: string;
}

export class MockBackend {
  readonly fetch: FetchLike = (input, init) => this.handleHttp(input, init);

  private readonly config: GameplayConfig;
  private readonly map: LakeMap;
  private readonly random: Random;
  private readonly forcedError: ErrorCode | null;
  private readonly latencyMs: number;
  private nowMs: number;
  private idCounter = 0;
  private loggedIn = false;
  private created = false;
  private displayName = 'Người chơi';
  private titleId = TITLES[0]!.id;
  private bio = '';
  private showcaseSlots: (string | null)[] = [null, null, null];
  /** Số level thành tựu đã nhận, và bộ đếm riêng của mock (người tiên phong, cá khủng, thương nhân). */
  private readonly achievementClaimed: Record<string, number> = {};
  private readonly achievementExtra: AchievementCounters = {};
  private exp = 0;
  private gold: number;
  private equippedRodId: string;
  private readonly rods: Set<string>;
  /** Skin shop đã mua và skin đang dùng (skin free luôn dùng được). */
  private readonly skinsOwned = new Set<string>();
  private selectedSkinId = 'skin_01';
  private fish: FishItem[] = [];
  /** Mọi con mình đã câu (kể cả đã bán/đổi) để dựng BXH cá ngày. */
  private readonly dailyLog: { speciesId: string; lengthTenthCm: number; caughtAt: string }[] = [];
  private inventoryVersion = 1;
  private readonly codex = new Map<string, CodexRuntime>();
  private readonly history: HistoryEntry[] = [];
  private position: { x: number; y: number; dir: Direction };
  /** Chỗ ngồi chơi người chơi đang ngồi (yêu cầu 2026-11-18). */
  private myRestSeatId: string | null = null;
  private lastMoveSeq = 0;
  private readonly seats = new Map<string, SeatRuntime>();
  private session: SessionRuntime | null = null;
  private ticket: TicketRuntime | null = null;
  private attempt: AttemptRuntime | null = null;
  private readonly settled = new Map<string, SettledAttempt>();
  private readonly bots: PlayerView[] = [];
  private readonly fishingBots: boolean;
  private readonly botStates = new Map<string, BotState>();
  /** Loài đã có ai câu được (để thông báo "người đầu tiên"). */
  private readonly caughtSpecies = new Set<string>();
  private readonly handlers = new Map<string, Set<HubHandler>>();
  private connected = false;
  private readonly httpReceipts = new Map<string, IdempotentReceipt>();
  private readonly hubReceipts = new Map<string, { fingerprint: string; ack: unknown }>();
  private seatTimeScale = 1;
  private botTimerMs = 0;
  /** Trạng thái đi bộ của bot pier: điểm đang tới, nghỉ tới khi nào, số nhịp bị kẹt. */
  private readonly botWalks = new Map<
    string,
    {
      target: { x: number; y: number } | null;
      pauseUntilMs: number;
      stuck: number;
      /** Đường đi tới ghế (điểm cần tới theo thứ tự); null khi chưa tính. */
      route?: { x: number; y: number }[] | null;
    }
  >();
  private broadcastTimerMs = 0;
  private realtimeHandle: ReturnType<typeof setInterval> | null = null;
  /**
   * pier.html (BOT-02): bot theo bảng mốc với user thật = 1 (30 bot, 20 được câu), vào dần 2–5 giây một con.
   * null khi dùng số bot cố định (fishing.html, test).
   */
  private botGoal: { total: number; fishing: number } | null = null;
  private botNamePool: string[] = [];
  private nextBotJoinMs = 0;
  private botSerial = 0;
  readonly social: MockSocial;

  constructor(options: MockOptions) {
    this.config = options.config;
    this.map = options.map;
    this.random = mulberry32(options.seed ?? 20261109);
    this.forcedError = options.forcedError ?? null;
    this.latencyMs = options.latencyMs ?? 0;
    this.nowMs = options.startMs ?? Date.now();
    this.gold = options.config.newPlayer.gold;
    this.equippedRodId = options.config.newPlayer.rodId;
    this.rods = new Set([options.config.newPlayer.rodId]);
    this.position = { x: options.map.spawn.x, y: options.map.spawn.y, dir: 'down' };
    for (const info of options.map.seats) {
      this.seats.set(info.seatId, { info, state: 'available', occupantPlayerId: null });
    }
    this.fishingBots = options.fishingBots ?? false;
    if (this.fishingBots && options.botCount === undefined) {
      this.botGoal = botTarget(pickBotTier(DEFAULT_BOT_TIERS, 1), 1);
      this.botNamePool = pickBotNames(this.botGoal.total, this.random, [this.displayName]);
      this.nextBotJoinMs = this.nowMs + 1000;
    } else {
      this.createBots(options.botCount ?? 3);
    }
    this.social = new MockSocial({
      config: this.config,
      random: this.random,
      now: () => this.nowMs,
      emit: (event, payload) => this.emit(event, payload),
      bots: () => this.bots,
      botState: (botId) => this.botChatState(botId),
      me: () => ({
        playerId: MY_ID,
        displayName: this.displayName,
        x: this.position.x,
        y: this.position.y,
      }),
      myFish: () => this.fish,
      swapFish: (giveIds, receive) => {
        this.fish = [...receive, ...this.fish.filter((f) => !giveIds.includes(f.catchId))];
        this.inventoryVersion += 1;
      },
    });
  }

  // ---------- Điều khiển thời gian ----------

  /** Tua thời gian giả, dùng trong test. */
  advance(ms: number): void {
    let remaining = ms;
    while (remaining > 0) {
      const step = Math.min(TICK_MS, remaining);
      this.nowMs += step;
      this.tick(step);
      remaining -= step;
    }
  }

  /** Chạy theo đồng hồ thật trong trình duyệt. */
  startRealtime(): void {
    if (this.realtimeHandle !== null) return;
    let last = performance.now();
    this.realtimeHandle = setInterval(() => {
      const current = performance.now();
      this.advance(current - last);
      last = current;
    }, TICK_MS);
  }

  stopRealtime(): void {
    if (this.realtimeHandle === null) return;
    clearInterval(this.realtimeHandle);
    this.realtimeHandle = null;
  }

  /** Nút debug: phiên ghế và cooldown trôi nhanh hơn, minigame giữ tốc độ thật. */
  setSeatTimeScale(scale: number): void {
    this.seatTimeScale = Math.max(1, scale);
  }

  getSeatTimeScale(): number {
    return this.seatTimeScale;
  }

  now(): number {
    return this.nowMs;
  }

  // ---------- Kết nối hub ----------

  createConnection(): HubConnectionLike {
    return {
      start: async () => {
        this.connected = true;
      },
      stop: async () => {
        this.connected = false;
      },
      invoke: async <T>(method: string, arg: unknown) => {
        await this.networkDelay();
        const ack = await this.handleHub(method, arg);
        await this.networkDelay();
        return ack as T;
      },
      on: (event: string, handler: HubHandler) => {
        const set = this.handlers.get(event) ?? new Set<HubHandler>();
        set.add(handler);
        this.handlers.set(event, set);
      },
      onreconnecting: () => {},
      onreconnected: () => {},
      onclose: () => {},
    };
  }

  private emit<K extends HubEventName>(event: K, payload: HubEvents[K]): void {
    if (!this.connected) return;
    const deliver = () => this.handlers.get(event)?.forEach((handler) => handler(payload));
    if (this.latencyMs > 0) setTimeout(deliver, this.latencyMs / 2);
    else deliver();
  }

  private networkDelay(): Promise<void> | undefined {
    if (this.latencyMs <= 0) return undefined;
    return new Promise((resolve) => setTimeout(resolve, this.latencyMs / 2));
  }

  // ---------- Vòng lặp ----------

  private tick(dt: number): void {
    this.applySeatTimeScale(dt);
    this.checkSession();
    this.checkAttempt();
    this.joinBots();
    this.moveBots(dt);
    if (this.fishingBots) this.social.tick();
  }

  /** Bot vào hồ dần, 2–5 giây một con, tới đúng mục tiêu của mốc (pier.html). */
  private joinBots(): void {
    const goal = this.botGoal;
    if (!goal || this.bots.length >= goal.total || this.nowMs < this.nextBotJoinMs) return;
    this.nextBotJoinMs = this.nowMs + uniformInt(this.random, 2000, 5000);
    this.botSerial += 1;
    const spawn =
      pickWanderTarget(this.map, this.map.spawn.x, this.map.spawn.y, this.random) ?? this.map.spawn;
    const bot: PlayerView = {
      playerId: `bot-${this.botSerial}`,
      displayName: this.botNamePool[this.botSerial - 1] ?? `Ngư dân ${this.botSerial}`,
      skinId: `skin_0${((this.botSerial - 1) % 5) + 1}`,
      rodId: this.config.newPlayer.rodId,
      x: spawn.x,
      y: spawn.y,
      dir: 'down',
      seatId: null,
      fishing: false,
    };
    this.bots.push(bot);
    this.botStates.set(bot.playerId, startWander(this.nowMs, this.random));
    this.emit('PlayerJoined', { ...bot });
  }

  /** Trạng thái chọn câu chat: ngồi chờ cá, cá cắn/kéo (3 giây cuối mỗi lượt), lúc khác. */
  private botChatState(botId: string): BotChatState {
    const state = this.botStates.get(botId);
    if (state?.mode !== 'fishing') return 'idle';
    return this.nowMs >= state.nextResultMs - 3000 ? 'fighting' : 'waiting';
  }

  /** Số bot được giữ suất ngồi (đang tới ghế hoặc đang câu); luôn chừa ghế cho người chơi. */
  private allowedBotSeats(): number {
    const fishingTarget = this.botGoal?.fishing ?? this.bots.length;
    return allowedFishingBots({
      fishingTarget,
      seatCount: this.seats.size,
      humansSeated: this.session ? 1 : 0,
      humansStanding: this.session ? 0 : 1,
    });
  }

  private botSeatHolders(): string[] {
    return [...this.botStates]
      .filter(([, s]) => s.mode === 'toSeat' || s.mode === 'fishing')
      .map(([id]) => id);
  }

  /** Thừa suất ngồi: bot đang tới ghế bỏ ghế trước, rồi bot đang câu đứng dậy. */
  private balanceBotSeats(): void {
    const holders = this.botSeatHolders();
    let excess = holders.length - this.allowedBotSeats();
    if (excess <= 0) return;
    const ordered = holders.sort(
      (a, b) =>
        Number(this.botStates.get(a)?.mode === 'fishing') -
        Number(this.botStates.get(b)?.mode === 'fishing'),
    );
    for (const id of ordered) {
      if (excess <= 0) break;
      const state = this.botStates.get(id);
      const bot = this.bots.find((b) => b.playerId === id);
      if (!state || !bot) continue;
      this.botStates.set(id, startWander(this.nowMs, this.random));
      const walk = this.botWalks.get(id);
      if (walk) walk.route = null;
      if (state.mode === 'fishing') this.botLeaveSeat(bot, state.seatId);
      excess -= 1;
    }
  }

  private applySeatTimeScale(dt: number): void {
    if (this.seatTimeScale <= 1) return;
    const extra = dt * (this.seatTimeScale - 1);
    if (this.ticket) this.ticket.expiresAtMs -= extra;
    this.broadcastTimerMs += dt;
    if (this.broadcastTimerMs < SCALE_BROADCAST_EVERY_MS) return;
    this.broadcastTimerMs = 0;
    if (this.ticket && this.ticket.expiresAtMs > this.nowMs) {
      this.emit('MyTicket', this.ticketView(this.ticket));
    }
  }

  /** Vé hết khi đang chờ cá cắn thì tự đứng dậy; giữa minigame thì câu nốt rồi kết thúc. */
  private checkSession(): void {
    if (!this.session) return;
    const ticketExpired = !this.ticket || this.nowMs >= this.ticket.expiresAtMs;
    if (ticketExpired && this.attempt?.phase !== 'minigame') {
      this.endSession('ticket_expired', 'ticket_expired');
    }
  }

  private checkAttempt(): void {
    const attempt = this.attempt;
    if (!attempt) return;
    if (attempt.phase === 'waiting' && this.nowMs >= attempt.biteAtMs) {
      this.toBite(attempt);
    } else if (attempt.phase === 'bite' && this.isBiteExpired(attempt)) {
      this.finishFailed(attempt, 'missed_bite');
    } else if (attempt.phase === 'minigame' && this.nowMs > attempt.minigameDeadlineMs!) {
      const { attemptId } = this.finishFailed(attempt, 'timeout');
      this.settled.get(attemptId)!.expired = true;
    }
  }

  private isBiteExpired(attempt: AttemptRuntime): boolean {
    return this.nowMs > attempt.biteDeadlineMs! + this.config.fishing.biteGraceMs;
  }

  private createBots(count: number): void {
    const spots = this.map.seats.slice(0, count);
    const names = this.fishingBots ? pickBotNames(count, this.random, [this.displayName]) : [];
    spots.forEach((seat, index) => {
      if (this.fishingBots)
        this.botStates.set(`bot-${index + 1}`, startWander(this.nowMs, this.random));
      this.bots.push({
        playerId: `bot-${index + 1}`,
        displayName: names[index] ?? `Bot ${index + 1}`,
        skinId: this.fishingBots ? `skin_0${(index % 5) + 1}` : 'skin_01',
        rodId: this.config.newPlayer.rodId,
        x: seat.x,
        y: seat.y - 32,
        dir: 'down',
        seatId: null,
        fishing: false,
      });
    });
  }

  private moveBots(dt: number): void {
    this.botTimerMs += dt;
    if (this.botTimerMs < (this.fishingBots ? BOT_WALK_EVERY_MS : BOT_MOVE_EVERY_MS)) return;
    this.botTimerMs = 0;
    const directions: { dir: Direction; dx: number; dy: number }[] = [
      { dir: 'up', dx: 0, dy: -BOT_STEP_PX },
      { dir: 'down', dx: 0, dy: BOT_STEP_PX },
      { dir: 'left', dx: -BOT_STEP_PX, dy: 0 },
      { dir: 'right', dx: BOT_STEP_PX, dy: 0 },
    ];
    if (this.fishingBots) this.balanceBotSeats();
    for (const bot of this.bots) {
      if (this.fishingBots) {
        // Bot pier: đi bộ mượt (bước ngắn mỗi 100 ms), không bước ngẫu nhiên 16 px.
        if (!this.tickFishingBot(bot)) this.wanderBot(bot);
        continue;
      }
      const step = directions[Math.floor(this.random() * directions.length)]!;
      const x = bot.x + step.dx;
      const y = bot.y + step.dy;
      if (canStand(this.map, x, y) && inLakeArea(this.map, x, y)) {
        bot.x = x;
        bot.y = y;
        bot.dir = step.dir;
        this.lastMoveSeq += 1;
        this.emit('PlayerMoved', {
          playerId: bot.playerId,
          x,
          y,
          dir: step.dir,
          seq: this.lastMoveSeq,
        });
      }
      if (this.random() < BOT_CATCH_CHANCE) {
        const fish = pickSpecies(this.config, 0, this.random);
        this.emit('CatchShown', {
          playerId: bot.playerId,
          speciesId: fish.speciesId,
          rarity: fish.rarity,
          shownUntil: this.iso(this.nowMs + this.config.fishing.catchShownMs),
        });
      }
      if (this.random() < BOT_FAIL_CHANCE) {
        this.emit('FailShown', {
          playerId: bot.playerId,
          shownUntil: this.iso(this.nowMs + this.config.fishing.failShownMs),
        });
      }
    }
  }

  /** Một bước ngắn tới (tx, ty), phát PlayerMoved; true khi đã tới (hoặc đứng yên quá 0,5 giây giữa đường thì coi như xong lượt đi này). */
  private stepBot(bot: PlayerView, tx: number, ty: number): boolean {
    const walk = this.botWalks.get(bot.playerId) ?? { target: null, pauseUntilMs: 0, stuck: 0 };
    this.botWalks.set(bot.playerId, walk);
    const stepPx = (BOT_WALK_SPEED * BOT_WALK_EVERY_MS) / 1000;
    const result = walkStep(this.map, bot.x, bot.y, tx, ty, stepPx, bot.dir);
    walk.stuck = result.moved || result.arrived ? 0 : walk.stuck + 1;
    if (result.moved) {
      bot.x = result.x;
      bot.y = result.y;
      bot.dir = result.dir;
      this.lastMoveSeq += 1;
      this.emit('PlayerMoved', {
        playerId: bot.playerId,
        x: bot.x,
        y: bot.y,
        dir: bot.dir,
        seq: this.lastMoveSeq,
      });
    }
    return result.arrived || walk.stuck >= BOT_STUCK_TICKS;
  }

  /** Đi dạo: chọn điểm đứng được gần đó, đi bộ tới, nghỉ một lúc rồi chọn điểm khác. */
  private wanderBot(bot: PlayerView): void {
    const walk = this.botWalks.get(bot.playerId) ?? { target: null, pauseUntilMs: 0, stuck: 0 };
    this.botWalks.set(bot.playerId, walk);
    const others = this.otherPositions(bot);
    const crowded = () => others.some((other) => tooClose(other, bot));
    if (this.nowMs < walk.pauseUntilMs) {
      // Có người/bot đứng đè lên chỗ này: không nghỉ nữa, đi sang chỗ khác ngay.
      if (!crowded()) return;
      walk.pauseUntilMs = 0;
      walk.target = null;
    }
    if (!walk.target) {
      walk.target = pickWanderTarget(this.map, bot.x, bot.y, this.random, 240, 30, (point) =>
        others.every((other) => !tooClose(other, point)),
      );
      walk.stuck = 0;
      if (!walk.target) {
        walk.pauseUntilMs = this.nowMs + 1000;
        return;
      }
    }
    if (this.stepBot(bot, walk.target.x, walk.target.y)) {
      const blocked = walk.stuck >= BOT_STUCK_TICKS;
      walk.target = null;
      // Bị chặn giữa đường (vị trí không đổi quá 0,5 giây) hoặc tới nơi mà chỗ đó vừa bị chiếm: chọn chỗ khác luôn, không nghỉ.
      walk.pauseUntilMs =
        blocked || crowded()
          ? 0
          : this.nowMs + BOT_PAUSE_MS[0] + this.random() * (BOT_PAUSE_MS[1] - BOT_PAUSE_MS[0]);
    }
  }

  /** Vị trí người chơi và các bot khác (không tính `bot`), để bot không dừng chồng lên ai. */
  private otherPositions(bot: PlayerView): { x: number; y: number }[] {
    return [
      { x: this.position.x, y: this.position.y },
      ...this.bots
        .filter((other) => other.playerId !== bot.playerId)
        .map((other) => ({ x: other.x, y: other.y })),
    ];
  }

  /**
   * Bot câu cá (pier): hết giờ dạo thì ngồi ghế trống; đang ngồi thì tới lượt có kết quả câu được/trượt,
   * hết lượt thì đứng dậy dạo tiếp. Trả true khi bot đang ngồi (không đi bước ngẫu nhiên).
   */
  private tickFishingBot(bot: PlayerView): boolean {
    const state = this.botStates.get(bot.playerId);
    if (!state) return false;
    if (state.mode === 'toRest' || state.mode === 'resting') return this.tickRestingBot(bot, state);
    if (state.mode === 'wander') {
      if (this.nowMs < state.untilMs) return false;
      // Thỉnh thoảng đi ngồi chơi một ghế trống ngẫu nhiên thay vì tìm ghế câu (yêu cầu 2026-11-18).
      if (this.random() < BOT_REST_CHANCE && this.startBotRest(bot)) return true;
      // Chỉ đúng số "bot được câu" mới tới ghế; bot khác tiếp tục đi dạo và chat (BOT-02).
      if (this.botSeatHolders().length >= this.allowedBotSeats()) {
        this.botStates.set(bot.playerId, startWander(this.nowMs, this.random));
        return false;
      }
      // Chọn ghế trống chưa bot nào đang đi tới, rồi đi bộ tới đó (không dịch chuyển lên ghế).
      const taken = new Set(
        [...this.botStates.values()].flatMap((s) => (s.mode === 'toSeat' ? [s.seatId] : [])),
      );
      const free = [...this.seats.values()].filter(
        (seat) =>
          seat.state === 'available' &&
          !taken.has(seat.info.seatId) &&
          // Không ngồi lên vị trí ghế đang có người/bot đứng.
          !this.otherPositions(bot).some((other) => tooClose(other, seat.info)),
      );
      const seat = free[Math.floor(this.random() * free.length)];
      if (!seat) {
        this.botStates.set(bot.playerId, startWander(this.nowMs, this.random));
        return false;
      }
      this.botStates.set(bot.playerId, {
        mode: 'toSeat',
        seatId: seat.info.seatId,
        giveUpMs: this.nowMs + BOT_TO_SEAT_MS,
      });
      return true;
    }
    if (state.mode === 'toSeat') {
      const seat = this.seats.get(state.seatId);
      if (!seat || seat.state !== 'available' || this.nowMs > state.giveUpMs) {
        this.botStates.set(bot.playerId, startWander(this.nowMs, this.random));
        return false;
      }
      const stand = nearestStandable(this.map, seat.info.x, seat.info.y) ?? this.map.spawn;
      // Chỗ đứng cạnh ghế đang có người/bot đứng: bỏ ghế này, không đứng đè lên họ.
      if (this.otherPositions(bot).some((other) => tooClose(other, stand))) {
        this.botStates.set(bot.playerId, startWander(this.nowMs, this.random));
        return false;
      }
      // Đi bộ tới chỗ đứng cạnh ghế theo đường vòng qua vật cản; không có đường hoặc kẹt thì bỏ ghế này,
      // không dịch chuyển lên ghế (feedback 2026-11-16).
      const progress = this.walkBotTo(bot, stand);
      if (progress === 'failed') {
        this.botStates.set(bot.playerId, startWander(this.nowMs, this.random));
        return false;
      }
      if (progress === 'walking') return true;
      seat.state = 'occupied';
      seat.occupantPlayerId = bot.playerId;
      bot.x = seat.info.x;
      bot.y = seat.info.y;
      bot.dir = seat.info.facing as Direction;
      bot.seatId = seat.info.seatId;
      bot.fishing = true;
      this.lastMoveSeq += 1;
      this.emit('PlayerMoved', {
        playerId: bot.playerId,
        x: bot.x,
        y: bot.y,
        dir: bot.dir,
        seq: this.lastMoveSeq,
      });
      this.emit('SeatChanged', this.seatView(seat));
      this.botStates.set(bot.playerId, startFishing(seat.info.seatId, this.nowMs, this.random));
      return true;
    }
    if (this.nowMs < state.nextResultMs) return true;
    const { caught, next } = nextRound(state, this.nowMs, this.random);
    if (caught) this.botCaught(bot);
    else {
      this.emit('FailShown', {
        playerId: bot.playerId,
        shownUntil: this.iso(this.nowMs + this.config.fishing.failShownMs),
      });
    }
    this.botStates.set(bot.playerId, next);
    if (next.mode === 'wander') this.botLeaveSeat(bot, state.seatId);
    return true;
  }

  /** Bot câu được: cá trên đầu (CatchShown) và khoe cá cho cả hồ (CatchAnnounced → thanh + chat). */
  private botCaught(bot: PlayerView): void {
    const fish = pickSpecies(this.config, 0, this.random);
    this.social.onBotCaught(bot, fish);
    this.emit('CatchShown', {
      playerId: bot.playerId,
      speciesId: fish.speciesId,
      rarity: fish.rarity,
      shownUntil: this.iso(this.nowMs + this.config.fishing.catchShownMs),
    });
    const first = !this.caughtSpecies.has(fish.speciesId);
    this.caughtSpecies.add(fish.speciesId);
    this.emit('CatchAnnounced', {
      playerId: bot.playerId,
      displayName: bot.displayName,
      speciesId: fish.speciesId,
      speciesName: fish.name,
      rarity: fish.rarity,
      first,
      announcedAt: this.iso(this.nowMs),
    });
  }

  private botLeaveSeat(bot: PlayerView, seatId: string): void {
    const seat = this.seats.get(seatId);
    if (seat && seat.occupantPlayerId === bot.playerId) {
      seat.state = 'available';
      seat.occupantPlayerId = null;
      this.emit('SeatChanged', this.seatView(seat));
    }
    bot.seatId = null;
    bot.fishing = false;
    // Đứng dậy ra chỗ đứng được gần ghế (ghế là vật cản).
    const spot = nearestStandable(this.map, bot.x, bot.y) ?? this.map.spawn;
    bot.x = spot.x;
    bot.y = spot.y;
    this.lastMoveSeq += 1;
    this.emit('PlayerMoved', {
      playerId: bot.playerId,
      x: bot.x,
      y: bot.y,
      dir: bot.dir,
      seq: this.lastMoveSeq,
    });
  }

  /** Đi bộ theo đường vòng qua vật cản tới `stand`: còn đi, đã tới, hoặc không có đường/kẹt. */
  private walkBotTo(
    bot: PlayerView,
    stand: { x: number; y: number },
  ): 'walking' | 'arrived' | 'failed' {
    const walk = this.botWalks.get(bot.playerId) ?? {
      target: null,
      pauseUntilMs: 0,
      stuck: 0,
      route: null,
    };
    this.botWalks.set(bot.playerId, walk);
    if (!walk.route) {
      walk.route = findRoute(this.map, bot, stand);
      walk.stuck = 0;
      if (!walk.route) return 'failed';
    }
    const waypoint = walk.route[0];
    if (waypoint) {
      if (this.stepBot(bot, waypoint.x, waypoint.y) && walk.stuck < BOT_STUCK_TICKS)
        walk.route.shift();
      if (walk.stuck >= BOT_STUCK_TICKS) {
        walk.route = null;
        walk.stuck = 0;
        return 'failed';
      }
      if (walk.route.length > 0) return 'walking';
    }
    walk.route = null;
    return 'arrived';
  }

  // ---------- Chỗ ngồi chơi (ghế quanh bàn, không câu; yêu cầu 2026-11-18) ----------

  private restSeatInfo(restSeatId: string): RestSeat | undefined {
    return (this.map.restSeats ?? []).find((seat) => seat.restSeatId === restSeatId);
  }

  /** Chỗ đã có người ngồi (mình hoặc bot) hoặc đang có bot đi tới. */
  private restTaken(restSeatId: string, exceptBotId?: string): boolean {
    if (this.myRestSeatId === restSeatId) return true;
    if (this.bots.some((bot) => bot.restSeatId === restSeatId)) return true;
    return [...this.botStates].some(
      ([id, state]) =>
        id !== exceptBotId && state.mode === 'toRest' && state.restSeatId === restSeatId,
    );
  }

  /** Chọn ngẫu nhiên một chỗ ngồi chơi trống để bot đi tới; false nếu map không có hoặc đã kín. */
  private startBotRest(bot: PlayerView): boolean {
    const free = (this.map.restSeats ?? []).filter((seat) => !this.restTaken(seat.restSeatId));
    const seat = free[Math.floor(this.random() * free.length)];
    if (!seat) return false;
    this.botStates.set(bot.playerId, {
      mode: 'toRest',
      restSeatId: seat.restSeatId,
      giveUpMs: this.nowMs + BOT_TO_SEAT_MS,
    });
    return true;
  }

  private tickRestingBot(
    bot: PlayerView,
    state: Extract<BotState, { mode: 'toRest' } | { mode: 'resting' }>,
  ): boolean {
    const seat = this.restSeatInfo(state.restSeatId);
    if (state.mode === 'resting') {
      if (this.nowMs < state.untilMs && seat) return true;
      this.botStandRest(bot);
      this.botStates.set(bot.playerId, startWander(this.nowMs, this.random));
      return true;
    }
    if (!seat || this.nowMs > state.giveUpMs || this.restTaken(seat.restSeatId, bot.playerId)) {
      this.botStates.set(bot.playerId, startWander(this.nowMs, this.random));
      return false;
    }
    const stand = nearestStandable(this.map, seat.x, seat.y) ?? this.map.spawn;
    const progress = this.walkBotTo(bot, stand);
    if (progress === 'failed') {
      this.botStates.set(bot.playerId, startWander(this.nowMs, this.random));
      return false;
    }
    if (progress === 'walking') return true;
    bot.restSeatId = seat.restSeatId;
    bot.x = seat.x;
    bot.y = seat.y;
    bot.dir = seat.facing as Direction;
    this.emit('PlayerJoined', { ...bot });
    this.botStates.set(bot.playerId, startResting(seat.restSeatId, this.nowMs, this.random));
    return true;
  }

  private botStandRest(bot: PlayerView): void {
    if (!bot.restSeatId) return;
    bot.restSeatId = null;
    const spot = nearestStandable(this.map, bot.x, bot.y) ?? this.map.spawn;
    bot.x = spot.x;
    bot.y = spot.y;
    this.emit('PlayerJoined', { ...bot });
  }

  private commandSitRest(args: Record<string, unknown>): null {
    const seat = this.restSeatInfo(String(args.restSeatId));
    const x = Number(args.x);
    const y = Number(args.y);
    const dir = args.dir as Direction;
    if (!seat || !Number.isFinite(x) || !Number.isFinite(y) || !DIRECTIONS.includes(dir)) {
      throw new CommandError('VALIDATION_FAILED');
    }
    if (this.session) throw new CommandError('ALREADY_HAS_SEAT');
    if (this.myRestSeatId !== seat.restSeatId && this.restTaken(seat.restSeatId)) {
      throw new CommandError('SEAT_TAKEN');
    }
    this.myRestSeatId = seat.restSeatId;
    this.position = { x, y, dir };
    this.emit('PlayerJoined', this.myView());
    return null;
  }

  private commandStandRest(): null {
    if (!this.myRestSeatId) return null;
    this.myRestSeatId = null;
    this.emit('PlayerJoined', this.myView());
    return null;
  }

  // ---------- Dữ liệu trả về ----------

  private iso(ms: number): string {
    return new Date(ms).toISOString();
  }

  private nextId(prefix: string): string {
    this.idCounter += 1;
    return `${prefix}-${this.idCounter}`;
  }

  private get level(): number {
    return levelForExp(this.config, this.exp);
  }

  private profile(): PlayerProfile {
    return {
      playerId: MY_ID,
      displayName: this.displayName,
      level: this.level,
      exp: this.exp,
      gold: String(this.gold),
      selectedSkinId: this.selectedSkinId,
      equippedRodId: this.equippedRodId,
      titleId: this.titleId,
      bio: this.bio,
    };
  }

  private myView(): PlayerView {
    return {
      playerId: MY_ID,
      displayName: this.displayName,
      skinId: this.selectedSkinId,
      rodId: this.equippedRodId,
      x: this.position.x,
      y: this.position.y,
      dir: this.position.dir,
      seatId: this.session?.seatId ?? null,
      fishing: this.attempt !== null,
      restSeatId: this.myRestSeatId,
    };
  }

  private seatView(seat: SeatRuntime): SeatView {
    return {
      seatId: seat.info.seatId,
      state: seat.state,
      occupantPlayerId: seat.occupantPlayerId,
    };
  }

  private ticketView(ticket: TicketRuntime): MyTicket {
    return {
      expiresAt: this.iso(ticket.expiresAtMs),
      purchasedMinutes: ticket.purchasedMinutes,
      ticketVersion: ticket.ticketVersion,
      priceVersion: this.config.ticketPricing.priceVersion,
    };
  }

  private mySeatView(session: SessionRuntime): MySeat {
    return {
      seatId: session.seatId,
      sessionId: session.sessionId,
      sitAt: this.iso(session.startedAtMs),
    };
  }

  private attemptView(attempt: AttemptRuntime): AttemptView {
    const params = attempt.minigame;
    return {
      attemptId: attempt.attemptId,
      phase: attempt.phase,
      reason: null,
      biteDeadlineAt: attempt.phase === 'bite' ? this.iso(attempt.biteDeadlineMs!) : null,
      minigame: params
        ? {
            ...params,
            startedAt: this.iso(attempt.minigameStartedAtMs!),
            deadlineAt: this.iso(attempt.minigameDeadlineMs!),
          }
        : null,
      state: null,
      result: null,
    };
  }

  private lakeEmpty = false;
  private forcedSpeciesId: string | null = null;

  private snapshot(): LakeSnapshot {
    return {
      mapId: this.map.mapId,
      mapVersion: this.map.mapVersion,
      configVersion: this.config.configVersion,
      serverTime: this.iso(this.nowMs),
      players: [this.myView(), ...this.bots.map((bot) => ({ ...bot }))],
      seats: [...this.seats.values()].map((seat) => this.seatView(seat)),
      myTicket: this.ticket ? this.ticketView(this.ticket) : null,
      mySeat: this.session ? this.mySeatView(this.session) : null,
      myAttempt: this.attempt ? this.attemptView(this.attempt) : null,
      lakeEmpty: this.lakeEmpty,
    };
  }

  /** Công cụ dev (`?mockFish=1`): ép mọi lần cá cắn của người chơi là loài này; null = ngẫu nhiên như thường. */
  setForcedSpecies(speciesId: string | null): void {
    this.forcedSpeciesId = speciesId;
  }

  /** Công cụ dev: thêm vào túi mỗi loài một con (và ghi vào sổ cá) để thử bán cá, sổ tay, bảng xếp hạng. Trả số loài đã thêm. */
  grantAllFish(): number {
    const caughtAt = this.iso(this.nowMs);
    for (const species of this.config.fish) {
      const lengthTenthCm = rollLength(this.config, species, 0, this.random);
      const previous = this.codex.get(species.speciesId);
      this.codex.set(species.speciesId, {
        totalCaught: (previous?.totalCaught ?? 0) + 1,
        bestLengthTenthCm: Math.max(previous?.bestLengthTenthCm ?? 0, lengthTenthCm),
        smallestLengthTenthCm: Math.min(previous?.smallestLengthTenthCm ?? lengthTenthCm, lengthTenthCm),
        firstCaughtAt: previous?.firstCaughtAt ?? caughtAt,
      });
      this.fish.unshift({
        catchId: this.nextId('catch'),
        speciesId: species.speciesId,
        lengthTenthCm,
        caughtAt,
      });
    }
    this.inventoryVersion += 1;
    return this.config.fish.length;
  }

  getForcedSpecies(): string | null {
    return this.forcedSpeciesId;
  }

  /** Danh sách loài trong config để công cụ dev liệt kê. */
  listSpecies(): { speciesId: string; name: string; rarity: string }[] {
    return this.config.fish.map((f) => ({ speciesId: f.speciesId, name: f.name, rarity: f.rarity }));
  }

  /** Giả lập hồ hết cá / có cá lại (Server thật phát LakeStockChanged khi quần thể về 0 hoặc được thả). */
  setLakeEmpty(empty: boolean): void {
    if (this.lakeEmpty === empty) return;
    this.lakeEmpty = empty;
    this.emit('LakeStockChanged', { empty });
  }

  private inventory(): InventoryResponse {
    return {
      inventoryVersion: this.inventoryVersion,
      gold: String(this.gold),
      equippedRodId: this.equippedRodId,
      rods: [...this.rods],
      items: [],
      fish: [...this.fish],
      skins: [...this.skinsOwned],
    };
  }

  private rodStats(): Stats {
    return pickStats(rodById(this.config, this.equippedRodId));
  }

  private totalStats(): Stats {
    return addStats(levelStats(this.config, this.level), this.rodStats());
  }

  // ---------- Hub ----------

  private async handleHub(method: string, arg: unknown): Promise<CommandAck<unknown>> {
    const args = (arg ?? {}) as Record<string, unknown>;
    const requestId = String(args.requestId ?? '');
    const respond = (ok: boolean, data: unknown, error: CommandAck<unknown>['error']) => ({
      requestId,
      ok,
      error,
      data,
    });

    const name = method as HubCommandName;
    const fingerprint = JSON.stringify({ method, args: { ...args, requestId: undefined } });
    const isMoney = name === 'BuyTicket';
    if (isMoney) {
      const receipt = this.hubReceipts.get(requestId);
      if (receipt) {
        if (receipt.fingerprint === fingerprint) return receipt.ack as CommandAck<unknown>;
        return respond(false, null, {
          code: 'IDEMPOTENCY_CONFLICT',
          message: 'requestId đã dùng với tham số khác',
        });
      }
    }

    let ack: CommandAck<unknown>;
    try {
      if (this.forcedError && !NO_FORCED_ERROR.has(name)) throw new CommandError(this.forcedError);
      ack = respond(true, this.runCommand(name, args), null);
    } catch (error) {
      if (error instanceof SocialError) {
        ack = respond(false, null, { code: error.code, message: error.message });
      } else {
        if (!(error instanceof CommandError)) throw error;
        ack = respond(false, null, { code: error.code, message: error.message });
      }
    }
    if (isMoney && ack.ok) this.hubReceipts.set(requestId, { fingerprint, ack });
    return ack;
  }

  private runCommand(name: HubCommandName, args: Record<string, unknown>): unknown {
    switch (name) {
      case 'JoinLake':
        if (Number.isFinite(args.x) && Number.isFinite(args.y)) {
          this.position = {
            x: Number(args.x),
            y: Number(args.y),
            dir: DIRECTIONS.includes(args.dir as Direction)
              ? (args.dir as Direction)
              : this.position.dir,
          };
        }
        return this.snapshot();
      case 'Move':
        return this.commandMove(args);
      case 'BuyTicket':
        return this.commandBuyTicket(args);
      case 'SitDown':
        return this.commandSitDown(args);
      case 'LeaveSeat':
        return this.commandLeave();
      case 'SitRest':
        return this.commandSitRest(args);
      case 'StandRest':
        return this.commandStandRest();
      case 'CastLine':
        return this.commandCast();
      case 'HookFish':
        return this.commandHook(args);
      case 'SubmitFishingResult':
        return this.commandSubmit(args);
      case 'SendChat':
        this.emit('ChatReceived', {
          messageId: this.nextId('msg'),
          playerId: MY_ID,
          displayName: this.displayName,
          text: String(args.text ?? '').trim(),
          sentAt: this.iso(this.nowMs),
        });
        return null;
      case 'SendEmoji':
        return this.commandEmoji(String(args.emojiId ?? ''));
      case 'SendDirectMessage':
        return this.social.sendDirect(args);
      default:
        throw new CommandError('VALIDATION_FAILED', `Mock chưa có lệnh ${String(name)}`);
    }
  }

  /** 16 emoji thường, hoặc icon cá `fish:<loài>` của loài đã câu (giống Server, BOT-02). */
  private commandEmoji(emojiId: string): null {
    const fish = emojiId.startsWith('fish:') ? emojiId.slice(5) : null;
    const allowed = fish ? this.codex.has(fish) : /^emoji_(0[1-9]|1[0-6])$/.test(emojiId);
    if (!allowed) throw new CommandError('VALIDATION_FAILED');
    this.emit('EmojiReceived', { playerId: MY_ID, emojiId });
    return null;
  }

  private commandMove(args: Record<string, unknown>): null {
    const x = Number(args.x);
    const y = Number(args.y);
    const seq = Number(args.seq);
    const dir = args.dir as Direction;
    if (
      !Number.isFinite(x) ||
      !Number.isFinite(y) ||
      !Number.isFinite(seq) ||
      !DIRECTIONS.includes(dir)
    ) {
      throw new CommandError('VALIDATION_FAILED');
    }
    // Giống Server: vị trí do Client báo, không kiểm tra map hay tốc độ.
    const moved = Math.abs(x - this.position.x) > 2 || Math.abs(y - this.position.y) > 2;
    this.position = { x, y, dir };
    // Đi khỏi chỗ ngồi chơi mà chưa báo đứng dậy: Server tự trả chỗ.
    if (moved && this.myRestSeatId) this.commandStandRest();
    return null;
  }

  private seatOf(seatId: string): SeatRuntime {
    const seat = this.seats.get(seatId);
    if (!seat) throw new CommandError('VALIDATION_FAILED', `Không có ghế ${seatId}`);
    return seat;
  }

  private commandBuyTicket(args: Record<string, unknown>): TicketPurchaseResult {
    const quantity = args.quantity;
    if (!Number.isInteger(quantity) || (quantity as number) <= 0) {
      throw new CommandError('INVALID_QUANTITY');
    }
    if (args.expectedPriceVersion !== this.config.ticketPricing.priceVersion) {
      throw new CommandError('PRICE_CHANGED');
    }
    const units = quantity as number;
    const total = units * Number(this.config.ticketPricing.unitPriceGold);
    if (this.gold < total) throw new CommandError('INSUFFICIENT_GOLD');

    const minutes = units * this.config.ticketPricing.billingUnitMinutes;
    this.gold -= total;
    const base =
      this.ticket && this.ticket.expiresAtMs > this.nowMs ? this.ticket.expiresAtMs : this.nowMs;
    this.ticket = {
      expiresAtMs: base + minutes * 60_000,
      purchasedMinutes: (this.ticket?.purchasedMinutes ?? 0) + minutes,
      ticketVersion: (this.ticket?.ticketVersion ?? 0) + 1,
    };
    this.emit('MyTicket', this.ticketView(this.ticket));
    return {
      ticket: this.ticketView(this.ticket),
      gold: String(this.gold),
      chargedGold: String(total),
    };
  }

  private commandSitDown(args: Record<string, unknown>): SitDownResult {
    if (this.session) throw new CommandError('ALREADY_HAS_SEAT');
    if (!this.ticket || this.nowMs >= this.ticket.expiresAtMs) throw new CommandError('NO_TICKET');
    const seat = this.seatOf(String(args.seatId));
    if (seat.state === 'occupied') throw new CommandError('SEAT_TAKEN');
    this.commandStandRest();

    this.session = {
      sessionId: this.nextId('session'),
      seatId: seat.info.seatId,
      startedAtMs: this.nowMs,
    };
    seat.state = 'occupied';
    seat.occupantPlayerId = MY_ID;

    this.emit('SeatChanged', this.seatView(seat));
    this.emit('MySeat', this.mySeatView(this.session));
    return { seat: this.mySeatView(this.session) };
  }

  private commandLeave(): null {
    if (!this.session) throw new CommandError('NOT_IN_SEAT');
    // SPEC 0.9: từ lúc thu cần tới khi có kết quả không được rời ghế.
    if (this.attempt?.phase === 'minigame') throw new CommandError('STATE_CONFLICT');
    this.endSession('left_seat', 'left_seat');
    return null;
  }

  private endSession(sessionReason: string, attemptReason: string): void {
    const session = this.session;
    if (!session) return;
    if (this.attempt) this.finishCancelled(this.attempt, attemptReason);
    const seat = this.seatOf(session.seatId);
    this.session = null;
    seat.state = 'available';
    seat.occupantPlayerId = null;
    this.emit('MySeat', { seatId: seat.info.seatId, ended: true, reason: sessionReason });
    this.emit('SeatChanged', this.seatView(seat));
  }

  private commandCast(): { attemptId: string } {
    if (!this.session) throw new CommandError('NOT_IN_SEAT');
    if (!this.ticket || this.nowMs >= this.ticket.expiresAtMs) throw new CommandError('NO_TICKET');
    if (this.attempt) throw new CommandError('ATTEMPT_ACTIVE');
    const { waitMinMs, waitMaxMs } = this.config.fishing;
    const attempt: AttemptRuntime = {
      attemptId: this.nextId('attempt'),
      phase: 'waiting',
      biteAtMs: this.nowMs + uniformInt(this.random, waitMinMs, waitMaxMs),
      biteDeadlineMs: null,
      species: null,
      minigame: null,
      minigameStartedAtMs: null,
      minigameDeadlineMs: null,
    };
    this.attempt = attempt;
    this.emit('AttemptUpdate', this.attemptView(attempt));
    return { attemptId: attempt.attemptId };
  }

  private toBite(attempt: AttemptRuntime): void {
    attempt.phase = 'bite';
    attempt.species =
      this.config.fish.find((f) => f.speciesId === this.forcedSpeciesId) ??
      pickSpecies(this.config, this.totalStats().rareLuck, this.random);
    attempt.biteDeadlineMs = this.nowMs + this.config.fishing.biteWindowMs;
    this.emit('AttemptUpdate', this.attemptView(attempt));
  }

  private activeAttempt(attemptId: unknown): AttemptRuntime {
    if (!this.attempt || this.attempt.attemptId !== attemptId) {
      throw new CommandError('NO_ACTIVE_ATTEMPT');
    }
    return this.attempt;
  }

  private commandHook(args: Record<string, unknown>): null {
    const attempt = this.activeAttempt(args.attemptId);
    if (attempt.phase !== 'bite') throw new CommandError('STATE_CONFLICT');
    if (this.isBiteExpired(attempt)) {
      this.finishFailed(attempt, 'missed_bite');
      throw new CommandError('BITE_EXPIRED');
    }
    const seed = Math.floor(this.random() * 4294967296) >>> 0;
    const params: MinigameParams = minigameParams(
      this.config,
      attempt.species!,
      this.totalStats(),
      seed,
    );
    attempt.phase = 'minigame';
    attempt.minigame = params;
    // Minigame chạy sau introMs kể từ lúc thu cần, hạn cũng lùi theo (giống Server).
    const startedAtMs = this.nowMs + this.config.minigame.introMs;
    attempt.minigameStartedAtMs = startedAtMs;
    attempt.minigameDeadlineMs =
      startedAtMs + params.durationMs + this.config.minigame.resultGraceMs;
    attempt.biteDeadlineMs = null;
    this.emit('AttemptUpdate', this.attemptView(attempt));
    return null;
  }

  /** Client báo thắng/thua; mỗi attempt chỉ được thưởng một lần dù gửi lặp với requestId khác. */
  private commandSubmit(args: Record<string, unknown>): { attempt: AttemptView } {
    const { outcome } = args;
    if (outcome !== 'success' && outcome !== 'failed') {
      throw new CommandError('VALIDATION_FAILED');
    }
    const settled = this.settled.get(String(args.attemptId));
    if (settled) {
      if (settled.outcome === outcome) return { attempt: settled.view };
      if (settled.expired) throw new CommandError('RESULT_EXPIRED');
      throw new CommandError('STATE_CONFLICT');
    }
    const attempt = this.activeAttempt(args.attemptId);
    if (attempt.phase !== 'minigame') throw new CommandError('STATE_CONFLICT');
    if (this.nowMs > attempt.minigameDeadlineMs!) throw new CommandError('RESULT_EXPIRED');
    return {
      attempt:
        outcome === 'success' ? this.finishSuccess(attempt) : this.finishFailed(attempt, 'timeout'),
    };
  }

  private settle(view: AttemptView): AttemptView {
    this.settled.set(view.attemptId, { outcome: view.phase, view, expired: false });
    this.emit('AttemptUpdate', view);
    return view;
  }

  private recordHistory(
    attempt: AttemptRuntime,
    outcome: HistoryEntry['outcome'],
    reason: string | null,
    lengthTenthCm: number | null,
  ): void {
    this.history.unshift({
      attemptId: attempt.attemptId,
      outcome,
      reason,
      speciesId: outcome === 'success' ? attempt.species!.speciesId : null,
      lengthTenthCm,
      endedAt: this.iso(this.nowMs),
    });
  }

  private finishFailed(attempt: AttemptRuntime, reason: string): AttemptView {
    this.attempt = null;
    this.recordHistory(attempt, 'failed', reason, null);
    const view = this.settle(this.endedView(attempt, 'failed', reason, null));
    // Trượt cá: vẫn ngồi ghế, Client tự câu lại (feedback 2026-11-11); thua minigame thì cả phòng thấy icon buồn.
    if (reason !== 'missed_bite') {
      this.emit('FailShown', {
        playerId: MY_ID,
        shownUntil: this.iso(this.nowMs + this.config.fishing.failShownMs),
      });
    }
    return view;
  }

  private finishCancelled(attempt: AttemptRuntime, reason: string): void {
    this.attempt = null;
    this.recordHistory(attempt, 'cancelled', reason, null);
    this.settle(this.endedView(attempt, 'cancelled', reason, null));
  }

  private endedView(
    attempt: AttemptRuntime,
    phase: 'success' | 'failed' | 'cancelled',
    reason: string | null,
    result: AttemptResult | null,
  ): AttemptView {
    return {
      attemptId: attempt.attemptId,
      phase,
      reason,
      biteDeadlineAt: null,
      minigame: null,
      state: null,
      result,
    };
  }

  private finishSuccess(attempt: AttemptRuntime): AttemptView {
    const species = attempt.species!;
    const largeLuck = this.totalStats().largeLuck;
    const lengthTenthCm = rollLength(this.config, species, largeLuck, this.random);
    const levelBefore = this.level;
    this.exp += species.exp;

    const caughtAt = this.iso(this.nowMs);
    const previous = this.codex.get(species.speciesId);
    const isNew = previous === undefined;
    const isRecord = !isNew && lengthTenthCm > previous.bestLengthTenthCm;
    if (lengthTenthCm >= species.maxTenthCm) this.bumpExtra('giant_fish', 1);
    if (isNew && !this.caughtSpecies.has(species.speciesId)) {
      this.caughtSpecies.add(species.speciesId);
      this.bumpExtra('pioneer', 1);
    }
    this.codex.set(species.speciesId, {
      totalCaught: (previous?.totalCaught ?? 0) + 1,
      bestLengthTenthCm: Math.max(previous?.bestLengthTenthCm ?? 0, lengthTenthCm),
      smallestLengthTenthCm: Math.min(
        previous?.smallestLengthTenthCm ?? lengthTenthCm,
        lengthTenthCm,
      ),
      firstCaughtAt: previous?.firstCaughtAt ?? caughtAt,
    });
    this.fish.unshift({
      catchId: this.nextId('catch'),
      speciesId: species.speciesId,
      lengthTenthCm,
      caughtAt,
    });
    this.dailyLog.push({ speciesId: species.speciesId, lengthTenthCm, caughtAt });
    this.inventoryVersion += 1;
    this.attempt = null;
    this.recordHistory(attempt, 'success', null, lengthTenthCm);

    const view = this.settle(
      this.endedView(attempt, 'success', null, {
        speciesId: species.speciesId,
        rarity: species.rarity,
        lengthTenthCm,
        isNew,
        isRecord,
        expGained: species.exp,
        level: this.level,
        levelUp: this.level > levelBefore,
      }),
    );
    this.emit('CatchShown', {
      playerId: MY_ID,
      speciesId: species.speciesId,
      rarity: species.rarity,
      shownUntil: this.iso(this.nowMs + this.config.fishing.catchShownMs),
    });
    return view;
  }

  // ---------- HTTP ----------

  private json(status: number, body: string): Response {
    return new Response(body, { status, headers: { 'Content-Type': 'application/json' } });
  }

  private errorBody(error: CommandError): { status: number; body: string } {
    return {
      status: HTTP_STATUS[error.code] ?? 400,
      body: JSON.stringify({
        error: { code: error.code, message: error.message, retryable: false },
        traceId: this.nextId('trace'),
      }),
    };
  }

  private async handleHttp(input: string, init: RequestInit): Promise<Response> {
    const url = new URL(input, 'http://mock.local');
    const path = url.pathname.replace(/^\/api\/v1/, '');
    const method = init.method ?? 'GET';
    const headers = (init.headers ?? {}) as Record<string, string>;
    const body = init.body ? (JSON.parse(String(init.body)) as Record<string, unknown>) : {};

    const isAuthRoute = path.startsWith('/auth/');
    const isMutation = method !== 'GET' && !isAuthRoute;
    const key = headers['Idempotency-Key'];
    const fingerprint = `${method} ${path} ${String(init.body ?? '')}`;

    if (isMutation && key) {
      const receipt = this.httpReceipts.get(key);
      if (receipt && receipt.fingerprint !== fingerprint) {
        const failure = this.errorBody(new CommandError('IDEMPOTENCY_CONFLICT'));
        return this.json(failure.status, failure.body);
      }
      if (receipt) return this.json(receipt.status, receipt.body);
    }

    let status = 200;
    let responseBody: string;
    try {
      if (!isAuthRoute && headers.Authorization !== 'Bearer mock-access-token') {
        throw new CommandError('UNAUTHENTICATED');
      }
      if (this.forcedError && isMutation) throw new CommandError(this.forcedError);
      const data = this.route(method, path, body, url.searchParams);
      if (data === undefined) return new Response(null, { status: 204 });
      responseBody = JSON.stringify({ data, traceId: this.nextId('trace') });
    } catch (caught) {
      const error = caught instanceof SocialError ? new CommandError(caught.code) : caught;
      if (!(error instanceof CommandError)) throw error;
      const failure = this.errorBody(error);
      status = failure.status;
      responseBody = failure.body;
    }
    if (isMutation && key && status === 200) {
      this.httpReceipts.set(key, { fingerprint, status, body: responseBody });
    }
    return this.json(status, responseBody);
  }

  private route(
    method: string,
    path: string,
    body: Record<string, unknown>,
    query: URLSearchParams,
  ): unknown {
    switch (`${method} ${path}`) {
      case 'POST /auth/login':
        return this.login();
      case 'POST /auth/refresh':
        if (!this.loggedIn) throw new CommandError('SESSION_EXPIRED');
        return { accessToken: 'mock-access-token', expiresAt: this.iso(this.nowMs + 3600_000) };
      case 'POST /auth/logout':
        this.loggedIn = false;
        return undefined;
      case 'GET /me':
        return this.profile();
      case 'PUT /me/display-name':
        return this.setDisplayName(body.displayName);
      case 'PUT /me/title':
        return this.setTitle(body.titleId);
      case 'PUT /me/bio':
        return this.setBio(body.bio);
      case 'GET /me/showcase':
        return this.showcase();
      case 'PUT /me/showcase':
        return this.setShowcase(body);
      case 'GET /me/achievements':
        return { achievements: this.achievements() };
      case 'POST /me/achievements/claim':
        return this.claimAchievement(body.achievementId);
      case 'POST /dev/achievement-progress':
        return this.devAchievementProgress(body);
      case 'GET /catalog':
        return this.catalog();
      case 'GET /me/progress':
        return this.progress();
      case 'GET /me/inventory':
        return this.inventory();
      case 'PUT /me/equipped-rod':
        return this.equipRod(String(body.rodId));
      case 'GET /skins':
        return this.skinList();
      case 'PUT /me/skin':
        return this.selectSkin(String(body.skinId));
      case 'POST /shop/buy':
        return this.shopBuy(String(body.offerId), body.quantity);
      case 'POST /shop/sell-fish':
        return this.sellFish(body);
      case 'POST /dev/topup':
        return this.devTopUp(String(body.packId));
      case 'POST /dev/announce-catch':
        return this.devAnnounceCatch(body);
      case 'GET /me/codex':
        return this.codexResponse();
      case 'GET /me/history':
        return this.historyPage(query);
      case 'GET /rankings/total-catch-weekly':
        return this.rankingResponse(query);
      case 'GET /friends':
        return this.social.list();
      case 'POST /friends/requests':
        return this.social.request(body.playerId);
      case 'GET /me/dm':
        return this.social.conversations();
      case 'GET /trades':
        return this.social.listTrades();
      case 'POST /trades':
        return this.social.createTrade(body);
      default:
        return this.routeWithId(method, path, query);
    }
  }

  /** Đường dẫn có id: hồ sơ công khai, trả lời lời mời, lịch sử tin riêng (BOT-02). */
  private routeWithId(method: string, path: string, query: URLSearchParams): unknown {
    const profile = /^\/players\/([^/]+)\/profile$/.exec(path);
    if (method === 'GET' && profile) return this.publicProfile(decodeURIComponent(profile[1]!));
    const answer = /^\/friends\/requests\/([^/]+)\/(accept|decline)$/.exec(path);
    if (method === 'POST' && answer) {
      const id = decodeURIComponent(answer[1]!);
      return answer[2] === 'accept' ? this.social.accept(id) : this.social.decline(id);
    }
    const daily = /^\/rankings\/daily-fish\/([^/]+)$/.exec(path);
    if (method === 'GET' && daily) {
      return this.dailyFishRanking(decodeURIComponent(daily[1]!), query);
    }
    const trade = /^\/trades\/([^/]+)\/(accept|decline|cancel)$/.exec(path);
    if (method === 'POST' && trade) {
      const id = decodeURIComponent(trade[1]!);
      if (trade[2] === 'accept') return this.social.acceptTrade(id);
      return trade[2] === 'decline' ? this.social.declineTrade(id) : this.social.cancelTrade(id);
    }
    const friendFish = /^\/friends\/([^/]+)\/fish$/.exec(path);
    if (method === 'GET' && friendFish) {
      return this.social.friendFish(decodeURIComponent(friendFish[1]!));
    }
    const friend = /^\/friends\/([^/]+)$/.exec(path);
    if (method === 'DELETE' && friend) return this.social.remove(decodeURIComponent(friend[1]!));
    const dm = /^\/me\/dm\/([^/]+)$/.exec(path);
    if (method === 'GET' && dm) return this.social.history(decodeURIComponent(dm[1]!));
    throw new CommandError('VALIDATION_FAILED', `Mock chưa có ${method} ${path}`);
  }

  /** Hồ sơ công khai: của mình (friendStatus self) hoặc của bot. */
  private publicProfile(playerId: string) {
    if (playerId !== MY_ID) return this.social.publicProfile(playerId);
    return {
      playerId: MY_ID,
      displayName: this.displayName,
      skinId: this.selectedSkinId,
      level: this.level,
      exp: this.exp,
      titleId: this.titleId,
      bio: this.bio,
      showcase: this.showcase().slots,
      online: true,
      friendStatus: 'self' as const,
    };
  }

  private login() {
    const isNew = !this.created;
    this.created = true;
    this.loggedIn = true;
    return {
      accessToken: 'mock-access-token',
      expiresAt: this.iso(this.nowMs + 3600_000),
      isNew,
      player: this.profile(),
    };
  }

  private setDisplayName(value: unknown): PlayerProfile {
    if (typeof value !== 'string' || !NAME_PATTERN.test(value)) {
      throw new CommandError('VALIDATION_FAILED');
    }
    const taken = this.bots.some((b) => b.displayName.toLowerCase() === value.toLowerCase());
    if (taken) throw new CommandError('STATE_CONFLICT');
    this.displayName = value;
    return this.profile();
  }

  private setTitle(value: unknown): PlayerProfile {
    if (typeof value !== 'string' || !TITLES.some((t) => t.id === value)) {
      throw new CommandError('VALIDATION_FAILED');
    }
    this.titleId = value;
    return this.profile();
  }

  private setBio(value: unknown): PlayerProfile {
    if (typeof value !== 'string' || [...value].length > BIO_MAX) {
      throw new CommandError('VALIDATION_FAILED');
    }
    this.bio = value;
    return this.profile();
  }

  private showcase(): { slots: ShowcaseSlot[] } {
    return {
      slots: this.showcaseSlots.map((speciesId, slot) => ({
        slot,
        speciesId: speciesId !== null && this.codex.has(speciesId) ? speciesId : null,
        lengthTenthCm:
          speciesId !== null ? (this.codex.get(speciesId)?.bestLengthTenthCm ?? null) : null,
      })),
    };
  }

  /** Đặt loài đã câu vào ô (hiện con dài nhất); null để gỡ. Một loài chỉ ở một ô, giống Server. */
  private setShowcase(body: Record<string, unknown>): { slots: ShowcaseSlot[] } {
    const slot = Number(body.slot);
    const speciesId = body.speciesId ?? null;
    if (!Number.isInteger(slot) || slot < 0 || slot >= this.showcaseSlots.length) {
      throw new CommandError('VALIDATION_FAILED');
    }
    if (speciesId !== null && (typeof speciesId !== 'string' || !this.codex.has(speciesId))) {
      throw new CommandError('VALIDATION_FAILED');
    }
    this.showcaseSlots = this.showcaseSlots.map((id) => (id === speciesId ? null : id));
    this.showcaseSlots[slot] = speciesId;
    return this.showcase();
  }

  private bumpExtra(id: string, amount: number): void {
    this.achievementExtra[id] = (this.achievementExtra[id] ?? 0) + amount;
  }

  /** Bộ đếm thành tựu suy ra từ codex; thời gian ngồi câu mock chưa đếm nên chỉ có qua dev endpoint. */
  private achievementCounters(): AchievementCounters {
    let total = 0;
    let rare = 0;
    let legendary = 0;
    for (const [speciesId, entry] of this.codex) {
      const rarity = this.config.fish.find((f) => f.speciesId === speciesId)?.rarity;
      total += entry.totalCaught;
      if (rarity === 'rare' || rarity === 'epic' || rarity === 'legendary') {
        rare += entry.totalCaught;
      }
      if (rarity === 'legendary') legendary += entry.totalCaught;
    }
    const extra = this.achievementExtra;
    return {
      diligent: total + (extra.diligent ?? 0),
      collector: this.codex.size + (extra.collector ?? 0),
      rare_hunter: rare + (extra.rare_hunter ?? 0),
      legend_lake: legendary + (extra.legend_lake ?? 0),
      giant_fish: extra.giant_fish ?? 0,
      pioneer: extra.pioneer ?? 0,
      merchant: extra.merchant ?? 0,
      persistent: extra.persistent ?? 0,
    };
  }

  private achievements() {
    return achievementEntries(this.achievementCounters(), this.achievementClaimed);
  }

  private claimAchievement(id: unknown) {
    const entry = this.achievements().find((a) => a.id === id);
    if (!entry) throw new CommandError('VALIDATION_FAILED');
    if (nextClaim(entry) === null) throw new CommandError('STATE_CONFLICT');
    this.achievementClaimed[entry.id] = entry.claimedLevels + 1;
    this.gold += entry.rewardGold;
    const updated = this.achievements().find((a) => a.id === id)!;
    return {
      achievement: updated,
      goldAdded: String(entry.rewardGold),
      gold: String(this.gold),
    };
  }

  /** Chỉ để thử giao diện: cộng thẳng vào bộ đếm một thành tựu. */
  private devAchievementProgress(body: Record<string, unknown>) {
    const def = ACHIEVEMENT_DEFS.find((d) => d.id === body.achievementId);
    const amount = Number(body.amount);
    if (!def || !Number.isFinite(amount) || amount <= 0)
      throw new CommandError('VALIDATION_FAILED');
    this.bumpExtra(def.id, Math.floor(amount));
    return { achievements: this.achievements() };
  }

  private catalog() {
    // Theo BE-A-05: trả toàn bộ config trừ khối spawn.
    return Object.fromEntries(Object.entries(this.config).filter(([key]) => key !== 'spawn'));
  }

  private progress() {
    const levelPart = levelStats(this.config, this.level);
    const rod = this.rodStats();
    return {
      level: this.level,
      exp: this.exp,
      expToNext: expToNext(this.config, this.exp),
      stats: addStats(levelPart, rod),
      breakdown: { level: levelPart, rod },
    };
  }

  private equipRod(rodId: string) {
    if (!this.rods.has(rodId)) throw new CommandError('ROD_NOT_OWNED');
    if (this.attempt) throw new CommandError('ATTEMPT_ACTIVE');
    this.equippedRodId = rodId;
    this.emit('RodChanged', { playerId: MY_ID, rodId });
    return { equippedRodId: rodId };
  }

  private shopBuy(offerId: string, quantity: unknown) {
    const offer = this.config.shopOffers.find((o) => o.offerId === offerId);
    if (!offer || quantity !== 1) throw new CommandError('VALIDATION_FAILED');
    const skin = MOCK_SKINS.find((s) => s.skinId === offer.itemId && s.unlock === 'shop');
    if (skin ? this.skinsOwned.has(skin.skinId) : this.rods.has(offer.itemId)) {
      throw new CommandError(skin ? 'SKIN_ALREADY_OWNED' : 'ROD_ALREADY_OWNED');
    }
    if (this.gold < offer.priceGold) throw new CommandError('INSUFFICIENT_GOLD');
    this.gold -= offer.priceGold;
    if (skin) this.skinsOwned.add(skin.skinId);
    else this.rods.add(offer.itemId);
    this.inventoryVersion += 1;
    return { gold: String(this.gold), inventory: this.inventory() };
  }

  private skinList(): SkinsResponse {
    return {
      skins: MOCK_SKINS.map((skin) => ({
        ...skin,
        owned: skin.unlock === 'free' || this.skinsOwned.has(skin.skinId),
      })),
      selectedSkinId: this.selectedSkinId,
    };
  }

  private selectSkin(skinId: string): SelectSkinResponse {
    const skin = MOCK_SKINS.find((s) => s.skinId === skinId);
    if (!skin) throw new CommandError('VALIDATION_FAILED');
    if (skin.unlock === 'shop' && !this.skinsOwned.has(skinId))
      throw new CommandError('SKIN_NOT_OWNED');
    this.selectedSkinId = skinId;
    this.emit('SkinChanged', { playerId: MY_ID, skinId });
    return { selectedSkinId: skinId };
  }

  /** Thông báo khoe cá thử, giống POST /dev/announce-catch của Server bản Development. */
  private devAnnounceCatch(body: Record<string, unknown>) {
    const fish =
      typeof body.speciesId === 'string'
        ? this.config.fish.find((f) => f.speciesId === body.speciesId)
        : this.config.fish[Math.floor(this.random() * this.config.fish.length)];
    if (!fish) throw new CommandError('VALIDATION_FAILED');
    const view = {
      playerId: MY_ID,
      displayName: this.displayName,
      speciesId: fish.speciesId,
      speciesName: fish.name,
      rarity: fish.rarity,
      first: body.first !== false,
      announcedAt: this.iso(this.nowMs),
    };
    this.emit('CatchAnnounced', view);
    return view;
  }

  /** Nạp Gold thử, giống POST /dev/topup của Server bản Development. */
  private devTopUp(packId: string) {
    const pack = TOP_UP_PACKS.find((p) => p.packId === packId);
    if (!pack) throw new CommandError('VALIDATION_FAILED');
    this.gold += pack.gold;
    return { goldAdded: String(pack.gold), gold: String(this.gold) };
  }

  private sellFish(body: Record<string, unknown>) {
    const ids = Array.isArray(body.catchIds) ? (body.catchIds as string[]) : null;
    if (body.all !== true && !ids) throw new CommandError('VALIDATION_FAILED');
    const toSell =
      body.all === true ? this.fish : this.fish.filter((f) => ids!.includes(f.catchId));
    if (ids && toSell.length !== ids.length) throw new CommandError('FISH_NOT_FOUND');
    const earned = toSell.reduce((sum, item) => {
      const species = this.config.fish.find((f) => f.speciesId === item.speciesId);
      return sum + (species?.sellGold ?? 0);
    }, 0);
    const sold = new Set(toSell.map((f) => f.catchId));
    this.fish = this.fish.filter((f) => !sold.has(f.catchId));
    this.gold += earned;
    this.bumpExtra('merchant', earned);
    this.inventoryVersion += 1;
    return { soldCount: sold.size, goldEarned: String(earned), gold: String(this.gold) };
  }

  private codexResponse(): { species: CodexEntry[] } {
    return {
      species: this.config.fish.map((fish) => {
        const entry = this.codex.get(fish.speciesId);
        return {
          speciesId: fish.speciesId,
          discovered: entry !== undefined,
          totalCaught: entry?.totalCaught ?? 0,
          bestLengthTenthCm: entry?.bestLengthTenthCm ?? null,
          firstCaughtAt: entry?.firstCaughtAt ?? null,
          smallestLengthTenthCm: entry?.smallestLengthTenthCm ?? null,
        };
      }),
    };
  }

  /**
   * BXH cá ngày mock (cùng luật Server): top 10 người chơi, mỗi người con tốt nhất. Có 12 người giả với con
   * rải đều từ 0h giờ VN tới hiện tại, cộng các con mình đã câu hôm nay (tính cả đã bán/đổi).
   */
  private dailyFishRanking(speciesId: string, query: URLSearchParams): DailyFishRanking {
    const metric = query.get('metric') ?? 'length';
    const species = this.config.fish.find((f) => f.speciesId === speciesId);
    if (!species || (metric !== 'length' && metric !== 'earliest')) {
      throw new CommandError('VALIDATION_FAILED');
    }
    const vn = 7 * 3_600_000;
    const dayStart = Math.floor((this.nowMs + vn) / 86_400_000) * 86_400_000 - vn;
    const names = pickBotNames(12, () => 0.5, [this.displayName]);
    const span = Math.max(1, this.nowMs - dayStart);
    // Người giả cố định theo loài: chiều dài và giờ câu suy ra từ chỉ số, không dùng random để bảng ổn định.
    const seed = [...speciesId].reduce((sum, ch) => sum + ch.charCodeAt(0), 0);
    const rows = names.map((name, index) => ({
      playerId: `bot-daily-${index + 1}`,
      displayName: name,
      lengthTenthCm: Math.round(
        species.minTenthCm +
          ((species.maxTenthCm - species.minTenthCm) * ((seed * 7 + index * 37) % 100)) / 100,
      ),
      caughtAt: new Date(
        dayStart + Math.floor((span * (((seed + index * 13) % 97) + 1)) / 98),
      ).toISOString(),
    }));
    for (const mine of this.dailyLog) {
      if (mine.speciesId !== speciesId || Date.parse(mine.caughtAt) < dayStart) continue;
      rows.push({ playerId: MY_ID, displayName: this.displayName, ...mine });
    }
    const order = (a: (typeof rows)[number], b: (typeof rows)[number]) =>
      metric === 'length'
        ? b.lengthTenthCm - a.lengthTenthCm || Date.parse(a.caughtAt) - Date.parse(b.caughtAt)
        : Date.parse(a.caughtAt) - Date.parse(b.caughtAt) || b.lengthTenthCm - a.lengthTenthCm;
    const seen = new Set<string>();
    const best = [...rows]
      .sort(order)
      .filter((row) => !seen.has(row.playerId) && seen.add(row.playerId));
    const entry = (row: (typeof rows)[number], index: number): DailyFishEntry => ({
      rank: index < 10 ? index + 1 : null,
      ...row,
    });
    const mineIndex = best.findIndex((row) => row.playerId === MY_ID);
    return {
      speciesId,
      metric,
      periodStartsAt: new Date(dayStart).toISOString(),
      periodEndsAt: new Date(dayStart + 86_400_000).toISOString(),
      items: best.slice(0, 10).map(entry),
      me: mineIndex < 0 ? null : entry(best[mineIndex]!, mineIndex),
    };
  }

  /**
   * Bảng "tổng số cá trong tuần" mock (contract dự thảo SOC-07): 20 bot giảm dần, người chơi xếp theo số cá
   * đã câu thật (tổng codex). Chưa câu con nào thì chưa vào bảng (rank/value/reward = null).
   */
  private rankingResponse(query: URLSearchParams): RankingResponse {
    const limit = Math.max(1, Math.min(50, Number(query.get('limit')) || 20));
    const skip = Math.max(0, Number(query.get('cursor')) || 0);
    // Thưởng bảng tuần theo doc/GAMEPLAY_SCOPE.md: 1..5 = 400/300/250/200/150, 6–10 = 100, 11–20 = 75, 21–50 = 50.
    const rewards = [400, 300, 250, 200, 150, 100, 100, 100, 100, 100];
    const rewardOf = (rank: number) =>
      rank > 50 ? null : String(rewards[rank - 1] ?? (rank <= 20 ? 75 : 50));
    const botNames = pickBotNames(55, () => 0.5, [this.displayName]);
    const rows = botNames.map((name, index) => ({
      playerId: `bot-rank-${index + 1}`,
      displayName: name,
      value: 1400 - index * 24,
    }));
    let mine = 0;
    for (const entry of this.codex.values()) mine += entry.totalCaught;
    if (mine > 0) rows.push({ playerId: MY_ID, displayName: this.displayName, value: mine });
    rows.sort((a, b) => b.value - a.value);
    const ranked: RankingEntry[] = rows.map((row, index) => ({
      rank: index + 1,
      playerId: row.playerId,
      displayName: row.displayName,
      value: row.value,
      reward: rewardOf(index + 1),
    }));
    const mineRanked = ranked.find((entry) => entry.playerId === MY_ID);
    // Ngoài top 50 thì không có hạng/thưởng nhưng điểm vẫn có (như Server thật).
    const me: RankingEntry =
      mineRanked && mineRanked.rank !== null && mineRanked.rank <= 50
        ? mineRanked
        : {
            rank: null,
            playerId: MY_ID,
            displayName: this.displayName,
            value: mine > 0 ? mine : null,
            reward: null,
          };
    const maxPage = Math.min(limit, 50 - skip);
    const items = ranked.slice(skip, skip + maxPage);
    const nextCursor =
      items.length === maxPage && skip + maxPage < 50 ? String(skip + maxPage) : null;
    const vn = new Date(this.nowMs + 7 * 3_600_000);
    const daysToMonday = 7 - ((vn.getUTCDay() + 6) % 7);
    const endsVn = Date.UTC(vn.getUTCFullYear(), vn.getUTCMonth(), vn.getUTCDate() + daysToMonday);
    return {
      boardId: 'total-catch-weekly',
      updatedAt: this.iso(this.nowMs),
      periodEndsAt: this.iso(endsVn - 7 * 3_600_000),
      items,
      nextCursor,
      me,
    };
  }

  private historyPage(query: URLSearchParams) {
    const start = Number(query.get('cursor') ?? 0);
    const limit = Number(query.get('limit') ?? 20);
    const items = this.history.slice(start, start + limit);
    const next = start + limit;
    return { items, nextCursor: next < this.history.length ? String(next) : null };
  }
}
