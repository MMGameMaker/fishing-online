import { describe, expect, it } from 'vitest';
import {
  LEGACY_SKIN_COLOR,
  SKIN_COLORS,
  SKIN_SPECIES,
  composeSkinId,
  isColoredSkin,
  parseSkinId,
  recolorPixels,
} from './skinColor';

describe('skinColor', () => {
  it('ghép và tách id có màu', () => {
    expect(composeSkinId('skin_02', 'brown')).toBe('skin_02~brown');
    expect(composeSkinId('skin_02', 'white')).toBe('skin_02');
    expect(composeSkinId('skin_02', 'khong-co')).toBe('skin_02');
    expect(parseSkinId('skin_bot_cat_white~orange')).toEqual({ base: 'skin_bot_cat_white', colorId: 'orange' });
    expect(parseSkinId('skin_06')).toEqual({ base: 'skin_06', colorId: 'white' });
    expect(parseSkinId('skin_02~khong-co')).toEqual({ base: 'skin_02', colorId: 'white' });
    expect(isColoredSkin('skin_02~peach')).toBe(true);
    expect(isColoredSkin('skin_02')).toBe(false);
  });

  it('đổi đúng 3 màu lông, giữ viền và mắt', () => {
    const brown = SKIN_COLORS.find((color) => color.id === 'brown')!;
    // sáng, bóng ấm, bóng lạnh, bóng đậm, viền 7d593a, trong suốt.
    const data = new Uint8ClampedArray([
      0xf9, 0xf7, 0xe4, 255, 0xe5, 0xd0, 0x9d, 255, 0xcc, 0xd5, 0xe7, 255, 0xb5, 0x97, 0x6e, 255, 0x7d, 0x59, 0x3a, 255, 0xf9, 0xf7, 0xe4, 0,
    ]);
    expect(recolorPixels(data, 'brown')).toBe(4);
    expect([...data.slice(0, 3)]).toEqual([...brown.ramp[0]]);
    expect([...data.slice(4, 7)]).toEqual([...brown.ramp[1]]);
    expect([...data.slice(8, 11)]).toEqual([...brown.ramp[1]]);
    expect([...data.slice(12, 15)]).toEqual([...brown.ramp[2]]);
    expect([...data.slice(16, 19)]).toEqual([0x7d, 0x59, 0x3a]);
    expect([...data.slice(20, 23)]).toEqual([0xf9, 0xf7, 0xe4]); // pixel trong suốt không đụng
  });

  it('màu trắng hoặc không có thì không đổi gì', () => {
    const data = new Uint8ClampedArray([0xf9, 0xf7, 0xe4, 255]);
    expect(recolorPixels(data, 'white')).toBe(0);
    expect(recolorPixels(data, 'khong-co')).toBe(0);
  });

  it('bảng chuyển skin cũ trỏ tới loài trắng và màu hợp lệ', () => {
    const bases = new Set(SKIN_SPECIES.map((species) => species.base));
    for (const target of Object.values(LEGACY_SKIN_COLOR)) {
      const parsed = parseSkinId(target);
      expect(bases.has(parsed.base), target).toBe(true);
      expect(parsed.colorId, target).not.toBe('white');
    }
  });
});
