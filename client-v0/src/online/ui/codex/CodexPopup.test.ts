import { describe, expect, it } from 'vitest';
import configJson from '@fixtures/gameplay-config.v0.json';
import type { Catalog } from '../../core/gameplayConfig';
import { codexRows } from './CodexPopup';

const catalog = configJson as unknown as Catalog;

describe('codexRows', () => {
  it('loài đã câu: đủ 6 dòng, có nhỏ nhất và lớn nhất đã câu', () => {
    const rows = codexRows(
      'koi',
      catalog,
      {
        speciesId: 'koi',
        discovered: true,
        totalCaught: 2,
        bestLengthTenthCm: 412,
        firstCaughtAt: '2026-11-13T00:00:00Z',
        smallestLengthTenthCm: 301,
      },
      'lake-01',
    );
    expect(rows.map((r) => r.label)).toEqual([
      'Tên',
      'Độ hiếm',
      'Nơi sống',
      'Kích thước',
      'Nhỏ nhất đã câu',
      'Lớn nhất đã câu',
    ]);
    expect(rows[1]).toMatchObject({ value: 'Sử thi' });
    expect(rows[4]?.value).toBe('30,1cm');
    expect(rows[5]?.value).toBe('41,2cm');
  });

  it('loài chưa câu: không điền nhỏ nhất/lớn nhất', () => {
    const rows = codexRows(
      'moonfin',
      catalog,
      {
        speciesId: 'moonfin',
        discovered: false,
        totalCaught: 0,
        bestLengthTenthCm: null,
        firstCaughtAt: null,
      },
      'lake-01',
    );
    expect(rows[0]?.value).toBe('Moonfin');
    expect(rows[4]?.value).toBe('');
    expect(rows[5]?.value).toBe('');
  });
});
