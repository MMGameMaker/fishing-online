import { describe, expect, it } from 'vitest';
import { RARITIES } from '../../core/gameplayConfig';
import { ERROR_CODES } from '../../net/contract';
import { ERROR_TEXT, errorTextFor } from './errorText';
import { RARITY_COLORS, RARITY_LABELS, formatGold, formatLength } from './format';

describe('errorText', () => {
  it.each([...ERROR_CODES])('%s có câu tiếng Việt', (code) => {
    expect(ERROR_TEXT[code].length).toBeGreaterThan(0);
    expect(errorTextFor(code)).toBe(ERROR_TEXT[code]);
  });

  it('mã lạ có câu mặc định', () => {
    expect(errorTextFor('XYZ')).toBe('Đã có lỗi xảy ra.');
  });
});

describe('format', () => {
  it('chiều dài 405 hiện 40,5 cm', () => {
    expect(formatLength(405)).toBe('40,5 cm');
    expect(formatLength(1500)).toBe('150,0 cm');
  });

  it('Gold có dấu chấm ngăn cách', () => {
    expect(formatGold('100')).toBe('100');
    expect(formatGold('2000')).toBe('2.000');
    expect(formatGold('1234567')).toBe('1.234.567');
  });

  it('đủ màu và tên cho 5 rarity', () => {
    for (const rarity of RARITIES) {
      expect(RARITY_COLORS[rarity]).toMatch(/^#/);
      expect(RARITY_LABELS[rarity]).not.toBe('');
    }
  });
});
