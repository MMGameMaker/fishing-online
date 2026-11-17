import { describe, expect, it } from 'vitest';
import { isPhone } from './device';

const nav = (userAgent: string, mobile?: boolean): Navigator =>
  ({
    userAgent,
    userAgentData: mobile === undefined ? undefined : { mobile },
  }) as unknown as Navigator;

describe('isPhone', () => {
  it('nhận điện thoại', () => {
    expect(
      isPhone(nav('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) Mobile/15E148')),
    ).toBe(true);
    expect(
      isPhone(nav('Mozilla/5.0 (Linux; Android 14; Pixel 8) Chrome/120 Mobile Safari/537.36')),
    ).toBe(true);
    expect(isPhone(nav('Mozilla/5.0 (X11; Linux x86_64)', true))).toBe(true);
  });

  it('không chặn máy tính và máy tính bảng', () => {
    expect(
      isPhone(nav('Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120 Safari/537.36', false)),
    ).toBe(false);
    expect(isPhone(nav('Mozilla/5.0 (Linux; Android 14; SM-X710) Chrome/120 Safari/537.36'))).toBe(
      false,
    );
    expect(isPhone(nav('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Safari/605.1.15'))).toBe(
      false,
    );
  });
});
