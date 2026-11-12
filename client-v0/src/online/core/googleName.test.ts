import { describe, expect, it } from 'vitest';
import { shouldApplyGoogleName, toDisplayName } from './googleName';

describe('toDisplayName', () => {
  it('giữ tên tiếng Việt có dấu và khoảng trắng', () => {
    expect(toDisplayName('Nguyễn Văn An')).toBe('Nguyễn Văn An');
  });

  it('bỏ ký tự không hợp lệ và gộp khoảng trắng', () => {
    expect(toDisplayName('  Zen   (Dev)! ')).toBe('Zen Dev');
  });

  it('cắt còn 16 ký tự', () => {
    expect(toDisplayName('Bùi Quốc Tín Nguyễn Văn')).toBe('Bùi Quốc Tín Ngu');
  });

  it('quá ngắn hoặc rỗng thì không dùng', () => {
    expect(toDisplayName('A!')).toBeNull();
    expect(toDisplayName(null)).toBeNull();
  });
});

describe('shouldApplyGoogleName', () => {
  it('mock luôn đổi theo Google', () => {
    expect(shouldApplyGoogleName('Người chơi', 'Zen', true)).toBe(true);
  });

  it('Server thật chỉ đổi tên mặc định FisherXXXXXXXX', () => {
    expect(shouldApplyGoogleName('Fisher1a2b3c4d', 'Zen', false)).toBe(true);
    expect(shouldApplyGoogleName('TenTuDat', 'Zen', false)).toBe(false);
  });

  it('không có tên Google hoặc trùng tên hiện tại thì thôi', () => {
    expect(shouldApplyGoogleName('Zen', 'Zen', true)).toBe(false);
    expect(shouldApplyGoogleName('Người chơi', null, true)).toBe(false);
  });
});
