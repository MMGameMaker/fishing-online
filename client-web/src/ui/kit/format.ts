import type { Rarity } from '../../core/gameplayConfig';

/** Bảng màu rarity dùng chung cho mọi màn. */
export const RARITY_COLORS: Record<Rarity, string> = {
  common: '#a8a8a8',
  uncommon: '#5fbf5f',
  rare: '#4f9bea',
  epic: '#a86be0',
  legendary: '#f2a33a',
};

export const RARITY_LABELS: Record<Rarity, string> = {
  common: 'Thường',
  uncommon: 'Khá',
  rare: 'Hiếm',
  epic: 'Sử thi',
  legendary: 'Huyền thoại',
};

/** Gold là chuỗi số nguyên từ Server: chỉ định dạng, không tính toán. */
export function formatGold(gold: string): string {
  return gold.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

/** 405 → "40,5 cm". */
export function formatLength(lengthTenthCm: number): string {
  const whole = Math.floor(lengthTenthCm / 10);
  return `${whole},${lengthTenthCm % 10} cm`;
}
