// Bot câu cá cho mock của pier.html (feedback 2026-11-14): tên người Việt/nước ngoài thay "Bot 1, Bot 2";
// bot đi dạo một lúc rồi ngồi ghế trống câu cá, mỗi lượt câu được (hiện cá trên đầu, thanh thông báo và
// tin hệ thống trong chat như người chơi khác) hoặc trượt (emoji buồn); câu vài lượt thì đứng dậy đi tiếp.
// Hàm thuần theo random truyền vào để test được; MockBackend gọi mỗi nhịp.

/** Tên hiển thị cho bot: người Việt và nước ngoài, 3–16 ký tự như luật tên của Server. */
export const BOT_NAMES = [
  'Minh Anh',
  'Quốc Bảo',
  'Thu Hà',
  'Hoàng Nam',
  'Lan Phương',
  'Gia Huy',
  'Bảo Ngọc',
  'Đức Trí',
  'Emma',
  'Liam',
  'Sakura',
  'Lucas',
  'Mia Chen',
  'Noah',
  'Yuki',
  'Olivia',
] as const;

/** Chọn `count` tên khác nhau, không trùng tên người chơi. */
export function pickBotNames(count: number, random: () => number, avoid: string[] = []): string[] {
  const pool = BOT_NAMES.filter(
    (name) => !avoid.some((a) => a.toLowerCase() === name.toLowerCase()),
  );
  const out: string[] = [];
  while (out.length < count && pool.length > 0) {
    out.push(pool.splice(Math.floor(random() * pool.length), 1)[0]!);
  }
  while (out.length < count) out.push(`Ngư dân ${out.length + 1}`);
  return out;
}

export const BOT_TIMING = {
  /** Đi dạo bao lâu trước khi tìm ghế (ms). */
  wanderMs: [8_000, 20_000] as const,
  /** Mỗi lượt câu kéo dài bao lâu tới khi có kết quả (ms). */
  roundMs: [12_000, 25_000] as const,
  /** Số lượt câu mỗi lần ngồi. */
  rounds: [2, 4] as const,
  /** Tỉ lệ câu được mỗi lượt. */
  catchChance: 0.6,
};

export type BotState =
  | { mode: 'wander'; untilMs: number }
  | { mode: 'fishing'; seatId: string; nextResultMs: number; roundsLeft: number };

const between = (random: () => number, [min, max]: readonly [number, number]) =>
  Math.round(min + random() * (max - min));

export function startWander(nowMs: number, random: () => number): BotState {
  return { mode: 'wander', untilMs: nowMs + between(random, BOT_TIMING.wanderMs) };
}

export function startFishing(seatId: string, nowMs: number, random: () => number): BotState {
  return {
    mode: 'fishing',
    seatId,
    nextResultMs: nowMs + between(random, BOT_TIMING.roundMs),
    roundsLeft: between(random, BOT_TIMING.rounds),
  };
}

/** Kết quả một lượt câu và trạng thái tiếp theo (còn lượt thì câu tiếp, hết lượt thì đứng dậy). */
export function nextRound(
  state: Extract<BotState, { mode: 'fishing' }>,
  nowMs: number,
  random: () => number,
): { caught: boolean; next: BotState } {
  const caught = random() < BOT_TIMING.catchChance;
  const roundsLeft = state.roundsLeft - 1;
  const next: BotState =
    roundsLeft > 0
      ? { ...state, roundsLeft, nextResultMs: nowMs + between(random, BOT_TIMING.roundMs) }
      : startWander(nowMs, random);
  return { caught, next };
}
