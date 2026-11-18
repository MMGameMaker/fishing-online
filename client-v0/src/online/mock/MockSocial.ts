// Phần xã hội của mock pier.html (BOT-02), cùng contract Server: kết bạn (bot mời khi đi gần, tự đồng ý khi được
// mời), tin riêng (bot trả lời 2–6 giây, thỉnh thoảng nhắn trước), chat world của bot (cả hồ 20–40 giây một câu,
// chọn câu theo trạng thái), icon cá và hồ sơ công khai. MockBackend giữ bot và gọi vào đây mỗi nhịp.
// Hoàn tất với mock không đồng nghĩa đã tích hợp Server thật.
import type { FishConfig, GameplayConfig } from '../core/gameplayConfig';
import type {
  Conversation,
  DirectMessage,
  FriendEntry,
  FriendRequestEntry,
  FriendRequestResult,
  FriendsResponse,
  HubEvents,
  PlayerView,
  PublicProfile,
  ShowcaseSlot,
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
      'VALIDATION_FAILED' | 'NOT_FRIENDS' | 'PLAYER_NOT_FOUND' | 'STATE_CONFLICT' | 'RATE_LIMITED',
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
}

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

  constructor(private readonly host: MockSocialHost) {
    const now = host.now();
    this.nextWorldChatMs = now + this.between(20_000, 40_000);
    this.nextEmojiMs = now + this.between(25_000, 50_000);
    this.nextBotDmMs = now + this.between(60_000, 120_000);
    this.nextInviteScanMs = now + INVITE_SCAN_MS;
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
