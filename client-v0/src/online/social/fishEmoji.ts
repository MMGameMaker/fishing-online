// Icon cá trong bảng "Biểu cảm" (BOT-02 mục 2): mỗi loài người chơi đã câu được (Sổ tay cá) thành một ô sau 16
// emoji; gửi qua SendEmoji với id `fish:<speciesId>`, Server chỉ nhận loài người gửi đã câu. Hàm thuần để test.

export const FISH_EMOJI_PREFIX = 'fish:';

export const fishEmojiId = (speciesId: string): string => `${FISH_EMOJI_PREFIX}${speciesId}`;

/** Loài của emoji icon cá; null nếu là emoji thường. */
export function fishSpeciesOf(emojiId: string | undefined | null): string | null {
  if (!emojiId?.startsWith(FISH_EMOJI_PREFIX)) return null;
  const speciesId = emojiId.slice(FISH_EMOJI_PREFIX.length);
  return speciesId || null;
}

/** Ô icon cá theo thứ tự loài trong catalog (cùng thứ tự Sổ tay); chỉ loài đã câu và có trong catalog. */
export function fishEmojiSlots(
  caught: readonly string[] | null,
  catalogOrder: readonly string[],
): string[] {
  if (!caught || caught.length === 0) return [];
  const set = new Set(caught);
  return catalogOrder.filter((speciesId) => set.has(speciesId));
}
