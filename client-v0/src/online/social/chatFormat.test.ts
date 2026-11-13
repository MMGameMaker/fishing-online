import { describe, expect, it } from 'vitest';
import { EMOJIS, emojiById } from './emojis';
import { CHAT_MAX_LENGTH, chatCounter, formatChatTime, normalizeChat } from './chatFormat';

describe('chatFormat', () => {
  it('giờ HH:MM:SS từ sentAt, thiếu thì lấy lúc nhận', () => {
    const at = new Date(2026, 10, 12, 10, 21, 36);
    expect(formatChatTime(at.toISOString(), 0)).toBe('10:21:36');
    expect(formatChatTime(undefined, at.getTime())).toBe('10:21:36');
  });

  it('chuẩn hoá tin: gộp khoảng trắng, rỗng thì không gửi, cắt độ dài', () => {
    expect(normalizeChat('  Xin   chào  ')).toBe('Xin chào');
    expect(normalizeChat('   ')).toBeNull();
    expect([...normalizeChat('a'.repeat(200))!]).toHaveLength(CHAT_MAX_LENGTH);
  });

  it('bộ đếm ký tự', () => {
    expect(chatCounter('')).toBe('0/160');
    expect(chatCounter('Hi')).toBe('2/160');
  });
});

describe('emojis', () => {
  it('16 biểu cảm emoji_01..16 không trùng art', () => {
    expect(EMOJIS).toHaveLength(16);
    expect(new Set(EMOJIS.map((e) => e.art)).size).toBe(16);
    expect(emojiById('emoji_16')?.art).toBe('claps');
    expect(emojiById('emoji_17')).toBeUndefined();
  });
});
