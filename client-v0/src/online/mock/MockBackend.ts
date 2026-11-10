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
  PlayerView,
  SeatView,
  SitDownResult,
  Stats,
  TicketPurchaseResult,
} from '../net/contract';
import type { HubConnectionLike, HubHandler } from '../net/GameHub';
import { canStand, inLakeArea, type LakeMap, type LakeSeat } from '../scenes/lake/walkable';
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
  PRICE_CHANGED: 409,
  STATE_CONFLICT: 409,
  INSUFFICIENT_GOLD: 422,
  ROD_NOT_OWNED: 422,
  NOT_IN_SEAT: 422,
  RATE_LIMITED: 429,
};

const MY_ID = '11111111-1111-4111-8111-111111111111';
const TICK_MS = 100;
const BOT_MOVE_EVERY_MS = 600;
const BOT_STEP_PX = 16;
const BOT_CATCH_CHANCE = 0.02;
const SCALE_BROADCAST_EVERY_MS = 1000;
const NO_FORCED_ERROR: ReadonlySet<HubCommandName> = new Set(['JoinLake', 'Move']);
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
  private exp = 0;
  private gold: number;
  private equippedRodId: string;
  private readonly rods: Set<string>;
  private fish: FishItem[] = [];
  private inventoryVersion = 1;
  private readonly codex = new Map<string, CodexRuntime>();
  private readonly history: HistoryEntry[] = [];
  private position: { x: number; y: number; dir: Direction };
  private lastMoveSeq = 0;
  private readonly seats = new Map<string, SeatRuntime>();
  private session: SessionRuntime | null = null;
  private ticket: TicketRuntime | null = null;
  private attempt: AttemptRuntime | null = null;
  private readonly settled = new Map<string, SettledAttempt>();
  private readonly bots: PlayerView[] = [];
  private readonly handlers = new Map<string, Set<HubHandler>>();
  private connected = false;
  private readonly httpReceipts = new Map<string, IdempotentReceipt>();
  private readonly hubReceipts = new Map<string, { fingerprint: string; ack: unknown }>();
  private seatTimeScale = 1;
  private botTimerMs = 0;
  private broadcastTimerMs = 0;
  private realtimeHandle: ReturnType<typeof setInterval> | null = null;

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
    this.createBots(options.botCount ?? 3);
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
    this.moveBots(dt);
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
    spots.forEach((seat, index) => {
      this.bots.push({
        playerId: `bot-${index + 1}`,
        displayName: `Bot ${index + 1}`,
        skinId: 'skin_01',
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
    if (this.botTimerMs < BOT_MOVE_EVERY_MS) return;
    this.botTimerMs = 0;
    const directions: { dir: Direction; dx: number; dy: number }[] = [
      { dir: 'up', dx: 0, dy: -BOT_STEP_PX },
      { dir: 'down', dx: 0, dy: BOT_STEP_PX },
      { dir: 'left', dx: -BOT_STEP_PX, dy: 0 },
      { dir: 'right', dx: BOT_STEP_PX, dy: 0 },
    ];
    for (const bot of this.bots) {
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
    }
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
      selectedSkinId: 'skin_01',
      equippedRodId: this.equippedRodId,
    };
  }

  private myView(): PlayerView {
    return {
      playerId: MY_ID,
      displayName: this.displayName,
      skinId: 'skin_01',
      rodId: this.equippedRodId,
      x: this.position.x,
      y: this.position.y,
      dir: this.position.dir,
      seatId: this.session?.seatId ?? null,
      fishing: this.attempt !== null,
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
    };
  }

  private inventory(): InventoryResponse {
    return {
      inventoryVersion: this.inventoryVersion,
      gold: String(this.gold),
      equippedRodId: this.equippedRodId,
      rods: [...this.rods],
      items: [],
      fish: [...this.fish],
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
      if (!(error instanceof CommandError)) throw error;
      ack = respond(false, null, { code: error.code, message: error.message });
    }
    if (isMoney && ack.ok) this.hubReceipts.set(requestId, { fingerprint, ack });
    return ack;
  }

  private runCommand(name: HubCommandName, args: Record<string, unknown>): unknown {
    switch (name) {
      case 'JoinLake':
        return this.snapshot();
      case 'Move':
        return this.commandMove(args);
      case 'BuyTicket':
        return this.commandBuyTicket(args);
      case 'SitDown':
        return this.commandSitDown(args);
      case 'LeaveSeat':
        return this.commandLeave();
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
          text: String(args.text ?? ''),
        });
        return null;
      case 'SendEmoji':
        this.emit('EmojiReceived', { playerId: MY_ID, emojiId: String(args.emojiId ?? '') });
        return null;
      default:
        throw new CommandError('VALIDATION_FAILED', `Mock chưa có lệnh ${String(name)}`);
    }
  }

  private commandMove(args: Record<string, unknown>): null {
    const x = Number(args.x);
    const y = Number(args.y);
    const seq = Number(args.seq);
    const dir = args.dir as Direction;
    if (!this.isMoveAllowed(x, y)) {
      this.emit('PositionCorrected', { x: this.position.x, y: this.position.y, seq });
      return null;
    }
    this.position = { x, y, dir };
    return null;
  }

  private isMoveAllowed(x: number, y: number): boolean {
    if (this.attempt) return false;
    if (!canStand(this.map, x, y) || !inLakeArea(this.map, x, y)) return false;
    if (!this.session) return true;
    const { info } = this.seatOf(this.session.seatId);
    return Math.hypot(x - info.x, y - info.y) <= info.roamRadius;
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

    this.session = {
      sessionId: this.nextId('session'),
      seatId: seat.info.seatId,
      startedAtMs: this.nowMs,
    };
    seat.state = 'occupied';
    seat.occupantPlayerId = MY_ID;

    // Đưa nhân vật về ghế để phạm vi roamRadius tính từ đúng vị trí.
    this.position = { x: seat.info.x, y: seat.info.y, dir: this.position.dir };
    this.emit('PositionCorrected', { x: seat.info.x, y: seat.info.y, seq: 0 });
    this.emit('SeatChanged', this.seatView(seat));
    this.emit('MySeat', this.mySeatView(this.session));
    return { seat: this.mySeatView(this.session) };
  }

  private commandLeave(): null {
    if (!this.session) throw new CommandError('NOT_IN_SEAT');
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
    attempt.species = pickSpecies(this.config, this.totalStats().rareLuck, this.random);
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
    attempt.minigameStartedAtMs = this.nowMs;
    attempt.minigameDeadlineMs =
      this.nowMs + params.durationMs + this.config.minigame.resultGraceMs;
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
    this.emit('FailShown', {
      playerId: MY_ID,
      shownUntil: this.iso(this.nowMs + this.config.fishing.failShownMs),
    });
    return this.settle(this.endedView(attempt, 'failed', reason, null));
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
    this.codex.set(species.speciesId, {
      totalCaught: (previous?.totalCaught ?? 0) + 1,
      bestLengthTenthCm: Math.max(previous?.bestLengthTenthCm ?? 0, lengthTenthCm),
      firstCaughtAt: previous?.firstCaughtAt ?? caughtAt,
    });
    this.fish.unshift({
      catchId: this.nextId('catch'),
      speciesId: species.speciesId,
      lengthTenthCm,
      caughtAt,
    });
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
    } catch (error) {
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
      case 'GET /catalog':
        return this.catalog();
      case 'GET /me/progress':
        return this.progress();
      case 'GET /me/inventory':
        return this.inventory();
      case 'PUT /me/equipped-rod':
        return this.equipRod(String(body.rodId));
      case 'POST /shop/buy':
        return this.shopBuy(String(body.offerId), body.quantity);
      case 'POST /shop/sell-fish':
        return this.sellFish(body);
      case 'GET /me/codex':
        return this.codexResponse();
      case 'GET /me/history':
        return this.historyPage(query);
      default:
        throw new CommandError('VALIDATION_FAILED', `Mock chưa có ${method} ${path}`);
    }
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
    return { equippedRodId: rodId };
  }

  private shopBuy(offerId: string, quantity: unknown) {
    const offer = this.config.shopOffers.find((o) => o.offerId === offerId);
    if (!offer || quantity !== 1) throw new CommandError('VALIDATION_FAILED');
    if (this.rods.has(offer.itemId)) throw new CommandError('ROD_ALREADY_OWNED');
    if (this.gold < offer.priceGold) throw new CommandError('INSUFFICIENT_GOLD');
    this.gold -= offer.priceGold;
    this.rods.add(offer.itemId);
    this.inventoryVersion += 1;
    return { gold: String(this.gold), inventory: this.inventory() };
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
        };
      }),
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
