// Phần xã hội của mock pier.html (BOT-02), cùng contract Server: kết bạn (bot mời khi đi gần, tự đồng ý khi được
// mời), tin riêng (bot trả lời 2–6 giây, thỉnh thoảng nhắn trước), chat world của bot (cả hồ 20–40 giây một câu,
// chọn câu theo trạng thái), icon cá và hồ sơ công khai. MockBackend giữ bot và gọi vào đây mỗi nhịp.
// Hoàn tất với mock không đồng nghĩa đã tích hợp Server thật.
import type { FishConfig, GameplayConfig } from '../core/gameplayConfig';
import {
  TRADE_MAX_FISH,
  type Conversation,
  type DirectMessage,
  type FishItem,
  type FriendEntry,
  type FriendFishResponse,
  type FriendRequestEntry,
  type FriendRequestResult,
  type FriendsResponse,
  type HubEvents,
  type PlayerView,
  type PublicProfile,
  type ShowcaseSlot,
  type TradeEntry,
  type TradeFish,
  type TradeResult,
  type TradesResponse,
} from '../net/contract';
import { TITLES } from '../ui/profile/profileModel';
import { levelForExp, rollLength, uniformInt, type Random } from './rules';
import {
  BOT_INVITE_RADIUS_PX,
  pickBotChat,
  pickNormalChat,
  pickSuccessChat,
  BOT_CONTENT,
  type BotChatState,
} from './botSocial';

export class SocialError extends Error {
  constructor(
    readonly code:
      | 'VALIDATION_FAILED'
      | 'NOT_FRIENDS'
      | 'PLAYER_NOT_FOUND'
      | 'STATE_CONFLICT'
      | 'RATE_LIMITED'
      | 'FISH_NOT_FOUND'
      | 'TRADE_NOT_FOUND'
      | 'TRADE_LIMIT_REACHED',
  ) {
    super(code);
  }
}

interface BotProfile {
  titleId: string;
  bio: string;
  exp: number;
  /** Con dài nhất theo loài bot đã câu (ô cá khoe tự cập nhật). */
  best: Map<string, number>;
}

export interface MockSocialHost {
  config: GameplayConfig;
  random: Random;
  now: () => number;
  emit: <K extends keyof HubEvents>(event: K, payload: HubEvents[K]) => void;
  /** Bot đang có trong hồ. */
  bots: () => readonly PlayerView[];
  botState: (botId: string) => BotChatState;
  me: () => { playerId: string; displayName: string; x: number; y: number };
  /** Túi cá của mình (chưa bán). */
  myFish: () => readonly FishItem[];
  /** Đổi cá: bỏ `giveIds` khỏi túi mình, thêm `receive` vào túi (tăng inventoryVersion). */
  swapFish: (giveIds: string[], receive: FishItem[]) => void;
}

const TRADE_PENDING_MAX = 10;
const BOT_TRADE_EVERY_MS = 3 * 60_000;
const BOT_FISH_COUNT = 5;

const CHAT_MAX = 160;
const DM_GAP_MS = 2000;
const DM_LOG_LIMIT = 100;
const BOT_DM_EVERY_MS = 10 * 60_000;
const INVITE_SCAN_MS = 2000;

export class MockSocial {
  private readonly profiles = new Map<string, BotProfile>();
  private readonly friends = new Set<string>();
  /** Lời mời bot gửi mình đang chờ: botId → lúc gửi. */
  private readonly incoming = new Map<string, number>();
  private readonly outgoing = new Set<string>();
  /** Bot đã từng mời mình (mỗi cặp một lần). */
  private readonly invitedBy = new Set<string>();
  private readonly dms = new Map<string, DirectMessage[]>();
  private readonly lastBotDm = new Map<string, number>();
  private readonly timers: { dueMs: number; run: () => void }[] = [];
  private idCounter = 0;
  private lastMyDmMs = -Infinity;
  private nextWorldChatMs: number;
  private nextEmojiMs: number;
  private nextBotDmMs: number;
  private nextInviteScanMs: number;
  private lastBotChatMs = -Infinity;
  /** Cá của từng bot (tạo lười lần đầu xem), đổi tay khi trade thành công. */
  private readonly botFish = new Map<string, FishItem[]>();
  /** Đề nghị đang chờ, cả đến lẫn đi. */
  private readonly trades = new Map<string, TradeEntry>();
  private nextBotTradeMs: number;

