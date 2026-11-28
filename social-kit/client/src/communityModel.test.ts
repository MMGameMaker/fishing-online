import { describe, expect, it } from 'vitest';
import { facebookShareUrl, normalizeGroupCode, providerLabel, safeHttpsUrl, sharesTotal } from './communityModel';

describe('communityModel', () => {
  it('địa chỉ chia sẻ mã hoá đường dẫn', () => {
    expect(facebookShareUrl('https://example.com/a?b=1&c=2')).toBe(
      'https://www.facebook.com/sharer/sharer.php?u=https%3A%2F%2Fexample.com%2Fa%3Fb%3D1%26c%3D2',
    );
  });

  it('chỉ chấp nhận liên kết https', () => {
    expect(safeHttpsUrl('https://www.facebook.com/groups/abc')).toBe('https://www.facebook.com/groups/abc');
    expect(safeHttpsUrl('http://example.com')).toBeNull();
    expect(safeHttpsUrl('javascript:alert(1)')).toBeNull();
    expect(safeHttpsUrl('khong-phai-url')).toBeNull();
    expect(safeHttpsUrl(null)).toBeNull();
  });

  it('nhãn nhà cung cấp ảnh', () => {
    expect(providerLabel('facebook.com')).toBe('Ảnh từ Facebook');
    expect(providerLabel('google.com')).toBe('Ảnh từ Google');
    expect(providerLabel(null)).toBe('Chưa có ảnh tài khoản');
  });

  it('mã nhóm: cắt khoảng trắng, chỉ chữ số và gạch', () => {
    expect(normalizeGroupCode('  FISH-2026 ')).toBe('FISH-2026');
    expect(normalizeGroupCode('ab')).toBeNull();
    expect(normalizeGroupCode('có dấu')).toBeNull();
    expect(normalizeGroupCode('a b c')).toBeNull();
  });

  it('tổng lượt chia sẻ', () => {
    expect(sharesTotal({ shares: { feed: 3, group: 2 } })).toBe(5);
  });
});
