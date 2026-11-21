// Lời chào của NPC khi người chơi bước vào vùng bấm F (yêu cầu 2026-11-21): chỉ nói lúc VÀO vùng; vào ra liên tục thì
// không nói liên tục, phải đợi `cooldownMs` kể từ lần RA cuối cùng. Hàm thuần để test.
export interface GreetState {
  /** Lần cập nhật trước người chơi có trong vùng không. */
  inside: boolean;
  /** Thời điểm ra khỏi vùng gần nhất (ms); -Infinity nếu chưa ra lần nào. */
  lastExitMs: number;
  /** Câu vừa nói (tránh lặp liền hai lần); -1 nếu chưa nói. */
  lastIndex: number;
}

/** Chọn ngẫu nhiên một câu trong `lineCount` câu, không trùng câu vừa nói (`lastIndex`, -1 nếu chưa nói). `random` trong [0, 1). */
export function pickLineIndex(lineCount: number, lastIndex: number, random: () => number = Math.random): number {
  let index = Math.min(lineCount - 1, Math.floor(random() * lineCount));
  if (lineCount > 1 && index === lastIndex) index = (index + 1) % lineCount;
  return index;
}

export const newGreetState = (): GreetState => ({ inside: false, lastExitMs: -Infinity, lastIndex: -1 });

/**
 * Cập nhật trạng thái theo vị trí hiện tại; trả về chỉ số câu cần nói (hoặc null nếu không nói).
 * `random` trong [0, 1).
 */
export function stepGreeting(
  state: GreetState,
  inside: boolean,
  nowMs: number,
  lineCount: number,
  cooldownMs: number,
  random: () => number = Math.random,
): number | null {
  if (inside === state.inside || lineCount <= 0) return null;
  state.inside = inside;
  if (!inside) {
    state.lastExitMs = nowMs;
    return null;
  }
  if (nowMs - state.lastExitMs < cooldownMs) return null;
  const index = pickLineIndex(lineCount, state.lastIndex, random);
  state.lastIndex = index;
  return index;
}