  constructor(private readonly host: MockSocialHost) {
    const now = host.now();
    this.nextWorldChatMs = now + this.between(20_000, 40_000);
    this.nextEmojiMs = now + this.between(25_000, 50_000);
    this.nextBotDmMs = now + this.between(60_000, 120_000);
    this.nextInviteScanMs = now + INVITE_SCAN_MS;
    this.nextBotTradeMs = now + BOT_TRADE_EVERY_MS;
  }

  private between(min: number, max: number): number {
    return uniformInt(this.host.random, min, max);
  }

  private iso(ms: number): string {
    return new Date(ms).toISOString();
  }

  private later(delayMs: number, run: () => void): void {
    this.timers.push({ dueMs: this.host.now() + delayMs, run });
  }

  /** Hồ sơ cố định của bot: danh hiệu, lời nhắn (một câu "Chat bình thường"), EXP khởi điểm. */
  profileOf(botId: string): BotProfile {
    let profile = this.profiles.get(botId);
    if (!profile) {
      const index = [...botId].reduce((sum, ch) => sum + ch.charCodeAt(0), 0);
      profile = {
        titleId: TITLES[index % TITLES.length]!.id,
        bio: BOT_CONTENT.normalChat[(index * 7) % BOT_CONTENT.normalChat.length]!,
        exp: (index % 9) * 40,
        best: new Map(),
      };
      this.profiles.set(botId, profile);
    }
    return profile;
  }

  private bot(botId: string): PlayerView | undefined {
    return this.host.bots().find((bot) => bot.playerId === botId);
  }

  private botEntry(bot: PlayerView): FriendEntry {
    return {
      playerId: bot.playerId,
      displayName: bot.displayName,
      skinId: bot.skinId,
      level: levelForExp(this.host.config, this.profileOf(bot.playerId).exp),
      online: true,
    };
  }

  // ---------- Nhịp ----------

  tick(): void {
    const now = this.host.now();
    const due = this.timers.filter((timer) => timer.dueMs <= now);
    if (due.length > 0) {
      const keep = this.timers.filter((timer) => timer.dueMs > now);
      this.timers.length = 0;
      this.timers.push(...keep);
      for (const timer of due) timer.run();
    }
    if (this.host.bots().length === 0) return;
    if (now >= this.nextWorldChatMs) this.worldChatOnce();
    if (now >= this.nextEmojiMs) this.emojiOnce();
    if (now >= this.nextInviteScanMs) {
      this.nextInviteScanMs = now + INVITE_SCAN_MS;
      this.inviteNearbyOnce();
    }
    if (now >= this.nextBotDmMs) {
      this.nextBotDmMs = now + this.between(60_000, 120_000);
      this.botDirectOnce();
    }
    if (now >= this.nextBotTradeMs) {
      this.nextBotTradeMs = now + BOT_TRADE_EVERY_MS;
      this.botTradeOnce();
    }
  }

  /** Một câu chat world của một bot bất kỳ theo trạng thái; câu kế sau 20–40 giây. */
  worldChatOnce(): string | null {
    const now = this.host.now();
    this.nextWorldChatMs = now + this.between(20_000, 40_000);
    const bots = this.host.bots();
    if (bots.length === 0) return null;
    const bot = bots[Math.floor(this.host.random() * bots.length)]!;
    this.say(bot, pickBotChat(this.host.botState(bot.playerId), this.host.random));
    return bot.playerId;
  }

  private say(bot: PlayerView, text: string): void {
    const now = this.host.now();
    this.lastBotChatMs = now;
    this.host.emit('ChatReceived', {
      messageId: this.nextId('msg'),
      playerId: bot.playerId,
      displayName: bot.displayName,
      text,
      sentAt: this.iso(now),
    });
  }

  private emojiOnce(): void {
    this.nextEmojiMs = this.host.now() + this.between(25_000, 50_000);
    const bots = this.host.bots();
    const bot = bots[Math.floor(this.host.random() * bots.length)];
    if (!bot) return;
    const caught = [...this.profileOf(bot.playerId).best.keys()];
    const emojiId =
      caught.length > 0 && this.host.random() < 0.5
        ? `fish:${caught[Math.floor(this.host.random() * caught.length)]!}`
        : `emoji_${String(1 + Math.floor(this.host.random() * 16)).padStart(2, '0')}`;
    this.host.emit('EmojiReceived', { playerId: bot.playerId, emojiId });
  }

