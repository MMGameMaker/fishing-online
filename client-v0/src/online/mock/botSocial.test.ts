import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  BOT_CONTENT,
  DEFAULT_BOT_TIERS,
  FIGHTING_LINES,
  GENERAL_LINES,
  WAITING_LINES,
  allowedFishingBots,
  botTarget,
  pickBotChat,
  pickBotTier,
} from './botSocial';

const seq = (...values: number[]) => {
  let i = 0;
  return () => values[i++ % values.length]!;
};

describe('botSocial (BOT-02)', () => {
  it('bản sao bot-content.json khớp file của Server', () => {
    const server = fileURLToPath(
      new URL(
        '../../../../server/FishingOnline.Api/Modules/Bots/bot-content.json',
        import.meta.url,
      ),
    );
    expect(JSON.parse(readFileSync(server, 'utf8'))).toEqual(BOT_CONTENT);
    expect(BOT_CONTENT.names).toHaveLength(50);
    expect(BOT_CONTENT.normalChat).toHaveLength(100);
    expect(BOT_CONTENT.successChat).toHaveLength(50);
  });

  it('chia câu theo trạng thái: 36–55 chờ cá, 56–75 cá cắn/kéo, còn lại lúc bất kỳ', () => {
    expect(WAITING_LINES).toHaveLength(20);
    expect(WAITING_LINES[0]).toBe('Cá đâu hết rồi, trốn kỹ thế!');
    expect(FIGHTING_LINES[0]).toBe('Ôi, dính rồi! Dính rồi!');
    expect(GENERAL_LINES).toHaveLength(60);
    expect(GENERAL_LINES).toContain(BOT_CONTENT.normalChat[0]);
    expect(GENERAL_LINES).toContain(BOT_CONTENT.normalChat[99]);
  });

  it('chọn câu chat theo trạng thái', () => {
    // random < 0.7 → câu của trạng thái; ≥ 0.7 → câu chung.
    expect(WAITING_LINES).toContain(pickBotChat('waiting', seq(0.1, 0.5)));
    expect(GENERAL_LINES).toContain(pickBotChat('waiting', seq(0.9, 0.5)));
    expect(FIGHTING_LINES).toContain(pickBotChat('fighting', seq(0.1, 0.5)));
    for (let i = 0; i < 20; i++) {
      expect(GENERAL_LINES).toContain(pickBotChat('idle', seq(i / 20)));
    }
  });

  it.each([
    [0, 30, 20],
    [9, 30, 20],
    [10, 30, 20],
    [19, 30, 20],
    [20, 20, 8],
    [30, 20, 8],
    [31, 10, 0],
    [40, 10, 0],
    [41, 3, 0],
    [99, 3, 0],
  ])('mốc bot với %i user thật: %i bot, %i được câu', (real, total, fishing) => {
    const tier = pickBotTier(DEFAULT_BOT_TIERS, real);
    expect(tier.totalBots).toBe(total);
    expect(tier.fishingBots).toBe(fishing);
  });

  it('tổng người không vượt 50: thiếu chỗ thì bớt bot', () => {
    expect(botTarget({ minRealPlayers: 0, totalBots: 30, fishingBots: 20 }, 1)).toEqual({
      total: 30,
      fishing: 20,
    });
    expect(botTarget({ minRealPlayers: 41, totalBots: 3, fishingBots: 0 }, 49).total).toBe(1);
    expect(botTarget({ minRealPlayers: 41, totalBots: 3, fishingBots: 0 }, 60).total).toBe(0);
    expect(botTarget({ minRealPlayers: 0, totalBots: 10, fishingBots: 8 }, 45)).toEqual({
      total: 5,
      fishing: 5,
    });
  });

  it('chừa ghế cho user thật: luôn còn một ghế trống khi có người đang đứng', () => {
    const base = { fishingTarget: 20, seatCount: 30 };
    expect(allowedFishingBots({ ...base, humansSeated: 0, humansStanding: 1 })).toBe(20);
    expect(allowedFishingBots({ ...base, humansSeated: 25, humansStanding: 1 })).toBe(4);
    expect(allowedFishingBots({ ...base, humansSeated: 30, humansStanding: 0 })).toBe(0);
    expect(
      allowedFishingBots({ ...base, fishingTarget: 0, humansSeated: 0, humansStanding: 0 }),
    ).toBe(0);
  });
});
