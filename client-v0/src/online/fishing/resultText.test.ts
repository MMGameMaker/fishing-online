import { describe, expect, it } from 'vitest';
import config from '@fixtures/gameplay-config.v0.json';
import type { Catalog } from '../core/gameplayConfig';
import type { AttemptResult } from '../net/contract';
import { buildResultCard, cancelText } from './resultText';

const catalog = config as unknown as Catalog;
const base: AttemptResult = {
  speciesId: 'perch',
  rarity: 'rare',
  lengthTenthCm: 405,
  isNew: false,
  isRecord: false,
  expGained: 12,
  level: 2,
  levelUp: false,
};

describe('buildResultCard', () => {
  it('tên, độ hiếm và chiều dài 405 hiện "40,5 cm"', () => {
    expect(buildResultCard(base, catalog)).toMatchObject({
      name: 'Perch',
      rarityLabel: 'Hiếm',
      length: '40,5 cm',
      badge: null,
      exp: '+12 EXP',
      levelUp: null,
    });
  });

  it('nhãn Mới, Kỷ lục và Lên cấp', () => {
    expect(buildResultCard({ ...base, isNew: true }, catalog).badge).toBe('Mới');
    expect(buildResultCard({ ...base, isRecord: true }, catalog).badge).toBe('Kỷ lục');
    expect(buildResultCard({ ...base, levelUp: true }, catalog).levelUp).toBe('Lên cấp! Cấp 2');
  });

  it('chưa có catalog thì dùng speciesId', () => {
    expect(buildResultCard(base, null).name).toBe('perch');
  });
});

describe('cancelText', () => {
  it('theo lý do hủy', () => {
    expect(cancelText('left_seat')).toBe('Bạn đã rời ghế, lần câu bị hủy.');
    expect(cancelText(null)).toBe('Lần câu đã bị hủy.');
  });
});