  /** Bot câu được cá: cập nhật ô khoe/EXP; thường nói câu "câu thành công", đôi khi thả icon loài đó. */
  onBotCaught(bot: PlayerView, fish: FishConfig): void {
    const profile = this.profileOf(bot.playerId);
    const length = rollLength(this.host.config, fish, 0, this.host.random);
    profile.best.set(fish.speciesId, Math.max(profile.best.get(fish.speciesId) ?? 0, length));
    profile.exp += fish.exp;
    const now = this.host.now();
    if (this.host.random() < 0.6 && now - this.lastBotChatMs >= 5000) {
      this.say(bot, pickSuccessChat(this.host.random));
      this.nextWorldChatMs = Math.max(this.nextWorldChatMs, now + this.between(20_000, 40_000));
    }
    if (this.host.random() < 0.3) {
      this.host.emit('EmojiReceived', {
        playerId: bot.playerId,
        emojiId: `fish:${fish.speciesId}`,
      });
    }
  }

  // ---------- Kết bạn ----------

  /** Bot đứng gần mình (≤ 80 px), chưa là bạn, chưa từng mời: gửi lời mời (tối đa một lời mỗi lần quét). */
  inviteNearbyOnce(): string | null {
    const me = this.host.me();
    for (const bot of this.host.bots()) {
      const id = bot.playerId;
      if (this.friends.has(id) || this.invitedBy.has(id)) continue;
      if (Math.hypot(bot.x - me.x, bot.y - me.y) > BOT_INVITE_RADIUS_PX) continue;
      this.invitedBy.add(id);
      if (this.outgoing.has(id)) {
        this.makeFriends(id);
        return id;
      }
      const sentAt = this.host.now();
      this.incoming.set(id, sentAt);
      this.host.emit('FriendRequestReceived', { ...this.requestEntry(bot, sentAt) });
      return id;
    }
    return null;
  }

  private requestEntry(bot: PlayerView, sentAt: number): FriendRequestEntry {
    const entry = this.botEntry(bot);
    return {
      playerId: entry.playerId,
      displayName: entry.displayName,
      skinId: entry.skinId,
      level: entry.level,
      sentAt: this.iso(sentAt),
    };
  }

  private makeFriends(botId: string): void {
    this.friends.add(botId);
    this.incoming.delete(botId);
    this.outgoing.delete(botId);
    const bot = this.bot(botId);
    if (bot) this.host.emit('FriendAdded', this.botEntry(bot));
  }

  /** Xoá bạn: giống Server, báo FriendRemoved; chưa là bạn thì NOT_FRIENDS. */
  remove(playerId: string): FriendRequestResult {
    if (!this.friends.delete(playerId)) throw new SocialError('NOT_FRIENDS');
    this.host.emit('FriendRemoved', { playerId });
    return { status: 'none' };
  }

  list(): FriendsResponse {
    const bots = this.host.bots();
    return {
      friends: bots
        .filter((bot) => this.friends.has(bot.playerId))
        .map((bot) => this.botEntry(bot)),
      incoming: [...this.incoming]
        .map(([id, at]) => ({ bot: bots.find((b) => b.playerId === id), at }))
        .filter((row): row is { bot: PlayerView; at: number } => row.bot !== undefined)
        .map((row) => this.requestEntry(row.bot, row.at)),
      outgoing: [...this.outgoing],
    };
  }

  /** Mình mời bot: bot tự đồng ý sau 2–5 giây. Bot đã mời mình trước thì thành bạn luôn. */
  request(playerId: unknown): FriendRequestResult {
    if (typeof playerId !== 'string' || playerId === this.host.me().playerId) {
      throw new SocialError('VALIDATION_FAILED');
    }
    if (!this.bot(playerId)) throw new SocialError('PLAYER_NOT_FOUND');
    if (this.friends.has(playerId)) return { status: 'friends' };
    if (this.incoming.has(playerId)) {
      this.makeFriends(playerId);
      return { status: 'friends' };
    }
    if (!this.outgoing.has(playerId)) {
      this.outgoing.add(playerId);
      this.later(this.between(2000, 5000), () => {
        if (this.outgoing.has(playerId)) this.makeFriends(playerId);
      });
    }
    return { status: 'sent' };
  }

