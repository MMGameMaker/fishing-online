import type { Catalog } from '../core/gameplayConfig';
import type { AttemptResult } from '../net/contract';
import { RARITY_COLORS, RARITY_LABELS, formatLength } from '../ui/kit/format';

export interface ResultCard {
  name: string;
  rarityLabel: string;
  rarityColor: string;
  length: string;
  badge: 'Mới' | 'Kỷ lục' | null;
  exp: string;
  levelUp: string | null;
}

export function buildResultCard(result: AttemptResult, catalog: Catalog | null): ResultCard {
  const species = catalog?.fish.find((f) => f.speciesId === result.speciesId);
  let badge: ResultCard['badge'] = null;
  if (result.isNew) badge = 'Mới';
  else if (result.isRecord) badge = 'Kỷ lục';
  return {
    name: species?.name ?? result.speciesId,
    rarityLabel: RARITY_LABELS[result.rarity],
    rarityColor: RARITY_COLORS[result.rarity],
    length: formatLength(result.lengthTenthCm),
    badge,
    exp: `+${result.expGained} EXP`,
    levelUp: result.levelUp ? `Lên cấp! Cấp ${result.level}` : null,
  };
}

const CANCEL_TEXT: Record<string, string> = {
  session_expired: 'Hết thời gian giữ ghế, lần câu bị hủy.',
  disconnected: 'Mất kết nối, lần câu bị hủy.',
  left_seat: 'Bạn đã rời ghế, lần câu bị hủy.',
};

export function cancelText(reason: string | null): string {
  return (reason && CANCEL_TEXT[reason]) || 'Lần câu đã bị hủy.';
}
