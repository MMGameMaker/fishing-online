import { describe, expect, it } from 'vitest';
import { clamp01, parseAudioSettings } from './audioSettings';

describe('audioSettings', () => {
  it('chặn giá trị trong 0..1', () => {
    expect(clamp01(-1)).toBe(0);
    expect(clamp01(2)).toBe(1);
    expect(clamp01(Number.NaN)).toBe(0);
  });

  it('đọc dữ liệu đã lưu, hỏng thì dùng mặc định', () => {
    expect(parseAudioSettings('{"sound":0,"music":0.25}')).toEqual({ sound: 0, music: 0.25 });
    expect(parseAudioSettings('{"sound":5}')).toEqual({ sound: 1, music: 0.5 });
    expect(parseAudioSettings('không phải json')).toEqual({ sound: 1, music: 0.5 });
    expect(parseAudioSettings(null)).toEqual({ sound: 1, music: 0.5 });
  });
});