  accept(playerId: string): FriendRequestResult {
    if (!this.incoming.has(playerId)) throw new SocialError('STATE_CONFLICT');
    this.makeFriends(playerId);
    return { status: 'friends' };
  }

  decline(playerId: string): FriendRequestResult {
    if (!this.incoming.delete(playerId)) throw new SocialError('STATE_CONFLICT');
    return { status: 'none' };
  }

  // ---------- Tin riêng ----------

  private push(other: string, message: DirectMessage): void {
    const list = [...(this.dms.get(other) ?? []), message].slice(-DM_LOG_LIMIT);
    this.dms.set(other, list);
    this.host.emit('DirectMessageReceived', message);
  }

  sendDirect(args: Record<string, unknown>): DirectMessage {
    const to = String(args.toPlayerId ?? '');
    const text = String(args.text ?? '').trim();
    if (!text || text.length > CHAT_MAX || to === this.host.me().playerId) {
      throw new SocialError('VALIDATION_FAILED');
    }
    if (!this.friends.has(to)) throw new SocialError('NOT_FRIENDS');
    const now = this.host.now();
    if (now - this.lastMyDmMs < DM_GAP_MS) throw new SocialError('RATE_LIMITED');
    this.lastMyDmMs = now;
    const me = this.host.me();
    const message: DirectMessage = {
      messageId: this.nextId('dm'),
      fromPlayerId: me.playerId,
      toPlayerId: to,
      fromName: me.displayName,
      text,
      sentAt: this.iso(now),
    };
    this.push(to, message);
    // Bot trả lời sau 2–6 giây bằng một câu "Chat bình thường".
    this.later(this.between(2000, 6000), () => this.botDirect(to));
    return message;
  }

  private botDirect(botId: string): void {
    const bot = this.bot(botId);
    if (!bot) return;
    const me = this.host.me();
    this.lastBotDm.set(botId, this.host.now());
    this.push(botId, {
      messageId: this.nextId('dm'),
      fromPlayerId: botId,
      toPlayerId: me.playerId,
      fromName: bot.displayName,
      text: pickNormalChat(this.host.random),
      sentAt: this.iso(this.host.now()),
    });
  }

  /** Thỉnh thoảng một bot bạn bè đang ở hồ nhắn trước; mỗi bot tối đa 1 tin / 10 phút. */
  botDirectOnce(): string | null {
    const now = this.host.now();
    const candidates = this.host
      .bots()
      .filter((bot) => this.friends.has(bot.playerId))
      .filter((bot) => now - (this.lastBotDm.get(bot.playerId) ?? -Infinity) >= BOT_DM_EVERY_MS);
    const bot = candidates[Math.floor(this.host.random() * candidates.length)];
    if (!bot) return null;
    this.botDirect(bot.playerId);
    return bot.playerId;
  }

  conversations(): { conversations: Conversation[] } {
    const bots = this.host.bots();
    return {
      conversations: [...this.dms]
        .map(([other, list]) => ({ other, last: list[list.length - 1]! }))
        .sort((a, b) => Date.parse(b.last.sentAt) - Date.parse(a.last.sentAt))
        .map(({ other, last }) => {
          const bot = bots.find((b) => b.playerId === other);
          return {
            playerId: other,
            displayName: bot?.displayName ?? last.fromName,
            skinId: bot?.skinId ?? 'skin_01',
            online: Boolean(bot),
            lastText: last.text,
            lastFromPlayerId: last.fromPlayerId,
            lastAt: last.sentAt,
          };
        }),
    };
  }

  history(otherId: string): { messages: DirectMessage[] } {
    return { messages: [...(this.dms.get(otherId) ?? [])].slice(-50) };
  }

  // ---------- Trao đổi cá ----------

  private botFishOf(botId: string): FishItem[] {
    let list = this.botFish.get(botId);
    if (!list) {
      const fish = this.host.config.fish;
      list = Array.from({ length: BOT_FISH_COUNT }, () => {
        const species = fish[Math.floor(this.host.random() * fish.length)]!;
        return {
          catchId: this.nextId('catch'),
          speciesId: species.speciesId,
          lengthTenthCm: rollLength(this.host.config, species, 0, this.host.random),
          caughtAt: this.iso(this.host.now()),
        };
      });
      this.botFish.set(botId, list);
    }
    return list;
  }

