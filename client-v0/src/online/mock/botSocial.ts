// Dữ liệu và luật thuần cho bot của mock pier.html (BOT-02), cùng luật với Server (Modules/Bots/BotContent.cs):
// 50 tên, câu chat theo trạng thái, bảng mốc theo số user thật. bot-content.json là bản sao của
// server/FishingOnline.Api/Modules/Bots/bot-content.json (test so khớp hai file).
import content from './bot-content.json';

export interface BotContentData {
  names: string[];
  normalChat: string[];
  successChat: string[];
}

export const BOT_CONTENT: BotContentData = content;

/** Câu 36–55 (đánh số từ 1): khi bot ngồi chờ cá; 56–75: khi cá cắn/đang kéo; còn lại: lúc bất kỳ. */
const WAITING = [36, 55] as const;
const FIGHTING = [56, 75] as const;
export const STATE_LINE_CHANCE = 0.7;

export type BotChatState = 'idle' | 'waiting' | 'fighting';

const range = ([first, last]: readonly [number, number]) =>
  BOT_CONTENT.normalChat.slice(first - 1, last);

export const WAITING_LINES = range(WAITING);
export const FIGHTING_LINES = range(FIGHTING);
export const GENERAL_LINES = BOT_CONTENT.normalChat.filter(
  (_, index) => index + 1 < WAITING[0] || index + 1 > FIGHTING[1],
);

const pick = <T>(list: readonly T[], random: () => number): T =>
  list[Math.floor(random() * list.length)]!;

/** Câu chat world theo trạng thái bot (giống BotContent.PickChat của Server). */
export function pickBotChat(state: BotChatState, random: () => number): string {
  if (state === 'waiting' && random() < STATE_LINE_CHANCE) return pick(WAITING_LINES, random);
  if (state === 'fighting' && random() < STATE_LINE_CHANCE) return pick(FIGHTING_LINES, random);
  return pick(GENERAL_LINES, random);
}

export const pickSuccessChat = (random: () => number): string =>
  pick(BOT_CONTENT.successChat, random);

export const pickNormalChat = (random: () => number): string =>
  pick(BOT_CONTENT.normalChat, random);

export interface BotTier {
  minRealPlayers: number;
  totalBots: number;
  fishingBots: number;
}

/** Bảng mốc Zen duyệt 2026-11-18 (cùng BotTiers.Default của Server). */
export const DEFAULT_BOT_TIERS: readonly BotTier[] = [
  { minRealPlayers: 0, totalBots: 30, fishingBots: 20 },
  { minRealPlayers: 10, totalBots: 30, fishingBots: 20 },
  { minRealPlayers: 20, totalBots: 20, fishingBots: 8 },
  { minRealPlayers: 31, totalBots: 10, fishingBots: 0 },
  { minRealPlayers: 41, totalBots: 3, fishingBots: 0 },
];

export function pickBotTier(tiers: readonly BotTier[], realPlayers: number): BotTier {
  let best: BotTier = { minRealPlayers: 0, totalBots: 0, fishingBots: 0 };
  for (const tier of tiers) {
    if (
      tier.minRealPlayers <= Math.max(0, realPlayers) &&
      tier.minRealPlayers >= best.minRealPlayers
    ) {
      best = tier;
    }
  }
  return best;
}

/**
 * Số bot được giữ suất ngồi ghế: không quá mốc "bot được câu", chừa ghế cho user thật đang ngồi và luôn còn
 * một ghế trống khi có user thật đang đứng (cùng luật BotManager của Server).
 */
export function allowedFishingBots(input: {
  fishingTarget: number;
  seatCount: number;
  humansSeated: number;
  humansStanding: number;
}): number {
  const free = input.seatCount - input.humansSeated - (input.humansStanding > 0 ? 1 : 0);
  return Math.max(0, Math.min(input.fishingTarget, free));
}

/** Giới hạn hồ Lake:MaxPlayers. */
export const LAKE_MAX_PLAYERS = 50;

/** Số bot mục tiêu: theo mốc nhưng tổng người không vượt giới hạn hồ. */
export function botTarget(tier: BotTier, realPlayers: number, maxPlayers = LAKE_MAX_PLAYERS) {
  const total = Math.max(0, Math.min(tier.totalBots, maxPlayers - realPlayers));
  return { total, fishing: Math.min(tier.fishingBots, total) };
}

/** Mời kết bạn khi bot đứng cách user thật trong khoảng này (px). */
export const BOT_INVITE_RADIUS_PX = 80;
