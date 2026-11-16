import { describe, expect, it } from 'vitest';
import { MUSIC_FILES, MUSIC_SWITCH_MS, pickTrack, shouldSwitch } from './backgroundMusic';

describe('shouldSwitch', () => {
  it('chỉ đổi bài khi đã đủ 30 phút', () => {
    expect(shouldSwitch(MUSIC_SWITCH_MS - 1)).toBe(false);
    expect(shouldSwitch(MUSIC_SWITCH_MS)).toBe(true);
  });
});

describe('pickTrack', () => {
  it('luôn chọn bài khác bài đang phát', () => {
    for (const current of MUSIC_FILES) {
      for (const r of [0, 0.25, 0.5, 0.99]) {
        expect(pickTrack(MUSIC_FILES, current, () => r)).not.toBe(current);
      }
    }
  });

  it('chỉ có 1 bài thì vẫn phát bài đó; không có bài thì null', () => {
    expect(pickTrack(['a.mp3'], 'a.mp3')).toBe('a.mp3');
    expect(pickTrack([], null)).toBeNull();
  });
});