  private static tradeFish(item: FishItem): TradeFish {
    return { catchId: item.catchId, speciesId: item.speciesId, lengthTenthCm: item.lengthTenthCm };
  }

  /** Cá của bot bạn bè để chọn khi đổi (giống GET /friends/{id}/fish). */
  friendFish(playerId: string): FriendFishResponse {
    if (!this.friends.has(playerId)) throw new SocialError('NOT_FRIENDS');
    return { playerId, fish: this.botFishOf(playerId).map(MockSocial.tradeFish) };
  }

  listTrades(): TradesResponse {
    const all = [...this.trades.values()].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
    const me = this.host.me().playerId;
    return {
      incoming: all.filter((trade) => trade.toPlayerId === me),
      outgoing: all.filter((trade) => trade.fromPlayerId === me),
    };
  }

  /** Mình đề nghị bot: cùng luật Server (bạn bè, 1–5 con mỗi bên, không trùng, cá phải còn). Bot trả lời sau 3–8 giây. */
  createTrade(body: Record<string, unknown>): TradeEntry {
    const me = this.host.me();
    const toId = typeof body.toPlayerId === 'string' ? body.toPlayerId : '';
    const ids = (value: unknown): string[] | null =>
      Array.isArray(value) && value.every((id) => typeof id === 'string')
        ? [...new Set(value as string[])]
        : null;
    const offer = ids(body.offerCatchIds);
    const request = ids(body.requestCatchIds);
    if (
      !offer ||
      !request ||
      toId === me.playerId ||
      offer.length < 1 ||
      offer.length > TRADE_MAX_FISH ||
      request.length < 1 ||
      request.length > TRADE_MAX_FISH ||
      offer.some((id) => request.includes(id))
    ) {
      throw new SocialError('VALIDATION_FAILED');
    }
    if (!this.friends.has(toId)) throw new SocialError('NOT_FRIENDS');
    const pending = [...this.trades.values()].filter((t) => t.fromPlayerId === me.playerId).length;
    if (pending >= TRADE_PENDING_MAX) throw new SocialError('TRADE_LIMIT_REACHED');
    const mine = new Map(this.host.myFish().map((fish) => [fish.catchId, fish]));
    const theirs = new Map(this.botFishOf(toId).map((fish) => [fish.catchId, fish]));
    if (offer.some((id) => !mine.has(id)) || request.some((id) => !theirs.has(id))) {
      throw new SocialError('FISH_NOT_FOUND');
    }
    const trade: TradeEntry = {
      tradeId: this.nextId('trade'),
      fromPlayerId: me.playerId,
      fromName: me.displayName,
      toPlayerId: toId,
      toName: this.bot(toId)?.displayName ?? 'Bạn bè',
      status: 'pending',
      createdAt: this.iso(this.host.now()),
      offer: offer.map((id) => MockSocial.tradeFish(mine.get(id)!)),
      request: request.map((id) => MockSocial.tradeFish(theirs.get(id)!)),
    };
    this.trades.set(trade.tradeId, trade);
    // Bot đồng ý ~70%, còn lại từ chối.
    this.later(this.between(3000, 8000), () => {
      if (!this.trades.has(trade.tradeId)) return;
      if (this.host.random() < 0.7) {
        try {
          this.settle(trade, 'accepted');
          return;
        } catch {
          // Cá đã bán hoặc đã đổi tay trong lúc chờ: bot coi như từ chối.
        }
      }
      this.close(trade, 'declined');
    });
    return trade;
  }

  private close(trade: TradeEntry, status: 'accepted' | 'declined' | 'cancelled'): TradeResult {
    this.trades.delete(trade.tradeId);
    this.host.emit('TradeUpdated', {
      tradeId: trade.tradeId,
      status,
      fromPlayerId: trade.fromPlayerId,
      toPlayerId: trade.toPlayerId,
    });
    return { tradeId: trade.tradeId, status };
  }

