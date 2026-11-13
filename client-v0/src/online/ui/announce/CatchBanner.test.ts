import { describe, expect, it } from 'vitest';
import { announcementParts } from './CatchBanner';

const base = {
  playerId: 'p',
  displayName: 'Rynz193',
  speciesId: 'goldcarp',
  speciesName: 'Golden Carp',
  rarity: 'rare' as const,
  first: true,
  announcedAt: '2026-11-13T00:00:00Z',
};

describe('announcementParts', () => {
  it('câu chữ theo doc: người đầu tiên câu được, tên vàng, cá màu độ hiếm', () => {
    const parts = announcementParts(base);
    expect(parts.map((p) => p.text).join('')).toBe(
      'Chúc mừng Rynz193 là người đầu tiên câu được Golden Carp!',
    );
    expect(parts[1]?.color).toBe('#ffd84a');
    expect(parts[3]?.color).toBe('#3f8fe0');
  });

  it('không phải lần đầu thì ghi "đã câu được"', () => {
    const text = announcementParts({ ...base, first: false })
      .map((p) => p.text)
      .join('');
    expect(text).toBe('Chúc mừng Rynz193 đã câu được Golden Carp!');
  });
});
