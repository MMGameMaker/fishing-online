import { describe, expect, it } from 'vitest';
import { devIdentityFromUrl, devPlayerIdFor } from './devLogin';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

describe('đăng nhập dev', () => {
  it('cùng tên thì cùng player id, tên khác thì khác', () => {
    expect(devPlayerIdFor('Tín')).toBe(devPlayerIdFor(' tín '));
    expect(devPlayerIdFor('An')).not.toBe(devPlayerIdFor('Bình'));
  });

  it('player id đúng định dạng UUID', () => {
    for (const name of ['A', 'Bùi Quốc Tín', 'player 2'])
      expect(devPlayerIdFor(name)).toMatch(UUID);
  });

  it('chỉ bật trong bản dev và khi có ?dev=', () => {
    expect(devIdentityFromUrl('?dev=An', true)?.name).toBe('An');
    expect(devIdentityFromUrl('?dev=An', false)).toBeNull();
    expect(devIdentityFromUrl('', true)).toBeNull();
  });
});
