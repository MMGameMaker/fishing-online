import { describe, expect, it } from 'vitest';
import { newGreetState, pickLineIndex, stepGreeting } from './npcGreeting';

const COOLDOWN = 10_000;

describe('lời chào NPC', () => {
  it('lần đầu vào vùng thì nói, đứng yên trong vùng không nói lại', () => {
    const s = newGreetState();
    expect(stepGreeting(s, true, 1000, 8, COOLDOWN, () => 0.5)).toBe(4);
    expect(stepGreeting(s, true, 2000, 8, COOLDOWN, () => 0.5)).toBeNull();
    expect(stepGreeting(s, true, 30_000, 8, COOLDOWN, () => 0.5)).toBeNull();
  });

  it('ra rồi vào lại trong 10 giây kể từ lần ra cuối thì không nói', () => {
    const s = newGreetState();
    stepGreeting(s, true, 0, 8, COOLDOWN);
    stepGreeting(s, false, 1000, 8, COOLDOWN);
    expect(stepGreeting(s, true, 5000, 8, COOLDOWN)).toBeNull();
  });

  it('cứ vào ra liên tục thì mốc tính lại từ lần ra cuối, đủ 10 giây mới nói', () => {
    const s = newGreetState();
    stepGreeting(s, true, 0, 8, COOLDOWN, () => 0);
    stepGreeting(s, false, 1000, 8, COOLDOWN);
    expect(stepGreeting(s, true, 9000, 8, COOLDOWN)).toBeNull(); // 8 giây sau lần ra
    stepGreeting(s, false, 9500, 8, COOLDOWN); // ra lần nữa: mốc mới 9500
    expect(stepGreeting(s, true, 18_000, 8, COOLDOWN)).toBeNull(); // mới 8,5 giây
    stepGreeting(s, false, 18_500, 8, COOLDOWN);
    expect(stepGreeting(s, true, 28_500, 8, COOLDOWN, () => 0.9)).not.toBeNull(); // đúng 10 giây
  });

  it('không lặp lại câu vừa nói và luôn trong khoảng số câu', () => {
    const s = newGreetState();
    expect(stepGreeting(s, true, 0, 8, COOLDOWN, () => 0.3)).toBe(2);
    stepGreeting(s, false, 100, 8, COOLDOWN);
    expect(stepGreeting(s, true, 20_000, 8, COOLDOWN, () => 0.3)).toBe(3);
    stepGreeting(s, false, 20_100, 8, COOLDOWN);
    expect(stepGreeting(s, true, 40_000, 8, COOLDOWN, () => 0.9999)).toBe(7);
  });

  it('pickLineIndex: ngẫu nhiên trong khoảng, không trùng câu vừa nói, một câu thì giữ nguyên', () => {
    expect(pickLineIndex(12, -1, () => 0.5)).toBe(6);
    expect(pickLineIndex(12, 6, () => 0.5)).toBe(7);
    expect(pickLineIndex(12, 11, () => 0.9999)).toBe(0);
    expect(pickLineIndex(1, 0, () => 0)).toBe(0);
  });

  it('không có câu nào thì không nói', () => {
    expect(stepGreeting(newGreetState(), true, 0, 0, COOLDOWN)).toBeNull();
  });
});
