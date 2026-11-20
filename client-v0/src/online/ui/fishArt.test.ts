// Mỗi loài trong config phải trỏ tới một file ảnh có thật trong public/assets/fish (tên file mới 2026-11-20).
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import config from '@fixtures/gameplay-config.v0.json';
import { describe, expect, it } from 'vitest';
import { fishArtUrl } from './fishArt';

const PUBLIC = resolve(__dirname, '../../../public');

describe('fishArtUrl', () => {
  it('mỗi loài trong config có file ảnh', () => {
    for (const { speciesId } of config.fish) {
      const url = fishArtUrl(speciesId);
      expect(existsSync(resolve(PUBLIC, `.${url}`)), `${speciesId} → ${url}`).toBe(true);
    }
  });

  it('dùng tên file mới, mã loài không có trong bảng thì giữ mã loài', () => {
    expect(fishArtUrl('carp')).toBe('/assets/fish/CaRoPhi.png');
    expect(fishArtUrl('moonfin')).toBe('/assets/fish/Muc.png');
    expect(fishArtUrl('khong-co')).toBe('/assets/fish/khong-co.png');
  });
});
