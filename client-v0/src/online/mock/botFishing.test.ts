import { describe, expect, it } from 'vitest';
import { BOT_NAMES, nextRound, pickBotNames, startFishing, startWander } from './botFishing';

const seq = (...values: number[]) => {
  let i = 0;
  return () => values[i++ % values.length]!;
};

describe('botFishing', () => {
  it('chọn tên khác nhau, tránh tên người chơi, thiếu thì dùng tên dự phòng', () => {
    const names = pickBotNames(5, seq(0.1, 0.5, 0.9), ['minh anh']);
    expect(new Set(names).size).toBe(5);
    expect(names).not.toContain('Minh Anh');
    const many = pickBotNames(BOT_NAMES.length + 2, seq(0));
    expect(many.at(-1)).toMatch(/^Ngư dân/);
  });

  it('đi dạo rồi câu: còn lượt thì câu tiếp, hết lượt thì đứng dậy', () => {
    expect(startWander(1000, seq(0)).mode).toBe('wander');
    const fishing = startFishing('seat-1', 0, seq(0, 0)); // 2 lượt
    if (fishing.mode !== 'fishing') throw new Error('phải đang câu');
    expect(fishing.roundsLeft).toBe(2);
    const first = nextRound(fishing, 100, seq(0.1, 0));
    expect(first.caught).toBe(true);
    expect(first.next.mode).toBe('fishing');
    if (first.next.mode !== 'fishing') return;
    const second = nextRound(first.next, 200, seq(0.9, 0));
    expect(second.caught).toBe(false);
    expect(second.next.mode).toBe('wander');
  });
});