  /** Đổi chéo: chỉ thành công khi mọi con còn đúng chủ, nếu không thì giữ nguyên (Server trả FISH_NOT_FOUND). */
  private settle(trade: TradeEntry, status: 'accepted'): TradeResult {
    const me = this.host.me().playerId;
    const mineIsOffer = trade.fromPlayerId === me;
    const botId = mineIsOffer ? trade.toPlayerId : trade.fromPlayerId;
    const give = (mineIsOffer ? trade.offer : trade.request).map((fish) => fish.catchId);
    const get = (mineIsOffer ? trade.request : trade.offer).map((fish) => fish.catchId);
    const myBag = this.host.myFish();
    const botBag = this.botFishOf(botId);
    if (
      give.some((id) => !myBag.some((fish) => fish.catchId === id)) ||
      get.some((id) => !botBag.some((fish) => fish.catchId === id))
    ) {
      throw new SocialError('FISH_NOT_FOUND');
    }
    const received = botBag.filter((fish) => get.includes(fish.catchId));
    const sent = myBag.filter((fish) => give.includes(fish.catchId)).map((fish) => ({ ...fish }));
    this.botFish.set(botId, [...botBag.filter((fish) => !get.includes(fish.catchId)), ...sent]);
    this.host.swapFish(give, received);
    return this.close(trade, status);
  }

  private tradeOf(tradeId: string, side: 'to' | 'from'): TradeEntry {
    const trade = this.trades.get(tradeId);
    const me = this.host.me().playerId;
    if (!trade || (side === 'to' ? trade.toPlayerId : trade.fromPlayerId) !== me) {
      throw new SocialError('TRADE_NOT_FOUND');
    }
    return trade;
  }

  acceptTrade(tradeId: string): TradeResult {
    const trade = this.tradeOf(tradeId, 'to');
    if (!this.friends.has(trade.fromPlayerId)) throw new SocialError('NOT_FRIENDS');
    return this.settle(trade, 'accepted');
  }

  declineTrade(tradeId: string): TradeResult {
    return this.close(this.tradeOf(tradeId, 'to'), 'declined');
  }

  cancelTrade(tradeId: string): TradeResult {
    return this.close(this.tradeOf(tradeId, 'from'), 'cancelled');
  }

  /** Thỉnh thoảng một bot bạn bè đang ở hồ đề nghị đổi 1 con của bot lấy 1 con của mình (mỗi 3 phút). */
  botTradeOnce(): string | null {
    const me = this.host.me();
    const mine = this.host.myFish();
    const bots = this.host
      .bots()
      .filter((bot) => this.friends.has(bot.playerId))
      .filter((bot) => ![...this.trades.values()].some((t) => t.fromPlayerId === bot.playerId));
    const bot = bots[Math.floor(this.host.random() * bots.length)];
    if (!bot || mine.length === 0) return null;
    const theirs = this.botFishOf(bot.playerId);
    if (theirs.length === 0) return null;
    const want = mine[Math.floor(this.host.random() * mine.length)]!;
    const give = theirs[Math.floor(this.host.random() * theirs.length)]!;
    const trade: TradeEntry = {
      tradeId: this.nextId('trade'),
      fromPlayerId: bot.playerId,
      fromName: bot.displayName,
      toPlayerId: me.playerId,
      toName: me.displayName,
      status: 'pending',
      createdAt: this.iso(this.host.now()),
      offer: [MockSocial.tradeFish(give)],
      request: [MockSocial.tradeFish(want)],
    };
    this.trades.set(trade.tradeId, trade);
    this.host.emit('TradeReceived', trade);
    return bot.playerId;
  }

  // ---------- Hồ sơ công khai ----------

  publicProfile(playerId: string): PublicProfile {
    const bot = this.bot(playerId);
    if (!bot) throw new SocialError('PLAYER_NOT_FOUND');
    const profile = this.profileOf(playerId);
    const best = [...profile.best].sort((a, b) => b[1] - a[1]).slice(0, 3);
    const showcase: ShowcaseSlot[] = [0, 1, 2].map((slot) => ({
      slot,
      speciesId: best[slot]?.[0] ?? null,
      lengthTenthCm: best[slot]?.[1] ?? null,
    }));
    return {
      playerId,
      displayName: bot.displayName,
      skinId: bot.skinId,
      level: levelForExp(this.host.config, profile.exp),
      exp: profile.exp,
      titleId: profile.titleId,
      bio: profile.bio,
      showcase,
      online: true,
      friendStatus: this.friends.has(playerId)
        ? 'friends'
        : this.incoming.has(playerId)
          ? 'pending_in'
          : this.outgoing.has(playerId)
            ? 'pending_out'
            : 'none',
    };
  }

  private nextId(prefix: string): string {
    this.idCounter += 1;
    return `${prefix}-social-${this.idCounter}`;
  }
}
