import { describe, expect, it } from 'vitest';
import { zonedToUtc } from './time';

describe('zonedToUtc', () => {
  it('converts Vietnam time (UTC+7) to UTC', () => {
    expect(zonedToUtc('2026-11-10T08:00', 'Asia/Ho_Chi_Minh')).toBe('2026-11-10T01:00:00.000Z');
  });

  it('keeps UTC as is and handles daylight saving zones', () => {
    expect(zonedToUtc('2026-11-10T08:00', 'UTC')).toBe('2026-11-10T08:00:00.000Z');
    expect(zonedToUtc('2026-07-01T12:00', 'Europe/London')).toBe('2026-07-01T11:00:00.000Z');
  });

  it('rejects malformed input', () => {
    expect(() => zonedToUtc('10/11/2026', 'UTC')).toThrow();
  });
});
